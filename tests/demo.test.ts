import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDemoStore, DEMO_KEY, type DemoStorage } from '../src/lib/store';
import { initialMenu, sampleData } from '../src/lib/seed';
import { defaults, emptyCustomer, jakartaDate, menuName, orderNumber, type OrderInput } from '../src/lib/model';
import { csvCell, csvOrder, receiptData, receiptRows } from '../src/lib/exports';
import { receiptPng } from '../src/lib/receipt-image';

function memory() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
const date = new Date('2026-10-16T12:00:00Z');
function fixture() { const storage = memory(); return { storage, store: createDemoStore(storage, () => date) }; }
function draft(menuId = 2): OrderInput {
  const menu = initialMenu[menuId - 1];
  return { requestId: randomUUID(), customer: { ...emptyCustomer }, done: false, paid: false, received: false, items: [
    { id: randomUUID(), kind: 'PERMANENT', menuId, name: 'Ignored client name', price: 1, quantity: 2, toppings: menu.toppings, customization: { ...defaults } },
    { id: randomUUID(), kind: 'TEMPORARY', menuId: null, name: 'Sample custom recipe', price: 27000, quantity: 1, toppings: [], customization: { ...defaults, notes: 'Potong kecil' } },
  ] };
}

test('first visit seeds only synthetic data; fresh stores persist edits and independent browsers stay isolated', () => {
  const { storage, store } = fixture();
  assert.deepEqual(store.menus(), initialMenu);
  const state = JSON.parse(storage.getItem(DEMO_KEY)!);
  assert.ok(state.orders.length > 60);
  assert.ok(new Set(state.orders.map((o: { orderDay: string }) => o.orderDay.slice(0, 7))).size >= 3);
  assert.ok(store.list().some(o => o.done && !o.paid));
  assert.ok(store.list().some(o => !o.done && o.paid));
  const saved = store.save(draft());
  assert.equal(saved.total, 87000);
  assert.deepEqual(createDemoStore(storage).order(saved.id), saved);
  assert.throws(() => createDemoStore(memory(), () => date).order(saved.id), /tidak ditemukan/);
  assert.equal(createDemoStore(storage).menus().length, 15);
});

test('create, edit and delete retain snapshots, customizations, daily references and idempotency', () => {
  const { storage, store } = fixture(), input = draft();
  input.items[0].toppings = ['C', 'K']; input.items[0].customization = { ...defaults, campur: true, pandan: true, kering: true, mentega: 'Tidak Ada', susu: 'Sedikit', gula: 'Banyakan' };
  const saved = store.save(input);
  assert.equal(saved.items[0].code, '2CK'); assert.equal(menuName(saved.items[0]), '1/2 CK 1/2 Keju');
  assert.equal(saved.items[1].code, 'TMP1'); assert.equal(orderNumber(saved), '#0009');
  assert.deepEqual(store.save(input), saved);
  const menu = store.menus()[1]; store.updateMenu(menu.id, { ...menu, price: 99000, name: 'Updated menu name', available: false });
  const edited = store.save({ ...saved, items: saved.items.map(i => ({ ...i, quantity: i.quantity + 1 })) }, saved.id);
  assert.equal(edited.items[0].price, 30000); assert.equal(edited.items[0].name, menu.name);
  assert.deepEqual(edited.items[0].customization, input.items[0].customization);
  assert.equal(edited.total, 144000); assert.equal(edited.createdAt, saved.createdAt); assert.equal(edited.dailyNumber, saved.dailyNumber);
  assert.throws(() => store.save(draft(), undefined), /Menu tidak tersedia/);
  assert.throws(() => store.save(saved, saved.id), /tab lain/);
  store.remove(edited.id, { version: edited.version }); assert.throws(() => store.order(saved.id), /tidak ditemukan/);
  const another = createDemoStore(storage, () => date).save(draft(3)); assert.equal(another.dailyNumber, 10);
});

test('WIB midnight resets numbering and deletions never reuse numbers', () => {
  const storage = memory(); let now = new Date('2026-10-16T16:59:59Z');
  const store = createDemoStore(storage, () => now); store.menus();
  const last = store.save(draft()); assert.equal(last.orderDay, '2026-10-16');
  now = new Date('2026-10-16T17:00:00Z');
  const first = store.save(draft()); assert.equal(orderNumber(first), '#0001'); assert.equal(first.orderDay, '2026-10-17');
  store.remove(first.id, { version: first.version }); assert.equal(store.save(draft()).dailyNumber, 2);
});

test('statuses sort finished orders last, enforce payment on pickup, restore and recalculate statistics', () => {
  const { store } = fixture(); const saved = store.save(draft());
  const before = store.statistics({ date: jakartaDate(date) });
  const done = store.status(saved.id, { version: saved.version, key: 'done', value: true });
  const active = store.list(); const firstDone = active.findIndex(o => o.done);
  assert.ok(active.slice(firstDone).every(o => o.done));
  const received = store.status(saved.id, { version: done.version, key: 'received', value: true });
  assert.ok(received.paid); assert.ok(!store.list().some(o => o.id === saved.id));
  const stats = store.statistics({ date: jakartaDate(date) });
  assert.equal(stats.revenue, before.revenue + saved.total); assert.equal(stats.quantity, before.quantity + 3);
  assert.equal(stats.orderCount, before.orderCount + 1); assert.equal(stats.average, stats.revenue / stats.quantity);
  const paid = store.status(saved.id, { version: received.version, key: 'paid', value: false }); assert.ok(paid.paid);
  store.status(saved.id, { version: paid.version, key: 'received', value: false });
  assert.deepEqual(store.statistics({ date: jakartaDate(date) }), before); assert.ok(store.order(saved.id).paid);
});

test('history pagination, search and date/month bounds agree with all-row export and totals', () => {
  const { store } = fixture(); const all = store.exportOrders();
  const ids: number[] = []; let cursor: string | undefined;
  do { const page = store.history({ cursor }, 7); ids.push(...page.orders.map(o => o.id)); cursor = page.nextCursor ?? undefined; } while (cursor);
  assert.deepEqual(ids, all.map(o => o.id)); assert.equal(new Set(ids).size, all.length);
  const today = store.history({ date: '2026-10-16' }); assert.equal(today.orders.length, 2);
  assert.equal(store.history({ date: '2026-10-16', q: '#0001' }).orders[0].dailyNumber, 1);
  assert.ok(store.history({ q: 'Coklat' }).orders.every(o => o.items.some(i => /Coklat/i.test(i.name))));
  const month = all.filter(o => jakartaDate(o.createdAt).startsWith('2026-09'));
  assert.equal(store.statistics({ month: '2026-09' }).revenue, month.reduce((sum, o) => sum + o.total, 0));
  assert.equal(store.statistics({ month: '2026-09' }).orderCount, month.length);
  assert.deepEqual(store.statistics({ date: '2000-01-01' }), { revenue: 0, quantity: 0, orderCount: 0, average: 0, bestSeller: null });
  assert.throws(() => store.history({ date: '2026-02-30' }));
});

test('all topping subsets preserve names, prices, menu codes and Campur rules', () => {
  const { store } = fixture();
  for (const menu of store.menus()) for (let mask = 0; mask < 2 ** menu.toppings.length; mask++) {
    const input = draft(menu.id); input.items = [input.items[0]];
    input.items[0].toppings = menu.toppings.filter((_, index) => mask & (1 << index));
    const saved = store.save(input), item = saved.items[0];
    assert.equal(item.name, menu.name); assert.equal(item.price, menu.price); assert.equal(saved.total, menu.price * 2);
    assert.ok(menuName(item));
    input.requestId = randomUUID(); input.items[0].customization.campur = true;
    if ([2, 7, 13].includes(menu.id)) assert.ok(store.save(input).items[0].customization.campur);
    else assert.throws(() => store.save(input), /Campur hanya tersedia/);
  }
});

test('reset restores catalog, orders and counters; corrupt or unavailable storage never silently discards data', () => {
  const { storage, store } = fixture(); store.menus(); store.save(draft());
  const menu = store.menus()[0]; store.updateMenu(1, { ...menu, name: 'Updated menu' });
  store.reset(); assert.deepEqual(JSON.parse(storage.getItem(DEMO_KEY)!), sampleData(date));
  storage.setItem(DEMO_KEY, 'broken'); assert.throws(() => store.list(), /Atur Ulang Demo/); assert.equal(storage.getItem(DEMO_KEY), 'broken');
  store.reset(); assert.equal(store.menus().length, 15);
  const blocked: DemoStorage = { getItem() { return null; }, setItem() { throw new Error('Quota'); } };
  assert.throws(() => createDemoStore(blocked).menus(), /tidak dapat disimpan/);
});

test('CSV neutralizes formulas and excludes customer information; receipts share full names without generated codes', async () => {
  const { store } = fixture(), input = draft();
  input.customer = { ...emptyCustomer, type: 'Online', name: 'Private test customer' };
  input.items[0].toppings = ['C']; input.items[0].customization = { ...defaults, campur: true, pandan: true };
  const order = receiptData(store.save(input)), csv = csvOrder(order), rows = receiptRows(order);
  assert.ok(!csv.includes(input.customer.name)); assert.ok(csv.includes('2C')); assert.ok(rows.some(r => r.text.includes('Campur')));
  assert.ok(rows.some(r => r.text === '1/2 C 1/2 Keju')); assert.ok(!rows.some(r => r.text.includes('TMP1')));
  assert.equal(csvCell('=SUM(1)'), '"\'=SUM(1)"'); assert.equal(csvCell('  @x'), '"\'  @x"');
  const drawn: string[] = [];
  const context = { measureText: (text: string) => ({ width: text.length * 6 }), scale() {}, fillRect() {}, fillText(text: string) { drawn.push(text); }, setLineDash() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} };
  const canvas = { width: 0, height: 0, getContext: () => context, toBlob: (callback: (blob: Blob) => void) => callback(new Blob(['png-test'], { type: 'image/png' })) };
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => canvas } });
  try { for (const width of ['58', '80'] as const) { assert.equal((await receiptPng(order, width)).type, 'image/png'); assert.ok(drawn.includes('TOTAL')); assert.ok(!drawn.includes(input.customer.name)); } }
  finally { if (descriptor) Object.defineProperty(globalThis, 'document', descriptor); else Reflect.deleteProperty(globalThis, 'document'); }
});


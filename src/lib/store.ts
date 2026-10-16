import { z } from 'zod';
import { historyFilters, salesBounds, type HistoryFilters, type SalesPeriod, type SalesStatistics } from './history';
import { campurAvailable, customerSchema, itemCode, jakartaDate, menuInput, menuCode, orderInput, recordVersion, sortActive, statusInput, toppingKeys, type SavedItem } from './model';
import { sampleData } from './seed';

export const DEMO_KEY = 'martabak-abong-public:v1';
export type DemoStorage = Pick<Storage, 'getItem' | 'setItem'>;
const savedItem = orderInput.shape.items.element.safeExtend({ code: z.string(), allowedToppings: z.array(z.enum(toppingKeys)) });
const stateSchema = z.object({
  schemaVersion: z.literal(1), menus: z.array(menuInput.extend({ id: z.number().int().min(1).max(15) })).length(15),
  orders: z.array(z.object({
    id: z.number().int().positive(), orderDay: z.iso.date(), dailyNumber: z.number().int().positive(), requestId: z.uuid(), version: recordVersion,
    items: z.array(savedItem).min(1).max(50), customer: customerSchema, total: z.number().int().nonnegative(),
    done: z.boolean(), paid: z.boolean(), received: z.boolean(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
  })), nextId: z.number().int().positive(), dailyCounters: z.record(z.iso.date(), z.number().int().nonnegative()),
});
type State = z.infer<typeof stateSchema>;

// Each operation reads a fresh snapshot; mutations commit the complete state once.
// Injected storage and clock allow tests without a browser or database.
export function createDemoStore(storage: DemoStorage, clock = () => new Date()) {
  function write(state: State) {
    try { storage.setItem(DEMO_KEY, JSON.stringify(state)); }
    catch { throw new Error('Data tidak dapat disimpan. Izinkan penyimpanan peramban atau kosongkan ruang penyimpanan.'); }
  }
  function load(): State {
    let raw: string | null;
    try { raw = storage.getItem(DEMO_KEY); }
    catch { throw new Error('Penyimpanan peramban tidak tersedia. Izinkan penyimpanan untuk menggunakan demo.'); }
    if (raw === null) { const state = stateSchema.parse(sampleData(clock())); write(state); return state; }
    try { return stateSchema.parse(JSON.parse(raw)); }
    catch { throw new Error('Data demo tidak dapat dibaca. Pilih Atur Ulang Demo untuk memulihkan data contoh.'); }
  }
  function find(state: State, id: number) {
    const order = state.orders.find(order => order.id === id);
    if (!order) throw new Error('Pesanan tidak ditemukan.');
    return order;
  }
  function check(actual: number, expected: number | undefined) {
    if (actual !== expected) throw new Error('Data telah berubah di tab lain. Muat ulang sebelum menyimpan.');
  }
  function matching(state: State, input: HistoryFilters = {}) {
    const filters = historyFilters.parse(input), q = filters.q?.toLocaleLowerCase('id-ID');
    const numeric = q && /^#?\d+$/.test(q) ? Number(q.replace('#', '')) : null;
    return state.orders.filter(order => order.received && (!filters.date || jakartaDate(order.createdAt) === filters.date) && (!q ||
      (numeric !== null && order.dailyNumber === numeric) || String(order.dailyNumber).includes(q) ||
      order.customer.name.toLocaleLowerCase('id-ID').includes(q) || order.items.some(item => `${item.name} ${itemCode(item)}`.toLocaleLowerCase('id-ID').includes(q))))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id);
  }
  return {
    menus: () => load().menus,
    updateMenu(id: number, input: unknown) {
      const data = menuInput.parse(input), state = load(), index = state.menus.findIndex(menu => menu.id === id);
      if (index < 0) throw new Error('Menu tidak ditemukan.');
      check(state.menus[index].version, data.version);
      const updated = { ...data, id, version: data.version + 1 }; state.menus[index] = updated; write(state); return updated;
    },
    list: () => load().orders.filter(order => !order.received).sort(sortActive),
    history(input: HistoryFilters = {}, limit = 30) {
      const filters = historyFilters.parse(input);
      let rows = matching(load(), filters);
      if (filters.cursor) { const [time, id] = filters.cursor.split('~'); rows = rows.filter(order => Date.parse(order.createdAt) < Date.parse(time) || (Date.parse(order.createdAt) === Date.parse(time) && order.id < Number(id))); }
      const orders = rows.slice(0, limit), last = orders.at(-1);
      return { orders, nextCursor: rows.length > limit && last ? `${last.createdAt}~${last.id}` : null };
    },
    exportOrders: (filters: HistoryFilters = {}) => matching(load(), filters),
    statistics(period: SalesPeriod = {}): SalesStatistics {
      const bounds = salesBounds(period);
      const rows = load().orders.filter(order => order.received && (!bounds || (Date.parse(order.createdAt) >= bounds.start.getTime() && Date.parse(order.createdAt) < bounds.end.getTime())));
      const revenue = rows.reduce((sum, order) => sum + order.total, 0), sales = new Map<string, { name: string; quantity: number }>();
      let quantity = 0;
      for (const order of rows) for (const item of order.items) {
        quantity += item.quantity;
        const key = item.kind === 'PERMANENT' ? `P:${item.menuId}` : `T:${item.name.trim().replace(/\s+/g, ' ').toLowerCase()}`;
        const prior = sales.get(key); sales.set(key, { name: prior?.name ?? item.name, quantity: (prior?.quantity ?? 0) + item.quantity });
      }
      const best = [...sales.entries()].sort((a, b) => b[1].quantity - a[1].quantity || a[0].localeCompare(b[0]))[0];
      return { revenue, orderCount: rows.length, quantity, average: quantity ? revenue / quantity : 0, bestSeller: best?.[1].name ?? null };
    },
    order: (id: number) => find(load(), id),
    save(input: unknown, id?: number) {
      const data = orderInput.parse(input), state = load(), existing = id === undefined ? undefined : find(state, id);
      if (existing) check(existing.version, data.version);
      else { const duplicate = state.orders.find(order => order.requestId === data.requestId); if (duplicate) return duplicate; }
      const prior = new Map(existing?.items.map(item => [item.id, item]) ?? []);
      let temporary = 0;
      const items: SavedItem[] = data.items.map(item => {
        const old = prior.get(item.id), same = old?.kind === 'PERMANENT' && old.menuId === item.menuId;
        if (item.customization.campur && !campurAvailable(item) && !(old?.kind === item.kind && old.menuId === item.menuId && old.customization.campur)) throw new Error('Campur hanya tersedia untuk menu 2, 7, dan 13.');
        if (item.kind === 'TEMPORARY') return { ...item, toppings: [], allowedToppings: [], code: `TMP${++temporary}` };
        const menu = state.menus.find(menu => menu.id === item.menuId);
        if (!same && (!menu || !menu.available)) throw new Error('Menu tidak tersedia. Pilih menu lain.');
        const allowed = same ? old.allowedToppings : menu!.toppings;
        if (item.toppings.some(topping => !allowed.includes(topping))) throw new Error('Pilihan topping tidak sesuai menu.');
        const toppings = toppingKeys.filter(topping => item.toppings.includes(topping));
        return { ...item, name: same ? old.name : menu!.name, price: same ? old.price : menu!.price, allowedToppings: allowed, toppings, code: menuCode(item.menuId!, toppings, allowed) };
      });
      const now = clock().toISOString(), day = jakartaDate(now);
      const dailyNumber = existing?.dailyNumber ?? (state.dailyCounters[day] ?? 0) + 1;
      const order: State['orders'][number] = {
        id: existing?.id ?? state.nextId++, requestId: existing?.requestId ?? data.requestId, version: (existing?.version ?? 0) + 1,
        items, customer: customerSchema.parse(data.customer.type ? { ...data.customer, ...(data.customer.type === 'Online' ? { gender: '', color: '', clothing: '' } : {}) } : {}),
        total: items.reduce((sum, item) => sum + item.price * item.quantity, 0), done: data.done, paid: data.received || data.paid, received: data.received,
        orderDay: existing?.orderDay ?? day, dailyNumber, createdAt: existing?.createdAt ?? now, updatedAt: now,
      };
      if (existing) state.orders[state.orders.findIndex(row => row.id === id)] = order;
      else { state.orders.push(order); state.dailyCounters[day] = dailyNumber; }
      write(state); return order;
    },
    status(id: number, input: unknown) {
      const { key, value, version } = statusInput.parse(input), state = load(), order = find(state, id);
      check(order.version, version); order[key] = value; if (order.received) order.paid = true;
      order.version++; order.updatedAt = clock().toISOString(); write(state); return order;
    },
    remove(id: number, input: unknown) {
      const { version } = z.object({ version: recordVersion }).parse(input), state = load(); check(find(state, id).version, version);
      state.orders = state.orders.filter(order => order.id !== id); write(state); return { id };
    },
    reset() { write(stateSchema.parse(sampleData(clock()))); },
  };
}
export type DemoStore = ReturnType<typeof createDemoStore>;

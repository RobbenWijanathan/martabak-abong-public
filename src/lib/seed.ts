import { defaults, emptyCustomer, jakartaDate, menuCode, type Menu, type Order, type SavedItem } from './model';

const names = ['Coklat Kacang Wijen', '1/2 CKW 1/2 Keju', 'Keju', 'Special', 'Goldenfil', 'Goldenfil Kacang Wijen', '1/2 Goldenfil 1/2 Keju', 'Goldenfil Keju', 'Goldenfil Special', 'Ketan Hitam + Kelapa', 'Durian', 'Tipis Kering CKW', 'Tipis Kering 1/2 CKW 1/2 Keju', 'Tipis Kering Keju', 'Tipis Kering Goldenfil'];
const prices = [25000, 30000, 35000, 40000, 28000, 33000, 35000, 42000, 45000, 23000, 48000, 17000, 22000, 22000, 22000];
export const initialMenu: Menu[] = names.map((name, i) => ({
  id: i + 1, name, price: prices[i], toppings: [1, 2, 4, 12, 13].includes(i + 1) ? ['C', 'K', 'W'] : [6, 9].includes(i + 1) ? ['K', 'W'] : [], available: true, version: 1,
}));

// Entirely synthetic fixtures. Dates are relative to the visitor's first visit in WIB.
export function sampleData(now = new Date()) {
  const today = jakartaDate(now), start = Date.parse(`${today}T00:00:00+07:00`);
  const orders: Order[] = [], dailyCounters: Record<string, number> = {};
  const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  function add(createdAt: string, menuId: number, received: boolean, variant: number) {
    const id = orders.length + 1, day = jakartaDate(createdAt), menu = initialMenu[menuId - 1];
    const toppings = variant % 3 === 0 ? menu.toppings.slice(0, 1) : [...menu.toppings];
    const items: SavedItem[] = [{
      id: uuid(id * 10), kind: 'PERMANENT', menuId, name: menu.name, price: menu.price,
      quantity: variant % 4 === 0 ? 2 : 1, toppings, allowedToppings: [...menu.toppings], code: menuCode(menuId, toppings, menu.toppings),
      customization: { ...defaults, susu: variant % 3 === 0 ? 'Sedikit' : 'Normal', pandan: variant % 4 === 0, kering: menuId >= 12, campur: [2, 7, 13].includes(menuId) && variant % 2 === 0, notes: variant % 5 === 0 ? 'Potong kecil' : '' },
    }];
    if (variant % 3 === 0) items.push({ id: uuid(id * 10 + 1), kind: 'TEMPORARY', menuId: null, name: 'Coklat Durian Keju', price: 45000, quantity: 1, toppings: [], allowedToppings: [], code: 'TMP1', customization: { ...defaults, mentega: 'Banyakan', gula: 'Sedikit', notes: 'Keju dipisah' } });
    else if (variant % 4 === 0) {
      const second = initialMenu[2];
      items.push({ id: uuid(id * 10 + 1), kind: 'PERMANENT', menuId: 3, name: second.name, price: second.price, quantity: 1, toppings: [], allowedToppings: [], code: '3', customization: { ...defaults } });
    }
    dailyCounters[day] = (dailyCounters[day] ?? 0) + 1;
    orders.push({ id, orderDay: day, dailyNumber: dailyCounters[day], requestId: uuid(10000 + id), version: 1, items,
      customer: { ...emptyCustomer, type: 'Langsung', name: ['Rani Contoh', 'Bima Contoh', '', 'Dewi Contoh'][variant % 4] },
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0), done: received || variant % 2 === 0, paid: received || variant % 3 === 0, received, createdAt, updatedAt: createdAt });
  }
  for (let days = 92; days >= 1; days--) {
    if (days > 6 && days % 3 !== 0) continue;
    const day = jakartaDate(new Date(start - days * 86400000));
    for (let n = 0; n < 2; n++) add(new Date(`${day}T${n ? '19:25' : '16:10'}:00+07:00`).toISOString(), (days + n) % 15 + 1, true, days + n);
  }
  for (let n = 0; n < 8; n++) {
    const time = new Date(Math.max(start, now.getTime() - (90 - n * 10) * 60000)).toISOString();
    add(time, [1, 2, 7, 12, 4, 13, 3, 9][n], n < 2, n);
  }
  return { schemaVersion: 1 as const, menus: structuredClone(initialMenu), orders, nextId: orders.length + 1, dailyCounters };
}

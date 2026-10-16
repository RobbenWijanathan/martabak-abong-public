import { z } from 'zod';

export const toppingKeys = ['C', 'K', 'W'] as const;
export const toppingNames = { C: 'Coklat', K: 'Kacang', W: 'Wijen' };
const money = z.number().int().min(0).max(100_000_000);
// Leave room for the next optimistic-lock increment.
export const recordVersion = z.number().int().min(1).max(2147483646);
export const menuInput = z.object({
  name: z.string().trim().min(1).max(100), price: money,
  toppings: z.array(z.enum(toppingKeys)).max(3).refine(a => new Set(a).size === a.length),
  available: z.boolean(), version: recordVersion,
});
export const levels = ['Tidak Ada', 'Sedikit', 'Normal', 'Banyakan'] as const;
export const customizationSchema = z.object({
  mentega: z.enum(levels).default('Normal'),
  susu: z.enum(levels).default('Normal'),
  gula: z.enum(levels).default('Normal'),
  pandan: z.boolean().default(false), kering: z.boolean().default(false), campur: z.boolean().default(false),
  notes: z.string().trim().max(500).default(''),
});
export const customerSchema = z.object({
  type: z.enum(['', 'Langsung', 'Online']).default(''),
  name: z.string().trim().max(100).default(''),
  gender: z.enum(['', 'Laki-laki', 'Perempuan']).default(''),
  color: z.string().trim().max(40).default(''), clothing: z.string().trim().max(40).default(''),
});
export const itemInput = z.object({
  id: z.uuid(), kind: z.enum(['PERMANENT', 'TEMPORARY']),
  menuId: z.number().int().min(1).max(15).nullable(),
  name: z.string().trim().min(1).max(100), price: money,
  quantity: z.number().int().min(1).max(100),
  toppings: z.array(z.enum(toppingKeys)).max(3).refine(a => new Set(a).size === a.length),
  customization: customizationSchema,
}).refine(i => i.kind === 'PERMANENT' ? i.menuId !== null : i.menuId === null, 'Menu tidak valid.');
export const orderInput = z.object({
  requestId: z.uuid(), version: recordVersion.optional(),
  items: z.array(itemInput).min(1).max(50).refine(a => new Set(a.map(i => i.id)).size === a.length),
  customer: customerSchema,
  done: z.boolean().default(false), paid: z.boolean().default(false), received: z.boolean().default(false),
});
export const statusInput = z.object({
  version: recordVersion, key: z.enum(['done', 'paid', 'received']), value: z.boolean(),
});
export type Customization = z.infer<typeof customizationSchema>;
export type Customer = z.infer<typeof customerSchema>;
export type ItemInput = z.infer<typeof itemInput>;
export type OrderInput = z.infer<typeof orderInput>;
export type SavedItem = ItemInput & { code: string; allowedToppings: (typeof toppingKeys)[number][] };
// Defaults come from the order's saved recipe, so later catalog edits cannot change history.
export function menuCode(menuId: number, selected: ItemInput['toppings'], defaults: ItemInput['toppings']) {
  const toppings = toppingKeys.filter(key => selected.includes(key));
  if (!defaults.length || (toppings.length === defaults.length && defaults.every(key => toppings.includes(key)))) return String(menuId);
  return toppings.length ? `${menuId}${toppings.join('')}` : `${menuId} Polos`;
}
export const itemCode = (item: SavedItem) => item.kind === 'TEMPORARY' ? item.code : menuCode(item.menuId!, item.toppings, item.allowedToppings);
// Derive from the saved recipe snapshot, not today's catalog. Never overwrite item.name:
// retaining it lets old orders and re-enabled toppings reconstruct the original recipe.
export function menuName(item: Pick<ItemInput, 'kind' | 'menuId' | 'name' | 'toppings'> & { allowedToppings?: (typeof toppingKeys)[number][] }) {
  if (item.kind === 'TEMPORARY') return item.name;
  const selected = toppingKeys.filter(key => item.toppings.includes(key));
  const special = (item.menuId === 4 && /^Special$/i.test(item.name)) || (item.menuId === 9 && /^Goldenfil Special$/i.test(item.name));
  if (special) {
    const original = item.menuId === 4 ? ['C', 'K', 'W'] : ['K', 'W'];
    if (selected.join('') === original.join('')) return item.name;
    return `${item.name} (${[...selected.map(key => toppingNames[key]), 'Keju'].join(' ')})`;
  }
  let recognized = false;
  const name = item.name.replace(/\b(Coklat|Kacang|Wijen|[CKW]{1,3})\b/g, token => {
    recognized = true;
    const key = toppingKeys.find(key => toppingNames[key] === token);
    if (key) return selected.includes(key) ? token : '';
    return toppingKeys.filter(key => token.includes(key) && selected.includes(key)).join('') || 'Polos';
  }).replace(/\s+/g, ' ').trim();
  if (recognized) return name || 'Polos';
  // A renamed recipe may not describe its ingredients. Keep that name intact and
  // explicitly describe removed options instead of guessing its fixed ingredients.
  const removed = toppingKeys.filter(key => item.allowedToppings?.includes(key) && !selected.includes(key));
  return removed.length ? `${item.name} (Tanpa ${removed.map(key => toppingNames[key]).join(' ')})` : item.name;
}
export type Menu = z.infer<typeof menuInput> & { id: number };
export type Order = {
  id: number; orderDay?: string | null; dailyNumber?: number | null; requestId: string; version: number; items: SavedItem[]; customer: Customer;
  total: number; done: boolean; paid: boolean; received: boolean; createdAt: string; updatedAt: string;
};
export const defaults: Customization = { mentega: 'Normal', susu: 'Normal', gula: 'Normal', pandan: false, kering: false, campur: false, notes: '' };
export const emptyCustomer: Customer = { type: '', name: '', gender: '', color: '', clothing: '' };
const currencyFormat = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const timeFormat = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
export const rupiah = (value: number) => currencyFormat.format(value);
export const orderNumber = (order: { id: number; dailyNumber?: number | null }) => `#${String(order.dailyNumber ?? order.id).padStart(order.dailyNumber == null ? 3 : 4, '0')}`;
export const dateTime = (value: string | Date) => timeFormat.format(new Date(value));
export const jakartaDate = (value: string | Date) => dayFormat.format(new Date(value));
export const sortActive = (a: Order, b: Order) => Number(a.done) - Number(b.done) || Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id - b.id;
export type HistoryPage = { orders: Order[]; nextCursor: string | null };
export const campurAvailable = (item: Pick<ItemInput, 'kind' | 'menuId'>) => item.kind === 'PERMANENT' && [2, 7, 13].includes(item.menuId ?? 0);
// Display-only suffixes; never use this value as a stored or exported menu code.
export const codeLabel = (code: string, c: Customization) => [code, c.campur && 'Campur', c.pandan && 'Pandan'].filter(Boolean).join(' ');
// Legacy empty types are supported in storage; the editor offers two current types.
export const customerForForm = (customer: Customer): Customer => ({ ...customer, type: customer.type || 'Langsung' });
export function details(c: Customization, { excludeCodeLabels = false }: { excludeCodeLabels?: boolean } = {}) {
  return [c.mentega !== 'Normal' && `Mentega ${c.mentega}`, c.susu !== 'Normal' && `Susu ${c.susu}`, c.gula !== 'Normal' && `Gula ${c.gula}`, !excludeCodeLabels && c.pandan && 'Pandan', c.kering && 'Kering', !excludeCodeLabels && c.campur && 'Campur', c.notes].filter(Boolean).join(' · ');
}
export function customerLabel(c: Customer) {
  return [c.type, c.name, ...(c.type === 'Langsung' ? [c.gender, c.color, c.clothing] : [])].filter(Boolean).join(' · ') || 'Pelanggan tidak diisi';
}

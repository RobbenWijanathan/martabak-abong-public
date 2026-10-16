import { ZodError } from 'zod';
import { createDemoStore, DEMO_KEY, type DemoStore } from './store';
import { csvHeaders, csvLine, csvOrder, receiptData } from './exports';
import type { HistoryFilters, SalesPeriod } from './history';

// The only browser-storage entry point. No network transport or backend fallback.
async function run<T>(operation: (store: DemoStore) => T, mutation = false): Promise<T> {
  const execute = () => {
    try {
      const result = operation(createDemoStore(window.localStorage));
      if (mutation) window.dispatchEvent(new Event('demo-change'));
      return result;
    } catch (error) {
      if (error instanceof ZodError) throw new Error('Data tidak valid. Periksa isian atau muat ulang data demo.');
      if (error instanceof DOMException) throw new Error('Penyimpanan peramban tidak tersedia. Izinkan penyimpanan untuk menggunakan demo.');
      throw error;
    }
  };
  // Serialize writes between tabs when supported; versions reject stale editors.
  return navigator.locks ? navigator.locks.request(DEMO_KEY, execute) : execute();
}
export const demo = {
  menus: () => run(store => store.menus()),
  updateMenu: (id: number, input: unknown) => run(store => store.updateMenu(id, input), true),
  list: () => run(store => store.list()),
  history: (filters: HistoryFilters) => run(store => store.history(filters)),
  statistics: (period: SalesPeriod) => run(store => store.statistics(period)),
  order: (id: number) => run(store => store.order(id)),
  receipt: (id: number) => run(store => receiptData(store.order(id))),
  save: (input: unknown, id?: number) => run(store => store.save(input, id), true),
  status: (id: number, input: unknown) => run(store => store.status(id, input), true),
  remove: (id: number, input: unknown) => run(store => store.remove(id, input), true),
  reset: () => run(store => store.reset(), true),
  exportCsv: async (filters: HistoryFilters) => {
    const orders = await run(store => store.exportOrders(filters));
    saveBlob(new Blob(['\uFEFF', csvLine(csvHeaders), ...orders.map(csvOrder)], { type: 'text/csv;charset=utf-8' }), 'martabak-abong-riwayat.csv');
  },
};
export function subscribeDemo(listener: () => void) {
  const changed = (event: StorageEvent) => { if (event.key === DEMO_KEY || event.key === null) listener(); };
  window.addEventListener('storage', changed);
  window.addEventListener('demo-change', listener);
  return () => { window.removeEventListener('storage', changed); window.removeEventListener('demo-change', listener); };
}
export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

import { z } from 'zod';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !value.startsWith('0000') && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});
const cursor = z.string().max(38).regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?Z~[1-9]\d{0,9}$/).refine(value => {
  const [time, id] = value.split('~');
  return day.safeParse(time.slice(0, 10)).success && Number.isFinite(Date.parse(time)) && Number(id) <= 2147483647;
});
export const historyFilters = z.object({
  date: day.optional(), q: z.string().trim().max(100).optional(),
  cursor: cursor.optional(),
});
export type HistoryFilters = z.infer<typeof historyFilters>;
export const salesPeriod = z.object({
  date: day.optional(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).refine(value => !value.startsWith('0000')).optional(),
}).refine(value => !(value.date && value.month), 'Choose a date or a month, not both.');
export type SalesPeriod = z.infer<typeof salesPeriod>;
export type SalesStatistics = { revenue: number; orderCount: number; quantity: number; average: number; bestSeller: string | null };
export function salesBounds(input: SalesPeriod) {
  const period = salesPeriod.parse(input);
  if (period.date) {
    const start = new Date(`${period.date}T00:00:00+07:00`);
    return { start, end: new Date(start.getTime() + 86400000) };
  }
  if (period.month) {
    const start = new Date(`${period.month}-01T00:00:00+07:00`);
    const next = new Date(`${period.month}-01T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    return { start, end: new Date(next.getTime() - 7 * 3600000) };
  }
  return null;
}
export function readHistoryFilters(params: URLSearchParams) {
  return historyFilters.parse(Object.fromEntries(['date', 'q', 'cursor'].flatMap(key => params.get(key) ? [[key, params.get(key)]] : [])));
}

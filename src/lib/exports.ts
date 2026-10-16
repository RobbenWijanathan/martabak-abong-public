import { type Order, orderNumber, details, rupiah, menuName, itemCode } from './model';

export type ReceiptOrder = Pick<Order, 'id' | 'dailyNumber' | 'orderDay' | 'createdAt' | 'items' | 'total' | 'paid'>;
export function receiptData(order: Omit<ReceiptOrder, 'createdAt'> & { createdAt: Date | string }): ReceiptOrder {
  return { id: order.id, dailyNumber: order.dailyNumber, orderDay: order.orderDay, createdAt: new Date(order.createdAt).toISOString(), items: order.items, total: order.total, paid: order.paid };
}
const exportDate = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
export const exportTime = (time: string | Date) => `${exportDate.format(new Date(time))} WIB`;
export type ReceiptRow = { text: string; right?: string; bold?: boolean; center?: boolean; rule?: boolean };
// One content model for HTML, thermal printing and canvas; no customer fields.
export function receiptRows(order: ReceiptOrder): ReceiptRow[] {
  return [
    { text: 'MARTABAK ABONG', bold: true, center: true },
    { text: `Pesanan ${orderNumber(order)}`, center: true },
    { text: exportTime(order.createdAt), center: true }, { text: '', rule: true },
    ...order.items.flatMap(item => [
      { text: menuName(item), bold: true },
      ...(details(item.customization) ? [{ text: details(item.customization) }] : []),
      { text: `${item.quantity} × ${rupiah(item.price)}`, right: rupiah(item.quantity * item.price) }, { text: '', rule: true },
    ]),
    { text: 'TOTAL', right: rupiah(order.total), bold: true },
    { text: order.paid ? 'Sudah Dibayar' : 'Belum Dibayar', bold: true, center: true },
  ];
}
export const csvHeaders = ['Nomor Pesanan', 'Tanggal/Waktu', 'Nama Menu', 'Kode Menu', 'Jumlah', 'Harga Satuan', 'Subtotal Item', 'Total Pesanan', 'Mentega', 'Susu', 'Gula', 'Pandan', 'Kering', 'Campur', 'Catatan Tambahan', 'Status Pembayaran'];
export function csvCell(value: string | number) {
  let text = String(value);
  // Quoting alone does not prevent spreadsheet formulas, including whitespace prefixes.
  if (typeof value === 'string' && (/^[\s\u0000-\u001f]*[=+@-]/u.test(text) || /^[\t\r\n]/.test(text))) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export const csvLine = (values: (string | number)[]) => values.map(csvCell).join(',') + '\r\n';
export function csvOrder(order: ReceiptOrder) {
  return order.items.map(item => {
    const c = item.customization;
    return csvLine([orderNumber(order), exportTime(order.createdAt), menuName(item), itemCode(item), item.quantity, item.price, item.quantity * item.price, order.total,
      c.mentega === 'Normal' ? '' : c.mentega, c.susu === 'Normal' ? '' : c.susu, c.gula === 'Normal' ? '' : c.gula,
      c.pandan ? 'Ya' : '', c.kering ? 'Ya' : '', c.campur ? 'Ya' : '', c.notes, order.paid ? 'Sudah Dibayar' : 'Belum Dibayar']);
  }).join('');
}

import { receiptRows, type ReceiptOrder } from './exports';

export function wrapText(text: string, width: number, measure: (text: string) => number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const character of Array.from(paragraph)) {
      if (line && measure(line + character) > width) {
        const space = line.lastIndexOf(' ');
        if (space > 0) { lines.push(line.slice(0, space + 1)); line = line.slice(space + 1); }
        else { lines.push(line); line = ''; }
      }
      line += character;
    }
    lines.push(line);
  }
  return lines;
}
export async function receiptPng(order: ReceiptOrder, paper: '58' | '80'): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Peramban tidak dapat membuat PNG. Gunakan Cetak struk.');
  const width = paper === '58' ? 232 : 320, padding = 14, usable = width - padding * 2;
  const font = (bold?: boolean) => `${bold ? 'bold ' : ''}12px monospace`;
  let y = padding;
  const lines = receiptRows(order).flatMap(row => {
    if (row.rule) { const position = y + 5; y += 13; return [{ ...row, y: position, x: padding }]; }
    context.font = font(row.bold);
    const rightWidth = row.right ? context.measureText(row.right).width : 0;
    const separate = row.right && usable - rightWidth - 12 < 75;
    const available = row.right && !separate ? usable - rightWidth - 12 : usable;
    const wrapped = wrapText(row.text, available, text => context.measureText(text).width);
    const result = wrapped.map((text, index) => ({ ...row, text, right: index === 0 && !separate ? row.right : undefined, y: y + index * 16, x: row.center ? width / 2 : padding }));
    y += wrapped.length * 16;
    if (separate) { result.push({ text: '', right: row.right, bold: row.bold, center: false, y, x: padding }); y += 16; }
    y += 5;
    return result;
  });
  const height = Math.ceil(y + padding);
  // Keep within conservative mobile canvas limits, even with fifty long notes.
  const scale = Math.min(3, 32760 / height, Math.sqrt(16000000 / (width * height)));
  canvas.width = Math.ceil(width * scale); canvas.height = Math.ceil(height * scale);
  context.scale(scale, scale); context.fillStyle = '#fff'; context.fillRect(0, 0, width, height);
  context.fillStyle = '#111'; context.strokeStyle = '#555'; context.textBaseline = 'top';
  for (const line of lines) {
    if (line.rule) { context.setLineDash([3, 3]); context.beginPath(); context.moveTo(padding, line.y); context.lineTo(width - padding, line.y); context.stroke(); continue; }
    context.font = font(line.bold); context.textAlign = line.center ? 'center' : 'left'; context.fillText(line.text, line.x, line.y);
    if (line.right) { context.textAlign = 'right'; context.fillText(line.right, width - padding, line.y); }
  }
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    canvas.width = 1; canvas.height = 1;
    if (blob) resolve(blob); else reject(new Error('PNG gagal dibuat. Gunakan Cetak struk atau coba lagi.'));
  }, 'image/png'));
}

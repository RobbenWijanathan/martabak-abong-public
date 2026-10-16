'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Printer, ArrowLeft, Download } from 'lucide-react';
import { demo, saveBlob } from '@/lib/client';
import { orderNumber, jakartaDate } from '@/lib/model';
import { receiptRows, type ReceiptOrder } from '@/lib/exports';
import { receiptPng } from '@/lib/receipt-image';
export function Receipt({ order: initial }: { order: ReceiptOrder }) {
  const [order, setOrder] = useState(initial), [width, setWidth] = useState<'58' | '80'>('58');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = useRef(false);
  useEffect(() => { setOrder(initial); }, [initial]);
  async function output(kind: 'print' | 'png') {
    if (pending.current) return; pending.current = true; setBusy(true); setError('');
    try {
      const latest = await demo.receipt(order.id);
      flushSync(() => setOrder(latest));
      if (kind === 'print') window.print();
      else saveBlob(await receiptPng(latest, width), `struk-martabak-abong-${latest.orderDay ?? jakartaDate(latest.createdAt)}-${orderNumber(latest).slice(1)}.png`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Struk gagal diunduh.'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <><div className="no-print"><Link className="back-link" href="/"><ArrowLeft size={17} /> Kembali</Link><div className="page-heading"><h1>Struk</h1></div><label>Lebar kertas<select value={width} onChange={e => setWidth(e.target.value as '58' | '80')} disabled={busy}><option value="58">58 mm</option><option value="80">80 mm</option></select></label><div className="receipt-actions"><button className="button primary" disabled={busy} onClick={() => output('print')}><Printer size={18} /> Cetak struk</button><button className="button" disabled={busy} onClick={() => output('png')}><Download size={18} /> Unduh PNG</button></div>{busy && <p role="status">Menyiapkan struk…</p>}{error && <p className="error" role="alert">{error}</p>}</div>
    <style>{`@media print { @page { size: auto; margin: 2mm; } .receipt { width: ${Number(width) - 4}mm !important; } }`}</style><article className="receipt" aria-label="Struk pesanan" style={{ maxWidth: `${width}mm` }}>{receiptRows(order).map((row, index) => row.rule ? <div key={index} className="receipt-rule" /> : <div key={index} className={`receipt-line ${row.center ? 'center' : ''} ${row.bold ? 'bold' : ''}`}><span>{row.text}</span>{row.right && <span>{row.right}</span>}</div>)}</article></>;
}

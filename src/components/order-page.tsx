'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { OrderForm } from './order-form';
import { Receipt } from './receipt';
import { demo, subscribeDemo } from '@/lib/client';
import type { ReceiptOrder } from '@/lib/exports';

export function OrderPage({ receipt = false }: { receipt?: boolean }) {
  const value = useSearchParams().get('id');
  const id = value && /^[1-9]\d*$/.test(value) ? Number(value) : 0;
  const [order, setOrder] = useState<ReceiptOrder | null>(null), [error, setError] = useState('');
  useEffect(() => {
    if (!receipt || !Number.isSafeInteger(id) || !id) return;
    let active = true;
    const load = () => { void demo.receipt(id).then(value => { if (active) { setOrder(value); setError(''); } }).catch(e => { if (active) { setOrder(null); setError(e instanceof Error ? e.message : 'Struk gagal dimuat.'); } }); };
    setOrder(null); load(); const unsubscribe = subscribeDemo(load);
    return () => { active = false; unsubscribe(); };
  }, [id, receipt]);
  if (!id || !Number.isSafeInteger(id) || error) return <><p role="alert" className="error">{error || 'Nomor pesanan tidak valid.'}</p><Link className="back-link" href="/">Kembali ke pesanan</Link></>;
  if (!receipt) return <OrderForm key={id} orderId={id} />;
  return order ? <Receipt key={`${id}:${order.paid}`} order={order} /> : <p className="loading" role="status">Memuat struk…</p>;
}

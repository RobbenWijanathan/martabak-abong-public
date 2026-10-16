'use client';
import { useEffect, useState } from 'react';
import { demo, subscribeDemo } from '@/lib/client';
import type { SalesStatistics } from '@/lib/history';
import { rupiah } from '@/lib/model';

export function SalesSummary({ date, month, revision }: { date?: string; month?: string; revision: number }) {
  const [data, setData] = useState<SalesStatistics | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true, pending = false;
    setData(null); setError('');
    async function load() {
      if (pending) return;
      pending = true;
      try { const value = await demo.statistics({ ...(date ? { date } : {}), ...(month ? { month } : {}) }); if (active) { setData(value); setError(''); } }
      catch (e) { if (active) { setData(null); setError(e instanceof Error ? e.message : 'Gagal memuat ringkasan.'); } }
      finally { pending = false; }
    }
    void load();
    const visible = () => { if (document.visibilityState === 'visible') void load(); };
    const unsubscribe = subscribeDemo(visible);
    window.addEventListener('focus', visible); document.addEventListener('visibilitychange', visible);
    return () => { active = false; unsubscribe(); window.removeEventListener('focus', visible); document.removeEventListener('visibilitychange', visible); };
  }, [date, month, revision, retry]);
  const cards = [
    { label: 'Total Loyang', value: data?.quantity.toLocaleString('id-ID') },
    { label: 'Total Pendapatan', value: data && rupiah(data.revenue) },
    { label: 'Total Pesanan', value: data?.orderCount.toLocaleString('id-ID') },
    { label: 'Paling Laris', value: data ? data.bestSeller ?? '—' : undefined },
    { label: 'Harga Rata-rata', value: data && rupiah(data.average) },
  ];
  return <section className="sales-summary" aria-label={month ? 'Ringkasan bulanan' : 'Ringkasan harian'}>
    <div className="sales-grid" aria-busy={!data && !error}>{cards.map(card => <div className="sales-card" key={card.label}><span>{card.label}</span><strong>{card.value ?? '…'}</strong></div>)}</div>
    <p className="field-hint">{month ? 'Bulan terpilih' : date ? 'Tanggal terpilih' : 'Semua tanggal'} · Pesanan diambil · WIB</p>
    {error && <div role="alert" className="error">{error}<button className="text-button" onClick={() => setRetry(value => value + 1)}>Muat ulang ringkasan</button></div>}
  </section>;
}

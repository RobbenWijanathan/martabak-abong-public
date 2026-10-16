'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SalesSummary } from './sales-summary';
import { Search, ReceiptText, Pencil, RotateCcw, X, Trash2, Download } from 'lucide-react';
import { demo, subscribeDemo } from '@/lib/client';
import { type Order, type HistoryPage, rupiah, orderNumber, dateTime, details, codeLabel, customerLabel, sortActive, jakartaDate, menuName, itemCode } from '@/lib/model';

export function OrderList({ history = false }: { history?: boolean }) {
  const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [date, setDate] = useState('');
  const [mode, setMode] = useState<'daily' | 'monthly'>('daily'), [month, setMonth] = useState(''), [revision, setRevision] = useState(0);
  // Resolve the visitor's date after hydration, not on the static build's date.
  useEffect(() => { const today = jakartaDate(new Date()); setDate(today); setMonth(today.slice(0, 7)); }, []);
  const monthly = history && mode === 'monthly';
  const [cursors, setCursors] = useState<string[]>([]), [nextCursor, setNextCursor] = useState<string | null>(null);
  const cursor = cursors.at(-1) || '';
  const [orders, setOrders] = useState<Order[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [pending, setPending] = useState<number | null>(null), [exporting, setExporting] = useState(false), [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'preparing' | 'ready'>('all');
  const [notice, setNotice] = useState<{ message: string } | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const busy = useRef(false), generation = useRef(0);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search); setCursors([]); }, 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    const saved = new URLSearchParams(window.location.search).get('saved');
    if (saved && /^\d+$/.test(saved)) {
      void demo.order(Number(saved)).then(order => setNotice({ message: `Pesanan ${orderNumber(order)} tersimpan.` })).catch(() => setNotice({ message: 'Pesanan tersimpan.' }));
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);
  const apply = useCallback((result: Order[] | HistoryPage) => {
    setOrders(Array.isArray(result) ? result : result.orders);
    setNextCursor(Array.isArray(result) ? null : result.nextCursor);
  }, []);
  const load = useCallback(async () => {
    if (busy.current || monthly) return;
    const version = ++generation.current;
    setRefreshing(true);
    try { const result = await (history ? demo.history({ ...(date ? { date } : {}), ...(query ? { q: query } : {}), ...(cursor ? { cursor } : {}) }) : demo.list()); if (version === generation.current) { apply(result); setError(''); } }
    catch (e) { if (version === generation.current) setError(e instanceof Error ? e.message : 'Gagal memuat pesanan.'); }
    finally { if (version === generation.current) { setLoading(false); setRefreshing(false); } }
  }, [history, date, query, cursor, apply, monthly]);
  useEffect(() => {
    if (monthly) return;
    setOrders([]); setLoading(true);
    void load();
    const visible = () => { if (document.visibilityState === 'visible') void load(); };
    const unsubscribe = subscribeDemo(() => { setRevision(value => value + 1); visible(); });
    window.addEventListener('focus', visible); document.addEventListener('visibilitychange', visible);
    return () => { ++generation.current; unsubscribe(); window.removeEventListener('focus', visible); document.removeEventListener('visibilitychange', visible); };
  }, [load, monthly]);
  async function change(order: Order, key: 'done' | 'paid' | 'received', value: boolean) {
    if (busy.current) return;
    busy.current = true; ++generation.current; setRefreshing(false); setPending(order.id); setError('');
    const before = orders;
    const optimistic = { ...order, [key]: value, paid: key === 'received' && value ? true : key === 'paid' ? value : order.paid };
    setOrders(before.map(o => o.id === order.id ? optimistic : o).filter(o => o.received === history));
    try {
      const saved = await demo.status(order.id, { version: order.version, key, value });
      const updated = before.map(o => o.id === saved.id ? saved : o).filter(o => o.received === history);
      setOrders(updated);
      setNotice({ message: `Pesanan ${orderNumber(order)} ${key === 'received' ? value ? 'dipindahkan ke riwayat.' : 'dikembalikan ke antrean.' : 'diperbarui.'}` });
    } catch (e) { setOrders(before); setError(e instanceof Error ? e.message : 'Gagal menyimpan status.'); }
    finally { busy.current = false; setPending(null); setLoading(false); setRevision(value => value + 1); }
  }
  async function remove(order: Order) {
    if (busy.current || !window.confirm(`Hapus pesanan ${orderNumber(order)}? Pesanan ini tidak dapat dikembalikan.`)) return;
    busy.current = true; ++generation.current; setRefreshing(false); setPending(order.id); setError('');
    try { await demo.remove(order.id, { version: order.version }); setOrders(old => old.filter(o => o.id !== order.id)); setNotice({ message: `Pesanan ${orderNumber(order)} dihapus.` }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Gagal menghapus pesanan.'); }
    finally { busy.current = false; setPending(null); setRevision(value => value + 1); }
  }
  async function exportCsv() {
    if (exporting) return; setExporting(true); setError('');
    try { await demo.exportCsv({ ...(date ? { date } : {}), ...(query ? { q: query } : {}) }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Gagal mengunduh CSV.'); } finally { setExporting(false); }
  }
  const filtered = history ? orders : orders.filter(o => filter === 'all' || (filter === 'ready' ? o.done : !o.done)).sort(sortActive);
  const feedback = <div className="queue-update" role="status" aria-live="polite" aria-atomic="true">{notice && <><span>{notice.message}</span><button type="button" aria-label="Tutup pemberitahuan" onClick={() => setNotice(null)}><X size={14} /></button></>}</div>;
  return <>
    {history && feedback}
    {history ? <><div className="compact-heading"><h1>Riwayat</h1>{!monthly && <button className="text-button" disabled={exporting || search !== query} onClick={exportCsv}><Download size={16} />{exporting ? 'Mengunduh…' : 'Unduh CSV'}</button>}</div>
      <div className="segmented history-mode" aria-label="Tampilan riwayat">{(['daily', 'monthly'] as const).map(value => <button key={value} disabled={pending !== null} aria-pressed={mode === value} className={mode === value ? 'selected' : ''} onClick={() => setMode(value)}>{value === 'daily' ? 'Harian' : 'Bulanan'}</button>)}</div>
      {monthly ? <label className="date-filter">Bulan dan tahun<input type="month" required value={month} onChange={e => { if (e.target.value) setMonth(e.target.value); }} /></label> : <>
      <div className="search-box"><Search size={18} /><input aria-label="Cari riwayat" placeholder="Nomor, menu, atau pelanggan" value={search} disabled={pending !== null} onChange={e => setSearch(e.target.value)} /></div>
      <label className="date-filter">Tanggal<input type="date" value={date} disabled={pending !== null} onChange={e => { setDate(e.target.value); setCursors([]); }} />{date && <button className="text-button" disabled={pending !== null} onClick={() => { setDate(''); setCursors([]); }}>Hapus filter</button>}</label></>}
      <SalesSummary key={monthly ? month : date} date={monthly ? undefined : date} month={monthly ? month : undefined} revision={revision} /></>
      : <div className="queue-toolbar"><div className="queue-filters" aria-label="Filter status pesanan">{([{ key: 'all', label: 'Semua' }, { key: 'preparing', label: 'Diproses' }, { key: 'ready', label: 'Selesai' }] as const).map(({ key, label }) => <button key={key} aria-pressed={filter === key} className={filter === key ? 'selected' : ''} onClick={() => setFilter(key)}>{label}</button>)}</div>{feedback}</div>}
    {!monthly && error && <div className="error" role="alert">{error}<button className="text-button" disabled={pending !== null} onClick={load}>Muat ulang</button></div>}
    {!monthly && refreshing && !loading && <p className="sync-status" role="status">Memperbarui…</p>}
    {!monthly && (loading ? <p className="loading" role="status">Memuat pesanan…</p> : filtered.length === 0 ? <div className="empty compact"><p>{history ? 'Tidak ada riwayat pada halaman ini.' : 'Belum ada pesanan.'}</p></div> : <div className="order-list">{filtered.map(order => <article key={order.id} aria-busy={pending === order.id} className={`order-card ${order.paid ? 'paid' : ''} ${!history && order.done ? 'done' : ''}`}>
      <div className="order-card-heading"><span className={`badge ${order.done ? 'ready' : ''}`}>{order.received ? 'Diambil' : order.done ? 'Selesai' : 'Diproses'}</span><div className="order-number"><span>{orderNumber(order)}</span><time>{dateTime(order.createdAt)}</time></div></div>
      <div className="order-items">{order.items.map(item => <div key={item.id} className="order-item"><div><strong>{codeLabel(itemCode(item), item.customization)} <span className="quantity">× {item.quantity}</span></strong><p>{menuName(item)}</p>{details(item.customization, { excludeCodeLabels: true }) && <p className="item-notes">{details(item.customization, { excludeCodeLabels: true })}</p>}</div><span>{rupiah(item.price * item.quantity)}</span></div>)}</div>
      {order.customer.type && <div className="customer-line">{customerLabel(order.customer)}</div>}<div className="order-total"><span>Total</span><strong>{rupiah(order.total)}</strong></div>
      <div className="statuses">{([{ key: 'done', label: 'Selesai' }, { key: 'paid', label: 'Dibayar' }, { key: 'received', label: 'Diambil' }] as const).map(({ key, label }) => <label key={key}><input type="checkbox" checked={order[key]} disabled={pending !== null || (key === 'paid' && order.received)} onChange={e => change(order, key, e.target.checked)} /><span>{label}</span></label>)}</div>
      <div className="card-actions"><Link href={`/pesanan/?id=${order.id}`} prefetch={false}><Pencil size={15} /> Ubah</Link><Link href={`/struk/?id=${order.id}`} prefetch={false}><ReceiptText size={15} /> Struk</Link>{history && <button disabled={pending !== null} onClick={() => change(order, 'received', false)}><RotateCcw size={15} /> Pulihkan</button>}<button disabled={pending !== null} onClick={() => remove(order)}><Trash2 size={15} /> Hapus</button></div>
    </article>)}</div>)}
    {!history && <Link href="/tambah" className="button primary full queue-add-order">Tambah Pesanan</Link>}
    {history && !monthly && <div className="pagination"><button className="text-button" disabled={!cursors.length || loading || pending !== null} onClick={() => setCursors(old => old.slice(0, -1))}>Sebelumnya</button><span>{cursors.length + 1}</span><button className="text-button" disabled={!nextCursor || loading || pending !== null} onClick={() => { if (nextCursor) setCursors(old => [...old, nextCursor]); }}>Berikutnya</button></div>}
  </>;
}


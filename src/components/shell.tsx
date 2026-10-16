'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Plus, History, UtensilsCrossed, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { demo } from '@/lib/client';
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function reset() {
    if (busy || !window.confirm('Atur ulang demo? Semua perubahan di peramban ini akan diganti dengan data contoh.')) return;
    setBusy(true); setError('');
    try { await demo.reset(); window.location.assign('/'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Demo gagal diatur ulang.'); setBusy(false); }
  }
  return <div className="app-shell"><header className="app-header no-print"><Link href="/" className="brand">Martabak Abong <span className="demo-badge">Demo</span></Link><button className="demo-reset" aria-label="Atur Ulang Demo" onClick={reset} disabled={busy}><RotateCcw size={15} />{busy ? '…' : 'Atur Ulang'}</button></header>
    {error && <p className="error" role="alert">{error}</p>}<main className="page-content">{children}</main>
    <nav className="bottom-nav no-print" aria-label="Navigasi utama">{[{ href: '/', label: 'Pesanan', Icon: ClipboardList }, { href: '/tambah', label: 'Tambah', Icon: Plus }, { href: '/riwayat', label: 'Riwayat', Icon: History }, { href: '/menu', label: 'Menu', Icon: UtensilsCrossed }].map(({ href, label, Icon }) => <Link key={href} href={href} className={path === href ? 'active' : ''} aria-current={path === href ? 'page' : undefined}><span className={href === '/tambah' ? 'nav-add' : ''}><Icon size={22} /></span>{label}</Link>)}</nav></div>;
}

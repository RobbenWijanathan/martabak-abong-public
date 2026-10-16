'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ColorPicker } from './color-picker';
import { ArrowLeft, Trash2, ChevronDown, Check, ShoppingBag } from 'lucide-react';
import { demo } from '@/lib/client';
import { type Customer, type ItemInput, type Menu, type Order, defaults, levels, emptyCustomer, rupiah, orderNumber, dateTime, campurAvailable, codeLabel, customerForForm, toppingKeys, toppingNames, menuName, menuCode } from '@/lib/model';

type DraftItem = ItemInput & { allowedToppings: Menu['toppings'] };
export function OrderForm({ orderId }: { orderId?: number }) {
  const router = useRouter(), submitting = useRef(false);
  const [menus, setMenus] = useState<Menu[]>([]), [items, setItems] = useState<DraftItem[]>([]), [customer, setCustomer] = useState<Customer>({ ...emptyCustomer, type: 'Langsung' });
  const [original, setOriginal] = useState<Order | null>(null), [requestId, setRequestId] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [statuses, setStatuses] = useState({ done: false, paid: false, received: false });
  async function load() {
    setLoading(true); setError('');
    try {
      const [catalog, order] = await Promise.all([demo.menus(), orderId ? demo.order(orderId) : Promise.resolve(null)]);
      setMenus(catalog); setRequestId(order?.requestId ?? crypto.randomUUID());
      if (order) { setOriginal(order); setItems(order.items); setCustomer(customerForForm(order.customer)); setStatuses({ done: order.done, paid: order.paid, received: order.received }); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal memuat menu.'); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); /* Only initialize on order change; never overwrite an unsaved draft. */ }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps
  function add(menu?: Menu) {
    setItems(old => [...old, { id: crypto.randomUUID(), kind: menu ? 'PERMANENT' : 'TEMPORARY', menuId: menu?.id ?? null, name: menu?.name ?? '', price: menu?.price ?? Number.NaN, quantity: 1, toppings: menu?.toppings ?? [], allowedToppings: menu?.toppings ?? [], customization: { ...defaults } }]);
  }
  function patch(id: string, values: Partial<DraftItem>) { setItems(old => old.map(i => i.id === id ? { ...i, ...values } : i)); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (submitting.current || !items.length) return; submitting.current = true; setBusy(true); setError('');
    try {
      const saved = await demo.save({ requestId, version: original?.version, items, customer, ...statuses }, orderId);
      router.push(`${saved.received ? '/riwayat' : '/'}?saved=${saved.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal menyimpan pesanan.'); setBusy(false); submitting.current = false; }
  }
  const total = items.reduce((n, i) => n + (Number.isFinite(i.price * i.quantity) ? i.price * i.quantity : 0), 0);
  let temporary = 0;
  return <><Link className="back-link" href={original?.received ? '/riwayat' : '/'}><ArrowLeft size={17} /> Kembali ke pesanan</Link><div className="page-heading"><h1>{orderId ? original ? `Ubah ${orderNumber(original)} · ${dateTime(original.createdAt)}` : 'Ubah pesanan' : 'Tambah pesanan'}</h1></div>
    {loading ? <p role="status" className="loading">Memuat menu…</p> : <form onSubmit={save}><fieldset disabled={busy} className="form-fieldset"><section className="form-section"><div className="section-heading"><h2><span className="step">1</span> Pilih martabak</h2></div>
      <label className="sr-only" htmlFor="select-menu">Tambahkan menu</label><div className="select-wrap"><select id="select-menu" value="" onChange={e => { if (e.target.value === 'temporary') { add(); return; } const menu = menus.find(m => m.id === Number(e.target.value)); if (menu) add(menu); }} disabled={items.length >= 50}><option value="">+ Pilih menu martabak</option>{menus.filter(m => m.available).map(m => <option key={m.id} value={m.id}>{m.id}. {m.name} — {rupiah(m.price)}</option>)}<option value="temporary">16. Menu Sementara</option></select><ChevronDown size={18} /></div>

    </section>
    <div className="draft-items">{items.map((item, index) => {
      const code = item.kind === 'TEMPORARY' ? `TMP${++temporary}` : menuCode(item.menuId!, item.toppings, item.allowedToppings);
      return <section className="draft-item" key={item.id}><div className="draft-title"><span className="item-index">{String(index + 1).padStart(2, '0')}</span><div><span className="eyebrow">{item.kind === 'TEMPORARY' ? 'MENU SEMENTARA' : `MENU ${codeLabel(code, item.customization)}`}</span><h3>{item.kind === 'TEMPORARY' ? codeLabel(code, item.customization) : menuName(item)}</h3></div><button type="button" className="icon-button delete-button" onClick={() => setItems(items.filter(i => i.id !== item.id))} aria-label={`Hapus item ${index + 1}`}><Trash2 size={18} /></button></div>
        {item.kind === 'TEMPORARY' && <div className="temporary-fields"><label>Nama menu<input required maxLength={100} value={item.name} onChange={e => patch(item.id, { name: e.target.value })} placeholder="Contoh: Coklat Durian Keju" /></label><label>Harga per martabak (Rp)<input type="number" inputMode="numeric" required min={0} max={100000000} step={1} value={Number.isNaN(item.price) ? '' : item.price} onChange={e => patch(item.id, { price: e.target.valueAsNumber })} onFocus={e => e.currentTarget.select()} /></label></div>}
        <div className="quantity-row"><span>{item.kind === 'PERMANENT' ? rupiah(item.price) : 'Jumlah'}</span><div className="quantity-control"><button type="button" aria-label={`Kurangi jumlah item ${index + 1}`} disabled={item.quantity <= 1} onClick={() => patch(item.id, { quantity: item.quantity - 1 })}>−</button><input aria-label={`Jumlah item ${index + 1}`} type="number" inputMode="numeric" min={1} max={100} required value={Number.isNaN(item.quantity) ? '' : item.quantity} onChange={e => patch(item.id, { quantity: e.target.valueAsNumber })} /><button type="button" aria-label={`Tambah jumlah item ${index + 1}`} disabled={item.quantity >= 100} onClick={() => patch(item.id, { quantity: item.quantity + 1 })}>+</button></div></div>
        {(item.allowedToppings.length > 0 || campurAvailable(item) || item.customization.campur) && <div className="topping-controls"><span className="field-label">Topping</span><div className="chip-row">{toppingKeys.filter(t => item.allowedToppings.includes(t)).map(t => <label className={`check-chip ${item.toppings.includes(t) ? 'selected' : ''}`} key={t}><input type="checkbox" checked={item.toppings.includes(t)} onChange={e => patch(item.id, { toppings: e.target.checked ? [...item.toppings, t] : item.toppings.filter(v => v !== t) })} />{toppingNames[t]}</label>)}{(campurAvailable(item) || item.customization.campur) && <label className={`check-chip campur-chip ${item.customization.campur ? 'selected' : ''}`}><input type="checkbox" checked={item.customization.campur} disabled={!campurAvailable(item)} title={!campurAvailable(item) ? 'Pilihan Campur lama tetap disimpan.' : undefined} onChange={e => patch(item.id, { customization: { ...item.customization, campur: e.target.checked } })} />Campur</label>}</div>{!campurAvailable(item) && item.customization.campur && <p className="field-hint">Pilihan Campur lama tetap disimpan.</p>}</div>}
        <details className="customization"><summary>Sesuaikan racikan <ChevronDown size={17} /></summary><div className="customization-body">{(['mentega', 'susu', 'gula'] as const).map(key => <label className="slider-label" key={key}><span>{key[0].toUpperCase() + key.slice(1)}<b>{item.customization[key]}</b></span><input type="range" min={0} max={3} step={1} aria-valuetext={item.customization[key]} value={levels.indexOf(item.customization[key])} onChange={e => patch(item.id, { customization: { ...item.customization, [key]: levels[Number(e.target.value)] } })} /><span className="slider-ticks">{levels.map(level => <small key={level}>{level}</small>)}</span></label>)}
        <div className="chip-row">{(['pandan', 'kering'] as const).map(key => <label className="check-chip" key={key}><input type="checkbox" checked={item.customization[key]} onChange={e => patch(item.id, { customization: { ...item.customization, [key]: e.target.checked } })} />{key[0].toUpperCase() + key.slice(1)}</label>)}</div><label>Catatan tambahan <span className="optional">opsional</span><textarea maxLength={500} value={item.customization.notes} onChange={e => patch(item.id, { customization: { ...item.customization, notes: e.target.value } })} placeholder="Contoh: keju dipisah" rows={2} /></label></div></details>
        <div className="item-subtotal"><span>Subtotal</span><strong>{rupiah(item.price * item.quantity || 0)}</strong></div></section>;
    })}</div>
    {!items.length && <div className="empty compact"><ShoppingBag size={28} strokeWidth={1.4} /><p>Pilih menu di atas untuk mulai meracik pesanan.</p></div>}
    <section className="form-section"><div className="section-heading"><h2><span className="step">2</span> Pelanggan</h2><span className="optional">Semua opsional</span></div><div className="segmented customer-types">{(['Langsung', 'Online'] as const).map(type => <button type="button" key={type} aria-pressed={customer.type === type} className={customer.type === type ? 'selected' : ''} onClick={() => setCustomer({ ...emptyCustomer, type, name: customer.name })}>{type}</button>)}</div>
      {customer.type && <div className="customer-form"><label>Nama pelanggan<input value={customer.name} maxLength={100} onChange={e => setCustomer({ ...customer, name: e.target.value })} placeholder="Boleh dikosongkan" /></label>{customer.type === 'Langsung' && <><label>Jenis kelamin<select value={customer.gender} onChange={e => setCustomer({ ...customer, gender: e.target.value as Customer['gender'] })}><option value="">Tidak diisi</option><option>Laki-laki</option><option>Perempuan</option></select></label><div className="field-pair"><ColorPicker value={customer.color} onChange={color => setCustomer({ ...customer, color })} /><label>Jenis pakaian<select value={customer.clothing} onChange={e => setCustomer({ ...customer, clothing: e.target.value })}><option value="">Tidak diisi</option>{['Kaos', 'Kemeja', 'Jaket', 'Hoodie', 'Hijab', 'Jeans', 'Topi'].map(v => <option key={v}>{v}</option>)}</select></label></div></>}</div>}
      <p className="field-hint">Informasi pelanggan tidak dicetak pada struk.</p></section>
    {orderId && <section className="form-section"><h2>Status pesanan</h2><div className="statuses">{(['done', 'paid', 'received'] as const).map((key, i) => <label key={key}><input type="checkbox" checked={statuses[key]} disabled={key === 'paid' && statuses.received} onChange={e => setStatuses({ ...statuses, [key]: e.target.checked, ...(key === 'received' && e.target.checked ? { paid: true } : {}) })} />{['Selesai', 'Dibayar', 'Diambil'][i]}</label>)}</div></section>}
    {error && <div role="alert" className="error">{error}<button type="button" className="text-button" onClick={load}>Muat ulang data (hapus perubahan)</button></div>}
    <div className="save-panel"><div><span>Total · {items.reduce((n, i) => n + (i.quantity || 0), 0)} martabak</span><strong>{rupiah(total || 0)}</strong></div><button className="button primary full" disabled={busy || !items.length || !requestId}><Check size={19} />{busy ? 'Menyimpan…' : orderId ? 'Simpan Perubahan' : 'Simpan Pesanan'}</button><Link className="cancel-link" href={original?.received ? '/riwayat' : '/'}>Batal</Link></div>
    </fieldset></form>}</>;
}

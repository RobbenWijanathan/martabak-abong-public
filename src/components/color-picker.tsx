'use client';
const colors: Record<string, string> = { Hitam: '#242424', Putih: '#fff', 'Abu-abu': '#919191', Merah: '#db403e', Biru: '#3675cf', Hijau: '#49945a', Kuning: '#efca3b', Coklat: '#865239', Oranye: '#ee872e', Pink: '#eb91b9', Ungu: '#975bb0', 'Merah muda': '#eb91b9' };
export function ColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const names = ['', ...Object.keys(colors).filter(name => name !== 'Merah muda')];
  if (value && !names.includes(value)) names.push(value);
  return <div className="color-field"><span className="field-label">Warna pakaian</span><details className="color-picker"><summary><i className="color-swatch" style={{ background: colors[value] || 'transparent' }} />{value || 'Tidak diisi'}</summary><div className="color-options" role="group" aria-label="Warna pakaian">{names.map(name => <button type="button" key={name} aria-pressed={value === name} onClick={event => { onChange(name); event.currentTarget.closest('details')?.removeAttribute('open'); }}><i className="color-swatch" style={{ background: colors[name] || 'transparent' }} />{name || 'Tidak diisi'}</button>)}</div></details></div>;
}

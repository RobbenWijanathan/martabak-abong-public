'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="standalone"><h1>Halaman belum dapat dimuat</h1><p>Periksa koneksi atau konfigurasi aplikasi, lalu coba lagi.</p><button className="button primary" onClick={reset}>Coba lagi</button></main>; }

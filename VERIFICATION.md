# Verifikasi Demo Publik

Tanggal pemeriksaan: 16 Oktober 2026 (Asia/Jakarta).

Pemeriksaan dilakukan hanya pada folder `martabak-abong-public`. Tidak ada akses ke database atau repository produksi, push, maupun deployment.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm test` | Lulus: 8 tes domain, tanpa database |
| `npm run typecheck` | Lulus |
| `npm run build` | Lulus: seluruh halaman diekspor statis ke `out/` |
| `npm run security:scan` | Lulus: sumber dan keluaran build diperiksa; tidak ada temuan pola kredensial |
| `npm run test:browser` | Lulus: Microsoft Edge headless, hasil ekspor produksi |
| Jaringan browser | 270 permintaan; 0 permintaan HTTP eksternal; 0 permintaan API/login; 0 kesalahan halaman |
| Tampilan | Lebar 320, 390, dan 1440 px; tidak ada overflow horizontal; shell maksimal 480 px |
| Tangkapan layar | Data fiktif; tampilan mobile, desktop, riwayat, dan statistik diperiksa secara visual |

## Cakupan aturan data

- Seed sekali pada penyimpanan kosong; tidak menyalin record atau pelanggan produksi.
- Perubahan bertahan pada instance penyimpanan baru; peramban terpisah memiliki data sendiri.
- CRUD, menu sementara, jumlah, topping C/K/W, kode dan nama dinamis, Campur, Pandan, Kering, catatan, dan empat tingkat racikan.
- Total dihitung dari harga katalog/snapshot, bukan nilai harga menu permanen yang dikirim formulir.
- Perubahan katalog tidak mengubah nama/harga pesanan terdahulu; menu tidak tersedia menolak pesanan baru.
- Nomor harian berganti pada pukul 00.00 WIB dan nomor yang dihapus tidak dipakai ulang.
- Simpan ulang request yang sama tidak menggandakan pesanan; versi lama ditolak.
- Pesanan selesai di bawah dan redup; Diambil membuat pesanan Dibayar; pemulihan mempertahankan pembayaran.
- Paginasi tanpa duplikat; pencarian, batas hari/bulan WIB, jumlah loyang, pendapatan, rata-rata, dan statistik kosong.
- Reset mengembalikan pesanan, menu, dan penomoran. Data rusak tidak dihapus diam-diam; reset dapat memulihkannya. Penyimpanan penuh menampilkan kesalahan.
- CSV menetralkan formula spreadsheet dan tidak menyertakan informasi pelanggan. Model struk menggunakan nama penuh dan tidak mencantumkan kode menu yang dihasilkan.

## Cakupan browser

Alur yang diuji: membuka aplikasi tanpa login, membuat pesanan dengan tiga jenis item, mengubah topping/racikan/harga/jumlah, memuat ulang, mengedit, membuka dan memuat ulang struk, mengunduh PNG pada 58/80 mm (signature PNG diperiksa), memakai jalur cetak, mengubah status, mengunduh CSV, membuka statistik bulanan, memulihkan dan menghapus pesanan, mengedit ketersediaan/harga menu, memuat ulang, dan mengatur ulang demo. Browser memeriksa tidak adanya kesalahan JavaScript dan permintaan ke origin luar/API/login.

Tangkapan layar tersimpan pada `docs/screenshots/`. Ringkasan otomatis pada `test-results/browser-summary.json` diabaikan Git. Gunakan `DEMO_BROWSER_CHANNEL=msedge` dan `DEMO_URL` bila alamat preview berbeda dari default.

## Audit dan batas verifikasi

- Login, autentikasi, sesi, logout, proxy, route API, ORM/driver database, migrasi, setup/admin scripts, konfigurasi lingkungan, dan dokumentasi produksi telah dihapus.
- Gambar verifikasi lama telah diganti tangkapan layar dari data fiktif. Aset aplikasi yang dipertahankan berupa ikon martabak dan telah diperiksa.
- Folder duplikat ini **tidak memiliki `.git`**; tidak ada konten terlacak atau riwayat lokal yang dapat diaudit. Scanner juga memeriksa keduanya jika metadata Git tersedia kemudian. Buat repository demo baru; jangan membawa riwayat produksi.
- Pemindaian rahasia bersifat heuristik. Tidak ditemukan kredensial atau endpoint bisnis pada sumber dan keluaran statis yang diperiksa.
- Browser menguji jalur `window.print` dengan dialog sistem digantikan, serta aturan tampilan media cetak. Printer fisik dan hasil termal belum diuji.
- Chrome/Firefox/Safari dan perangkat fisik belum diuji; pengujian browser memakai Edge desktop dengan ukuran viewport mobile/desktop.
- Build awal dalam sandbox Windows mengalami pembatasan izin folder keluaran Next.js; build dengan izin filesystem normal berhasil.
- Konfigurasi Vercel siap untuk output `out/` tanpa variabel backend. Deployment Vercel aktual dan header pada hosting belum diuji karena tidak ada deployment yang dilakukan.

## Langkah publikasi tersisa

1. Buat repository baru dari folder demo ini dan unggah hanya berkas yang tidak diabaikan Git.
2. Import sebagai project Vercel baru, Node.js 24, `npm ci`, `npm run build`, output `out`, tanpa variabel lingkungan.
3. Deploy saat siap, lakukan smoke test di URL publik, dan isi placeholder URL pada README.

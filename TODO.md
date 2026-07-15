# TODO

## Rencana perubahan
1. Ubah penggunaan logo di index.html agar memakai `logo.png` (navbar + header semua halaman).
2. Tambahkan overlay loading animation (HTML) di index.html.
3. Tambahkan styling loading animation (CSS) di style.css.
4. Tambahkan fungsi `showLoading(message)` & `hideLoading()` di script.js.
5. Integrasikan loading pada aksi berikut:
   - `exportPDF()`
   - `tambahPenjualan()`
   - `tambahPengeluaran()`
   - `tambahMasuk()`
   - `tambahKeluar()`
   - `hapusSemuaData()`
   - `tambahStok()` dan `kurangiStok()` dan `resetSemuaStok()`
   - `lihatRekap()`
   - `bukaHalaman()`
6. Pastikan saat error/return awal loading otomatis dimatikan (gunakan `try/finally`).
7. Tes manual di browser: simpan data, export PDF, pindah halaman, tampil stok/rekap.


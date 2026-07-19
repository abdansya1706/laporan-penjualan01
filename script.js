/* ==========================================================================
   PERSISTENSI & KUNCI PENYIMPANAN LOCALSTORAGE
   ========================================================================== */
const STORAGE_KEY_STOK = 'stokBarang';
const STORAGE_KEY_PENJUALAN = 'penjualan';
const STORAGE_KEY_PENGELUARAN = 'pengeluaran';
const STORAGE_KEY_MASUK = 'masuk';
const STORAGE_KEY_KELUAR = 'keluar';
const STORAGE_KEY_REKAP_MASTER = 'rekapanHarianMaster';

// Variabel Tracker Global untuk Mode Edit di Semua Dashboard
let editIndexPenjualan = -1;
let editIndexPengeluaran = -1;
let editIndexMasuk = -1;
let editIndexKeluar = -1;

// Sinkronisasi Inisialisasi Sistem
document.addEventListener('DOMContentLoaded', () => {
    initStokDariDaftarBarang();
    loadData();
    loadProfil();
    
    const inputTanggal = document.getElementById("tanggalRekap");
    if(inputTanggal) inputTanggal.value = dapatkanTanggalYMD();
    
    hideLoading();
});

/* ==========================================================================
   FUNGSI INDIKATOR LOADING & UTILITAS
   ========================================================================== */
function showLoading() {
    document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
}

function rupiah(angka){
    return "Rp " + Number(angka || 0).toLocaleString("id-ID");
}

function tanggalHariIni(){
    const d = new Date();
    return d.toLocaleDateString("id-ID");
}

function dapatkanTanggalYMD() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
}

function getData(key){
    return JSON.parse(localStorage.getItem(key)) || [];
}

function setData(key, data){
    localStorage.setItem(key, JSON.stringify(data));
}

function formatRupiahInput(input) {
    let value = input.value.replace(/\D/g, '');
    input.value = value ? Number(value).toLocaleString("id-ID") : "";
}

function bukaHalaman(halaman) {
    document.querySelectorAll('.halaman').forEach(el => el.style.display = 'none');
    const target = document.getElementById('halaman-' + halaman);
    if (target) target.style.display = 'block';

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const currentBtn = document.getElementById('nav-' + halaman);
    if (currentBtn) currentBtn.classList.add('active');
}

/* ==========================================================================
   PROFIL CONFIGURATION
   ========================================================================== */
function simpanProfilToko(){
    localStorage.setItem("namaToko", document.getElementById("namaToko").value.toUpperCase());
    localStorage.setItem("namaCabang", document.getElementById("namaCabang").value.toUpperCase());
    alert("✅ Konfigurasi profil cabang toko berhasil diperbarui!");
}

function loadProfil(){
    document.getElementById("namaToko").value = localStorage.getItem("namaToko") || "";
    document.getElementById("namaCabang").value = localStorage.getItem("namaCabang") || "";
}

function hitungTotal(){
    let jumlah = Number(document.getElementById("qty").value) || 0;
    // Membersihkan format titik ribuan agar kalkulasi matematis akurat
    let hargaRaw = document.getElementById("harga").value.replace(/\./g,'');
    let harga = Number(hargaRaw) || 0;
    document.getElementById("total").value = jumlah * harga;
}

/* ==========================================================================
   CORE LOGIC: PROSES OTOMATISASI REKAPAN PERMANEN (PRO)
   ========================================================================== */
function sinkronisasiKeRekapMasterOtomatis() {
    const tglKunci = dapatkanTanggalYMD();
    let rekapMaster = JSON.parse(localStorage.getItem(STORAGE_KEY_REKAP_MASTER)) || {};

    const penjualan = getData(STORAGE_KEY_PENJUALAN);
    const pengeluaran = getData(STORAGE_KEY_PENGELUARAN);
    const masuk = getData(STORAGE_KEY_MASUK);
    const keluar = getData(STORAGE_KEY_KELUAR);

    rekapMaster[tglKunci] = {
        penjualan: penjualan.filter(x => x.tanggalKunci === tglKunci || x.tanggal === tanggalHariIni()),
        pengeluaran: pengeluaran,
        masuk: masuk,
        keluar: keluar
    };

    localStorage.setItem(STORAGE_KEY_REKAP_MASTER, JSON.stringify(rekapMaster));
}

function bukaModalTutupBuku() {
    if (confirm("🔒 Anda ingin melakukan PROSES TUTUP BUKU?\n\nTindakan ini akan memigrasi data hari ini ke rekapan permanen dan mengosongkan layar kerja aktif agar esok hari tim karyawan Anda dapat langsung bekerja bersih tanpa perlu menghapus manual.")) {
        showLoading();
        setTimeout(() => {
            sinkronisasiKeRekapMasterOtomatis();
            
            localStorage.removeItem(STORAGE_KEY_PENJUALAN);
            localStorage.removeItem(STORAGE_KEY_PENGELUARAN);
            localStorage.removeItem(STORAGE_KEY_MASUK);
            localStorage.removeItem(STORAGE_KEY_KELUAR);

            loadData();
            hideLoading();
            alert("✅ Sukses Tutup Buku! Seluruh teks & tabel diarsipkan. Lembar kerja siap digunakan kembali.");
        }, 600);
    }
}

function lihatRekap() {
    showLoading();
    setTimeout(() => {
        const tglDipilih = document.getElementById("tanggalRekap").value;
        if(!tglDipilih) {
            hideLoading();
            alert("Silakan tentukan tanggal target arsip terlebih dahulu.");
            return;
        }

        const rekapMaster = JSON.parse(localStorage.getItem(STORAGE_KEY_REKAP_MASTER)) || {};
        const dataHariItu = rekapMaster[tglDipilih];

        if (!dataHariItu) {
            document.getElementById("hasilRekap").innerHTML = `<p class="placeholder-text">❌ Tidak ditemukan riwayat rekapan data pada tanggal ${tglDipilih}.</p>`;
            hideLoading();
            return;
        }

        let totalJual = 0; let totalKeluar = 0;
        let html = `<h3>📅 Hasil Rekap Log Cabang: ${tglDipilih}</h3><hr style="margin:12px 0; border:0; border-top:1px solid #cbd5e1;">`;

        html += `<h4>🛒 Penjualan Terarsip</h4><table class="modern-table"><thead><tr><th>Barang</th><th>Qty</th><th>Harga</th><th>Total</th></tr></thead><tbody>`;
        if(dataHariItu.penjualan && dataHariItu.penjualan.length > 0) {
            dataHariItu.penjualan.forEach(x => {
                totalJual += Number(x.total);
                html += `<tr><td>${x.barang}</td><td>${x.qty}</td><td>${rupiah(x.harga)}</td><td>${rupiah(x.total)}</td></tr>`;
            });
        } else { html += `<tr><td colspan="4">Tidak ada penjualan.</td></tr>`; }
        html += `</tbody></table>`;

        html += `<h4 style="margin-top:16px;">💸 Pengeluaran Operasional</h4><table class="modern-table"><thead><tr><th>Keperluan</th><th>Nominal</th></tr></thead><tbody>`;
        if(dataHariItu.pengeluaran && dataHariItu.pengeluaran.length > 0) {
            dataHariItu.pengeluaran.forEach(x => {
                totalKeluar += Number(x.total);
                html += `<tr><td>${x.nama}</td><td>${rupiah(x.total)}</td></tr>`;
            });
        } else { html += `<tr><td colspan="2">Tidak ada pengeluaran.</td></tr>`; }
        html += `</tbody></table>`;

        html += `
        <div style="margin-top:16px; background:#fff; padding:16px; border-radius:8px; border:1px solid #e2e8f0;">
            <p><strong>Total Penjualan:</strong> ${rupiah(totalJual)}</p>
            <p><strong>Total Pengeluaran:</strong> ${rupiah(totalKeluar)}</p>
            <p style="font-size:16px; color:var(--success)"><strong>Profit Bersih:</strong> ${rupiah(totalJual - totalKeluar)}</p>
        </div>`;

        document.getElementById("hasilRekap").innerHTML = html;
        hideLoading();
    }, 500);
}

/* ==========================================================================
   1. DASHBOARD UTAMA: PENJUALAN CONTROLLER
   ========================================================================== */
function tambahPenjualan(){
    showLoading();
    setTimeout(() => {
        let data = getData(STORAGE_KEY_PENJUALAN);
        let namaBarang = document.getElementById("barang").value.trim().toUpperCase();
        let qtyJual = Number(document.getElementById("qty").value) || 0;
        let hargaJual = Number(document.getElementById("harga").value.replace(/\./g,'')) || 0;

        if (!namaBarang || qtyJual <= 0 || hargaJual <= 0) {
            hideLoading();
            alert("⚠️ Lengkapi Nama Barang, Qty, dan Harga dengan valid!");
            return;
        }

        const stok = getStokData();
        if (editIndexPenjualan >= 0) {
            const oldItem = data[editIndexPenjualan];
            stok[oldItem.barang] = (stok[oldItem.barang] || 0) + oldItem.qty;
        }

        const stokSaatIni = stok[namaBarang] || 0;
        if (stokSaatIni < qtyJual) {
            if (!confirm(`⚠️ STOK MINIM: ${namaBarang}\nSisa gudang: ${stokSaatIni}. Tetap lanjutkan penjualan?`)) {
                loadData();
                hideLoading();
                return;
            }
        }
        
        stok[namaBarang] = Math.max(0, stokSaatIni - qtyJual);
        setStokData(stok);

        let item = {
            no: editIndexPenjualan >= 0 ? data[editIndexPenjualan].no : data.length + 1,
            barang: namaBarang,
            qty: qtyJual,
            harga: hargaJual,
            total: document.getElementById("total").value,
            tanggal: tanggalHariIni(),
            tanggalKunci: dapatkanTanggalYMD()
        };

        if(editIndexPenjualan >= 0){
            data[editIndexPenjualan] = item;
            editIndexPenjualan = -1;
        } else {
            data.push(item);
        }

        // Penataan ulang nomor agar tetap responsif berurutan
        data = data.map((x, idx) => { x.no = idx + 1; return x; });
        setData(STORAGE_KEY_PENJUALAN, data);
        
        document.getElementById("barang").value="";
        document.getElementById("qty").value="";
        document.getElementById("harga").value="";
        document.getElementById("total").value="";

        sinkronisasiKeRekapMasterOtomatis();
        loadData();
        hideLoading();
    }, 400);
}

function tampilPenjualan(){
    let data = getData(STORAGE_KEY_PENJUALAN);
    let html = "";
    data.forEach((item, index) => {
        html += `
        <tr>
            <td>${item.no}</td>
            <td style="text-align:left;">${item.barang}</td>
            <td>${item.qty}</td>
            <td>${rupiah(item.harga)}</td>
            <td>${rupiah(item.total)}</td>
            <td>${item.tanggal}</td>
            <td>
                <button class="btn-warning btn-small" onclick="editPenjualan(${index})">✏️ Edit</button>
                <button class="btn-danger btn-small" onclick="hapusPenjualan(${index})">🗑 Hapus</button>
            </td>
        </tr>`;
    });
    document.getElementById("listPenjualan").innerHTML = html || '<tr><td colspan="7" style="color:#94a3b8; padding:20px;">Belum ada entri transaksi hari ini.</td></tr>';
}

function editPenjualan(index){
    let data = getData(STORAGE_KEY_PENJUALAN);
    let item = data[index];
    document.getElementById("no").value = item.no;
    document.getElementById("barang").value = item.barang;
    document.getElementById("qty").value = item.qty;
    document.getElementById("harga").value = Number(item.harga).toLocaleString("id-ID");
    document.getElementById("total").value = item.total;
    editIndexPenjualan = index;
    window.scrollTo({ top: document.getElementById("barang").offsetTop - 100, behavior: 'smooth' });
}

function hapusPenjualan(index){
    if(confirm("Hapus item data penjualan ini?")){
        let data = getData(STORAGE_KEY_PENJUALAN);
        const item = data[index];
        
        const stok = getStokData();
        stok[item.barang] = (stok[item.barang] || 0) + item.qty;
        setStokData(stok);

        data.splice(index, 1);
        data = data.map((x, idx) => { x.no = idx + 1; return x; });

        setData(STORAGE_KEY_PENJUALAN, data);
        sinkronisasiKeRekapMasterOtomatis();
        loadData();
    }
}

/* ==========================================================================
   2. DASHBOARD OPERASIONAL: PENGELUARAN CONTROLLER
   ========================================================================== */
function tambahPengeluaran(){
    let data = getData(STORAGE_KEY_PENGELUARAN);
    let nama = document.getElementById("namaPengeluaran").value.trim().toUpperCase();
    let totalRaw = document.getElementById("nilaiPengeluaran").value.replace(/\./g,'');
    let total = Number(totalRaw) || 0;

    if(!nama || total <= 0) return alert("Isi parameter pengeluaran secara valid!");

    let item = {
        no: editIndexPengeluaran >= 0 ? data[editIndexPengeluaran].no : data.length + 1,
        nama: nama,
        total: total,
        tanggal: tanggalHariIni()
    };

    if(editIndexPengeluaran >= 0) {
        data[editIndexPengeluaran] = item;
        editIndexPengeluaran = -1;
    } else {
        data.push(item);
    }

    data = data.map((x, idx) => { x.no = idx + 1; return x; });
    setData(STORAGE_KEY_PENGELUARAN, data);
    
    document.getElementById("namaPengeluaran").value = "";
    document.getElementById("nilaiPengeluaran").value = "";
    
    sinkronisasiKeRekapMasterOtomatis();
    loadData();
}

function tampilPengeluaran(){
    let data = getData(STORAGE_KEY_PENGELUARAN);
    let html = "";
    data.forEach((item, index) => {
        html += `
        <li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:6px; background:#f8fafc; border-radius:4px;">
            <span><strong>${item.no}.</strong> 🔹 ${item.nama} - <strong>${rupiah(item.total)}</strong></span>
            <div>
                <button class="btn-warning btn-small" style="padding:2px 6px; font-size:11px;" onclick="editPengeluaran(${index})">✏️</button>
                <button class="btn-danger btn-small" style="padding:2px 6px; font-size:11px;" onclick="hapusPengeluaran(${index})">🗑</button>
            </div>
        </li>`;
    });
    document.getElementById("listPengeluaran").innerHTML = html || '<li style="color:#94a3b8;">Belum ada pengeluaran hari ini.</li>';
}

function editPengeluaran(index) {
    let data = getData(STORAGE_KEY_PENGELUARAN);
    let item = data[index];
    document.getElementById("namaPengeluaran").value = item.nama;
    document.getElementById("nilaiPengeluaran").value = Number(item.total).toLocaleString("id-ID");
    editIndexPengeluaran = index;
}

function hapusPengeluaran(index) {
    if(confirm("Hapus item data pengeluaran ini?")){
        let data = getData(STORAGE_KEY_PENGELUARAN);
        data.splice(index, 1);
        data = data.map((x, idx) => { x.no = idx + 1; return x; });
        setData(STORAGE_KEY_PENGELUARAN, data);
        sinkronisasiKeRekapMasterOtomatis();
        loadData();
    }
}

/* ==========================================================================
   3. DASHBOARD LOGISTIK: INVENTARIS BARANG MASUK CONTROLLER
   ========================================================================== */
function tambahMasuk(){
    let data = getData(STORAGE_KEY_MASUK);
    let namaBarang = document.getElementById("barangMasuk").value.trim().toUpperCase();
    let jumlah = Number(document.getElementById("jumlahMasuk").value) || 0;

    if (!namaBarang || jumlah <= 0) return alert("Input log masuk tidak valid!");

    const stok = getStokData();
    // Jika proses edit, kembalikan dlu penambahan stok yang salah sebelumnya
    if(editIndexMasuk >= 0) {
        let oldItem = data[editIndexMasuk];
        stok[oldItem.barang] = Math.max(0, (stok[oldItem.barang] || 0) - oldItem.jumlah);
    }

    stok[namaBarang] = (stok[namaBarang] || 0) + jumlah;
    setStokData(stok);

    let item = {
        no: editIndexMasuk >= 0 ? data[editIndexMasuk].no : data.length + 1,
        barang: namaBarang,
        jumlah: jumlah,
        tanggal: tanggalHariIni()
    };

    if(editIndexMasuk >= 0) {
        data[editIndexMasuk] = item;
        editIndexMasuk = -1;
    } else {
        data.push(item);
    }

    data = data.map((x, idx) => { x.no = idx + 1; return x; });
    setData(STORAGE_KEY_MASUK, data);
    
    document.getElementById("barangMasuk").value = "";
    document.getElementById("jumlahMasuk").value = "";

    sinkronisasiKeRekapMasterOtomatis();
    loadData();
}

function tampilMasuk(){
    let data = getData(STORAGE_KEY_MASUK);
    let html = "";
    data.forEach((item, index) => { 
        html += `
        <li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:6px; background:#f8fafc; border-radius:4px;">
            <span><strong>${item.no}.</strong> 📥 ${item.barang} <mark style="padding:2px 6px; border-radius:4px;">+${item.jumlah} Unit</mark></span>
            <div>
                <button class="btn-warning btn-small" style="padding:2px 6px; font-size:11px;" onclick="editMasuk(${index})">✏️</button>
                <button class="btn-danger btn-small" style="padding:2px 6px; font-size:11px;" onclick="hapusMasuk(${index})">🗑</button>
            </div>
        </li>`; 
    });
    document.getElementById("listMasuk").innerHTML = html || '<li style="color:#94a3b8;">Belum ada log barang masuk.</li>';
}

function editMasuk(index) {
    let data = getData(STORAGE_KEY_MASUK);
    let item = data[index];
    document.getElementById("barangMasuk").value = item.barang;
    document.getElementById("jumlahMasuk").value = item.jumlah;
    editIndexMasuk = index;
}

function hapusMasuk(index) {
    if(confirm("Hapus riwayat penambahan barang masuk ini?")){
        let data = getData(STORAGE_KEY_MASUK);
        let item = data[index];
        
        // Kurangi stok kembali karena riwayat pasokan dibatalkan/dihapus
        const stok = getStokData();
        stok[item.barang] = Math.max(0, (stok[item.barang] || 0) - item.jumlah);
        setStokData(stok);

        data.splice(index, 1);
        data = data.map((x, idx) => { x.no = idx + 1; return x; });
        setData(STORAGE_KEY_MASUK, data);
        sinkronisasiKeRekapMasterOtomatis();
        loadData();
    }
}

/* ==========================================================================
   4. DASHBOARD LOGISTIK: INVENTARIS BARANG KELUAR CONTROLLER
   ========================================================================== */
function tambahKeluar(){
    let data = getData(STORAGE_KEY_KELUAR);
    let namaBarang = document.getElementById("barangKeluar").value.trim().toUpperCase();
    let jumlah = Number(document.getElementById("jumlahKeluar").value) || 0;

    if (!namaBarang || jumlah <= 0) return alert("Input log keluar tidak valid!");

    const stok = getStokData();
    // Jika edit, pulihkan dulu pemotongan stok lama
    if(editIndexKeluar >= 0) {
        let oldItem = data[editIndexKeluar];
        stok[oldItem.barang] = (stok[oldItem.barang] || 0) + oldItem.jumlah;
    }

    stok[namaBarang] = Math.max(0, (stok[namaBarang] || 0) - jumlah);
    setStokData(stok);

    let item = {
        no: editIndexKeluar >= 0 ? data[editIndexKeluar].no : data.length + 1,
        barang: namaBarang,
        jumlah: jumlah,
        tanggal: tanggalHariIni()
    };

    if(editIndexKeluar >= 0) {
        data[editIndexKeluar] = item;
        editIndexKeluar = -1;
    } else {
        data.push(item);
    }

    data = data.map((x, idx) => { x.no = idx + 1; return x; });
    setData(STORAGE_KEY_KELUAR, data);
    
    document.getElementById("barangKeluar").value = "";
    document.getElementById("jumlahKeluar").value = "";

    sinkronisasiKeRekapMasterOtomatis();
    loadData();
}

function tampilKeluar(){
    let data = getData(STORAGE_KEY_KELUAR);
    let html = "";
    data.forEach((item, index) => { 
        html += `
        <li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:6px; background:#f8fafc; border-radius:4px;">
            <span><strong>${item.no}.</strong> 📤 ${item.barang} <mark style="background:#fee2e2; color:#991b1b; padding:2px 6px; border-radius:4px;">-${item.jumlah} Unit</mark></span>
            <div>
                <button class="btn-warning btn-small" style="padding:2px 6px; font-size:11px;" onclick="editKeluar(${index})">✏️</button>
                <button class="btn-danger btn-small" style="padding:2px 6px; font-size:11px;" onclick="hapusKeluar(${index})">🗑</button>
            </div>
        </li>`; 
    });
    document.getElementById("listKeluar").innerHTML = html || '<li style="color:#94a3b8;">Belum ada log barang keluar.</li>';
}

function editKeluar(index) {
    let data = getData(STORAGE_KEY_KELUAR);
    let item = data[index];
    document.getElementById("barangKeluar").value = item.barang;
    document.getElementById("jumlahKeluar").value = item.jumlah;
    editIndexKeluar = index;
}

function hapusKeluar(index) {
    if(confirm("Hapus riwayat barang keluar ini?")){
        let data = getData(STORAGE_KEY_KELUAR);
        let item = data[index];

        // Kembalikan barang ke gudang karena status pengeluaran dibatalkan/dihapus
        const stok = getStokData();
        stok[item.barang] = (stok[item.barang] || 0) + item.jumlah;
        setStokData(stok);

        data.splice(index, 1);
        data = data.map((x, idx) => { x.no = idx + 1; return x; });
        setData(STORAGE_KEY_KELUAR, data);
        sinkronisasiKeRekapMasterOtomatis();
        loadData();
    }
}

/* ==========================================================================
   UI DATA DISPLAY & INVENTARIS MASTER STOK
   ========================================================================== */
function hitungDashboard(){
    let penjualan = getData(STORAGE_KEY_PENJUALAN);
    let pengeluaran = getData(STORAGE_KEY_PENGELUARAN);

    let totalPenjualan = 0; let totalHariIni = 0; let totalPengeluaran = 0;
    let hariIni = tanggalHariIni();

    penjualan.forEach(item => {
        totalPenjualan += Number(item.total);
        if(item.tanggal === hariIni) totalHariIni += Number(item.total);
    });
    pengeluaran.forEach(item => { totalPengeluaran += Number(item.total); });

    document.getElementById("penghasilanHariIni").innerHTML = rupiah(totalHariIni);
    document.getElementById("totalPenjualan").innerHTML = rupiah(totalPenjualan);
    document.getElementById("totalPengeluaran").innerHTML = rupiah(totalPengeluaran);
    document.getElementById("totalPendapatan").innerHTML = rupiah(totalPenjualan - totalPengeluaran);
}

function loadData(){
    tampilPenjualan();
    tampilMasuk();
    tampilKeluar();
    tampilPengeluaran();
    hitungDashboard();
    tampilStok();
    tampilSemuaStok();
    document.getElementById("no").value = getData(STORAGE_KEY_PENJUALAN).length + 1;
}

function getStokData() { return JSON.parse(localStorage.getItem(STORAGE_KEY_STOK)) || {}; }
function setStokData(stok) { localStorage.setItem(STORAGE_KEY_STOK, JSON.stringify(stok)); }

function initStokDariDaftarBarang() {
    const stok = getStokData(); let ubah = false;
    if (typeof daftarBarang !== 'undefined') {
        daftarBarang.forEach(nama => {
            const bersih = nama.trim().toUpperCase();
            if (bersih && !(bersih in stok)) { stok[bersih] = 0; ubah = true; }
        });
    }
    if (ubah) setStokData(stok);
}

function tampilStok() {
    const stok = getStokData();
    const keyword = (document.getElementById('cariStok')?.value || '').toUpperCase().trim();
    let keys = Object.keys(stok);

    if (keyword) keys = keys.filter(n => n.includes(keyword));
    keys.sort();

    let totalItem = keys.length; let tersedia = 0; let habis = 0;
    keys.forEach(n => { if (stok[n] > 0) tersedia++; else habis++; });

    if(document.getElementById('totalItemStok')) document.getElementById('totalItemStok').textContent = totalItem;
    if(document.getElementById('totalStokTersedia')) document.getElementById('totalStokTersedia').textContent = tersedia;
    if(document.getElementById('totalStokHabis')) document.getElementById('totalStokHabis').textContent = habis;

    const tbody = document.getElementById('listStok');
    if (!tbody) return;
    tbody.innerHTML = "";

    keys.forEach((nama, i) => {
        const qty = stok[nama] || 0;
        let badge = qty === 0 ? `<span class="status-badge status-danger">Habis (0)</span>` : (qty <= 5 ? `<span class="status-badge status-warning">Minim (${qty})</span>` : `<span class="status-badge status-ready">Aman (${qty})</span>`);
        tbody.innerHTML += `<tr><td>${i+1}</td><td style="text-align:left;">${nama}</td><td><strong>${qty}</strong></td><td>${badge}</td></tr>`;
    });
}

function tampilSemuaStok() {
    const stok = getStokData();
    const tbody = document.getElementById('listSemuaStok');
    if (!tbody) return;
    tbody.innerHTML = Object.keys(stok).sort().map((n, i) => `<tr><td>${i+1}</td><td style="text-align:left;">${n}</td><td><strong>${stok[n]}</strong></td></tr>`).join('');
}

function resetSemuaStok() {
    if (confirm('⚠️ PERINGATAN! Anda ingin mereset seluruh kuantitas stok ke angka 0?')) {
        const stok = getStokData();
        Object.keys(stok).forEach(k => { stok[k] = 0; });
        setStokData(stok); loadData();
    }
}

/* ==========================================================================
   FUNGSI TAMBAHAN: RESET & HAPUS SEMUA DATA DASHBOARD HARIAN
   ========================================================================== */
function resetSemuaDataHarian() {
    if (confirm("⚠️ PERINGATAN KRITIS!\n\nApakah Anda yakin ingin MENGHAPUS SEMUA DATA transaksi hari ini (Penjualan, Pengeluaran, Barang Masuk, dan Barang Keluar)?\n\nTindakan ini tidak bisa dibatalkan.")) {
        showLoading();
        setTimeout(() => {
            // 1. Menghapus data operasional aktif dari LocalStorage
            localStorage.removeItem(STORAGE_KEY_PENJUALAN);
            localStorage.removeItem(STORAGE_KEY_PENGELUARAN);
            localStorage.removeItem(STORAGE_KEY_MASUK);
            localStorage.removeItem(STORAGE_KEY_KELUAR);

            // 2. Mereset Tracker Index Edit kembali ke default (-1)
            editIndexPenjualan = -1;
            editIndexPengeluaran = -1;
            editIndexMasuk = -1;
            editIndexKeluar = -1;

            // 3. Perbarui database rekapan master harian secara otomatis
            sinkronisasiKeRekapMasterOtomatis();

            // 4. Reload UI untuk membersihkan semua tabel di layar dashboard
            loadData();
            hideLoading();
            
            alert("✅ Sukses! Seluruh data dashboard transaksi harian telah dibersihkan.");
        }, 500);
    }
}

/* ==========================================================================
   LAPORAN GENERATOR (DOKUMEN PDF PROFESIONAL - SEMUA DASHBOARD MASUK)
   ========================================================================== */
function exportPDF(){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    
    let toko = localStorage.getItem("namaToko") || "AUDIO MINIATUR";
    let cabang = localStorage.getItem("namaCabang") || "PUSAT";

    // --- 1. RENDER KOP HEADER LAPORAN ---
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(toko, 14, 20);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(`LAPORAN KINERJA KEUANGAN & LOGISTIK CABANG: ${cabang}`, 14, 26);
    doc.text(`Tanggal Cetak Dokumen: ${tanggalHariIni()}`, 14, 31);
    
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.5);
    doc.line(14, 35, 196, 35);

    // --- 2. TABEL RINGKASAN FINANSIAL DASHBOARD ---
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text("I. REKAPITULASI FINANSIAL UTAMA", 14, 42);

    doc.autoTable({
        startY: 45,
        margin: { left: 14, right: 14 },
        head:[["Kategori Dashboard", "Akumulasi Nilai Buku"]],
        body:[
            ["Total Penjualan", document.getElementById("totalPenjualan").innerText],
            ["Total Pengeluaran Operasional", document.getElementById("totalPengeluaran").innerText],
            ["Profit Bersih Cabang", document.getElementById("totalPendapatan").innerText]
        ],
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
    });

    // --- 3. TABEL DETAIL TRANSAKSI PENJUALAN ---
    let logJual = getData(STORAGE_KEY_PENJUALAN);
    let bodyTabelJual = logJual.map(item => [
        item.no,
        item.barang,
        item.qty.toString(),
        rupiah(item.harga),
        rupiah(item.total)
    ]);

    doc.setFont("Helvetica", "bold");
    doc.setTextColor(51, 65, 85);
    doc.text("II. RINCIAN TRANSAKSI PENJUALAN", 14, doc.lastAutoTable.finalY + 10);

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 13,
        margin: { left: 14, right: 14 },
        head: [["No", "Nama Barang", "Qty", "Harga Satuan", "Total Nilai"]],
        body: bodyTabelJual.length > 0 ? bodyTabelJual : [["-", "Tidak ada data penjualan hari ini", "-", "-", "-"]],
        theme: 'striped',
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 2.5 },
        columnStyles: {
            0: { halign: 'center', width: 10 },
            2: { halign: 'center', width: 15 },
            3: { halign: 'right' },
            4: { halign: 'right' }
        }
    });

    // --- 4. TABEL DETAIL PENGELUARAN OPERASIONAL ---
    let logKeluarUang = getData(STORAGE_KEY_PENGELUARAN);
    let bodyTabelPengeluaran = logKeluarUang.map(item => [
        item.no,
        item.nama,
        rupiah(item.total),
        item.tanggal
    ]);

    doc.setFont("Helvetica", "bold");
    doc.text("III. DAFTAR PENGELUARAN OPERASIONAL", 14, doc.lastAutoTable.finalY + 10);

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 13,
        margin: { left: 14, right: 14 },
        head: [["No", "Keperluan / Keterangan", "Nominal Pengeluaran", "Tanggal"]],
        body: bodyTabelPengeluaran.length > 0 ? bodyTabelPengeluaran : [["-", "Tidak ada data pengeluaran hari ini", "-", "-"]],
        theme: 'striped',
        headStyles: { fillColor: [148, 163, 184], textColor: [30, 41, 59] },
        styles: { fontSize: 9, cellPadding: 2.5 },
        columnStyles: {
            0: { halign: 'center', width: 10 },
            2: { halign: 'right' },
            3: { halign: 'center', width: 30 }
        }
    });

    // --- 5. TABEL DETAIL LOGISTIK (BARANG MASUK & KELUAR) ---
    // Menggunakan pemisah halaman otomatis dari autoTable jika baris sudah terlalu panjang ke bawah
    doc.setFont("Helvetica", "bold");
    doc.text("IV. LOG MUTASI BARANG (LOGISTIK INVENTARIS)", 14, doc.lastAutoTable.finalY + 10);

    let logMasukBarang = getData(STORAGE_KEY_MASUK);
    let logKeluarBarang = getData(STORAGE_KEY_KELUAR);

    // Gabungkan riwayat masuk & keluar menjadi satu struktur tabel logistik yang rapi
    let bodyLogistik = [];
    
    logMasukBarang.forEach(item => {
        bodyLogistik.push([item.no, item.barang, `+${item.jumlah} Unit`, "Masuk (Pasokan Stok)", item.tanggal]);
    });
    
    logKeluarBarang.forEach(item => {
        bodyLogistik.push([item.no, item.barang, `-${item.jumlah} Unit`, "Keluar (Manual/BS)", item.tanggal]);
    });

    // Urutkan ulang nomor baris gabungan mutasi barang agar tetap responsif (1, 2, 3...)
    bodyLogistik = bodyLogistik.map((row, idx) => {
        row[0] = idx + 1;
        return row;
    });

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 13,
        margin: { left: 14, right: 14 },
        head: [["No", "Nama Produk/Barang", "Kuantitas", "Jenis Mutasi", "Tanggal Log"]],
        body: bodyLogistik.length > 0 ? bodyLogistik : [["-", "Tidak ada aktivitas logistik (Masuk/Keluar) hari ini", "-", "-", "-"]],
        theme: 'striped',
        headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 2.5 },
        columnStyles: {
            0: { halign: 'center', width: 10 },
            2: { halign: 'center', width: 25 },
            3: { halign: 'center' },
            4: { halign: 'center', width: 30 }
        }
    });

    // Unduh File Dokumen PDF Resmi
    doc.save(`Laporan_Lengkap_${toko}_${dapatkanTanggalYMD()}.pdf`);
}
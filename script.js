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
    const el = document.getElementById('loadingOverlay');
    if(el) el.classList.add('show');
}

function hideLoading() {
    const el = document.getElementById('loadingOverlay');
    if(el) el.classList.remove('show');
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
    if(document.getElementById("namaToko")) document.getElementById("namaToko").value = localStorage.getItem("namaToko") || "";
    if(document.getElementById("namaCabang")) document.getElementById("namaCabang").value = localStorage.getItem("namaCabang") || "";
}

function hitungTotal(){
    let jumlah = Number(document.getElementById("qty").value) || 0;
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
            <p style="font-size:16px; color:var(--success, #16a34a)"><strong>Profit Bersih:</strong> ${rupiah(totalJual - totalKeluar)}</p>
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
    const target = document.getElementById("listPenjualan");
    if(target) target.innerHTML = html || '<tr><td colspan="7" style="color:#94a3b8; padding:20px;">Belum ada entri transaksi hari ini.</td></tr>';
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
    const target = document.getElementById("listPengeluaran");
    if(target) target.innerHTML = html || '<li style="color:#94a3b8;">Belum ada pengeluaran hari ini.</li>';
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
    const target = document.getElementById("listMasuk");
    if(target) target.innerHTML = html || '<li style="color:#94a3b8;">Belum ada log barang masuk.</li>';
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
    const target = document.getElementById("listKeluar");
    if(target) target.innerHTML = html || '<li style="color:#94a3b8;">Belum ada log barang keluar.</li>';
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

    if(document.getElementById("penghasilanHariIni")) document.getElementById("penghasilanHariIni").innerHTML = rupiah(totalHariIni);
    if(document.getElementById("totalPenjualan")) document.getElementById("totalPenjualan").innerHTML = rupiah(totalPenjualan);
    if(document.getElementById("totalPengeluaran")) document.getElementById("totalPengeluaran").innerHTML = rupiah(totalPengeluaran);
    if(document.getElementById("totalPendapatan")) document.getElementById("totalPendapatan").innerHTML = rupiah(totalPenjualan - totalPengeluaran);
}

function loadData(){
    tampilPenjualan();
    tampilMasuk();
    tampilKeluar();
    tampilPengeluaran();
    hitungDashboard();
    tampilStok();
    tampilSemuaStok();
    if(document.getElementById("no")) document.getElementById("no").value = getData(STORAGE_KEY_PENJUALAN).length + 1;
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

function resetSemuaDataHarian() {
    if (confirm("⚠️ PERINGATAN KRITIS!\n\nApakah Anda yakin ingin MENGHAPUS SEMUA DATA transaksi hari ini (Penjualan, Pengeluaran, Barang Masuk, dan Barang Keluar)?\n\nTindakan ini tidak bisa dibatalkan.")) {
        showLoading();
        setTimeout(() => {
            localStorage.removeItem(STORAGE_KEY_PENJUALAN);
            localStorage.removeItem(STORAGE_KEY_PENGELUARAN);
            localStorage.removeItem(STORAGE_KEY_MASUK);
            localStorage.removeItem(STORAGE_KEY_KELUAR);

            editIndexPenjualan = -1;
            editIndexPengeluaran = -1;
            editIndexMasuk = -1;
            editIndexKeluar = -1;

            sinkronisasiKeRekapMasterOtomatis();
            loadData();
            hideLoading();
            
            alert("✅ Sukses! Seluruh data dashboard transaksi harian telah dibersihkan.");
        }, 500);
    }
}

/* ==========================================================================
   LAPORAN GENERATOR (DENGAN TABEL LOGISTIK TERPISAH)
   ========================================================================== */
function exportPDF() {
    let toko = localStorage.getItem("namaToko") || "AUDIO MINIATUR";
    let cabang = localStorage.getItem("namaCabang") || "PUSAT";

    let logJual = getData(STORAGE_KEY_PENJUALAN);
    let logKeluarUang = getData(STORAGE_KEY_PENGELUARAN);
    let logMasukBarang = getData(STORAGE_KEY_MASUK);
    let logKeluarBarang = getData(STORAGE_KEY_KELUAR);

    let totalPenjualan = document.getElementById("totalPenjualan")?.innerText || "Rp 0";
    let totalPengeluaran = document.getElementById("totalPengeluaran")?.innerText || "Rp 0";
    let totalPendapatan = document.getElementById("totalPendapatan")?.innerText || "Rp 0";

    // 1. Baris Tabel Penjualan
    let htmlJual = logJual.length > 0 ? logJual.map(i => `
        <tr>
            <td style="text-align:center;">${i.no}</td>
            <td>${i.barang}</td>
            <td style="text-align:center;">${i.qty}</td>
            <td style="text-align:right;">${rupiah(i.harga)}</td>
            <td style="text-align:right; font-weight:bold;">${rupiah(i.total)}</td>
        </tr>
    `).join('') : `<tr><td colspan="5" style="text-align:center; color:#64748b;">Tidak ada data penjualan hari ini</td></tr>`;

    // 2. Baris Tabel Pengeluaran Operasional
    let htmlPengeluaran = logKeluarUang.length > 0 ? logKeluarUang.map(i => `
        <tr>
            <td style="text-align:center;">${i.no}</td>
            <td>${i.nama}</td>
            <td style="text-align:right; font-weight:bold;">${rupiah(i.total)}</td>
            <td style="text-align:center;">${i.tanggal}</td>
        </tr>
    `).join('') : `<tr><td colspan="4" style="text-align:center; color:#64748b;">Tidak ada data pengeluaran hari ini</td></tr>`;

    // 3. Baris Tabel Logistik: Barang Masuk (Terpisah)
    let htmlMasuk = logMasukBarang.length > 0 ? logMasukBarang.map((i, idx) => `
        <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td>${i.barang}</td>
            <td style="text-align:center; font-weight:bold; color:#16a34a;">+${i.jumlah} Unit</td>
            <td style="text-align:center;">${i.tanggal}</td>
        </tr>
    `).join('') : `<tr><td colspan="4" style="text-align:center; color:#64748b;">Tidak ada barang masuk hari ini</td></tr>`;

    // 4. Baris Tabel Logistik: Barang Keluar (Terpisah)
    let htmlKeluar = logKeluarBarang.length > 0 ? logKeluarBarang.map((i, idx) => `
        <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td>${i.barang}</td>
            <td style="text-align:center; font-weight:bold; color:#dc2626;">-${i.jumlah} Unit</td>
            <td style="text-align:center;">${i.tanggal}</td>
        </tr>
    `).join('') : `<tr><td colspan="4" style="text-align:center; color:#64748b;">Tidak ada barang keluar hari ini</td></tr>`;

    // 5. Struktur HTML Dokumen Laporan
    let cetakHTML = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <title>Laporan_${toko}_${dapatkanTanggalYMD()}</title>
        <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #1e293b; margin: 0; padding: 10px; font-size: 11px; }
            .kop { background-color: #1e293b; color: #ffffff; text-align: center; padding: 10px; border-radius: 4px; font-size: 14px; font-weight: bold; text-transform: uppercase; }
            .sub-kop { background-color: #f1f5f9; color: #475569; text-align: center; padding: 6px; font-size: 10px; font-weight: bold; margin-top: 4px; margin-bottom: 12px; border-radius: 4px; }
            .section-title { background-color: #475569; color: #ffffff; font-size: 11px; font-weight: bold; padding: 6px; margin-top: 12px; border-radius: 3px 3px 0 0; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10.5px; }
            th { background-color: #64748b; color: #ffffff; font-weight: bold; text-align: left; }
            tr:nth-child(even) td { background-color: #f8fafc; }
        </style>
    </head>
    <body>
        <div class="kop">${toko} - LAPORAN OPERASIONAL & FINANSIAL</div>
        <div class="sub-kop">Cabang Toko: ${cabang} &nbsp;&nbsp;|&nbsp;&nbsp; Tanggal Cetak: ${tanggalHariIni()}</div>

        <!-- Section 1: Ringkasan Finansial -->
        <div class="section-title">I. Ringkasan Dashboard Finansial</div>
        <table>
            <thead>
                <tr><th>Kategori Ringkasan</th><th style="text-align:right;">Akumulasi Nilai</th></tr>
            </thead>
            <tbody>
                <tr><td>Total Penjualan</td><td style="text-align:right; font-weight:bold;">${totalPenjualan}</td></tr>
                <tr><td>Total Pengeluaran Operasional</td><td style="text-align:right; font-weight:bold;">${totalPengeluaran}</td></tr>
                <tr style="background-color:#e2e8f0;">
                    <td style="font-weight:bold;">Profit Bersih Cabang</td>
                    <td style="text-align:right; font-weight:bold; color:#16a34a; font-size:12px;">${totalPendapatan}</td>
                </tr>
            </tbody>
        </table>

        <!-- Section 2: Penjualan -->
        <div class="section-title">II. Rincian Transaksi Penjualan Harian</div>
        <table>
            <thead>
                <tr>
                    <th style="text-align:center; width:30px;">No</th>
                    <th>Nama Produk / Barang</th>
                    <th style="text-align:center; width:45px;">Qty</th>
                    <th style="text-align:right; width:110px;">Harga Satuan</th>
                    <th style="text-align:right; width:120px;">Total Subtotal</th>
                </tr>
            </thead>
            <tbody>${htmlJual}</tbody>
        </table>

        <!-- Section 3: Pengeluaran -->
        <div class="section-title">III. Rincian Pengeluaran Operasional</div>
        <table>
            <thead>
                <tr>
                    <th style="text-align:center; width:30px;">No</th>
                    <th>Deskripsi / Keperluan Operasional</th>
                    <th style="text-align:right; width:120px;">Nominal</th>
                    <th style="text-align:center; width:100px;">Tanggal Log</th>
                </tr>
            </thead>
            <tbody>${htmlPengeluaran}</tbody>
        </table>

        <!-- Section 4: Logistik Barang Masuk -->
        <div class="section-title" style="background-color: #15803d;">IV. Log Mutasi Barang Masuk (Pasokan Stok)</div>
        <table>
            <thead>
                <tr>
                    <th style="text-align:center; width:30px; background-color: #16a34a;">No</th>
                    <th style="background-color: #16a34a;">Nama Produk / Barang</th>
                    <th style="text-align:center; width:100px; background-color: #16a34a;">Jumlah Masuk</th>
                    <th style="text-align:center; width:120px; background-color: #16a34a;">Tanggal Log</th>
                </tr>
            </thead>
            <tbody>${htmlMasuk}</tbody>
        </table>

        <!-- Section 5: Logistik Barang Keluar -->
        <div class="section-title" style="background-color: #b91c1c;">V. Log Mutasi Barang Keluar (Manual / BS / Kerusakan)</div>
        <table>
            <thead>
                <tr>
                    <th style="text-align:center; width:30px; background-color: #dc2626;">No</th>
                    <th style="background-color: #dc2626;">Nama Produk / Barang</th>
                    <th style="text-align:center; width:100px; background-color: #dc2626;">Jumlah Keluar</th>
                    <th style="text-align:center; width:120px; background-color: #dc2626;">Tanggal Log</th>
                </tr>
            </thead>
            <tbody>${htmlKeluar}</tbody>
        </table>
    </body>
    </html>
    `;

    // 6. Eksekusi Jendela Cetak/PDF
    let printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(cetakHTML);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 300);
    } else {
        alert("⚠️ Pop-up terblokir browser. Izinkan pop-up (Allow Popups) untuk aplikasi ini.");
    }
}
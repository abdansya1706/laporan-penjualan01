/* ==========================================================================
   PERSISTENSI & KUNCI PENYIMPANAN LOCALSTORAGE
   ========================================================================== */
const STORAGE_KEY_STOK = 'stokBarang';
const STORAGE_KEY_PENJUALAN = 'penjualan';
const STORAGE_KEY_PENGELUARAN = 'pengeluaran';
const STORAGE_KEY_MASUK = 'masuk';
const STORAGE_KEY_KELUAR = 'keluar';
const STORAGE_KEY_REKAP_MASTER = 'rekapanHarianMaster';

let editIndex = -1;

// Sinkronisasi Inisialisasi Sistem
document.addEventListener('DOMContentLoaded', () => {
    initStokDariDaftarBarang();
    loadData();
    loadProfil();
    
    // Set default filter tanggal rekapan ke hari ini agar mudah dibaca
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
    let harga = Number(document.getElementById("harga").value.replace(/\./g,'')) || 0;
    document.getElementById("total").value = jumlah * harga;
}

/* ==========================================================================
   CORE CORE LOGIC: PROSES OTOMATISASI REKAPAN PERMANEN (PRO)
   ========================================================================== */
function sinkronisasiKeRekapMasterOtomatis() {
    // Fungsi vital ini mengambil semua snapshot input text/tabel dan menyimpannya secara otomatis ke database rekapan
    const tglKunci = dapatkanTanggalYMD();
    let rekapMaster = JSON.parse(localStorage.getItem(STORAGE_KEY_REKAP_MASTER)) || {};

    const penjualan = getData(STORAGE_KEY_PENJUALAN);
    const pengeluaran = getData(STORAGE_KEY_PENGELUARAN);
    const masuk = getData(STORAGE_KEY_MASUK);
    const keluar = getData(STORAGE_KEY_KELUAR);

    // Kunci data berdasarkan ID Tanggal YMD
    rekapMaster[tglKunci] = {
        penjualan: penjualan.filter(x => x.tanggalKunci === tglKunci || x.tanggal === tanggalHariIni()),
        pengeluaran: pengeluaran,
        masuk: masuk,
        keluar: keluar
    };

    localStorage.setItem(STORAGE_KEY_REKAP_MASTER, JSON.stringify(rekapMaster));
}

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

        let item = {
            no: editIndex >= 0 ? data[editIndex].no : data.length + 1,
            barang: namaBarang,
            qty: qtyJual,
            harga: hargaJual,
            total: document.getElementById("total").value,
            tanggal: tanggalHariIni(),
            tanggalKunci: dapatkanTanggalYMD()
        };

        // Potong Stok Otomatis
        const stok = getStokData();
        if (editIndex >= 0) {
            const oldItem = data[editIndex];
            stok[oldItem.barang] = (stok[oldItem.barang] || 0) + oldItem.qty;
        }

        const stokSaatIni = stok[namaBarang] || 0;
        if (stokSaatIni < qtyJual) {
            if (!confirm(`⚠️ STOK MINIM: ${namaBarang}\nSisa gudang: ${stokSaatIni}. Tetap lanjutkan penjualan?`)) {
                hideLoading();
                return;
            }
        }
        
        stok[namaBarang] = Math.max(0, stokSaatIni - qtyJual);
        setStokData(stok);

        if(editIndex >= 0){
            data[editIndex] = item;
            editIndex = -1;
        } else {
            data.push(item);
        }

        setData(STORAGE_KEY_PENJUALAN, data);
        
        // Pembersihan Otomatis Form Pengisian
        document.getElementById("barang").value="";
        document.getElementById("qty").value="";
        document.getElementById("harga").value="";
        document.getElementById("total").value="";

        sinkronisasiKeRekapMasterOtomatis();
        loadData();
        hideLoading();
    }, 400);
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

        // Render Tabel Penjualan Tanggal Terpilih
        html += `<h4>🛒 Penjualan Terarsip</h4><table class="modern-table"><thead><tr><th>Barang</th><th>Qty</th><th>Harga</th><th>Total</th></tr></thead><tbody>`;
        if(dataHariItu.penjualan && dataHariItu.penjualan.length > 0) {
            dataHariItu.penjualan.forEach(x => {
                totalJual += Number(x.total);
                html += `<tr><td>${x.barang}</td><td>${x.qty}</td><td>${rupiah(x.harga)}</td><td>${rupiah(x.total)}</td></tr>`;
            });
        } else { html += `<tr><td colspan="4">Tidak ada penjualan.</td></tr>`; }
        html += `</tbody></table>`;

        // Render Pengeluaran
        html += `<h4 style="margin-top:16px;">💸 Pengeluaran Operasional</h4><table class="modern-table"><thead><tr><th>Keperluan</th><th>Nominal</th></tr></thead><tbody>`;
        if(dataHariItu.pengeluaran && dataHariItu.pengeluaran.length > 0) {
            dataHariItu.pengeluaran.forEach(x => {
                totalKeluar += Number(x.total);
                html += `<tr><td>${x.nama}</td><td>${rupiah(x.total)}</td></tr>`;
            });
        } else { html += `<tr><td colspan="2">Tidak ada pengeluaran.</td></tr>`; }
        html += `</tbody></table>`;

        // Ringkasan Finansial Akurat
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

function bukaModalTutupBuku() {
    if (confirm("🔒 Anda ingin melakukan PROSES TUTUP BUKU?\n\nTindakan ini akan memigrasi data hari ini ke rekapan permanen dan mengosongkan layar kerja aktif agar esok hari tim karyawan Anda dapat langsung bekerja bersih tanpa perlu menghapus manual.")) {
        showLoading();
        setTimeout(() => {
            sinkronisasiKeRekapMasterOtomatis();
            
            // Mengosongkan workspace harian aktif demi efisiensi kerja esok hari
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

/* ==========================================================================
   TRANSAKSI PENDUKUNG (PENGELUARAN, BARANG MASUK & KELUAR)
   ========================================================================= */
function tambahPengeluaran(){
    let data = getData(STORAGE_KEY_PENGELUARAN);
    let nama = document.getElementById("namaPengeluaran").value.trim().toUpperCase();
    let total = document.getElementById("nilaiPengeluaran").value.trim();

    if(!nama || !total) return alert("Isi parameter pengeluaran!");

    data.push({ nama: nama, total: total, tanggal: tanggalHariIni() });
    setData(STORAGE_KEY_PENGELUARAN, data);
    document.getElementById("namaPengeluaran").value = "";
    document.getElementById("nilaiPengeluaran").value = "";
    
    sinkronisasiKeRekapMasterOtomatis();
    loadData();
}

function tambahMasuk(){
    let data = getData(STORAGE_KEY_MASUK);
    let namaBarang = document.getElementById("barangMasuk").value.trim().toUpperCase();
    let jumlah = Number(document.getElementById("jumlahMasuk").value) || 0;

    if (!namaBarang || jumlah <= 0) return alert("Input tidak valid!");

    const stok = getStokData();
    stok[namaBarang] = (stok[namaBarang] || 0) + jumlah;
    setStokData(stok);

    data.push({ barang: namaBarang, jumlah: jumlah, tanggal: tanggalHariIni() });
    setData(STORAGE_KEY_MASUK, data);
    document.getElementById("barangMasuk").value="";
    document.getElementById("jumlahMasuk").value="";

    sinkronisasiKeRekapMasterOtomatis();
    loadData();
}

function tambahKeluar(){
    let data = getData(STORAGE_KEY_KELUAR);
    let namaBarang = document.getElementById("barangKeluar").value.trim().toUpperCase();
    let jumlah = Number(document.getElementById("jumlahKeluar").value) || 0;

    if (!namaBarang || jumlah <= 0) return alert("Input tidak valid!");

    const stok = getStokData();
    stok[namaBarang] = Math.max(0, (stok[namaBarang] || 0) - jumlah);
    setStokData(stok);

    data.push({ barang: namaBarang, jumlah: jumlah, tanggal: tanggalHariIni() });
    setData(STORAGE_KEY_KELUAR, data);
    document.getElementById("barangKeluar").value="";
    document.getElementById("jumlahKeluar").value="";

    sinkronisasiKeRekapMasterOtomatis();
    loadData();
}

/* ==========================================================================
   UI DATA DISPLAY & LOGIC INVENTARIS
   ========================================================================== */
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

function hapusPenjualan(index){
    if(confirm("Hapus item data penjualan ini?")){
        let data = getData(STORAGE_KEY_PENJUALAN);
        const item = data[index];
        const stok = getStokData();
        stok[item.barang] = (stok[item.barang] || 0) + item.qty;
        setStokData(stok);

        data.splice(index, 1);
        setData(STORAGE_KEY_PENJUALAN, data);
        sinkronisasiKeRekapMasterOtomatis();
        loadData();
    }
}

function editPenjualan(index){
    let data = getData(STORAGE_KEY_PENJUALAN);
    let item = data[index];
    document.getElementById("no").value = item.no;
    document.getElementById("barang").value = item.barang;
    document.getElementById("qty").value = item.qty;
    document.getElementById("harga").value = Number(item.harga).toLocaleString("id-ID");
    document.getElementById("total").value = item.total;
    editIndex = index;
    window.scrollTo({ top: document.getElementById("barang").offsetTop - 100, behavior: 'smooth' });
}

function tampilPengeluaran(){
    let data = getData(STORAGE_KEY_PENGELUARAN);
    let html = "";
    data.forEach((item, index) => {
        html += `<li><span>🔹 ${item.nama}</span><strong>${rupiah(item.total)}</strong></li>`;
    });
    document.getElementById("listPengeluaran").innerHTML = html;
}

function tampilMasuk(){
    let data = getData(STORAGE_KEY_MASUK);
    let html = "";
    data.forEach(item => { html += `<li><span>📥 ${item.barang}</span><mark style="padding:2px 6px; border-radius:4px;">+${item.jumlah} Unit</mark></li>`; });
    document.getElementById("listMasuk").innerHTML = html;
}

function tampilKeluar(){
    let data = getData(STORAGE_KEY_KELUAR);
    let html = "";
    data.forEach(item => { html += `<li><span>📤 ${item.barang}</span><mark style="background:#fee2e2; color:#991b1b; padding:2px 6px; border-radius:4px;">-${item.jumlah} Unit</mark></li>`; });
    document.getElementById("listKeluar").innerHTML = html;
}

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

/* ==========================================================================
   STOK MANAGEMENT CONTROLLER
   ========================================================================== */
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

function tambahStok() {
    const nama = document.getElementById('stokBarangMasuk').value.trim().toUpperCase();
    const jml = parseInt(document.getElementById('stokJumlahMasuk').value);
    if(!nama || !jml || jml < 1) return alert("Lengkapi data update stok!");

    const stok = getStokData();
    stok[nama] = (stok[nama] || 0) + jml;
    setStokData(stok);
    alert(`✅ Berhasil menambahkan ${jml} unit ke produk ${nama}`);
    document.getElementById('stokBarangMasuk').value = '';
    document.getElementById('stokJumlahMasuk').value = '';
    loadData();
}

function kurangiStok() {
    const nama = document.getElementById('stokBarangKeluar').value.trim().toUpperCase();
    const jml = parseInt(document.getElementById('stokJumlahKeluar').value);
    const stok = getStokData();

    if(!nama || !jml || !stok[nama] || stok[nama] < jml) return alert("Gagal, kuantitas stok tidak mencukupi atau barang tidak ditemukan!");

    stok[nama] -= jml;
    setStokData(stok);
    alert(`✅ Berhasil memotong ${jml} unit produk ${nama}`);
    document.getElementById('stokBarangKeluar').value = '';
    document.getElementById('stokJumlahKeluar').value = '';
    loadData();
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
   LAPORAN GENERATOR PDF RINGKAS & ELEGAN + LOGO (PRO - TERPISAH JELAS)
   ========================================================================== */
function exportPDF() {
    showLoading();

    setTimeout(() => {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4'); // Kertas A4 (210mm x 297mm)

            let toko = (localStorage.getItem("namaToko") || "AUDIO MINIATUR").toUpperCase();
            let cabang = (localStorage.getItem("namaCabang") || "PUSAT").toUpperCase();
            
            let penjualan = getData("penjualan");
            let pengeluaran = getData("pengeluaran");
            let masuk = getData("masuk");
            let keluar = getData("keluar");

            let totalJual = 0;
            let totalKeluar = 0;

            penjualan.forEach(item => { totalJual += Number(item.total || 0); });
            pengeluaran.forEach(item => { totalKeluar += Number(item.total || item.nilai || 0); });
            let profitBersih = totalJual - totalKeluar;

            // =======================================================
            // 1. HEADER MINIMALIS & MODERN + LOGO TOKO
            // =======================================================
            doc.setFillColor(37, 99, 235); // Biru Safir
            doc.rect(0, 0, 210, 32, 'F');

            // Nama Toko & Subtitle (Kiri)
            doc.setTextColor(255, 255, 255);
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(20);
            doc.text(toko, 14, 14);

            doc.setFont("Helvetica", "normal");
            doc.setFontSize(9);
            doc.text(`LAPORAN PENJUALAN • CABANG: ${cabang}`, 14, 20);
            doc.text(`Periode Rekap: ${tanggalHariIni()}`, 14, 25);

            // Render Logo Toko (Kanan)
            try {
                const imgLogo = document.querySelector(".nav-logo") || document.querySelector(".logo");
                if (imgLogo) {
                    doc.addImage(imgLogo, 'PNG', 175, 5, 22, 22);
                }
            } catch (e) {
                console.log("Logo image tidak termuat di PDF: ", e);
            }

            doc.setTextColor(30, 41, 59); // Reset warna teks ke gelap

            // =======================================================
            // 2. WIDGET FINANSIAL RINGKAS (BERJAJAR)
            // =======================================================
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(11);
            doc.text("I. IKHTISAR KEUANGAN HARI INI", 14, 40);

            doc.autoTable({
                startY: 43,
                head: [["OMZET PENJUALAN", "TOTAL PENGELUARAN", "PROFIT BERSIH"]],
                body: [[rupiah(totalJual), rupiah(totalKeluar), rupiah(profitBersih)]],
                theme: 'grid',
                headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], halign: 'center' },
                bodyStyles: { halign: 'center', fontStyle: 'bold', fontSize: 11 },
                didParseCell: function(data) {
                    if (data.section === 'body' && data.column.index === 2) {
                        data.cell.styles.textColor = [5, 150, 105]; // Warna Hijau untuk Profit
                    }
                }
            });

            // =======================================================
            // 3. TABEL PENJUALAN BARANG (LEBIH RAPAT)
            // =======================================================
            let currentY = doc.lastAutoTable.finalY + 8;
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(11);
            doc.text("II. RINCIAN BARANG TERJUAL", 14, currentY);

            doc.autoTable({
                startY: currentY + 3,
                head: [["No", "Nama Barang", "Qty", "Harga Satuan", "Subtotal"]],
                body: penjualan.length > 0 ? 
                    penjualan.map(item => [
                        item.no || 1, 
                        item.barang.toUpperCase(), 
                        `${item.qty} Pcs`, 
                        rupiah(item.harga), 
                        rupiah(item.total)
                    ]) : [["-", "Tidak ada transaksi penjualan", "-", "-", "-"]],
                theme: 'striped',
                styles: { cellPadding: 2, fontSize: 9 },
                headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
                columnStyles: {
                    0: { halign: 'center', width: 10 },
                    2: { halign: 'center', width: 20 },
                    3: { halign: 'right', width: 35 },
                    4: { halign: 'right', fontStyle: 'bold', width: 35 }
                }
            });

            // =======================================================
            // 4. BAGIAN OPERASIONAL (BIAYA / PENGELUARAN)
            // =======================================================
            currentY = doc.lastAutoTable.finalY + 8;
            if (currentY > 230) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFont("Helvetica", "bold");
            doc.setFontSize(11);
            doc.text("III. OPERASIONAL BIAYA & PENGELUARAN TOKO", 14, currentY);

            doc.autoTable({
                startY: currentY + 3,
                head: [["Keperluan Operasional / Biaya", "Nominal Pengeluaran"]],
                body: pengeluaran.length > 0 ? 
                    pengeluaran.map(item => [item.nama.toUpperCase(), rupiah(item.total || item.nilai)]) : [["Tidak ada pengeluaran harian", "-"]],
                theme: 'grid',
                styles: { cellPadding: 2, fontSize: 8.5 },
                headStyles: { fillColor: [185, 28, 28] }, // Warna Merah Gelap untuk Pengeluaran
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold', width: 45 } }
            });

            // =======================================================
            // 5. STRUKTUR 2 KOLOM YANG SANGAT JELAS UNTUK MUTASI LOGISTIK
            // =======================================================
            currentY = doc.lastAutoTable.finalY + 8;
            if (currentY > 220) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFont("Helvetica", "bold");
            doc.setFontSize(11);
            doc.text("IV. RIWAYAT MUTASI LOGISTIK GUDANG (BARANG MASUK vs KELUAR)", 14, currentY);

            // Kolom Kiri: DATA BARANG MASUK 🟢 (HIJAU EMERALD)
            let dataMasuk = masuk.length > 0 ? 
                masuk.map((item, idx) => [idx + 1, item.barang.toUpperCase(), `+ ${item.jumlah} Pcs`]) : [["-", "Tidak ada barang masuk", "-"]];

            // Kolom Kanan: DATA BARANG KELUAR 🔴 (MERAH/ORANYE)
            let dataKeluar = keluar.length > 0 ? 
                keluar.map((item, idx) => [idx + 1, item.barang.toUpperCase(), `- ${item.jumlah} Pcs`]) : [["-", "Tidak ada barang keluar", "-"]];

            // RENDER TABEL SEBELAH KIRI (BARANG MASUK - HIJAU)
            doc.autoTable({
                startY: currentY + 3,
                margin: { right: 110 }, // Lebar tabel dibatasi sampai setengah halaman sebelah kiri (lebar ~96mm)
                head: [["No", "Barang MASUK", "Qty"]],
                body: dataMasuk,
                theme: 'grid',
                styles: { cellPadding: 2, fontSize: 8 },
                headStyles: { fillColor: [5, 150, 105] }, // Hijau Emerald
                columnStyles: { 
                    0: { halign: 'center', width: 10 },
                    2: { halign: 'center', fontStyle: 'bold', width: 20 } 
                }
            });

            // RENDER TABEL SEBELAH KANAN (BARANG KELUAR - ORANYE) MENGGUNAKAN STARTY YANG SAMA
            doc.autoTable({
                startY: currentY + 3,
                margin: { left: 106 }, // Mulai dari sisi tengah halaman (X: 106mm) ke kanan
                head: [["No", "Barang KELUAR", "Qty"]],
                body: dataKeluar,
                theme: 'grid',
                styles: { cellPadding: 2, fontSize: 8 },
                headStyles: { fillColor: [217, 119, 6] }, // Oranye / Amber Gelap
                columnStyles: { 
                    0: { halign: 'center', width: 10 },
                    2: { halign: 'center', fontStyle: 'bold', width: 20 } 
                }
            });

            // Menentukan letak Y final berdasarkan tabel logistik yang paling panjang
            let finalLeftY = doc.lastAutoTable.finalY;
            currentY = finalLeftY + 12;

            // =======================================================
            // 6. AREA SIGNATURE (TANDA TANGAN)
            // =======================================================
            if (currentY > 250) {
                doc.addPage();
                currentY = 20;
            }


            // EXPORT FILE PDF
            doc.save(`REKAP_MUTASI_${cabang}_${dapatkanTanggalYMD()}.pdf`);

        } catch (error) {
            console.error("PDF Export Error: ", error);
            alert("Terjadi kesalahan sistem saat mengekspor PDF.");
        } finally {
            hideLoading();
        }
    }, 600);
}
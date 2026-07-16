/* =========================
   STORAGE KEYS (harus di atas agar tidak TDZ)
========================= */
const STORAGE_KEY_STOK = 'stokBarang';
let editIndex = -1;

/* =========================
   LOAD AWAL
========================= */
loadData();
loadProfil();
initStokDariDaftarBarang();

/* =========================
   UTILITAS
========================= */
function rupiah(angka){
    return "Rp " + Number(angka || 0).toLocaleString("id-ID");
}

function tanggalHariIni(){
    return new Date().toLocaleDateString("id-ID");
}

function getData(key){
    return JSON.parse(localStorage.getItem(key)) || [];
}

function setData(key,data){
    localStorage.setItem(key, JSON.stringify(data));
}

/* =========================
   PROFIL TOKO
========================= */
function simpanProfilToko(){
    localStorage.setItem("namaToko", document.getElementById("namaToko").value);
    localStorage.setItem("namaCabang", document.getElementById("namaCabang").value);
    alert("Profil toko berhasil disimpan");
}

function loadProfil(){
    document.getElementById("namaToko").value = localStorage.getItem("namaToko") || "";
    document.getElementById("namaCabang").value = localStorage.getItem("namaCabang") || "";
}

/* =========================
   TOTAL OTOMATIS
========================= */
function hitungTotal(){
    let jumlah = Number(document.getElementById("qty").value) || 0;
    let harga = Number(document.getElementById("harga").value.replace(/\./g,'')) || 0;
    document.getElementById("total").value = jumlah * harga;
}

/* =========================
   PENJUALAN
========================= */
function tambahPenjualan(){
    console.log('[DEBUG] tambahPenjualan() dipanggil');

    let data = getData("penjualan");
    let namaBarang = document.getElementById("barang").value.trim().toUpperCase();
    let qtyJual = Number(document.getElementById("qty").value) || 0;
    let hargaJual = Number(document.getElementById("harga").value.replace(/\./g,'')) || 0;

    if (!namaBarang || qtyJual <= 0 || hargaJual <= 0) {
        alert("Silakan lengkapi Nama Barang, Jumlah, dan Harga dengan benar!");
        return;
    }

    let item = {
        no: (editIndex >= 0) ? data[editIndex].no : data.length + 1,
        barang: namaBarang,
        qty: qtyJual,
        harga: hargaJual,
        total: document.getElementById("total").value,
        tanggal: (editIndex >= 0) ? data[editIndex].tanggal : tanggalHariIni()
    };

    // ===== OTOMATIS KURANGI/KEMBALIKAN STOK SAAT JUAL =====
    if (namaBarang && qtyJual > 0) {
        const stok = getStokData();

        if (editIndex >= 0) {
            const oldItem = data[editIndex];
            const oldNama = oldItem.barang.toUpperCase();
            const oldQty = Number(oldItem.qty) || 0;
            if (oldNama && oldQty > 0) {
                stok[oldNama] = (stok[oldNama] || 0) + oldQty;
            }
        }

        const stokSaatIni = stok[namaBarang] || 0;

        if (stokSaatIni < qtyJual) {
            if (!confirm(
                '⚠️ STOK TIDAK MENCUKUPI\n\n' +
                'Barang: ' + namaBarang + '\n' +
                'Stok tersedia: ' + stokSaatIni + '\n' +
                'Dibutuhkan: ' + qtyJual + '\n\n' +
                'Tetap lanjutkan penjualan?'
            )) {
                if (editIndex >= 0) {
                    const oldItem = data[editIndex];
                    const oldNama = oldItem.barang.toUpperCase();
                    const oldQty = Number(oldItem.qty) || 0;
                    if (oldNama && oldQty > 0) {
                        stok[oldNama] = Math.max(0, (stok[oldNama] || 0) - oldQty);
                    }
                }
                return;
            }
            stok[namaBarang] = 0;
        } else {
            stok[namaBarang] = stokSaatIni - qtyJual;
        }

        setStokData(stok);
    }

    if(editIndex >= 0){
        data[editIndex] = item;
        editIndex = -1;
    } else {
        data.push(item);
    }

    setData("penjualan", data);

    document.getElementById("barang").value="";
    document.getElementById("qty").value="";
    document.getElementById("harga").value="";
    document.getElementById("total").value="";

    // Menjaga agar form tidak terkunci/readonly
    document.getElementById("qty").readOnly = false;
    document.getElementById("harga").readOnly = false;

    loadData();
}

function tampilPenjualan(){
    let data = getData("penjualan");
    let html="";

    data.forEach((item, index)=>{
        // Menggunakan index + 1 sebagai nomor urut dinamis
        html += `
        <tr>
            <td>${index + 1}</td>
            <td>${item.barang}</td>
            <td>${item.qty}</td>
            <td>${rupiah(item.harga)}</td>
            <td>${rupiah(item.total)}</td>
            <td>${item.tanggal}</td>
            <td>
                <button class="btnedit" onclick="editPenjualan(${index})">Edit</button>
                <button class="btnhapus" onclick="hapusPenjualan(${index})">Hapus</button>
            </td>
        </tr>`;
    });

    document.getElementById("listPenjualan").innerHTML = html;
}

function hapusPenjualan(index){
    if(confirm("Hapus data?")){
        let data = getData("penjualan");
        const item = data[index];
        const namaBarang = (item.barang || '').toUpperCase();
        const qty = Number(item.qty) || 0;
        if (namaBarang && qty > 0) {
            const stok = getStokData();
            stok[namaBarang] = (stok[namaBarang] || 0) + qty;
            setStokData(stok);
        }

        data.splice(index, 1);
        setData("penjualan", data);
        loadData();
    }
}

function editPenjualan(index){
    let data = getData("penjualan");
    let item = data[index];

    // Tampilkan nomor urut baris di form agar tidak membingungkan
    document.getElementById("no").value = index + 1;
    document.getElementById("barang").value = item.barang;
    document.getElementById("qty").value = item.qty;
    document.getElementById("harga").value = Number(item.harga).toLocaleString("id-ID");
    document.getElementById("total").value = item.total;

    editIndex = index;

    // Pastikan input tetap terbuka agar bisa diedit
    document.getElementById("qty").readOnly = false;
    document.getElementById("harga").readOnly = false;
}

/* =========================
   BARANG MASUK
========================= */
function tambahMasuk(){
    let data = getData("masuk");
    let namaBarang = document.getElementById("barangMasuk").value.trim().toUpperCase();
    let jumlah = Number(document.getElementById("jumlahMasuk").value) || 0;

    if (!namaBarang || jumlah <= 0) {
        alert("Nama barang dan jumlah harus diisi dengan benar");
        return;
    }

    const stok = getStokData();
    stok[namaBarang] = (stok[namaBarang] || 0) + jumlah;
    setStokData(stok);

    data.push({
        barang: namaBarang,
        jumlah: jumlah,
        tanggal: tanggalHariIni()
    });

    setData("masuk", data);
    document.getElementById("barangMasuk").value="";
    document.getElementById("jumlahMasuk").value="";

    loadData();
}

function tampilMasuk(){
    let data = getData("masuk");
    let html="";

    data.forEach((item, index)=>{
        html += `
        <li>
            ${item.barang} (${item.jumlah})
            <button class="btnhapus" onclick="hapusMasuk(${index})">Hapus</button>
        </li>`;
    });

    document.getElementById("listMasuk").innerHTML = html;
}

function hapusMasuk(index){
    let data = getData("masuk");
    const item = data[index];
    const namaBarang = (item.barang || '').toUpperCase();
    const jumlah = Number(item.jumlah) || 0;
    if (namaBarang && jumlah > 0) {
        const stok = getStokData();
        stok[namaBarang] = Math.max(0, (stok[namaBarang] || 0) - jumlah);
        setStokData(stok);
    }

    data.splice(index, 1);
    setData("masuk", data);
    loadData();
}

/* =========================
   BARANG KELUAR
========================= */
function tambahKeluar(){
    let data = getData("keluar");
    let namaBarang = document.getElementById("barangKeluar").value.trim().toUpperCase();
    let jumlah = Number(document.getElementById("jumlahKeluar").value) || 0;

    if (!namaBarang || jumlah <= 0) {
        alert("Nama barang dan jumlah harus diisi dengan benar");
        return;
    }

    const stok = getStokData();
    stok[namaBarang] = Math.max(0, (stok[namaBarang] || 0) - jumlah);
    setStokData(stok);

    data.push({
        barang: namaBarang,
        jumlah: jumlah,
        tanggal: tanggalHariIni()
    });

    setData("keluar", data);
    document.getElementById("barangKeluar").value="";
    document.getElementById("jumlahKeluar").value="";

    loadData();
}

function tampilKeluar(){
    let data = getData("keluar");
    let html="";

    data.forEach((item, index)=>{
        html += `
        <li>
            ${item.barang} (${item.jumlah})
            <button class="btnhapus" onclick="hapusKeluar(${index})">Hapus</button>
        </li>`;
    });

    document.getElementById("listKeluar").innerHTML = html;
}

function hapusKeluar(index){
    let data = getData("keluar");
    const item = data[index];
    const namaBarang = (item.barang || '').toUpperCase();
    const jumlah = Number(item.jumlah) || 0;
    if (namaBarang && jumlah > 0) {
        const stok = getStokData();
        stok[namaBarang] = (stok[namaBarang] || 0) + jumlah;
        setStokData(stok);
    }

    data.splice(index, 1);
    setData("keluar", data);
    loadData();
}

/* =========================
   PENGELUARAN
========================= */
function tambahPengeluaran(){
    let data = getData("pengeluaran");
    data.push({
        nama: document.getElementById("namaPengeluaran").value,
        total: document.getElementById("nilaiPengeluaran").value,
        tanggal: tanggalHariIni()
    });

    setData("pengeluaran", data);
    document.getElementById("namaPengeluaran").value="";
    document.getElementById("nilaiPengeluaran").value="";

    loadData();
}

function tampilPengeluaran(){
    let data = getData("pengeluaran");
    let html="";

    data.forEach((item, index)=>{
        html += `
        <li>
            ${item.nama} - ${rupiah(item.total)}
            <button class="btnhapus" onclick="hapusPengeluaran(${index})">Hapus</button>
        </li>`;
    });

    document.getElementById("listPengeluaran").innerHTML = html;
}

function hapusPengeluaran(index){
    let data = getData("pengeluaran");
    data.splice(index, 1);
    setData("pengeluaran", data);
    loadData();
}

/* =========================
   DASHBOARD
========================= */
function hitungDashboard(){
    let penjualan = getData("penjualan");
    let pengeluaran = getData("pengeluaran");

    let totalPenjualan = 0;
    let totalHariIni = 0;
    let totalPengeluaran = 0;
    let hariIni = tanggalHariIni();

    penjualan.forEach(item=>{
        totalPenjualan += Number(item.total) || 0;
        if(item.tanggal === hariIni){
            totalHariIni += Number(item.total) || 0;
        }
    });

    pengeluaran.forEach(item=>{
        totalPengeluaran += Number(item.total) || 0;
    });

    document.getElementById("penghasilanHariIni").innerHTML = rupiah(totalHariIni);
    document.getElementById("totalPenjualan").innerHTML = rupiah(totalPenjualan);
    document.getElementById("totalPengeluaran").innerHTML = rupiah(totalPengeluaran);
    document.getElementById("totalPendapatan").innerHTML = rupiah(totalPenjualan - totalPengeluaran);
}

/* =========================
   LOAD DATA
========================= */
function loadData(){
    tampilPenjualan();
    tampilMasuk();
    tampilKeluar();
    tampilPengeluaran();
    hitungDashboard();

    if (typeof tampilStok === "function") tampilStok();
    if (typeof tampilSemuaStok === "function") tampilSemuaStok();

    generateNomorPenjualan();
}

/* =========================
   PDF PROFESIONAL (Bebas Error)
========================= */
function exportPDF(){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let toko = localStorage.getItem("namaToko") || "NAMA TOKO";
    let cabang = localStorage.getItem("namaCabang") || "-";
    
    let penjualan = getData("penjualan");
    let masuk = getData("masuk");
    let keluar = getData("keluar");
    let pengeluaran = getData("pengeluaran");

    let totalJual = 0;
    let totalKeluar = 0;

    penjualan.forEach(item => { totalJual += Number(item.total) || 0; });
    pengeluaran.forEach(item => { totalKeluar += Number(item.total) || 0; });

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(toko.toUpperCase(), 14, 18);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Cabang  : " + cabang, 14, 25);
    doc.text("Tanggal : " + tanggalHariIni(), 14, 30);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 33, 196, 33);

    // I. RINGKASAN KEUANGAN
    doc.autoTable({
        startY: 38,
        head: [[{ content: "I. RINGKASAN KEUANGAN HARI INI", colSpan: 2, styles: { fillColor: [37, 99, 235], fontStyle: 'bold' } }]],
        body: [
            ["Total Penjualan", rupiah(totalJual)],
            ["Total Pengeluaran", rupiah(totalKeluar)],
            ["Total Pendapatan Bersih", rupiah(totalJual - totalKeluar)]
        ],
        theme: 'grid',
        styles: { cellPadding: 3, fontSize: 9 },
        columnStyles: {
            0: { fontStyle: 'bold', width: 80 },
            1: { halign: 'right', fontStyle: 'bold', textColor: [22, 101, 52] }
        }
    });

    // II. TABEL PENJUALAN BARANG TERJUAL (Menggunakan Index Dinamis)
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [[{ content: "II. RINCIAN BARANG TERJUAL", colSpan: 5, styles: { fillColor: [37, 99, 235], fontStyle: 'bold' } }],
               ["No", "Nama Produk / Barang Terjual", "Qty", "Harga Satuan", "Subtotal"]],
        body: penjualan.length > 0 ? 
            penjualan.map((item, index) => [
                index + 1, 
                (item.barang || "").toUpperCase(), 
                (item.qty || 0) + " Pcs", 
                rupiah(item.harga), 
                rupiah(item.total)
            ]) : [["-", "Tidak ada transaksi penjualan hari ini.", "-", "-", "-"]],
        theme: 'grid',
        styles: { cellPadding: 3, fontSize: 8.5 },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
        columnStyles: {
            0: { halign: 'center', width: 12 },
            1: { halign: 'left' },
            2: { halign: 'center', width: 20 },
            3: { halign: 'right', width: 35 },
            4: { halign: 'right', fontStyle: 'bold', width: 35 }
        }
    });

    // III. TABEL BARANG MASUK
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [[{ content: "III. BARANG MASUK (LOGISTIK)", colSpan: 3, styles: { fillColor: [37, 99, 235], fontStyle: 'bold' } }],
               ["No", "Nama Barang", "Jumlah Masuk"]],
        body: masuk.length > 0 ? 
            masuk.map((item, index) => [
                index + 1, 
                (item.barang || "").toUpperCase(), 
                (item.jumlah || 0) + " Pcs"
            ]) : [["-", "Tidak ada barang masuk hari ini.", "-"]],
        theme: 'grid',
        styles: { cellPadding: 3, fontSize: 8.5 },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
        columnStyles: {
            0: { halign: 'center', width: 12 },
            2: { halign: 'center', width: 40 }
        }
    });

    // IV. TABEL BARANG KELUAR
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [[{ content: "IV. BARANG KELUAR (LOGISTIK)", colSpan: 3, styles: { fillColor: [37, 99, 235], fontStyle: 'bold' } }],
               ["No", "Nama Barang", "Jumlah Keluar"]],
        body: keluar.length > 0 ? 
            keluar.map((item, index) => [
                index + 1, 
                (item.barang || "").toUpperCase(), 
                (item.jumlah || 0) + " Pcs"
            ]) : [["-", "Tidak ada barang keluar hari ini.", "-"]],
        theme: 'grid',
        styles: { cellPadding: 3, fontSize: 8.5 },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
        columnStyles: {
            0: { halign: 'center', width: 12 },
            2: { halign: 'center', width: 40 }
        }
    });

    // V. TABEL PENGELUARAN OPERASIONAL TOKO
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [[{ content: "V. OPERASIONAL / PENGELUARAN TOKO", colSpan: 3, styles: { fillColor: [37, 99, 235], fontStyle: 'bold' } }],
               ["No", "Deskripsi Pengeluaran", "Total Nominal"]],
        body: pengeluaran.length > 0 ? 
            pengeluaran.map((item, index) => [
                index + 1, 
                (item.nama || "").toUpperCase(), 
                rupiah(item.total)
            ]) : [["-", "Tidak ada pengeluaran operasional hari ini.", "-"]],
        theme: 'grid',
        styles: { cellPadding: 3, fontSize: 8.5 },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
        columnStyles: {
            0: { halign: 'center', width: 12 },
            2: { halign: 'right', fontStyle: 'bold', width: 50 }
        }
    });

    doc.save("Laporan_" + toko.replace(/\s+/g, '_') + "_" + tanggalHariIni().replace(/\//g, '-') + ".pdf");
}

function hapusSemuaData() {
    const konfirmasi = confirm("Yakin ingin menghapus SEMUA data?");
    if (!konfirmasi) return;

    localStorage.removeItem("penjualan");
    localStorage.removeItem("masuk");
    localStorage.removeItem("keluar");
    localStorage.removeItem("pengeluaran");

    document.getElementById("listPenjualan").innerHTML = "";
    document.getElementById("listMasuk").innerHTML = "";
    document.getElementById("listKeluar").innerHTML = "";
    document.getElementById("listPengeluaran").innerHTML = "";

    document.getElementById("penghasilanHariIni").innerText = "Rp 0";
    document.getElementById("totalPenjualan").innerText = "Rp 0";
    document.getElementById("totalPengeluaran").innerText = "Rp 0";
    document.getElementById("totalPendapatan").innerText = "Rp 0";

    alert("Semua data berhasil dihapus!");
}

function lihatRekap() {
    const tanggal = document.getElementById("tanggalRekap").value;
    const penjualan = JSON.parse(localStorage.getItem("penjualan")) || [];
    const pengeluaran = JSON.parse(localStorage.getItem("pengeluaran")) || [];
    const barangMasuk = JSON.parse(localStorage.getItem("masuk")) || [];
    const barangKeluar = JSON.parse(localStorage.getItem("keluar")) || [];

    const jualHari = penjualan.filter(x => x.tanggal === tanggal);
    const keluarHari = pengeluaran.filter(x => x.tanggal === tanggal);
    const masukHari = barangMasuk.filter(x => x.tanggal === tanggal);
    const barangKeluarHari = barangKeluar.filter(x => x.tanggal === tanggal);

    let totalJual = 0;
    let totalKeluar = 0;

    jualHari.forEach(x => totalJual += Number(x.total) || 0);
    keluarHari.forEach(x => totalKeluar += Number(x.total) || 0);

    let html = `
        <h3>📅 Rekapan Tanggal ${tanggal}</h3>
        <hr>
        <h3>🛒 Penjualan Barang</h3>
        <table>
        <tr>
            <th>Barang</th>
            <th>Qty</th>
            <th>Harga</th>
            <th>Total</th>
        </tr>
    `;

    jualHari.forEach(item => {
        html += `
        <tr>
            <td>${item.barang}</td>
            <td>${item.qty}</td>
            <td>Rp ${Number(item.harga).toLocaleString("id-ID")}</td>
            <td>Rp ${Number(item.total).toLocaleString("id-ID")}</td>
        </tr>`;
    });

    html += `</table><h3>💸 Pengeluaran Toko</h3><table><tr><th>Nama</th><th>Jumlah</th></tr>`;

    keluarHari.forEach(item => {
        html += `
        <tr>
            <td>${item.nama}</td>
            <td>Rp ${Number(item.total).toLocaleString("id-ID")}</td>
        </tr>`;
    });

    html += `</table><h3>📦 Barang Masuk</h3><table><tr><th>Barang</th><th>Jumlah</th></tr>`;

    masukHari.forEach(item => {
        html += `<tr><td>${item.barang}</td><td>${item.jumlah}</td></tr>`;
    });

    html += `</table><h3>📤 Barang Keluar</h3><table><tr><th>Barang</th><th>Jumlah</th></tr>`;

    barangKeluarHari.forEach(item => {
        html += `<tr><td>${item.barang}</td><td>${item.jumlah}</td></tr>`;
    });

    html += `
    </table>
    <hr>
    <h2>Total Penjualan : Rp ${totalJual.toLocaleString("id-ID")}</h2>
    <h2>Total Pengeluaran : Rp ${totalKeluar.toLocaleString("id-ID")}</h2>
    <h2>Total Pendapatan : Rp ${(totalJual-totalKeluar).toLocaleString("id-ID")}</h2>
    `;

    document.getElementById("hasilRekap").innerHTML = html;
}

function generateNomorPenjualan(){
    let data = getData("penjualan");
    document.getElementById("no").value = data.length + 1;
}

function formatRupiahInput(input) {
    let value = input.value.replace(/\D/g, '');
    input.value = Number(value).toLocaleString("id-ID");
}

/* =========================
   MANAJEMEN HALAMAN (NAVIGASI)
========================= */
function bukaHalaman(halaman) {
    document.querySelectorAll('.halaman').forEach(el => { el.style.display = 'none'; });

    const target = document.getElementById('halaman-' + halaman);
    if (target) { target.style.display = 'block'; }

    document.querySelectorAll('.nav-btn').forEach(btn => { btn.classList.remove('active'); });
    const navBtn = document.getElementById('nav-' + halaman);
    if (navBtn) { navBtn.classList.add('active'); }

    if (halaman === 'lihatStok') {
        tampilStok();
    } else if (halaman === 'updateStok') {
        tampilSemuaStok();
    } else if (halaman === 'beranda') {
        loadData();
    }
}

/* =========================
   MANAJEMEN STOK BARANG
========================= */
function getStokData() {
    const data = localStorage.getItem(STORAGE_KEY_STOK);
    return data ? JSON.parse(data) : {};
}

function setStokData(stok) {
    localStorage.setItem(STORAGE_KEY_STOK, JSON.stringify(stok));
}

function initStokDariDaftarBarang() {
    const stok = getStokData();
    let adaPerubahan = false;

    if (typeof daftarBarang !== 'undefined') {
        daftarBarang.forEach(nama => {
            const bersih = nama.trim();
            if (bersih && !(bersih in stok)) {
                stok[bersih] = 0;
                adaPerubahan = true;
            }
        });
    }

    if (adaPerubahan) { setStokData(stok); }
}

function tampilStok() {
    const stok = getStokData();
    const keyword = (document.getElementById('cariStok').value || '').toUpperCase().trim();
    let namaBarang = Object.keys(stok);

    if (keyword) {
        namaBarang = namaBarang.filter(nama => nama.toUpperCase().includes(keyword));
    }
    namaBarang.sort();

    let totalItem = namaBarang.length;
    let totalTersedia = 0;
    let totalHabis = 0;

    namaBarang.forEach(nama => {
        if (stok[nama] > 0) totalTersedia++;
        else totalHabis++;
    });

    if (document.getElementById('totalItemStok')) document.getElementById('totalItemStok').textContent = totalItem;
    if (document.getElementById('totalStokTersedia')) document.getElementById('totalStokTersedia').textContent = totalTersedia;
    if (document.getElementById('totalStokHabis')) document.getElementById('totalStokHabis').textContent = totalHabis;

    const tbody = document.getElementById('listStok');
    const kosong = document.getElementById('stokKosong');

    if (!tbody) return;
    if (namaBarang.length === 0) {
        tbody.innerHTML = '';
        if(kosong) kosong.style.display = 'block';
        return;
    }
    if(kosong) kosong.style.display = 'none';

    let html = '';
    namaBarang.forEach((nama, index) => {
        const jumlah = stok[nama] || 0;
        let statusClass = 'status-habis';
        let statusText = 'Habis';
        
        if (jumlah > 0) {
            statusClass = 'status-tersedia';
            statusText = 'Tersedia (' + jumlah + ')';
        }
        if (jumlah > 0 && jumlah <= 5) {
            statusClass = 'status-minim';
            statusText = 'Minim (' + jumlah + ')';
        }

        html += `
        <tr>
            <td>${index + 1}</td>
            <td style="text-align:left;">${nama}</td>
            <td><strong>${jumlah}</strong></td>
            <td><span class="${statusClass}">${statusText}</span></td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function tambahStok() {
    const namaBarang = document.getElementById('stokBarangMasuk').value.trim().toUpperCase();
    const jumlah = parseInt(document.getElementById('stokJumlahMasuk').value);

    if (!namaBarang) {
        tampilNotif('notifTambahStok', '❌ Nama barang harus diisi!', 'danger');
        return;
    }
    if (!jumlah || jumlah < 1) {
        tampilNotif('notifTambahStok', '❌ Jumlah tambahan harus lebih dari 0!', 'danger');
        return;
    }

    const stok = getStokData();
    if (!stok[namaBarang]) { stok[namaBarang] = 0; }

    stok[namaBarang] += jumlah;
    setStokData(stok);

    tampilNotif('notifTambahStok', '✅ Stok ' + namaBarang + ' berhasil ditambah ' + jumlah + ' unit', 'success');
    document.getElementById('stokBarangMasuk').value = '';
    document.getElementById('stokJumlahMasuk').value = '';
    loadData();
}

function kurangiStok() {
    const namaBarang = document.getElementById('stokBarangKeluar').value.trim().toUpperCase();
    const jumlah = parseInt(document.getElementById('stokJumlahKeluar').value);

    if (!namaBarang) {
        tampilNotif('notifKurangStok', '❌ Nama barang harus diisi!', 'danger');
        return;
    }
    if (!jumlah || jumlah < 1) {
        tampilNotif('notifKurangStok', '❌ Jumlah pengurangan harus lebih dari 0!', 'danger');
        return;
    }

    const stok = getStokData();
    if (!stok[namaBarang] || stok[namaBarang] < jumlah) {
        const stokSaatIni = stok[namaBarang] || 0;
        tampilNotif('notifKurangStok', '❌ Stok tidak mencukupi! (Sisa: ' + stokSaatIni + ')', 'danger');
        return;
    }

    stok[namaBarang] -= jumlah;
    setStokData(stok);

    tampilNotif('notifKurangStok', '✅ Stok ' + namaBarang + ' berhasil dikurangi', 'success');
    document.getElementById('stokBarangKeluar').value = '';
    document.getElementById('stokJumlahKeluar').value = '';
    loadData();
}

function tampilSemuaStok() {
    const stok = getStokData();
    const namaBarang = Object.keys(stok).sort();
    const tbody = document.getElementById('listSemuaStok');
    if (!tbody) return;

    let html = '';
    namaBarang.forEach((nama, index) => {
        const jumlah = stok[nama] || 0;
        let statusClass = 'status-habis';
        let statusText = 'Habis';
        if (jumlah > 0) statusClass = 'status-tersedia';
        if (jumlah > 0 && jumlah <= 5) statusClass = 'status-minim';

        html += `
        <tr>
            <td>${index + 1}</td>
            <td style="text-align:left;">${nama}</td>
            <td><strong>${jumlah}</strong></td>
        </tr>`;
    });

    if (namaBarang.length === 0) {
        html = `<tr><td colspan="3" style="padding:30px;color:#94a3b8;">Belum ada data stok.</td></tr>`;
    }
    tbody.innerHTML = html;
}

function resetSemuaStok() {
    if (!confirm('⚠️ Yakin ingin mereset SEMUA stok ke 0?')) return;
    const stok = getStokData();
    Object.keys(stok).forEach(key => { stok[key] = 0; });
    setStokData(stok);
    loadData();
    alert('✅ Semua stok berhasil direset ke 0');
}

function tampilNotif(elementId, pesan, tipe) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = pesan;
    el.style.display = 'block';
    el.className = tipe === 'danger' ? 'notif-danger' : 'notif-success';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}

/* =========================
   PROSES TUTUP BUKU HARIAN
========================= */
function prosesTutupBuku() {
    let penjualan = getData("penjualan");
    let pengeluaran = getData("pengeluaran");
    let masuk = getData("masuk");
    let keluar = getData("keluar");

    if (penjualan.length === 0 && pengeluaran.length === 0 && masuk.length === 0 && keluar.length === 0) {
        alert("⚠️ Tidak ada data transaksi aktif hari ini untuk ditutup buku!");
        return;
    }

    const konfirmasi1 = confirm(
        "⚠️ PROSES TUTUP BUKU HARIAN\n\n" +
        "Tindakan ini akan:\n" +
        "1. Mengarsipkan seluruh transaksi hari ini ke database riwayat.\n" +
        "2. Mengosongkan tabel transaksi aktif agar siap untuk hari baru.\n" +
        "3. STOK BARANG TETAP TERJAGA (tidak direset).\n\n" +
        "Apakah Anda yakin ingin memproses Tutup Buku?"
    );
    if (!konfirmasi1) return;

    const konfirmasi2 = confirm("Sangat disarankan untuk melakukan 'Export Laporan PDF' terlebih dahulu sebelum Tutup Buku. Apakah Anda ingin langsung melanjutkan Tutup Buku sekarang?");
    if (!konfirmasi2) return;

    try {
        let arsipLama = JSON.parse(localStorage.getItem("arsipTutupBuku")) || [];
        
        let dataTutupBukuHariIni = {
            tanggalTutupBuku: tanggalHariIni(),
            timestamp: new Date().toISOString(),
            penjualan: penjualan,
            pengeluaran: pengeluaran,
            masuk: masuk,
            keluar: keluar
        };

        arsipLama.push(dataTutupBukuHariIni);
        localStorage.setItem("arsipTutupBuku", JSON.stringify(arsipLama));

        localStorage.removeItem("penjualan");
        localStorage.removeItem("pengeluaran");
        localStorage.removeItem("masuk");
        localStorage.removeItem("keluar");

        loadData();

        alert("✅ PROSES TUTUP BUKU BERHASIL!\n\nSeluruh transaksi aktif telah diarsipkan dengan aman. Aplikasi Anda sekarang siap digunakan untuk mencatat transaksi hari baru.");
    } catch (error) {
        console.error("Gagal melakukan proses tutup buku:", error);
        alert("❌ Terjadi kesalahan sistem saat memproses Tutup Buku. Silakan coba lagi.");
    }
}

window.addEventListener('load', () => {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;

    overlay.classList.add('loaded');
    setTimeout(() => {
        overlay.classList.add('hidden');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 450);
    }, 2200);
});
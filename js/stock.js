/**
 * GudangPro — stock.js
 * Stock data management, LocalStorage persistence, and export
 */

'use strict';

const STOCK_KEY   = 'gudangpro_materials';
const RIWAYAT_KEY = 'gudangpro_riwayat';
const DATA_VERSION = 'v2';
// ============================================================
// DEFAULT MATERIALS
// ============================================================
const DEFAULT_MATERIALS = [
  { id: 1, nama: 'Paving Natural T8 20x20',     kategori: 'Paving',   stock: 0, satuan: 'pcs',  minAlert: 500  },
  { id: 2, nama: 'Paving Natural T6 20x20',     kategori: 'Paving',   stock: 0, satuan: 'pcs',  minAlert: 500  },
  { id: 3, nama: 'Paving Natural T8 20x10',     kategori: 'Paving',   stock: 0, satuan: 'pcs',  minAlert: 300  },
  { id: 4, nama: 'Paving Natural T6 20x10',     kategori: 'Paving',   stock: 0, satuan: 'pcs',  minAlert: 1000 },
  { id: 5, nama: 'Paving Merah T8 20x20 ',      kategori: 'Paving',   stock: 0, satuan: 'pcs',  minAlert: 500  },
  { id: 6, nama: 'Paving Merah T6 20x10',       kategori: 'Paving',   stock: 0,  satuan: 'pcs',  minAlert: 100  },
  { id: 7, nama: 'Paving Merah T8 20x20',       kategori: 'Paving',   stock: 0,  satuan: 'pcs',  minAlert: 50   },
  { id: 8, nama: 'Paving Merah T6 20x10',       kategori: 'Paving',   stock: 0, satuan: 'pcs',  minAlert: 300  },
  { id: 9, nama: 'Grasblock',                   kategori: 'Paving',   stock: 0,   satuan: 'pcs',  minAlert: 200  },
  { id:10, nama: 'Kanstin Besar',               kategori: 'Kanstin',  stock: 0,   satuan: 'm³',   minAlert: 20   },
  { id:11, nama: 'Kanstin Kecil',               kategori: 'Kanstin',  stock: 0,   satuan: 'm³',   minAlert: 20   },
  { id:12, nama: 'Kanstin Kursi',               kategori: 'Kanstin',  stock: 0,  satuan: 'sak',  minAlert: 50   },
  { id:13, nama: 'Kanstin Lubang',              kategori: 'Kanstin',  stock: 0,  satuan: 'sak',  minAlert: 50   },
];

// ============================================================
// DATA ACCESSORS
// ============================================================
function getMaterials() {
  // cek versi data
  const savedVersion = localStorage.getItem('gudangpro_version');
  // jika versi berbeda → reset data
  if(savedVersion !== DATA_VERSION){
    localStorage.removeItem(STOCK_KEY);
    localStorage.setItem(
      'gudangpro_version',
      DATA_VERSION
    );
  }
  try {
    const raw = localStorage.getItem(STOCK_KEY);
    if(raw){
      return JSON.parse(raw);
    }
    // pertama kali buka website
    saveMaterials(DEFAULT_MATERIALS);
    return DEFAULT_MATERIALS;
  } catch {
    return DEFAULT_MATERIALS;
  }
}

function saveMaterials(materials) {
  localStorage.setItem(STOCK_KEY, JSON.stringify(materials));
}

function getRiwayat() {
  try {
    const raw = localStorage.getItem(RIWAYAT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRiwayat(riwayat) {
  localStorage.setItem(RIWAYAT_KEY, JSON.stringify(riwayat));
}

function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

// ============================================================
// MATERIAL CRUD
// ============================================================
function addMaterial(data) {
  const materials = getMaterials();
  const newMat = {
    id: generateId(),
    nama: data.nama.trim(),
    kategori: data.kategori,
    stock: parseInt(data.stock) || 0,
    satuan: data.satuan.trim(),
    minAlert: parseInt(data.minAlert) || 50
  };
  materials.push(newMat);
  saveMaterials(materials);
  return newMat;
}

function updateMaterial(id, data) {
  const materials = getMaterials();
  const idx = materials.findIndex(m => m.id == id);
  if (idx === -1) return false;
  materials[idx] = {
    ...materials[idx],
    nama: data.nama.trim(),
    kategori: data.kategori,
    satuan: data.satuan.trim(),
    minAlert: parseInt(data.minAlert) || 50
  };
  saveMaterials(materials);
  return true;
}

function deleteMaterial(id) {
  const materials = getMaterials().filter(m => m.id != id);
  saveMaterials(materials);
}

function getMaterialById(id) {
  return getMaterials().find(m => m.id == id);
}

// ============================================================
// STOCK TRANSACTIONS
// ============================================================
function tambahStock(materialId, jumlah, user, keterangan) {
  const materials = getMaterials();
  const idx = materials.findIndex(m => m.id == materialId);
  if (idx === -1) return { success: false, msg: 'Material tidak ditemukan.' };

  jumlah = parseInt(jumlah);
  if (isNaN(jumlah) || jumlah <= 0) return { success: false, msg: 'Jumlah tidak valid.' };

  const stockBefore = materials[idx].stock;
  materials[idx].stock += jumlah;
  saveMaterials(materials);

  addRiwayat({
    materialId,
    materialNama: materials[idx].nama,
    jenis: 'MASUK',
    jumlah,
    stockBefore,
    stockAfter: materials[idx].stock,
    username: user.username,
    nama: user.nama,
    keterangan: keterangan || ''
  });

  return { success: true, msg: `Stock ${materials[idx].nama} berhasil ditambah +${jumlah}.`, material: materials[idx] };
}

function kurangiStock(materialId, jumlah, user, keterangan) {
  const materials = getMaterials();
  const idx = materials.findIndex(m => m.id == materialId);
  if (idx === -1) return { success: false, msg: 'Material tidak ditemukan.' };

  jumlah = parseInt(jumlah);
  if (isNaN(jumlah) || jumlah <= 0) return { success: false, msg: 'Jumlah tidak valid.' };
  if (materials[idx].stock < jumlah) return { success: false, msg: `Stock tidak cukup. Stock tersedia: ${materials[idx].stock} ${materials[idx].satuan}.` };

  const stockBefore = materials[idx].stock;
  materials[idx].stock -= jumlah;
  saveMaterials(materials);

  addRiwayat({
    materialId,
    materialNama: materials[idx].nama,
    jenis: 'KELUAR',
    jumlah,
    stockBefore,
    stockAfter: materials[idx].stock,
    username: user.username,
    nama: user.nama,
    keterangan: keterangan || ''
  });

  return { success: true, msg: `Stock ${materials[idx].nama} berhasil dikurangi -${jumlah}.`, material: materials[idx] };
}

function addRiwayat(data) {
  const riwayat = getRiwayat();
  riwayat.unshift({
    id: generateId(),
    tanggal: new Date().toISOString(),
    ...data
  });
  // Limit to last 500 records
  if (riwayat.length > 500) riwayat.splice(500);
  saveRiwayat(riwayat);
}

function clearRiwayat() {
  saveRiwayat([]);
}

// ============================================================
// STATS
// ============================================================
function getStats() {
  const materials = getMaterials();
  const riwayat   = getRiwayat();

  const totalMaterial  = materials.length;
  const totalItems     = materials.reduce((a, m) => a + m.stock, 0);
  const lowStock       = materials.filter(m => m.stock <= m.minAlert);
  const todayStr       = new Date().toDateString();
  const transaksiHari  = riwayat.filter(r => new Date(r.tanggal).toDateString() === todayStr).length;

  return { totalMaterial, totalItems, lowStock, transaksiHari };
}

// ============================================================
// EXPORT — EXCEL (SheetJS)
// ============================================================
function exportStockExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('Library XLSX belum dimuat.', 'error');
    return;
  }

  const materials = getMaterials();
  const tanggal   = formatTanggalFile(new Date());

  const rows = [
    ['No', 'Nama Material', 'Kategori', 'Stock', 'Satuan', 'Min. Alert', 'Status']
  ];

  materials.forEach((m, i) => {
    const status = m.stock <= m.minAlert ? 'STOCK MENIPIS' : 'AMAN';
    rows.push([i + 1, m.nama, m.kategori, m.stock, m.satuan, m.minAlert, status]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 5 }, { wch: 25 }, { wch: 14 }, { wch: 10 },
    { wch: 10 }, { wch: 12 }, { wch: 16 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Stock');
  XLSX.writeFile(wb, `Stock_Material_${tanggal}.xlsx`);

  showToast('Export stock berhasil diunduh!', 'success');
}

function exportRiwayatExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('Library XLSX belum dimuat.', 'error');
    return;
  }

  const riwayat = getRiwayat();
  const tanggal = formatTanggalFile(new Date());

  const rows = [
    ['No', 'Tanggal', 'Waktu', 'Nama Material', 'Jenis', 'Jumlah', 'Stock Sebelum', 'Stock Sesudah', 'Operator', 'Keterangan']
  ];

  riwayat.forEach((r, i) => {
    const d = new Date(r.tanggal);
    rows.push([
      i + 1,
      d.toLocaleDateString('id-ID'),
      d.toLocaleTimeString('id-ID'),
      r.materialNama,
      r.jenis === 'MASUK' ? 'Barang Masuk' : 'Barang Keluar',
      r.jumlah,
      r.stockBefore,
      r.stockAfter,
      r.nama,
      r.keterangan
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 5 }, { wch: 14 }, { wch: 10 }, { wch: 22 }, { wch: 14 },
    { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 24 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Transaksi');
  XLSX.writeFile(wb, `Riwayat_Transaksi_${tanggal}.xlsx`);

  showToast('Export riwayat berhasil diunduh!', 'success');
}

function formatTanggalFile(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
function showToast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: '✓',
    error:   '✕',
    warning: '!',
    info:    'ℹ'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ'}</div>
    <div class="toast-msg">${msg}</div>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

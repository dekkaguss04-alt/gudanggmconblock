/**
 * GudangPro — dashboard.js
 * Main dashboard controller: navigation, rendering, UI interactions
 */

'use strict';

// ============================================================
// INIT — runs on page load
// ============================================================
(function init() {
  // Auth guard
  const session = requireAuth();
  if (!session) return;

  // Apply role-based UI
  applyRoleUI(session);

  // Set user display
  const initials = session.nama.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('sidebarAvatar').textContent  = initials;
  document.getElementById('topbarAvatar').textContent   = initials;
  document.getElementById('sidebarUsername').textContent = session.nama;
  document.getElementById('sidebarRole').textContent     = session.roleLabel;
  document.getElementById('topbarUsername').textContent  = session.username;

  // Current date
  const now = new Date();
  document.getElementById('currentDate').textContent =
    now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Populate material selects
  populateMaterialSelects();

  // Render dashboard
  renderDashboard();

  // Event listeners
  setupEventListeners(session);

  // Auto-navigate to correct page based on role
  const defaultPage = session.role === 'operator_masuk' ? 'tambah'
                    : session.role === 'operator_keluar' ? 'kurangi'
                    : 'dashboard';
  navigate(defaultPage);
})();

// ============================================================
// ROLE-BASED UI
// ============================================================
function applyRoleUI(session) {
  const { role } = session;

  // Admin-only elements
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin(role) ? '' : 'none';
  });

  // Hide tambah nav for operator_keluar
  if (role === 'operator_keluar') {
    document.getElementById('navTambah').style.display = 'none';
  }

  // Hide kurangi nav for operator_masuk
  if (role === 'operator_masuk') {
    document.getElementById('navKurangi').style.display = 'none';
  }

  // Clear riwayat button — admin only
  if (isAdmin(role)) {
    const btn = document.getElementById('btnClearRiwayat');
    if (btn) btn.style.display = 'flex';
  }
}

// ============================================================
// NAVIGATION
// ============================================================
function navigate(pageId) {
  const session = getSession();

  // Access control per page
  if (pageId === 'tambah' && !canTambahStock(session.role)) {
    showToast('Anda tidak memiliki akses halaman ini.', 'warning');
    return;
  }
  if (pageId === 'kurangi' && !canKurangiStock(session.role)) {
    showToast('Anda tidak memiliki akses halaman ini.', 'warning');
    return;
  }
  if (pageId === 'material' && !isAdmin(session.role)) {
    showToast('Hanya Admin yang dapat mengakses halaman ini.', 'warning');
    return;
  }

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Show target page
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Update topbar title
  const titles = {
    dashboard: 'Dashboard',
    stock:     'Stock Material',
    tambah:    'Tambah Stock',
    kurangi:   'Kurangi Stock',
    riwayat:   'Riwayat Transaksi',
    material:  'Kelola Material'
  };
  document.getElementById('pageTitle').textContent = titles[pageId] || 'GudangPro';

  // Re-render page content
  if (pageId === 'dashboard') renderDashboard();
  if (pageId === 'stock')     renderStockTable();
  if (pageId === 'riwayat')   renderRiwayatTable();
  if (pageId === 'material')  renderMaterialTable();
  if (pageId === 'tambah')    populateMaterialSelects();
  if (pageId === 'kurangi')   populateMaterialSelects();

  // Close sidebar on mobile
  closeSidebar();

  // Scroll to top
  document.querySelector('.content-area').scrollTop = 0;
}

// ============================================================
// SIDEBAR MOBILE
// ============================================================
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function setupEventListeners(session) {
  // Hamburger
  document.getElementById('hamburger').addEventListener('click', openSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

  // Form: Tambah Stock
  document.getElementById('formTambah').addEventListener('submit', function(e) {
    e.preventDefault();
    const matId  = document.getElementById('tambahMaterial').value;
    const jumlah = document.getElementById('tambahJumlah').value;
    const ket    = document.getElementById('tambahKeterangan').value;

    if (!matId) { showToast('Pilih material terlebih dahulu.', 'warning'); return; }
    if (!jumlah || parseInt(jumlah) <= 0) { showToast('Jumlah harus lebih dari 0.', 'warning'); return; }

    const result = tambahStock(matId, jumlah, session, ket);
    if (result.success) {
      showToast(result.msg, 'success');
      this.reset();
      renderDashboard();
    } else {
      showToast(result.msg, 'error');
    }
  });

  // Form: Kurangi Stock
  document.getElementById('formKurangi').addEventListener('submit', function(e) {
    e.preventDefault();
    const matId  = document.getElementById('kurangiMaterial').value;
    const jumlah = document.getElementById('kurangiJumlah').value;
    const ket    = document.getElementById('kurangiKeterangan').value;

    if (!matId) { showToast('Pilih material terlebih dahulu.', 'warning'); return; }
    if (!jumlah || parseInt(jumlah) <= 0) { showToast('Jumlah harus lebih dari 0.', 'warning'); return; }

    const mat = getMaterialById(matId);
    if (mat && parseInt(jumlah) > mat.stock) {
      showToast(`Stock tidak cukup. Tersedia: ${mat.stock} ${mat.satuan}`, 'error');
      return;
    }

    const result = kurangiStock(matId, jumlah, session, ket);
    if (result.success) {
      showToast(result.msg, 'success');
      this.reset();
      renderDashboard();
    } else {
      showToast(result.msg, 'error');
    }
  });

  // Form: Tambah Material (modal)
  document.getElementById('formTambahMaterial').addEventListener('submit', function(e) {
    e.preventDefault();
    const data = {
      nama: document.getElementById('matNama').value,
      kategori: document.getElementById('matKategori').value,
      satuan: document.getElementById('matSatuan').value,
      stock: document.getElementById('matStock').value,
      minAlert: document.getElementById('matMinAlert').value
    };

    if (!data.nama || !data.kategori || !data.satuan) {
      showToast('Lengkapi semua field yang wajib diisi.', 'warning');
      return;
    }

    addMaterial(data);
    showToast(`Material "${data.nama}" berhasil ditambahkan!`, 'success');
    closeModal('modalTambahMaterial');
    this.reset();
    renderMaterialTable();
    populateMaterialSelects();
    renderDashboard();
  });

  // Form: Edit Material (modal)
  document.getElementById('formEditMaterial').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('editMatId').value;
    const data = {
      nama: document.getElementById('editMatNama').value,
      kategori: document.getElementById('editMatKategori').value,
      satuan: document.getElementById('editMatSatuan').value,
      minAlert: document.getElementById('editMatMinAlert').value
    };

    updateMaterial(id, data);
    showToast('Material berhasil diperbarui!', 'success');
    closeModal('modalEditMaterial');
    renderMaterialTable();
    populateMaterialSelects();
    renderStockTable();
    renderDashboard();
  });

  // Notification bell click → go to low stock
  document.getElementById('notifBell').addEventListener('click', () => {
    navigate('stock');
    setTimeout(() => {
      document.getElementById('filterKategori').value = '';
      renderStockTable();
      showToast('Menampilkan semua stock. Cari item dengan status MENIPIS.', 'info');
    }, 100);
  });
}

// ============================================================
// RENDER: DASHBOARD
// ============================================================
function renderDashboard() {
  const stats = getStats();

  // Stat cards
  document.getElementById('statGrid').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Material</div>
      <div class="stat-value">${stats.totalMaterial} <span>jenis</span></div>
      <div class="stat-sub">Material terdaftar</div>
      <div class="stat-icon">📦</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">Total Stock</div>
      <div class="stat-value">${stats.totalItems.toLocaleString('id-ID')} <span>item</span></div>
      <div class="stat-sub">Seluruh material</div>
      <div class="stat-icon">📊</div>
    </div>
    <div class="stat-card red">
      <div class="stat-label">Stock Menipis</div>
      <div class="stat-value">${stats.lowStock.length} <span>material</span></div>
      <div class="stat-sub">Di bawah batas minimum</div>
      <div class="stat-icon">⚠️</div>
    </div>
    <div class="stat-card blue">
      <div class="stat-label">Transaksi Hari Ini</div>
      <div class="stat-value">${stats.transaksiHari} <span>transaksi</span></div>
      <div class="stat-sub">${new Date().toLocaleDateString('id-ID')}</div>
      <div class="stat-icon">🔄</div>
    </div>
  `;

  // Low stock alert
  const alertSection = document.getElementById('alertSection');
  const alertList    = document.getElementById('alertList');
  const notifBadge   = document.getElementById('notifBadge');

  if (stats.lowStock.length > 0) {
    alertSection.style.display = 'block';
    notifBadge.style.display = 'flex';
    alertList.innerHTML = stats.lowStock.map(m =>
      `<div class="alert-item">• <strong>${m.nama}</strong> — Sisa: ${m.stock} ${m.satuan} (Min: ${m.minAlert})</div>`
    ).join('');
  } else {
    alertSection.style.display = 'none';
    notifBadge.style.display = 'none';
  }

  // Material cards
  const materials = getMaterials();
  const container = document.getElementById('dashMaterialCards');
  if (!container) return;

  if (materials.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Belum ada material terdaftar.</p>';
    return;
  }

  container.innerHTML = materials.map(m => `
    <div class="mat-card ${m.stock <= m.minAlert ? 'low-stock' : ''}">
      <div class="mat-card-cat">${m.kategori}</div>
      <div class="mat-card-name">${m.nama}</div>
      <div class="mat-card-stock">${m.stock.toLocaleString('id-ID')}</div>
      <div class="mat-card-satuan">${m.satuan}</div>
    </div>
  `).join('');
}

// ============================================================
// RENDER: STOCK TABLE
// ============================================================
function renderStockTable() {
  const session   = getSession();
  const search    = (document.getElementById('searchStock')?.value || '').toLowerCase();
  const kategori  = document.getElementById('filterKategori')?.value || '';
  let   materials = getMaterials();

  if (search)   materials = materials.filter(m => m.nama.toLowerCase().includes(search) || m.kategori.toLowerCase().includes(search));
  if (kategori) materials = materials.filter(m => m.kategori === kategori);

  const tbody = document.getElementById('stockTbody');
  const empty = document.getElementById('stockEmpty');

  if (materials.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  const canIn  = canTambahStock(session.role);
  const canOut = canKurangiStock(session.role);

  tbody.innerHTML = materials.map((m, i) => {
    const isLow   = m.stock <= m.minAlert;
    const statusBadge = isLow
      ? '<span class="badge badge-low">MENIPIS</span>'
      : '<span class="badge badge-ok">AMAN</span>';

    const btnIn  = canIn  ? `<button class="btn-table-in"  onclick="quickTambah(${m.id})">+ Tambah</button>` : '';
    const btnOut = canOut ? `<button class="btn-table-out" onclick="quickKurangi(${m.id})">− Kurangi</button>` : '';

    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong style="color:var(--text-primary)">${m.nama}</strong></td>
        <td><span style="color:var(--gold-dim);font-size:12px">${m.kategori}</span></td>
        <td><span class="stock-value">${m.stock.toLocaleString('id-ID')}</span></td>
        <td>${m.satuan}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="table-actions">
            ${btnIn}
            ${btnOut}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================================
// QUICK ACTIONS from stock table
// ============================================================
function quickTambah(matId) {
  navigate('tambah');
  setTimeout(() => {
    document.getElementById('tambahMaterial').value = matId;
    document.getElementById('tambahJumlah').focus();
  }, 100);
}

function quickKurangi(matId) {
  navigate('kurangi');
  setTimeout(() => {
    document.getElementById('kurangiMaterial').value = matId;
    document.getElementById('kurangiJumlah').focus();
  }, 100);
}

// ============================================================
// RENDER: RIWAYAT TABLE
// ============================================================
function renderRiwayatTable() {
  const search = (document.getElementById('searchRiwayat')?.value || '').toLowerCase();
  const jenis  = document.getElementById('filterJenis')?.value || '';
  let   data   = getRiwayat();

  if (search) data = data.filter(r =>
    r.materialNama.toLowerCase().includes(search) ||
    r.nama.toLowerCase().includes(search) ||
    r.username.toLowerCase().includes(search)
  );
  if (jenis) data = data.filter(r => r.jenis === jenis);

  const tbody = document.getElementById('riwayatTbody');
  const empty = document.getElementById('riwayatEmpty');

  if (data.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = data.map((r, i) => {
    const d     = new Date(r.tanggal);
    const tgl   = d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
    const time  = d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
    const badge = r.jenis === 'MASUK'
      ? '<span class="badge badge-in">▲ MASUK</span>'
      : '<span class="badge badge-out">▼ KELUAR</span>';

    return `
      <tr>
        <td>${i + 1}</td>
        <td>
          <div style="font-weight:500;color:var(--text-primary)">${tgl}</div>
          <div style="font-size:11px;color:var(--text-muted)">${time}</div>
        </td>
        <td><strong style="color:var(--text-primary)">${r.materialNama}</strong></td>
        <td>${badge}</td>
        <td>
          <span style="font-family:var(--font-display);font-size:18px;color:${r.jenis==='MASUK'?'var(--green)':'var(--red)'}">
            ${r.jenis === 'MASUK' ? '+' : '-'}${r.jumlah.toLocaleString('id-ID')}
          </span>
        </td>
        <td style="color:var(--text-secondary)">${r.stockAfter.toLocaleString('id-ID')}</td>
        <td>
          <div style="font-weight:500;color:var(--text-primary)">${r.nama}</div>
          <div style="font-size:11px;color:var(--text-muted)">@${r.username}</div>
        </td>
        <td style="font-size:12px;color:var(--text-muted);max-width:180px">${r.keterangan || '—'}</td>
      </tr>
    `;
  }).join('');
}

// ============================================================
// RENDER: MATERIAL MANAGEMENT TABLE (Admin)
// ============================================================
function renderMaterialTable() {
  const materials = getMaterials();
  const tbody     = document.getElementById('materialTbody');

  tbody.innerHTML = materials.map((m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong style="color:var(--text-primary)">${m.nama}</strong></td>
      <td><span style="color:var(--gold-dim);font-size:12px">${m.kategori}</span></td>
      <td><span class="stock-value">${m.stock.toLocaleString('id-ID')}</span></td>
      <td>${m.satuan}</td>
      <td>${m.minAlert}</td>
      <td>
        <div class="table-actions">
          <button class="btn-table-edit" onclick="openEditMaterial(${m.id})">✏ Edit</button>
          <button class="btn-table-del"  onclick="confirmDelete(${m.id}, '${m.nama.replace(/'/g,'\\\'')}')" >🗑 Hapus</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ============================================================
// MATERIAL SELECTS
// ============================================================
function populateMaterialSelects() {
  const materials = getMaterials();
  const opts      = '<option value="">-- Pilih Material --</option>' +
    materials.map(m => `<option value="${m.id}">${m.nama} (${m.stock} ${m.satuan})</option>`).join('');

  ['tambahMaterial', 'kurangiMaterial'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = opts;
  });
}

// ============================================================
// MODAL HELPERS
// ============================================================
function openModal(id) {
  document.getElementById(id).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  document.body.style.overflow = '';
}

function openModalTambahMaterial() {
  document.getElementById('formTambahMaterial').reset();
  openModal('modalTambahMaterial');
}

function openEditMaterial(id) {
  const m = getMaterialById(id);
  if (!m) return;

  document.getElementById('editMatId').value      = m.id;
  document.getElementById('editMatNama').value    = m.nama;
  document.getElementById('editMatKategori').value= m.kategori;
  document.getElementById('editMatSatuan').value  = m.satuan;
  document.getElementById('editMatMinAlert').value= m.minAlert;

  openModal('modalEditMaterial');
}

function confirmDelete(id, nama) {
  const modal = document.getElementById('modalKonfirmasi');
  document.getElementById('konfirmasiTitle').textContent = 'Hapus Material';
  document.getElementById('konfirmasiText').innerHTML =
    `Yakin ingin menghapus material <strong style="color:var(--red)">"${nama}"</strong>?<br><small style="color:var(--text-muted)">Tindakan ini tidak dapat dibatalkan.</small>`;

  const btn = document.getElementById('konfirmasiBtn');
  btn.onclick = () => {
    deleteMaterial(id);
    showToast(`Material "${nama}" berhasil dihapus.`, 'success');
    closeModal('modalKonfirmasi');
    renderMaterialTable();
    populateMaterialSelects();
    renderDashboard();
  };

  openModal('modalKonfirmasi');
}

function confirmClearRiwayat() {
  const modal = document.getElementById('modalKonfirmasi');
  document.getElementById('konfirmasiTitle').textContent = 'Hapus Semua Riwayat';
  document.getElementById('konfirmasiText').innerHTML =
    `Yakin ingin menghapus <strong style="color:var(--red)">semua riwayat transaksi?</strong><br><small style="color:var(--text-muted)">Tindakan ini tidak dapat dibatalkan.</small>`;

  const btn = document.getElementById('konfirmasiBtn');
  btn.onclick = () => {
    clearRiwayat();
    showToast('Semua riwayat berhasil dihapus.', 'success');
    closeModal('modalKonfirmasi');
    renderRiwayatTable();
  };

  openModal('modalKonfirmasi');
}

// ============================================================
// FORM RESET HELPER
// ============================================================
function resetForm(formId) {
  document.getElementById(formId).reset();
}

// ============================================================
// CLEAR RIWAYAT (from button)
// ============================================================
function clearRiwayat() {
  confirmClearRiwayat();
}

// ============================================================
// CLOSE MODAL on overlay click
// ============================================================
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function(e) {
    if (e.target === this) {
      this.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
});

// ============================================================
// KEYBOARD: ESC closes modal
// ============================================================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
});

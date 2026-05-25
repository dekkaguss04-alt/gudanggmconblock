/**
 * GudangPro — auth.js
 * Handles login, session, and access control
 */

'use strict';

// ============================================================
// USER DATABASE (stored in code — edit here to add users)
// ============================================================
const USERS = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    nama: 'Administrator',
    role: 'admin',
    roleLabel: 'Administrator'
  },
  {
    id: 2,
    username: 'masuk',
    password: 'masuk123',
    nama: 'Operator Masuk',
    role: 'operator_masuk',
    roleLabel: 'Operator Masuk'
  },
  {
    id: 3,
    username: 'keluar',
    password: 'keluar123',
    nama: 'Operator Keluar',
    role: 'operator_keluar',
    roleLabel: 'Operator Keluar'
  }
];

const SESSION_KEY = 'gudangpro_session';

// ============================================================
// SESSION HELPERS
// ============================================================
function getSession() {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function setSession(user) {
  const session = {
    id: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
    roleLabel: user.roleLabel,
    loginAt: new Date().toISOString()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

function logout() {
  clearSession();
  window.location.href = 'login.html';
}

// ============================================================
// ACCESS CONTROL HELPERS
// ============================================================
function canTambahStock(role) {
  return role === 'admin' || role === 'operator_masuk';
}

function canKurangiStock(role) {
  return role === 'admin' || role === 'operator_keluar';
}

function isAdmin(role) {
  return role === 'admin';
}

// ============================================================
// LOGIN PAGE LOGIC
// (only runs if on login.html)
// ============================================================
if (document.getElementById('loginForm')) {

  // Redirect if already logged in
  if (getSession()) {
    window.location.href = 'dashboard.html';
  }

  const form      = document.getElementById('loginForm');
  const errorDiv  = document.getElementById('loginError');
  const loginBtn  = document.getElementById('loginBtn');
  const togglePw  = document.getElementById('togglePw');
  const pwInput   = document.getElementById('password');
  const eyeIcon   = document.getElementById('eyeIcon');

  // Toggle password visibility
  togglePw.addEventListener('click', () => {
    const isText = pwInput.type === 'text';
    pwInput.type = isText ? 'password' : 'text';
    eyeIcon.innerHTML = isText
      ? '<path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"/>'
      : '<path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"/><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>';
  });

  // Form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    // Show loading
    loginBtn.disabled = true;
    document.querySelector('.btn-text').style.display = 'none';
    document.querySelector('.btn-loader').style.display = 'flex';
    errorDiv.style.display = 'none';

    // Simulate slight delay for UX
    setTimeout(() => {
      const user = USERS.find(u => u.username === username && u.password === password);

      if (user) {
        setSession(user);
        window.location.href = 'dashboard.html';
      } else {
        loginBtn.disabled = false;
        document.querySelector('.btn-text').style.display = '';
        document.querySelector('.btn-loader').style.display = 'none';
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'Username atau password salah. Silakan coba lagi.';
        document.getElementById('password').value = '';
        document.getElementById('password').focus();
      }
    }, 800);
  });

  // Enter key on username → focus password
  document.getElementById('username').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('password').focus();
  });
}

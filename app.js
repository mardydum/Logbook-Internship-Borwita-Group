/* ============================================
   APP.JS — Core Application Router & UI Shell
   ============================================ */

// Icon SVGs (minimalist Lucide-style)
const ICONS = {
  briefcase: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
  clock: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  layout: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="21" y2="9"/></svg>',
  messageSquare: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  clipboardCheck: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>',
  award: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>',
  users: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  barChart: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>',
  download: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
  logOut: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',
  lock: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  calendar: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
  fileText: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  check: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>',
  edit: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  alertCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
  sun: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" x2="12" y1="1" y2="3"/><line x1="12" x2="12" y1="21" y2="23"/><line x1="4.22" x2="5.64" y1="4.22" y2="5.64"/><line x1="18.36" x2="19.78" y1="18.36" y2="19.78"/><line x1="1" x2="3" y1="12" y2="12"/><line x1="21" x2="23" y1="12" y2="12"/><line x1="4.22" x2="5.64" y1="19.78" y2="18.36"/><line x1="18.36" x2="19.78" y1="5.64" y2="4.22"/></svg>',
  moon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  star: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  inbox: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  toggleLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="6" ry="6"/><circle cx="8" cy="12" r="2"/></svg>',
};

/* ---------- NAV CONFIG ---------- */
const NAV_CONFIG = {
  intern: [
    { id: 'attendance', label: 'Attendance', icon: 'clock', render: renderAttendancePage },
    { id: 'dashboard', label: 'Dashboard', icon: 'layout', render: renderInternDashboard },
    { id: 'feedback', label: 'Feedback', icon: 'messageSquare', render: renderFeedbackPage },
  ],
  mentor: [
    { id: 'monthly-review', label: 'Monthly Review', icon: 'clipboardCheck', render: renderMonthlyReviewPage },
    { id: 'final-evaluation', label: 'Final Evaluation', icon: 'award', render: renderFinalEvaluationPage },
  ],
  admin: [
    { id: 'admin-dashboard', label: 'Dashboard', icon: 'barChart', render: renderAdminDashboard },
  ],
};

let currentPage = null;
let clockInterval = null;

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initData();
  const user = getCurrentUser();
  if (user) {
    showApp(user);
  } else {
    showLogin();
  }
});

/* ---------- GLOBAL LOADER ---------- */
function showLoader(message = 'Loading...') {
  let loader = document.getElementById('global-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.innerHTML = `
      <div class="loader-content">
        <div class="spinner"></div>
        <p id="loader-msg">${message}</p>
      </div>
    `;
    document.body.appendChild(loader);
  } else {
    document.getElementById('loader-msg').textContent = message;
    loader.style.display = 'flex';
  }
}

function hideLoader() {
  const loader = document.getElementById('global-loader');
  if (loader) loader.style.display = 'none';
}

/* ---------- LOGIN ---------- */
function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');

  const btn = document.getElementById('login-btn');
  const input = document.getElementById('login-password');
  const error = document.getElementById('login-error');

  btn.onclick = () => attemptLogin();
  input.onkeydown = (e) => { if (e.key === 'Enter') attemptLogin(); };

  async function attemptLogin() {
    const pwd = input.value.trim();
    error.textContent = '';
    if (!pwd) { error.textContent = 'Please enter your password'; return; }
    
    showLoader('Authenticating...');
    btn.disabled = true;
    try {
      const user = await loginUser(pwd);
      if (user) {
        await showApp(user);
      } else {
        error.textContent = 'Invalid password or account inactive';
      }
    } catch (e) {
      console.error(e);
      error.innerHTML = `Connection error. Please try again.<br><small style="color:#ff8888">${e.message}</small>`;
    } finally {
      hideLoader();
      btn.disabled = false;
    }
  }
}

/* ---------- SHOW APP ---------- */
async function showApp(user) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('login-password').value = '';

  // Clear stale content from previous user session
  document.getElementById('content-area').innerHTML = '';

  // Reset caches for fresh session
  window._usersCache = [];
  _cachedInterns = [];

  // Always make sure the current user is in the cache using both id casings.
  const normalizedUser = {
    ...user,
    id: user.id || user.ID,
    ID: user.ID || user.id,
    name: user.name || user.Name,
    Name: user.Name || user.name,
  };
  window._usersCache = [normalizedUser];

  // Render sidebar and navigate to first page immediately (don't wait for pre-fetch)
  renderSidebar(user);
  const nav = NAV_CONFIG[user.role];
  if (nav && nav.length > 0) {
    await navigateTo(nav[0].id);
  }

  // Pre-fetch intern list in background (non-blocking) for mentor/admin
  if (user.role === 'mentor' || user.role === 'admin') {
    getInterns().then(allInterns => {
      window._usersCache = [normalizedUser, ...allInterns];
      setCachedInterns(allInterns);
    }).catch(e => console.warn('Background intern fetch failed:', e));
  }
}

/* ---------- UID HELPER ---------- */
// Simple unique ID generator used by mentor.js when submitting reviews/approvals.
function uid(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------- SIDEBAR ---------- */
function renderSidebar(user) {
  const nav = NAV_CONFIG[user.role] || [];
  const roleLabels = { admin: 'Administrator', mentor: 'Mentor', intern: 'Intern' };

  document.getElementById('sidebar-nav').innerHTML = `
    <div class="nav-section-title">Menu</div>
    ${nav.map(item => `
      <div class="nav-item" data-page="${item.id}" onclick="navigateTo('${item.id}')">
        ${ICONS[item.icon]} <span>${item.label}</span>
      </div>
    `).join('')}
  `;

  document.getElementById('sidebar-user').innerHTML = `
    <div class="user-card">
      <div class="user-avatar">${user.name.charAt(0)}</div>
      <div class="user-details">
        <div class="user-name">${user.name}</div>
        <div class="user-role">${roleLabels[user.role]}</div>
      </div>
    </div>
  `;

  document.getElementById('logout-btn').onclick = () => {
    logoutUser();
    if (clockInterval) clearInterval(clockInterval);
    // Clear stale UI from previous session
    document.getElementById('content-area').innerHTML = '';
    document.getElementById('sidebar-nav').innerHTML = '';
    document.getElementById('sidebar-user').innerHTML = '';
    showLogin();
  };
}

/* ---------- NAVIGATION ---------- */
async function navigateTo(pageId) {
  const user = getCurrentUser();
  if (!user) return;

  const nav = NAV_CONFIG[user.role];
  const page = nav.find(p => p.id === pageId);
  if (!page) return;

  currentPage = pageId;

  // Update active nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });

  // Update topbar
  document.getElementById('topbar-title').textContent = page.label;
  document.getElementById('topbar-date').textContent = formatDisplayDate(new Date());

  // Clear interval if leaving attendance page
  if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }

  // Render page with loading state
  showLoader('Loading content...');
  try {
    const renderContent = page.render(user);
    if (renderContent instanceof Promise) {
      await renderContent;
    }
  } catch (err) {
    console.error('Render error:', err);
    showToast('Error loading page. Please refresh.', 'danger');
  } finally {
    hideLoader();
  }
}

/* ---------- TOAST ---------- */
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const iconMap = { success: ICONS.check, error: ICONS.alertCircle, info: ICONS.alertCircle };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${iconMap[type] || ''}<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'fadeOut 0.3s ease'; setTimeout(() => toast.remove(), 300); }, 3000);
}

/* ---------- MODAL ---------- */
function showModal(title, bodyHTML, footerHTML = '') {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" onclick="closeModal()">${ICONS.x}</button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>
  `;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}

function closeModal() {
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.remove();
}

/* ---------- HELPERS ---------- */
const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function formatDisplayDate(d) {
  const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  return `${days[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;
}

function monthSelector(selectedMonth, selectedYear, onChange) {
  const now = new Date();
  return `
    <div class="month-selector">
      <select id="month-select" onchange="${onChange}">
        ${MONTHS.map((m, i) => `<option value="${i+1}" ${i+1 === selectedMonth ? 'selected' : ''}>${m}</option>`).join('')}
      </select>
      <select id="year-select" onchange="${onChange}">
        ${[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y =>
          `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`
        ).join('')}
      </select>
    </div>
  `;
}

function getSelectedMonth() {
  return parseInt(document.getElementById('month-select')?.value || (new Date().getMonth()+1));
}

function getSelectedYear() {
  return parseInt(document.getElementById('year-select')?.value || new Date().getFullYear());
}
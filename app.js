/* ==========================================
   SPRIX Ramadan Work Tracker — Application
   ========================================== */

// ---- Ramadan 2026 dates (approximate: Feb 18 – Mar 19, 2026) ----
const RAMADAN_START = new Date(2026, 1, 18); // Feb 18, 2026
const RAMADAN_END = new Date(2026, 2, 19);   // Mar 19, 2026

// ---- Day names (for calendar headers) ----
const MONTH_NAMES = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ja: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

// ---- State ----
let state = {
  employees: [],
  attendance: {}, // { 'YYYY-MM-DD': { empId: { status, shift } } }
  currentView: 'dashboard',
  calendarMonth: new Date().getMonth(),
  calendarYear: new Date().getFullYear(),
  editingEmployee: null,
  workMode: 'normal',
};

// ---- Google Sheets API config (Phase 2) ----
const API_CONFIG = {
  scriptUrl: '', // Will be set when Google Apps Script is deployed
  connected: false,
};

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  loadLanguage();
  loadState();
  initNavigation();
  initModal();
  initExport();
  initMobileMenu();
  initSettings();
  initSecurity();

  // Apply saved language
  setLanguage(currentLang);

  // Update modes
  const modeSelect = document.getElementById('workModeSelect');
  if (modeSelect) modeSelect.value = state.workMode;
  changeWorkMode(); // ensure shift options reflect current mode
});

// ---- State Management ----
function loadState() {
  try {
    const saved = localStorage.getItem('sprix-ramadan-tracker');
    if (saved) {
      const parsed = JSON.parse(saved);
      state.employees = parsed.employees || [];
      state.attendance = parsed.attendance || {};
      state.workMode = parsed.workMode || 'normal';

      // Migrate old data
      state.employees.forEach(emp => {
        if (emp.defaultShift === '9-15') emp.defaultShift = 'opt1';
        if (emp.defaultShift === '10-16') emp.defaultShift = 'opt2';
      });
      Object.keys(state.attendance).forEach(date => {
        Object.keys(state.attendance[date]).forEach(empId => {
          if (state.attendance[date][empId].shift === '9-15') state.attendance[date][empId].shift = 'opt1';
          if (state.attendance[date][empId].shift === '10-16') state.attendance[date][empId].shift = 'opt2';
        });
      });
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
}

function saveState() {
  try {
    localStorage.setItem('sprix-ramadan-tracker', JSON.stringify({
      employees: state.employees,
      attendance: state.attendance,
      workMode: state.workMode,
    }));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

// ---- Navigation ----
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      if (view) switchView(view);
    });
  });
}

function switchView(viewName) {
  state.currentView = viewName;

  // Update nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');

  // Update views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view${capitalize(viewName)}`)?.classList.add('active');

  // Update header title
  const titleKey = `nav.${viewName}`;
  document.getElementById('headerTitle').textContent = t(titleKey);

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');

  // Render view-specific content
  if (viewName === 'calendar') renderCalendar();
  if (viewName === 'employees') renderEmployeeTable();

  render();
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ---- Mobile Menu ----
function initMobileMenu() {
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
}

// ---- Header / Ramadan ----
function updateHeader() {
  const now = new Date();

  let dateStr;
  if (currentLang === 'ja') {
    dateStr = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  } else if (currentLang === 'ar') {
    dateStr = now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  } else {
    dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  document.getElementById('headerDate').textContent = dateStr;
}

function updateRamadanDay() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(RAMADAN_START);
  start.setHours(0, 0, 0, 0);

  const diffTime = now - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const dayEl = document.getElementById('ramadanDay');
  const dateEl = document.getElementById('ramadanDate');

  if (diffDays >= 0 && diffDays < 30) {
    dayEl.textContent = diffDays + 1;
    dateEl.textContent = `Day ${diffDays + 1} ${t('ramadan.dayOf')}`;
  } else if (diffDays < 0) {
    dayEl.textContent = Math.abs(diffDays);
    dateEl.textContent = `${Math.abs(diffDays)} ${t('ramadan.daysUntil')}`;
  } else {
    dayEl.textContent = '✓';
    dateEl.textContent = t('ramadan.completed');
  }
}

// ---- Render ----
function render() {
  renderStatusCards();
  renderDashboard();
}

function renderStatusCards() {
  const today = getDateKey(new Date());
  const todayData = state.attendance[today] || {};

  let officeCount = 0;
  let remoteCount = 0;
  let leaveCount = 0;

  state.employees.forEach(emp => {
    const record = todayData[emp.id];
    const status = record ? record.status : getDefaultStatus(emp);
    if (status === 'office') officeCount++;
    else if (status === 'remote') remoteCount++;
    else leaveCount++;
  });

  document.getElementById('totalCount').textContent = state.employees.length;
  document.getElementById('officeCount').textContent = officeCount;
  document.getElementById('remoteCount').textContent = remoteCount;
  document.getElementById('leaveCount').textContent = leaveCount;
}

function getDefaultStatus(emp) {
  const today = new Date();
  const dayOfWeek = today.getDay();

  // Friday & Saturday are weekend in Egypt
  if (dayOfWeek === 5 || dayOfWeek === 6) return 'leave';

  // Check default remote day
  if (emp.remoteDay !== undefined && emp.remoteDay !== '' && parseInt(emp.remoteDay) === dayOfWeek) {
    return 'remote';
  }

  return 'office';
}

function getDefaultShift(emp) {
  return emp.defaultShift || 'opt1';
}

function renderDashboard() {
  const grid = document.getElementById('employeeGrid');

  if (state.employees.length === 0) {
    grid.innerHTML = '';
    grid.appendChild(createEmptyState());
    return;
  }

  const today = getDateKey(new Date());
  const todayData = state.attendance[today] || {};

  grid.innerHTML = state.employees.map(emp => {
    const record = todayData[emp.id];
    const status = record ? record.status : getDefaultStatus(emp);
    const shift = record ? record.shift : getDefaultShift(emp);
    const initials = getInitials(emp.name);

    const shiftText = shift === 'opt1'
      ? t(state.workMode === 'normal' ? 'shift.normal1' : 'shift.ramadan1')
      : t(state.workMode === 'normal' ? 'shift.normal2' : 'shift.ramadan2');

    return `
      <div class="employee-card ${status}" data-emp-id="${emp.id}">
        <div class="employee-card-header">
          <div class="employee-info">
            <div class="employee-avatar">${initials}</div>
            <div>
              <div class="employee-name">${escapeHTML(emp.name)}</div>
              <div class="employee-dept">${escapeHTML(emp.department || '')}</div>
            </div>
          </div>
          <span class="status-badge ${status}">
            ${t('badge.' + status)}
          </span>
        </div>

        <div class="employee-details">
          <div class="detail-tag">
            <span class="tag-icon">🕐</span>
            <span>${shiftText}</span>
          </div>
          ${emp.remoteDay !== undefined && emp.remoteDay !== ''
        ? `<div class="detail-tag"><span class="tag-icon">🏠</span><span>${getDayNameShort(parseInt(emp.remoteDay))}</span></div>`
        : ''}
        </div>

        <div class="status-selector">
          <button class="status-btn office-btn ${status === 'office' ? 'active' : ''}"
                  onclick="setStatus('${emp.id}', 'office')">${t('btn.office')}</button>
          <button class="status-btn remote-btn ${status === 'remote' ? 'active' : ''}"
                  onclick="setStatus('${emp.id}', 'remote')">${t('btn.remote')}</button>
          <button class="status-btn leave-btn ${status === 'leave' ? 'active' : ''}"
                  onclick="setStatus('${emp.id}', 'leave')">${t('btn.leave')}</button>
        </div>

        <div class="shift-selector">
          <button class="shift-btn ${shift === 'opt1' ? 'active' : ''}"
                  onclick="setShift('${emp.id}', 'opt1')">${t(state.workMode === 'normal' ? 'shift.normal1' : 'shift.ramadan1')}</button>
          <button class="shift-btn ${shift === 'opt2' ? 'active' : ''}"
                  onclick="setShift('${emp.id}', 'opt2')">${t(state.workMode === 'normal' ? 'shift.normal2' : 'shift.ramadan2')}</button>
        </div>
      </div>
    `;
  }).join('');
}

function createEmptyState() {
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.innerHTML = `
    <div class="empty-icon">👥</div>
    <p>${t('emp.emptyTitle')}<br>${t('emp.emptyAction')}</p>
    <button class="btn btn-primary" onclick="openModal()">${t('emp.addFirst')}</button>
  `;
  return div;
}

// ---- Status & Shift ----
function setStatus(empId, status) {
  const today = getDateKey(new Date());
  if (!state.attendance[today]) state.attendance[today] = {};
  if (!state.attendance[today][empId]) {
    const emp = state.employees.find(e => e.id === empId);
    state.attendance[today][empId] = {
      status: status,
      shift: getDefaultShift(emp),
    };
  } else {
    state.attendance[today][empId].status = status;
  }
  saveState();
  render();
  syncToSheets();
}

function setShift(empId, shift) {
  const today = getDateKey(new Date());
  if (!state.attendance[today]) state.attendance[today] = {};
  if (!state.attendance[today][empId]) {
    state.attendance[today][empId] = {
      status: getDefaultStatus(state.employees.find(e => e.id === empId)),
      shift: shift,
    };
  } else {
    state.attendance[today][empId].shift = shift;
  }
  saveState();
  render();
  syncToSheets();
}

// ---- Modal ----
function initModal() {
  const overlay = document.getElementById('modalOverlay');
  const closeBtn = document.getElementById('modalClose');
  const cancelBtn = document.getElementById('modalCancel');
  const saveBtn = document.getElementById('modalSave');
  const addBtn = document.getElementById('btnAddEmployee');
  const addBtn2 = document.getElementById('btnAddEmployee2');
  const addFirstBtn = document.getElementById('btnAddFirst');

  addBtn.addEventListener('click', () => openModal());
  addBtn2.addEventListener('click', () => openModal());
  if (addFirstBtn) addFirstBtn.addEventListener('click', () => openModal());

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  saveBtn.addEventListener('click', saveEmployee);
}

function openModal(employee = null) {
  state.editingEmployee = employee;
  const title = document.getElementById('modalTitle');
  const nameInput = document.getElementById('empName');
  const deptInput = document.getElementById('empDept');
  const shiftSelect = document.getElementById('empShift');
  const remoteDaySelect = document.getElementById('empRemoteDay');

  if (employee) {
    title.textContent = t('modal.editTitle');
    nameInput.value = employee.name;
    deptInput.value = employee.department || '';
    shiftSelect.value = employee.defaultShift || 'opt1';
    remoteDaySelect.value = employee.remoteDay !== undefined ? employee.remoteDay : '';
  } else {
    title.textContent = t('modal.addTitle');
    nameInput.value = '';
    deptInput.value = '';
    shiftSelect.value = 'opt1';
    remoteDaySelect.value = '';
  }

  document.getElementById('modalOverlay').classList.add('active');
  setTimeout(() => nameInput.focus(), 200);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  state.editingEmployee = null;
}

function saveEmployee() {
  const name = document.getElementById('empName').value.trim();
  const department = document.getElementById('empDept').value.trim();
  const defaultShift = document.getElementById('empShift').value;
  const remoteDay = document.getElementById('empRemoteDay').value;

  if (!name) {
    showToast(t('toast.nameRequired'), 'error');
    return;
  }

  if (state.editingEmployee) {
    // Edit existing
    const emp = state.employees.find(e => e.id === state.editingEmployee.id);
    if (emp) {
      emp.name = name;
      emp.department = department;
      emp.defaultShift = defaultShift;
      emp.remoteDay = remoteDay;
    }
    showToast(`${name} ${t('toast.updated')}`, 'success');
  } else {
    // Add new
    const newEmp = {
      id: generateId(),
      name,
      department,
      defaultShift,
      remoteDay,
    };
    state.employees.push(newEmp);
    showToast(`${name} ${t('toast.added')}`, 'success');
  }

  saveState();
  closeModal();
  render();
  if (state.currentView === 'employees') renderEmployeeTable();
  syncToSheets();
}

// ---- Employee Table ----
function renderEmployeeTable() {
  const tbody = document.getElementById('employeeTableBody');

  if (state.employees.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: var(--gray-400);">
          ${t('emp.emptyTitle')}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = state.employees.map(emp => {
    const shiftText = emp.defaultShift === 'opt1'
      ? t(state.workMode === 'normal' ? 'shift.normal1' : 'shift.ramadan1')
      : t(state.workMode === 'normal' ? 'shift.normal2' : 'shift.ramadan2');

    return `
      <tr>
        <td>
          <div class="table-avatar">
            <div class="employee-avatar" style="width: 32px; height: 32px; font-size: 11px;">${getInitials(emp.name)}</div>
            <span style="font-weight: 500;">${escapeHTML(emp.name)}</span>
          </div>
        </td>
        <td>${escapeHTML(emp.department || '—')}</td>
        <td>${shiftText}</td>
        <td>${emp.remoteDay !== undefined && emp.remoteDay !== '' ? getDayName(parseInt(emp.remoteDay)) : '—'}</td>
        <td>
          <div class="table-actions">
            <button onclick="editEmployee('${emp.id}')">✏️ ${currentLang === 'ar' ? 'تعديل' : 'Edit'}</button>
            <button class="delete" onclick="deleteEmployee('${emp.id}')">🗑️ ${currentLang === 'ar' ? 'حذف' : 'Delete'}</button>
          </div>
        </td>
      </tr>
    `
  }).join('');
}

function editEmployee(empId) {
  const emp = state.employees.find(e => e.id === empId);
  if (emp) openModal(emp);
}

function deleteEmployee(empId) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;

  const msg = currentLang === 'ar'
    ? `${t('confirm.delete')} ${emp.name}?`
    : `${emp.name} ${t('confirm.delete')}`;

  if (confirm(msg)) {
    state.employees = state.employees.filter(e => e.id !== empId);
    // Also remove attendance records
    Object.keys(state.attendance).forEach(date => {
      if (state.attendance[date][empId]) {
        delete state.attendance[date][empId];
      }
    });
    saveState();
    render();
    renderEmployeeTable();
    showToast(`${emp.name} ${t('toast.deleted')}`, 'success');
    syncToSheets();
  }
}

// ---- Calendar ----
function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const title = document.getElementById('calTitle');

  const year = state.calendarYear;
  const month = state.calendarMonth;
  const monthNames = MONTH_NAMES[currentLang] || MONTH_NAMES['en'];

  title.textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay(); // 0=Sun

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let html = '';

  // Day headers
  for (let i = 0; i < 7; i++) {
    html += `<div class="calendar-day-header">${getDayNameShort(i)}</div>`;
  }

  // Previous month fill
  const prevMonthLast = new Date(year, month, 0);
  for (let i = startDay - 1; i >= 0; i--) {
    const dayNum = prevMonthLast.getDate() - i;
    html += `<div class="calendar-day other-month"><span class="calendar-day-number">${dayNum}</span></div>`;
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateObj = new Date(year, month, d);
    dateObj.setHours(0, 0, 0, 0);
    const dateKey = getDateKey(dateObj);
    const isToday = dateObj.getTime() === today.getTime();
    const dayData = state.attendance[dateKey] || {};

    let dotsHtml = '';
    let remoteBadges = '';

    state.employees.forEach(emp => {
      const record = dayData[emp.id];
      let status;
      if (record) {
        status = record.status;
      } else {
        // Use defaults based on day of week
        const dow = dateObj.getDay();
        if (dow === 5 || dow === 6) {
          status = 'leave';
        } else if (emp.remoteDay !== undefined && emp.remoteDay !== '' && parseInt(emp.remoteDay) === dow) {
          status = 'remote';
        } else {
          status = 'office';
        }
      }
      dotsHtml += `<span class="calendar-dot ${status}"></span>`;
      if (status === 'remote') {
        remoteBadges += `<div class="calendar-mini-badge remote">${getInitials(emp.name)}</div>`;
      }
    });

    html += `
      <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateKey}">
        <span class="calendar-day-number">${d}</span>
        <div class="calendar-dots">${dotsHtml}</div>
        <div class="calendar-mini-badges">${remoteBadges}</div>
      </div>
    `;
  }

  // Next month fill
  const totalCells = startDay + lastDay.getDate();
  const remaining = 7 - (totalCells % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      html += `<div class="calendar-day other-month"><span class="calendar-day-number">${d}</span></div>`;
    }
  }

  grid.innerHTML = html;

  // Calendar nav
  document.getElementById('calPrev').onclick = () => {
    state.calendarMonth--;
    if (state.calendarMonth < 0) {
      state.calendarMonth = 11;
      state.calendarYear--;
    }
    renderCalendar();
  };

  document.getElementById('calNext').onclick = () => {
    state.calendarMonth++;
    if (state.calendarMonth > 11) {
      state.calendarMonth = 0;
      state.calendarYear++;
    }
    renderCalendar();
  };
}

// ---- Export ----
function initExport() {
  document.getElementById('btnExportCSV').addEventListener('click', exportCSV);
  document.getElementById('btnExportJSON').addEventListener('click', exportJSON);
  document.getElementById('btnImportJSON').addEventListener('change', importJSON);
}

function exportCSV() {
  if (state.employees.length === 0) {
    showToast(t('toast.noData'), 'error');
    return;
  }

  let csv = 'Date,Employee,Department,Status,Shift\n';

  const dates = Object.keys(state.attendance).sort();
  dates.forEach(date => {
    const dayData = state.attendance[date];
    state.employees.forEach(emp => {
      const record = dayData[emp.id];
      if (record) {
        csv += `${date},"${emp.name}","${emp.department || ''}",${record.status},${record.shift === '9-15' ? '9:00-15:00' : '10:00-16:00'}\n`;
      }
    });
  });

  downloadFile(csv, `sprix-ramadan-attendance-${getDateKey(new Date())}.csv`, 'text/csv');
  showToast(t('toast.csvDone'), 'success');
}

function exportJSON() {
  const data = JSON.stringify({
    employees: state.employees,
    attendance: state.attendance,
    exportDate: new Date().toISOString(),
  }, null, 2);

  downloadFile(data, `sprix-ramadan-backup-${getDateKey(new Date())}.json`, 'application/json');
  showToast(t('toast.backupDone'), 'success');
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.employees && Array.isArray(data.employees)) {
        state.employees = data.employees;
        state.attendance = data.attendance || {};
        saveState();
        render();
        showToast(t('toast.restored'), 'success');
      } else {
        showToast(t('toast.invalidFile'), 'error');
      }
    } catch (err) {
      showToast(t('toast.readFailed'), 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = ''; // Reset
}

// ---- Google Sheets Connection ----

function initSettings() {
  // Load saved URL
  const savedUrl = localStorage.getItem('sprix-sheets-url');
  if (savedUrl) {
    API_CONFIG.scriptUrl = savedUrl;
    const urlInput = document.getElementById('sheetsUrl');
    if (urlInput) urlInput.value = savedUrl;
    API_CONFIG.connected = true;
    updateConnectionStatus(true);
    updateSettingsUI(true);
    // Auto-load from Sheets on startup
    loadFromSheets();
  }
}

function connectToSheets() {
  const url = document.getElementById('sheetsUrl').value.trim();
  if (!url) {
    showToast(t('toast.urlRequired'), 'error');
    return;
  }

  if (!url.startsWith('https://script.google.com/')) {
    showToast('Invalid Google Apps Script URL', 'error');
    return;
  }

  API_CONFIG.scriptUrl = url;
  localStorage.setItem('sprix-sheets-url', url);

  // Test connection by loading data
  document.getElementById('syncStatus').textContent = 'Connecting...';

  loadFromSheets().then(success => {
    if (success) {
      API_CONFIG.connected = true;
      updateConnectionStatus(true);
      updateSettingsUI(true);
      showToast(t('toast.connected'), 'success');
      // Push local data to Sheets
      forceSyncToSheets();
    } else {
      document.getElementById('syncStatus').textContent = 'Connection failed. Check the URL and try again.';
    }
  });
}

function disconnectSheets() {
  API_CONFIG.scriptUrl = '';
  API_CONFIG.connected = false;
  localStorage.removeItem('sprix-sheets-url');
  document.getElementById('sheetsUrl').value = '';
  document.getElementById('syncStatus').textContent = '';
  updateConnectionStatus(false);
  updateSettingsUI(false);
  showToast(t('toast.disconnected'), 'success');
}

function updateSettingsUI(connected) {
  const connectBtn = document.getElementById('btnConnect');
  const disconnectBtn = document.getElementById('btnDisconnect');
  const syncBtn = document.getElementById('btnSyncNow');
  const urlInput = document.getElementById('sheetsUrl');

  if (connected) {
    if (connectBtn) connectBtn.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = '';
    if (syncBtn) syncBtn.style.display = '';
    if (urlInput) urlInput.disabled = true;
  } else {
    if (connectBtn) connectBtn.style.display = '';
    if (disconnectBtn) disconnectBtn.style.display = 'none';
    if (syncBtn) syncBtn.style.display = 'none';
    if (urlInput) urlInput.disabled = false;
  }
}

async function syncToSheets() {
  if (!API_CONFIG.scriptUrl || !API_CONFIG.connected) return;

  try {
    const response = await fetch(API_CONFIG.scriptUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'sync',
        employees: state.employees,
        attendance: state.attendance,
      }),
    });

    if (response.ok) {
      const lastSync = new Date().toLocaleString();
      document.getElementById('syncStatus').textContent = `Last sync: ${lastSync}`;
      updateConnectionStatus(true);
    }
  } catch (err) {
    console.warn('Sync failed:', err);
    // Apps Script CORS — fetch will throw for opaque responses but data may still be sent
    const lastSync = new Date().toLocaleString();
    document.getElementById('syncStatus').textContent = `Last sync attempt: ${lastSync}`;
  }
}

async function forceSyncToSheets() {
  if (!API_CONFIG.scriptUrl) return;

  document.getElementById('syncStatus').textContent = 'Syncing...';

  try {
    const response = await fetch(API_CONFIG.scriptUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'sync',
        employees: state.employees,
        attendance: state.attendance,
      }),
    });

    if (response.ok) {
      const lastSync = new Date().toLocaleString();
      document.getElementById('syncStatus').textContent = `✓ Synced: ${lastSync}`;
      showToast(t('toast.syncDone'), 'success');
      updateConnectionStatus(true);
    }
  } catch (err) {
    console.warn('Sync attempt:', err);
    document.getElementById('syncStatus').textContent = `Sync attempted: ${new Date().toLocaleString()}`;
    showToast(t('toast.syncDone'), 'success');
  }
}

async function loadFromSheets() {
  if (!API_CONFIG.scriptUrl) return false;

  try {
    const response = await fetch(`${API_CONFIG.scriptUrl}?action=load`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.employees) {
        // Merge: if sheets has data, use it; otherwise keep local
        if (data.employees.length > 0) {
          state.employees = data.employees;
        }
        if (data.attendance && Object.keys(data.attendance).length > 0) {
          state.attendance = data.attendance;
        }
        saveState();
        render();
        updateConnectionStatus(true);
        const lastSync = new Date().toLocaleString();
        document.getElementById('syncStatus').textContent = `✓ Connected: ${lastSync}`;
        return true;
      }
      // Empty sheet — still connected
      updateConnectionStatus(true);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Load from Sheets failed:', err);
    updateConnectionStatus(false);
    return false;
  }
}

function updateConnectionStatus(connected) {
  const el = document.getElementById('connectionStatus');
  API_CONFIG.connected = connected;

  if (connected) {
    el.classList.add('connected');
    el.innerHTML = `<span class="status-dot"></span><span>${t('header.sheetsConnected')}</span>`;
  } else {
    el.classList.remove('connected');
    el.innerHTML = `<span class="status-dot"></span><span>${t('header.localMode')}</span>`;
  }
}


// ---- Utilities ----
function getDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function generateId() {
  return 'emp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
}

function getInitials(name) {
  return name.split(/[\s　]+/).map(w => w.charAt(0).toUpperCase()).join('').slice(0, 2);
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- Toast ----
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '⚠'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ---- Work Mode & Security ----
function changeWorkMode() {
  const modeSelect = document.getElementById('workModeSelect');
  if (!modeSelect) return;

  state.workMode = modeSelect.value;
  saveState();

  // Update options in Add Employee Modal
  const shiftSelect = document.getElementById('empShift');
  if (shiftSelect) {
    if (state.workMode === 'normal') {
      shiftSelect.innerHTML = `
        <option value="opt1" data-i18n="shift.normal1">${t('shift.normal1')}</option>
        <option value="opt2" data-i18n="shift.normal2">${t('shift.normal2')}</option>
      `;
    } else {
      shiftSelect.innerHTML = `
        <option value="opt1" data-i18n="shift.ramadan1">${t('shift.ramadan1')}</option>
        <option value="opt2" data-i18n="shift.ramadan2">${t('shift.ramadan2')}</option>
      `;
    }
  }

  // Re-render views if they are open
  if (state.currentView === 'dashboard') renderDashboard();
  if (state.currentView === 'employees') renderEmployeeTable();
}

function initSecurity() {
  const isAuthValid = sessionStorage.getItem('sprix-auth') === 'true';
  const overlay = document.getElementById('authOverlay');
  const passInput = document.getElementById('authPassword');
  const authBtn = document.getElementById('btnAuth');
  const err = document.getElementById('authError');

  if (isAuthValid) {
    if (overlay) overlay.classList.add('hidden');
    return;
  }

  if (authBtn && passInput) {
    authBtn.addEventListener('click', () => {
      // Simple pass requirement for Sprix EdTech
      if (passInput.value === 'sprix2026') {
        sessionStorage.setItem('sprix-auth', 'true');
        overlay.classList.add('hidden');
      } else {
        err.classList.add('show');
      }
    });

    passInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') authBtn.click();
    });
  }
}

// Ensure auth overlay shows instantly if not authenticated
if (sessionStorage.getItem('sprix-auth') !== 'true') {
  document.getElementById('authOverlay')?.classList.remove('hidden');
}

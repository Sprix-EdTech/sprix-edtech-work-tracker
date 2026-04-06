
function getEgyptTimeMinutes() {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hour12: false });
  const parts = dtf.formatToParts(new Date());
  const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
  const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
  return hour * 60 + minute;
}

function getCurrentEgyptDateKey() {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = dtf.formatToParts(new Date());
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  const y = parts.find(p => p.type === 'year').value;
  return `${y}-${m}-${d}`;
}


/* ==========================================
   SPRIX Ramadan Work Tracker — Application
   ========================================== */

// === Ramadan Date Logic ===
const RAMADAN_START = new Date(2026, 1, 19); // Feb 19, 2026
const RAMADAN_END = new Date(2026, 2, 20);   // Mar 20, 2026

// === Dual Timezone Clock Logic ===
function updateClocks() {
  const now = new Date();
  const dateOptions = { month: 'short', day: 'numeric' };

  const getParts = (tz) => {
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' });
    const parts = dtf.formatToParts(now);
    return {
      h: parseInt(parts.find(p => p.type === 'hour').value, 10),
      m: parseInt(parts.find(p => p.type === 'minute').value, 10),
      s: parseInt(parts.find(p => p.type === 'second').value, 10)
    };
  };

  // Japan Time (Asia/Tokyo)
  const jpn = getParts('Asia/Tokyo');
  document.getElementById('dateJpn').textContent = new Intl.DateTimeFormat('en-US', { ...dateOptions, timeZone: 'Asia/Tokyo' }).format(now);
  setAnalogClock('Jpn', jpn.h, jpn.m, jpn.s);

  // Egypt Time (Africa/Cairo)
  const egy = getParts('Africa/Cairo');
  document.getElementById('dateEgy').textContent = new Intl.DateTimeFormat('en-US', { ...dateOptions, timeZone: 'Africa/Cairo' }).format(now);
  setAnalogClock('Egy', egy.h, egy.m, egy.s);
}

function setAnalogClock(idSuffix, h, m, s) {
  const hourDeg = (h % 12) * 30 + (m / 60) * 30;
  const minDeg = m * 6 + (s / 60) * 6;
  const secDeg = s * 6;

  const hourEl = document.getElementById(`hour${idSuffix}`);
  const minEl = document.getElementById(`min${idSuffix}`);
  const secEl = document.getElementById(`sec${idSuffix}`);
  const clockEl = document.getElementById(`clock${idSuffix}`);

  if (hourEl) hourEl.style.transform = `rotate(${hourDeg}deg)`;
  if (minEl) minEl.style.transform = `rotate(${minDeg}deg)`;
  if (secEl) secEl.style.transform = `rotate(${secDeg}deg)`;

  if (clockEl) {
    if (h >= 6 && h < 18) {
      clockEl.classList.remove('night');
    } else {
      clockEl.classList.add('night');
    }
  }
}

function startClocks() {
  updateClocks(); // Initial call
  setInterval(updateClocks, 1000);
}

function renderRamadanDay() {
  const egyNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
  const today = egyNow.setHours(0, 0, 0, 0);
  const start = RAMADAN_START.setHours(0, 0, 0, 0);
  const end = RAMADAN_END.setHours(0, 0, 0, 0);

  const ramadanDayEl = document.getElementById('ramadanDay');
  const ramadanDateEl = document.getElementById('ramadanDate');
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = dtf.formatToParts(new Date());

  const formattedDate = `${parts.find(p => p.type === 'month').value}/${parts.find(p => p.type === 'day').value}`;

  if (today < start) {
    const labelEl = document.querySelector('.ramadan-label');
    if (labelEl) {
      labelEl.dataset.i18n = 'ramadan.label';
      labelEl.textContent = t('ramadan.label');
    }
    ramadanDayEl.textContent = '-';
    ramadanDateEl.textContent = 'Upcoming';
  } else if (today > end) {
    const hijri = getHijriDateInfo(egyNow);
    const lang = currentLang || 'en';
    const mName = HIJRI_MONTH_NAMES[lang]?.[hijri.month - 1] || HIJRI_MONTH_NAMES.en[hijri.month - 1];
    
    const labelEl = document.querySelector('.ramadan-label');
    if (labelEl) {
      labelEl.dataset.i18n = 'hijri.label';
      labelEl.textContent = t('hijri.label');
    }
    
    ramadanDayEl.textContent = hijri.day;
    ramadanDateEl.textContent = mName;
  } else {
    const labelEl = document.querySelector('.ramadan-label');
    if (labelEl) {
      labelEl.dataset.i18n = 'ramadan.label';
      labelEl.textContent = t('ramadan.label');
    }
    const diffTime = Math.abs(today - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    ramadanDayEl.textContent = diffDays;
    ramadanDateEl.textContent = formattedDate;
  }
}

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
  requests: [],   // [ { id, empId, type, date, reason, notes, status, submittedAt, reviewedAt } ]
  currentView: 'dashboard',
  calendarMonth: new Date().getMonth(),
  calendarYear: new Date().getFullYear(),
  editingEmployee: null,
  workMode: 'normal',
  theme: 'light',
  textSize: 'normal', // 'normal', 'large', 'xlarge'
  currentFilter: null, // 'office', 'remote', 'leave', 'finished', 'total'
};

// ---- Google Sheets API config (Phase 2) ----
const API_CONFIG = {
  scriptUrl: 'https://script.google.com/macros/s/AKfycbztwBicL7qoIYi0xQ9qTS7tDz1NPSYk70mB553VbpB9K16C8HsYgWM5ewoF9WPPVVen8Q/exec',
  connected: true,
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

  // Apply saved language & theme
  setLanguage(currentLang);
  document.body.classList.toggle('dark-mode', state.theme === 'dark');
  // Remove the pre-paint dark class (applied synchronously in <head> to avoid flash)
  document.documentElement.classList.remove('dark-pre');
  applyTextSize();

  // Update modes
  const modeSelect = document.getElementById('workModeSelect');
  if (modeSelect) modeSelect.value = state.workMode;
  changeWorkMode(); // ensure shift options reflect current mode

  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) themeSelect.value = state.theme;

  // Start Timezone Clocks
  startClocks();
  
  // Render Sidebar Hijri/Ramadan Card
  renderRamadanDay();
  setInterval(renderRamadanDay, 60000);

  // Initial stats check
  setTimeout(updateGlobalStats, 100);
  setInterval(updateGlobalStats, 60000);

  // Initial request badge update
  setTimeout(updateRequestBadge, 200);
});

// ---- State Management ----
function loadState() {
  try {
    const saved = localStorage.getItem('sprix-ramadan-tracker');
    if (saved) {
      const parsed = JSON.parse(saved);
      state.employees = parsed.employees || [];
      state.attendance = parsed.attendance || {};
      state.requests = parsed.requests || [];
      state.workMode = parsed.workMode || 'normal';
      state.theme = parsed.theme || 'light';
      state.textSize = parsed.textSize || 'normal';

      // Migrate old data
      state.employees.forEach(emp => {
        if (emp.defaultShift === '9-15') emp.defaultShift = 'opt1';
        if (emp.defaultShift === '10-16') emp.defaultShift = 'opt2';
      });

      // Sort alphabetically
      state.employees.sort((a, b) => a.name.localeCompare(b.name));
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

  // Load from cloud if connected
  if (API_CONFIG.connected && API_CONFIG.scriptUrl) {
    loadDataFromCloud();
  }
}

function saveState() {
  try {
    localStorage.setItem('sprix-ramadan-tracker', JSON.stringify({
      employees: state.employees,
      attendance: state.attendance,
      requests: state.requests,
      workMode: state.workMode,
      theme: state.theme,
      textSize: state.textSize,
    }));
  } catch (e) {
    console.error('Failed to save state:', e);
  }

  // Sync to cloud if connected
  if (API_CONFIG.connected && API_CONFIG.scriptUrl) {
    syncDataToCloud();
  }
}

// ---- Cloud Sync (Phase 2) ----
async function loadDataFromCloud() {
  try {
    const response = await fetch(`${API_CONFIG.scriptUrl}?action=load`);
    const data = await response.json();

    if (data.success) {
      if (data.employees && data.employees.length > 0) {
        state.employees = data.employees;
        state.employees.sort((a, b) => a.name.localeCompare(b.name));
      }
      if (data.attendance) state.attendance = Object.assign(state.attendance, data.attendance);

      // Re-save to local silently
      localStorage.setItem('sprix-ramadan-tracker', JSON.stringify({
        employees: state.employees,
        attendance: state.attendance,
        workMode: state.workMode,
        theme: state.theme,
        textSize: state.textSize,
      }));

      // Re-render views with new data
      if (state.currentView === 'dashboard') renderDashboard();
      if (state.currentView === 'calendar') renderCalendar();
      if (state.currentView === 'employees') renderEmployeeTable();
      if (state.currentView === 'analytics') renderAnalytics();
      renderStatusCards();
    }
  } catch (e) {
    console.error('Cloud load failed', e);
  }
}

let syncTimeout = null;
function syncDataToCloud() {
  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    try {
      const payload = {
        action: 'sync',
        employees: state.employees,
        attendance: state.attendance
      };

      const response = await fetch(API_CONFIG.scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!result.success) console.error('Cloud sync failed:', result.error);
    } catch (e) {
      console.error('Cloud sync failed', e);
    }
  }, 1500); // 1.5s debounce to avoid rate limits
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
  if (viewName === 'analytics') renderAnalytics();
  if (viewName === 'requests') renderRequests();

  updateGlobalStats();
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
  if (!dayEl || !dateEl) return;

  if (diffDays >= 0 && diffDays < 30) {
    const d = diffDays + 1;
    // Line 2: Always display just the number, regardless of language
    dayEl.textContent = `${d}`;

    // Line 3: e.g. "7 日目 / 30日", "Day 7 / 30 Days"
    if (currentLang === 'ja') dateEl.textContent = `${d} 日目 / 30日`;
    else if (currentLang === 'en') dateEl.textContent = `Day ${d} / 30 Days`;
    else dateEl.textContent = `يوم ${d} / 30 يوم`;

  } else if (diffDays < 0) {
    dayEl.textContent = Math.abs(diffDays);
    dateEl.textContent = `${Math.abs(diffDays)} ${t('ramadan.daysUntil')}`;
  } else {
    dayEl.textContent = '✓';
    dateEl.textContent = t('ramadan.completed');
  }
}
// ---- Request Submission System ----

function openRequestModal(empId) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;

  document.getElementById('reqEmpId').value = empId;
  document.getElementById('reqEmpName').textContent = emp.name + (emp.department ? ` — ${emp.department}` : '');
  document.getElementById('reqType').value = 'absent';
  document.getElementById('reqDate').value = getCurrentEgyptDateKey();
  document.getElementById('reqReason').value = '';
  document.getElementById('reqNotes').value = '';

  document.getElementById('requestModalOverlay').classList.add('active');
}

function closeRequestModal() {
  document.getElementById('requestModalOverlay').classList.remove('active');
}

function submitRequest() {
  const empId = document.getElementById('reqEmpId').value;
  const type = document.getElementById('reqType').value;
  const date = document.getElementById('reqDate').value;
  const reason = document.getElementById('reqReason').value.trim();
  const notes = document.getElementById('reqNotes').value.trim();

  if (!empId || !date || !reason) {
    showToast(currentLang === 'ja' ? '理由を入力してください' : currentLang === 'ar' ? 'الرجاء إدخال السبب' : 'Please enter a reason', 'error');
    return;
  }

  const request = {
    id: 'req_' + Date.now(),
    empId,
    type,
    date,
    reason,
    notes,
    status: 'pending',
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
  };

  state.requests.unshift(request); // newest first
  saveState();
  closeRequestModal();
  updateRequestBadge();
  render();

  showToast(
    currentLang === 'ja' ? '届出を提出しました' : currentLang === 'ar' ? 'تم تقديم الطلب' : 'Request submitted successfully',
    'success'
  );
}

function reviewRequest(reqId, decision) {
  const req = state.requests.find(r => r.id === reqId);
  if (!req) return;

  req.status = decision; // 'approved' or 'rejected'
  req.reviewedAt = new Date().toISOString();

  // If approved absence, auto-set leave status for that employee on that date
  if (decision === 'approved' && req.type === 'absent') {
    if (!state.attendance[req.date]) state.attendance[req.date] = {};
    state.attendance[req.date][req.empId] = {
      status: 'leave',
      shift: getDefaultShift(state.employees.find(e => e.id === req.empId) || {}),
    };
  }

  saveState();
  updateRequestBadge();
  render();
  if (state.currentView === 'requests') renderRequests();

  const msg = decision === 'approved'
    ? (currentLang === 'ja' ? '承認しました' : currentLang === 'ar' ? 'تمت الموافقة' : 'Approved')
    : (currentLang === 'ja' ? '却下しました' : currentLang === 'ar' ? 'تم الرفض' : 'Rejected');
  showToast(msg, decision === 'approved' ? 'success' : 'error');
}

function deleteRequest(reqId) {
  const req = state.requests.find(r => r.id === reqId);
  
  // Undo leave status if it was an approved absence
  if (req && req.status === 'approved' && req.type === 'absent') {
    if (state.attendance[req.date] && state.attendance[req.date][req.empId] && state.attendance[req.date][req.empId].status === 'leave') {
      // Remove the exact attendance record that was set to leave
      delete state.attendance[req.date][req.empId];
      
      // Clean up the date key if it's now empty
      if (Object.keys(state.attendance[req.date]).length === 0) {
        delete state.attendance[req.date];
      }
    }
  }

  state.requests = state.requests.filter(r => r.id !== reqId);
  saveState();
  updateRequestBadge();
  if (state.currentView === 'requests') renderRequests();
  render();
}

function getEmpPendingRequests(empId) {
  return state.requests.filter(r => r.empId === empId && r.status === 'pending');
}

function updateRequestBadge() {
  const pendingCount = state.requests.filter(r => r.status === 'pending').length;
  const badge = document.getElementById('navReqBadge');
  if (badge) {
    if (pendingCount > 0) {
      badge.textContent = pendingCount;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

function renderRequests() {
  const container = document.getElementById('requestsContainer');
  if (!container) return;

  if (state.requests.length === 0) {
    container.innerHTML = `
      <div class="req-empty-state">
        <div class="empty-icon">📝</div>
        <p>${t('req.empty')}</p>
        <div class="sub">${t('req.emptyDesc')}</div>
      </div>`;
    return;
  }

  // Sort: pending first, then by submittedAt descending
  const sorted = [...state.requests].sort((a, b) => {
    const aP = a.status === 'pending' ? 0 : 1;
    const bP = b.status === 'pending' ? 0 : 1;
    if (aP !== bP) return aP - bP;
    return new Date(b.submittedAt) - new Date(a.submittedAt);
  });

  container.innerHTML = sorted.map(req => {
    const emp = state.employees.find(e => e.id === req.empId);
    const empName = emp ? emp.name : req.empId;
    const empDept = emp ? (emp.department || '') : '';
    const initials = emp ? getInitials(emp.name) : '?';

    const typeLabel = req.type === 'absent' ? t('req.absent')
      : req.type === 'late' ? t('req.late') : t('req.earlyLeave');
    const statusLabel = req.status === 'pending' ? t('req.pending')
      : req.status === 'approved' ? t('req.approved') : t('req.rejected');

    const submittedDate = new Date(req.submittedAt);
    const timeStr = submittedDate.toLocaleDateString(
      currentLang === 'ja' ? 'ja-JP' : currentLang === 'ar' ? 'ar-EG' : 'en-US',
      { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    );

    let actionsHtml = '';
    if (req.status === 'pending') {
      actionsHtml = `
        <button class="req-action-btn approve" onclick="reviewRequest('${req.id}', 'approved')">${t('req.approve')}</button>
        <button class="req-action-btn reject" onclick="reviewRequest('${req.id}', 'rejected')">${t('req.reject')}</button>`;
    } else {
      actionsHtml = `
        <span class="req-status-badge ${req.status}">${statusLabel}</span>
        <button class="req-action-btn delete" onclick="deleteRequest('${req.id}')" style="margin-top: 8px;">${t('req.delete')}</button>
      `;
    }

    return `
      <div class="request-card type-${req.type} status-${req.status}">
        <div class="request-avatar">${initials}</div>
        <div class="request-body">
          <div class="req-name">${escapeHTML(empName)}</div>
          <div class="req-meta">
            <span class="req-type-badge ${req.type}">${typeLabel}</span>
            <span style="font-size:12px;color:var(--gray-400);">📅 ${req.date}</span>
          </div>
          <div class="req-reason">${escapeHTML(req.reason)}</div>
          ${req.notes ? `<div class="req-notes">📎 ${escapeHTML(req.notes)}</div>` : ''}
          <div class="req-time">${t('req.submittedAt')}: ${timeStr}</div>
        </div>
        <div class="request-actions">
          ${actionsHtml}
        </div>
      </div>`;
  }).join('');
}

// ---- Render ----
function render() {
  renderStatusCards();
  renderDashboard();
  updateRequestBadge();
}

function renderStatusCards() {
  const today = getCurrentEgyptDateKey();
  const todayData = state.attendance[today] || {};

  const currentMinutes = typeof getEgyptTimeMinutes === 'function' ? getEgyptTimeMinutes() : 0;

  let officeCount = 0;
  let remoteCount = 0;
  let leaveCount = 0;
  let finishedCount = 0;

  state.employees.forEach(emp => {
    const record = todayData[emp.id];
    const status = record ? record.status : getDefaultStatus(emp);

    let isStarted = true;
    let isFinished = false;

    if (status !== 'leave' && typeof getEgyptTimeMinutes === 'function') {
      const shiftText = getShiftString(record?.shift || getDefaultShift(emp));
      if (typeof shiftText === 'string') {
        const parts = shiftText.split('-');
        const startTimeStr = parts[0]?.trim();
        const endTimeStr = parts[1]?.trim();

        if (endTimeStr) {
          const [hours, mins] = endTimeStr.split(':').map(Number);
          if (!isNaN(hours) && !isNaN(mins) && currentMinutes >= hours * 60 + mins) isFinished = true;
        }

        if (startTimeStr) {
          const [sHours, sMins] = startTimeStr.split(':').map(Number);
          if (!isNaN(sHours) && !isNaN(sMins) && currentMinutes < sHours * 60 + sMins) isStarted = false;
        }
      }
    }

    if (status === 'leave') {
      leaveCount++;
    } else if (isFinished) {
      finishedCount++;
    } else if (!isStarted && (status === 'office' || status === 'remote')) {
      // Not yet started
    } else if (status === 'office') {
      officeCount++;
    } else if (status === 'remote') {
      remoteCount++;
    }
  });

  const gt = document.getElementById('globalTotal');
  if (gt) gt.textContent = state.employees.length;
  const go = document.getElementById('globalOffice');
  if (go) go.textContent = officeCount;
  const gr = document.getElementById('globalRemote');
  if (gr) gr.textContent = remoteCount;
  const gl = document.getElementById('globalLeave');
  if (gl) gl.textContent = leaveCount;
  const gf = document.getElementById('globalFinished');
  if (gf) gf.textContent = finishedCount;
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

// Parse end hour from a shift string like "9:00 - 17:00" → 17
function getShiftEndHour(shiftValue) {
  let shiftStr = '';
  if (shiftValue === 'opt1') {
    shiftStr = state.workMode === 'normal' ? '9:00 - 17:00' : '9:00 - 15:00';
  } else if (shiftValue === 'opt2') {
    shiftStr = state.workMode === 'normal' ? '10:00 - 18:00' : '10:00 - 16:00';
  } else {
    shiftStr = shiftValue || '9:00 - 17:00';
  }
  const match = shiftStr.match(/-\s*(\d{1,2})/);
  return match ? parseInt(match[1]) : 18; // default end at 18
}

// Check if current Egypt time is past the employee's shift end hour
function isAfterShiftEnd(shiftValue) {
  const endHour = getShiftEndHour(shiftValue);
  const egyNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
  return egyNow.getHours() >= endHour;
}

function renderDashboard() {
  const grid = document.getElementById('employeeGrid');

  if (state.employees.length === 0) {
    grid.innerHTML = '';
    grid.appendChild(createEmptyState());
    return;
  }

  const today = getCurrentEgyptDateKey();
  const todayData = state.attendance[today] || {};

  // Apply Filter Logic
  let employeesToRender = state.employees;

  if (state.currentFilter && state.currentFilter !== 'total') {
    const currentMinutes = getEgyptTimeMinutes();

    employeesToRender = state.employees.filter(emp => {
      const record = todayData[emp.id];
      const status = record ? record.status : getDefaultStatus(emp);

      let isFinished = false;
      let isStarted = true;
      if (status !== 'leave') {
        const shiftText = getShiftString(record?.shift || getDefaultShift(emp));
        if (typeof shiftText === 'string') {
          const parts = shiftText.split('-');
          const startTimeStr = parts[0]?.trim();
          const endTimeStr = parts[1]?.trim();
          if (endTimeStr) {
            const [hours, mins] = endTimeStr.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(mins) && currentMinutes >= hours * 60 + mins) isFinished = true;
          }
          if (startTimeStr) {
            const [sHours, sMins] = startTimeStr.split(':').map(Number);
            if (!isNaN(sHours) && !isNaN(sMins) && currentMinutes < sHours * 60 + sMins) isStarted = false;
          }
        }
      }

      if (state.currentFilter === 'finished') return isFinished;
      if (isFinished) return false; // If filtering by anything other than finished, hide finished people
      if (!isStarted && (status === 'office' || status === 'remote')) return false;
      return status === state.currentFilter;
    });
  }

  // Update Filter Badge UI
  const filterBadge = document.getElementById('filterActiveBadge');
  const filterTextName = document.getElementById('filterTextName');

  if (state.currentFilter && state.currentFilter !== 'total') {
    filterBadge.style.display = 'flex';
    if (state.currentFilter === 'office') filterTextName.textContent = t('status.inOffice');
    else if (state.currentFilter === 'remote') filterTextName.textContent = t('status.remote');
    else if (state.currentFilter === 'leave') filterTextName.textContent = t('status.leave');
    else if (state.currentFilter === 'finished') filterTextName.textContent = t('analytics.finished');
  } else {
    filterBadge.style.display = 'none';
  }

  if (employeesToRender.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">
      <div class="empty-icon">🔍</div>
      <p>No employees match the current filter.</p>
    </div>`;
    return;
  }

  grid.innerHTML = employeesToRender.map(emp => {
    const record = todayData[emp.id];
    const status = record ? record.status : getDefaultStatus(emp);
    const shift = record ? record.shift : getDefaultShift(emp);
    const initials = getInitials(emp.name);

    // After shift hours, show "Home" (inactive) instead of Office/Remote
    const afterHours = (status === 'office' || status === 'remote') && isAfterShiftEnd(shift);
    const displayStatus = afterHours ? 'home' : status;

    const shiftText = shift === 'opt1'
      ? t(state.workMode === 'normal' ? 'shift.normal1' : 'shift.ramadan1')
      : shift === 'opt2'
        ? t(state.workMode === 'normal' ? 'shift.normal2' : 'shift.ramadan2')
        : escapeHTML(shift);
    const isLeave = status === 'leave' || displayStatus === 'home';

    let shiftButtonsHtml = ``;

    if (!isLeave) {
      shiftButtonsHtml = `
          <button class="shift-btn ${shift === 'opt1' ? 'active' : ''}"
                  onclick="setShift('${emp.id}', 'opt1')">${t(state.workMode === 'normal' ? 'shift.normal1' : 'shift.ramadan1')}</button>
          <button class="shift-btn ${shift === 'opt2' ? 'active' : ''}"
                  onclick="setShift('${emp.id}', 'opt2')">${t(state.workMode === 'normal' ? 'shift.normal2' : 'shift.ramadan2')}</button>
    `;
      if (emp.defaultShift !== 'opt1' && emp.defaultShift !== 'opt2') {
        shiftButtonsHtml += `
          <button class="shift-btn ${shift === emp.defaultShift ? 'active' : ''}"
                  onclick="setShift('${emp.id}', '${escapeHTML(emp.defaultShift)}')">${escapeHTML(emp.defaultShift)}</button>
       `;
      }
    }
    const pendingRequests = getEmpPendingRequests(emp.id);
    let pendingIndicatorHtml = '';
    if (pendingRequests.length > 0) {
      pendingIndicatorHtml = pendingRequests.map(r => `
        <span class="card-req-indicator">📝 ${r.type === 'absent' ? t('req.absent') : r.type === 'late' ? t('req.late') : t('req.earlyLeave')}</span>
      `).join('');
    }

    return `
      <div class="employee-card ${displayStatus}" data-emp-id="${emp.id}">
        <div class="employee-card-header">
          <div class="employee-info">
            <div class="employee-avatar">${initials}</div>
            <div>
              <div class="employee-name">${escapeHTML(emp.name)}</div>
              <div class="employee-dept">${escapeHTML(emp.department || '')}</div>
            </div>
          </div>
          <span class="status-badge ${displayStatus}">
            ${t('badge.' + displayStatus)}
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
          ${pendingIndicatorHtml}
        </div>

        <button class="card-request-btn" onclick="openRequestModal('${emp.id}')">📝 <span data-i18n="req.btnLabel">${t('req.btnLabel')}</span></button>

        <div class="status-selector">
          <button class="status-btn office-btn ${status === 'office' ? 'active' : ''}"
                  onclick="setStatus('${emp.id}', 'office')">🏢 <span data-i18n="btn.office">${t('btn.office')}</span></button>
          <button class="status-btn remote-btn ${status === 'remote' ? 'active' : ''}"
                  onclick="setStatus('${emp.id}', 'remote')">🏠 <span data-i18n="btn.remote">${t('btn.remote')}</span></button>
          <button class="status-btn leave-btn ${status === 'leave' ? 'active' : ''}"
                  onclick="setStatus('${emp.id}', 'leave')">🌙 <span data-i18n="btn.leave">${t('btn.leave')}</span></button>
          ${(displayStatus === 'home' || status === 'overtime') ? `
          <button class="status-btn overtime-btn ${status === 'overtime' ? 'active' : ''}"
                  onclick="setStatus('${emp.id}', 'overtime')">🔥 <span data-i18n="btn.overtime">${t('btn.overtime')}</span></button>
          ` : ''}
        </div>

        <div class="shift-selector">
${shiftButtonsHtml}
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
  const today = getCurrentEgyptDateKey();
  const emp = state.employees.find(e => e.id === empId);

  if (!state.attendance[today]) state.attendance[today] = {};

  state.attendance[today][empId] = {
    status: status,
    shift: state.attendance[today][empId]?.shift || getDefaultShift(emp)
  };

  saveState();
  updateGlobalStats();
  render();
  syncToSheets();
}

// Support function for getting raw shift string text
function getShiftString(shiftValue) {
  if (shiftValue === 'opt1') return t(state.workMode === 'normal' ? 'shift.normal1' : 'shift.ramadan1');
  if (shiftValue === 'opt2') return t(state.workMode === 'normal' ? 'shift.normal2' : 'shift.ramadan2');
  return shiftValue;
}

function setShift(empId, shift) {
  const today = getCurrentEgyptDateKey();
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

// ---- Filtering ----
function filterByStatus(status) {
  state.currentFilter = status === 'total' ? null : status;
  if (state.currentView !== 'dashboard') {
    switchView('dashboard');
  } else {
    renderDashboard();
  }
}

function clearFilter() {
  state.currentFilter = null;
  renderDashboard();
}

// ---- Global Stats Logic ----
function updateGlobalStats() {
  if (state.employees.length === 0) return;

  const today = getCurrentEgyptDateKey();
  const todayData = state.attendance[today] || {};

  let total = state.employees.length;
  let office = 0;
  let remote = 0;
  let leave = 0;
  let finished = 0;

  const currentMinutes = getEgyptTimeMinutes();

  state.employees.forEach(emp => {
    const record = todayData[emp.id];
    let status = record ? record.status : getDefaultStatus(emp);

    // Auto Finished/Started check
    let isFinished = false;
    let isStarted = true;
    if (status !== 'leave') {
      const shiftText = getShiftString(record?.shift || getDefaultShift(emp));
      if (typeof shiftText === 'string') {
        const parts = shiftText.split('-');
        const startTimeStr = parts[0]?.trim();
        const endTimeStr = parts[1]?.trim();
        if (endTimeStr) {
          const [hours, mins] = endTimeStr.split(':').map(Number);
          if (!isNaN(hours) && !isNaN(mins) && currentMinutes >= hours * 60 + mins) isFinished = true;
        }
        if (startTimeStr) {
          const [sHours, sMins] = startTimeStr.split(':').map(Number);
          if (!isNaN(sHours) && !isNaN(sMins) && currentMinutes < sHours * 60 + sMins) isStarted = false;
        }
      }
    }

    if (status === 'leave') {
      leave++;
    } else if (isFinished) {
      finished++;
    } else if (!isStarted && (status === 'office' || status === 'remote')) {
      // Do not count as office/remote until shift starts
    } else if (status === 'office') {
      office++;
    } else if (status === 'remote') {
      remote++;
    }
  });

  const gt = document.getElementById('globalTotal');
  if (gt) gt.textContent = total;
  const go = document.getElementById('globalOffice');
  if (go) go.textContent = office;
  const gr = document.getElementById('globalRemote');
  if (gr) gr.textContent = remote;
  const gl = document.getElementById('globalLeave');
  if (gl) gl.textContent = leave;
  const gf = document.getElementById('globalFinished');
  if (gf) gf.textContent = finished;

  if (state.currentView === 'analytics' && typeof renderAnalytics === 'function') {
    // Only update analytics if it's not the initial boot rendering to save performance
    renderAnalytics(office, remote, leave, finished, total);
  }
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

  const shiftSelect = document.getElementById('empShift');
  if (shiftSelect) {
    shiftSelect.addEventListener('change', (e) => {
      const customGroup = document.getElementById('customShiftGroup');
      if (customGroup) {
        customGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
        if (e.target.value === 'custom') document.getElementById('empCustomShift').focus();
      }
    });
  }
}

function openModal(employee = null) {
  state.editingEmployee = employee;
  const title = document.getElementById('modalTitle');
  const nameInput = document.getElementById('empName');
  const deptInput = document.getElementById('empDept');
  const shiftSelect = document.getElementById('empShift');
  const remoteDaySelect = document.getElementById('empRemoteDay');

  const customShiftGroup = document.getElementById('customShiftGroup');
  const customShiftInput = document.getElementById('empCustomShift');

  if (employee) {
    title.textContent = t('modal.editTitle');
    nameInput.value = employee.name;
    deptInput.value = employee.department || '';
    remoteDaySelect.value = employee.remoteDay !== undefined ? employee.remoteDay : '';

    if (employee.defaultShift === 'opt1' || employee.defaultShift === 'opt2') {
      shiftSelect.value = employee.defaultShift;
      customShiftGroup.style.display = 'none';
      customShiftInput.value = '';
    } else {
      shiftSelect.value = 'custom';
      customShiftGroup.style.display = 'block';
      customShiftInput.value = employee.defaultShift;
    }
  } else {
    title.textContent = t('modal.addTitle');
    nameInput.value = '';
    deptInput.value = '';
    shiftSelect.value = 'opt1';
    customShiftGroup.style.display = 'none';
    customShiftInput.value = '';
    remoteDaySelect.value = '';
  }

  document.getElementById('modalOverlay').classList.add('active');
  setTimeout(() => nameInput.focus(), 200);
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  // Trigger the closing animation
  overlay.classList.add('closing');
  // After the animation completes, fully hide the modal
  setTimeout(() => {
    overlay.classList.remove('active', 'closing');
    state.editingEmployee = null;
  }, 350);
}

function saveEmployee() {
  const name = document.getElementById('empName').value.trim();
  const department = document.getElementById('empDept').value.trim();
  const remoteDay = document.getElementById('empRemoteDay').value;
  let defaultShift = document.getElementById('empShift').value;

  if (defaultShift === 'custom') {
    defaultShift = document.getElementById('empCustomShift').value.trim();
    if (!defaultShift) defaultShift = '09:00 - 18:00'; // fallback if left empty
  }

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

  // Sort employees alphabetically by name
  state.employees.sort((a, b) => a.name.localeCompare(b.name));

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

// ---- Analytics ----
let attendanceChartInstance = null;

// ---- Analytics View ----
function renderAnalytics(officeVal, remoteVal, leaveVal, finishedVal, totalVal) {
  const container = document.getElementById('analyticsSummary');
  const canvas = document.getElementById('attendanceChart');
  if (!container || !canvas) return;

  if (state.employees.length === 0) {
    container.innerHTML = `<p style="text-align:center; color: var(--gray-400);">${t('analytics.empty')}</p>`;
    if (attendanceChartInstance) attendanceChartInstance.destroy();
    return;
  }

  let officeCount = officeVal;
  let remoteCount = remoteVal;
  let leaveCount = leaveVal;
  let finishedCount = finishedVal;
  let total = totalVal;

  if (officeVal === undefined) {
    // Fallback if called directly without arguments
    const today = getCurrentEgyptDateKey();
    const todayData = state.attendance[today] || {};
    officeCount = 0; remoteCount = 0; leaveCount = 0; finishedCount = 0;

    const currentMinutes = getEgyptTimeMinutes();

    state.employees.forEach(emp => {
      const record = todayData[emp.id];
      const status = record ? record.status : getDefaultStatus(emp);

      let isFinished = false;
      let isStarted = true;
      if (status !== 'leave') {
        const shiftText = getShiftString(record?.shift || emp.defaultShift);
        const parts = shiftText.split('-');
        const startTimeStr = parts[0]?.trim();
        const endTimeStr = parts[1]?.trim();
        if (endTimeStr) {
          const [hours, mins] = endTimeStr.split(':').map(Number);
          if (currentMinutes >= hours * 60 + mins) isFinished = true;
        }
        if (startTimeStr) {
          const [sHours, sMins] = startTimeStr.split(':').map(Number);
          if (currentMinutes < sHours * 60 + sMins) isStarted = false;
        }
      }

      if (status === 'leave') leaveCount++;
      else if (isFinished) finishedCount++;
      else if (!isStarted && (status === 'office' || status === 'remote')) { /* skip */ }
      else if (status === 'office') officeCount++;
      else if (status === 'remote') remoteCount++;
    });
    total = state.employees.length;
  }

  container.innerHTML = `
    <div class="analytics-stat">
      <div class="stat-label">👥 ${t('dashboard.todayTitle')}</div>
      <div class="stat-value">${total}</div>
    </div>
    <div class="analytics-stat" style="color: var(--success);">
      <div class="stat-label">🏢 ${t('analytics.office')}</div>
      <div class="stat-value">${officeCount}</div>
      <div class="stat-percent">${Math.round((officeCount / total) * 100) || 0}%</div>
    </div>
    <div class="analytics-stat" style="color: var(--warning);">
      <div class="stat-label">🏠 ${t('analytics.remote')}</div>
      <div class="stat-value">${remoteCount}</div>
      <div class="stat-percent">${Math.round((remoteCount / total) * 100) || 0}%</div>
    </div>
    <div class="analytics-stat" style="color: var(--gray-400);">
      <div class="stat-label">🌙 ${t('analytics.leave')}</div>
      <div class="stat-value">${leaveCount}</div>
       <div class="stat-percent">${Math.round((leaveCount / total) * 100) || 0}%</div>
    </div>
    <div class="analytics-stat" style="color: var(--gray-600);">
      <div class="stat-label">🏁 ${t('analytics.finished')}</div>
      <div class="stat-value">${finishedCount}</div>
       <div class="stat-percent">${Math.round((finishedCount / total) * 100) || 0}%</div>
    </div>
  `;

  // Render Chart
  const ctx = canvas.getContext('2d');
  if (attendanceChartInstance) {
    attendanceChartInstance.destroy();
  }

  const isDark = state.theme === 'dark';
  const textColor = isDark ? '#e2e8f0' : '#475569';

  attendanceChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [t('analytics.office'), t('analytics.remote'), t('analytics.leave'), t('analytics.finished')],
      datasets: [{
        data: [officeCount, remoteCount, leaveCount, finishedCount],
        backgroundColor: ['#10b981', '#f59e0b', '#cbd5e1', '#64748b'],
        borderWidth: isDark ? 2 : 0,
        borderColor: isDark ? '#1e293b' : '#ffffff',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textColor }
        }
      }
    }
  });
}

// ---- Export / Import ----
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

  downloadFile(csv, `sprix-ramadan-attendance-${getCurrentEgyptDateKey()}.csv`, 'text/csv');
  showToast(t('toast.csvDone'), 'success');
}

function exportJSON() {
  const data = JSON.stringify({
    employees: state.employees,
    attendance: state.attendance,
    exportDate: new Date().toISOString(),
  }, null, 2);

  downloadFile(data, `sprix-ramadan-backup-${getCurrentEgyptDateKey()}.json`, 'application/json');
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
        <option value="custom" data-i18n="shift.custom">${t('shift.custom')}</option>
      `;
    } else {
      shiftSelect.innerHTML = `
        <option value="opt1" data-i18n="shift.ramadan1">${t('shift.ramadan1')}</option>
        <option value="opt2" data-i18n="shift.ramadan2">${t('shift.ramadan2')}</option>
        <option value="custom" data-i18n="shift.custom">${t('shift.custom')}</option>
      `;
    }
  }

  // Re-render views if they are open
  if (state.currentView === 'dashboard') renderDashboard();
  if (state.currentView === 'employees') renderEmployeeTable();
}

function changeTheme() {
  const themeSelect = document.getElementById('themeSelect');
  if (!themeSelect) return;

  state.theme = themeSelect.value;
  saveState();
  document.body.classList.toggle('dark-mode', state.theme === 'dark');

  // Re-render charts to fit the theme if analytics view is open
  if (state.currentView === 'analytics') renderAnalytics();
}

function toggleTextSize() {
  const sizes = ['normal', 'large', 'xlarge'];
  let idx = sizes.indexOf(state.textSize);
  if (idx === -1) idx = 0;
  idx = (idx + 1) % sizes.length;
  state.textSize = sizes[idx];

  saveState();
  applyTextSize();
}

function applyTextSize() {
  document.body.classList.remove('text-large', 'text-xlarge');
  if (state.textSize === 'large') {
    document.body.classList.add('text-large');
  } else if (state.textSize === 'xlarge') {
    document.body.classList.add('text-xlarge');
  }
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

// ═══════════════════════════════════════════
//  HIJRI (ISLAMIC) CALENDAR MODULE
// ═══════════════════════════════════════════

let hijriMonthOffset = 0; // 0 = current month

const HIJRI_MONTH_NAMES = {
  en: ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', 'Sha\'ban', 'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'],
  ja: ['ムハッラム', 'サファル', 'ラビーウル・アウワル', 'ラビーウッ・サーニー', 'ジュマーダル・ウーラー', 'ジュマーダッ・サーニー', 'ラジャブ', 'シャアバーン', 'ラマダーン', 'シャウワール', 'ズルカアダ', 'ズルヒッジャ'],
  ar: ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة']
};

const HIJRI_WEEKDAY_NAMES = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  ar: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
};

const HIJRI_DAY_OFFSET = -1; // -1 day offset to align Umm al-Qura astronomical calculation with local moon sighting

function getHijriDateInfo(date) {
  // Apply the manual offset (e.g., -1 day)
  const adjustedDate = new Date(date.getTime() + (HIJRI_DAY_OFFSET * 24 * 60 * 60 * 1000));

  // Get Hijri date parts using Intl API
  const dtf = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
    day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Africa/Cairo'
  });
  const parts = dtf.formatToParts(adjustedDate);
  return {
    day: parseInt(parts.find(p => p.type === 'day').value),
    month: parseInt(parts.find(p => p.type === 'month').value),
    year: parseInt(parts.find(p => p.type === 'year').value)
  };
}

function getGregorianFromHijri(hYear, hMonth, hDay) {
  // Brute-force search: iterate Gregorian dates to find matching Hijri date
  // Start from a reasonable base and search forward
  const baseDate = new Date(2024, 6, 1); // Rough start for Hijri ~1446
  for (let i = 0; i < 1200; i++) {
    const d = new Date(baseDate.getTime() + i * 86400000);
    const hi = getHijriDateInfo(d);
    if (hi.year === hYear && hi.month === hMonth && hi.day === hDay) {
      return d;
    }
  }
  return null;
}

function renderHijriCalendar() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
  const todayHijri = getHijriDateInfo(now);

  // Calculate target month/year with offset
  let targetMonth = todayHijri.month + hijriMonthOffset;
  let targetYear = todayHijri.year;
  while (targetMonth > 12) { targetMonth -= 12; targetYear++; }
  while (targetMonth < 1) { targetMonth += 12; targetYear--; }

  const lang = currentLang || 'en';

  // Render month title
  const monthName = HIJRI_MONTH_NAMES[lang]?.[targetMonth - 1] || HIJRI_MONTH_NAMES.en[targetMonth - 1];
  const yearStr = targetYear.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', { useGrouping: false });
  document.getElementById('hijriMonthTitle').textContent = `${monthName} ${yearStr}`;

  // Render weekday headers
  const weekdays = HIJRI_WEEKDAY_NAMES[lang] || HIJRI_WEEKDAY_NAMES.en;
  document.getElementById('hijriWeekdays').innerHTML = weekdays
    .map(d => `<div class="hijri-weekday">${d}</div>`).join('');

  // Find the first day of this Hijri month in Gregorian
  const firstDayGreg = getGregorianFromHijri(targetYear, targetMonth, 1);
  if (!firstDayGreg) {
    document.getElementById('hijriDaysGrid').innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--gray-400);padding:20px;">Calendar data unavailable</div>';
    return;
  }

  // Determine how many days in this month (scan forward until month changes)
  let daysInMonth = 29;
  for (let d = 29; d <= 30; d++) {
    const testDate = new Date(firstDayGreg.getTime() + (d) * 86400000);
    const hi = getHijriDateInfo(testDate);
    if (hi.month === targetMonth && hi.year === targetYear) {
      daysInMonth = d + 1;
    } else {
      break;
    }
  }

  // Get the day of week the first falls on (0=Sun)
  const firstDow = firstDayGreg.getDay();

  // Build grid
  let html = '';
  // Empty cells before first day
  for (let i = 0; i < firstDow; i++) {
    html += '<div class="hijri-day empty"></div>';
  }

  const isRamadan = (targetMonth === 9);

  for (let d = 1; d <= daysInMonth; d++) {
    const gregDate = new Date(firstDayGreg.getTime() + (d - 1) * 86400000);
    const dow = gregDate.getDay();
    const isToday = (todayHijri.day === d && todayHijri.month === targetMonth && todayHijri.year === targetYear);
    const isFriday = (dow === 5);

    let cls = 'hijri-day';
    if (isToday) cls += ' today';
    else if (isRamadan) cls += ' ramadan-day';
    else if (isFriday) cls += ' friday';

    html += `<div class="${cls}">${d}</div>`;
  }

  document.getElementById('hijriDaysGrid').innerHTML = html;

  // Footer: show Gregorian date range
  const lastDayGreg = new Date(firstDayGreg.getTime() + (daysInMonth - 1) * 86400000);
  const fmtOpts = { month: 'short', day: 'numeric', year: 'numeric' };
  const footerText = `${firstDayGreg.toLocaleDateString('en-US', fmtOpts)} — ${lastDayGreg.toLocaleDateString('en-US', fmtOpts)}`;
  document.getElementById('hijriFooter').textContent = footerText;
}

function openHijriCalendar() {
  hijriMonthOffset = 0;
  renderHijriCalendar();
  const overlay = document.getElementById('hijriCalendarOverlay');
  overlay.classList.add('active');
}

function closeHijriCalendar() {
  const overlay = document.getElementById('hijriCalendarOverlay');
  overlay.classList.add('closing');
  setTimeout(() => {
    overlay.classList.remove('active', 'closing');
  }, 350);
}

function navigateHijriMonth(dir) {
  hijriMonthOffset += dir;
  renderHijriCalendar();
}

// Close on backdrop click
document.addEventListener('DOMContentLoaded', () => {
  const hijriOverlay = document.getElementById('hijriCalendarOverlay');
  if (hijriOverlay) {
    hijriOverlay.addEventListener('click', (e) => {
      if (e.target === hijriOverlay) closeHijriCalendar();
    });
  }
});

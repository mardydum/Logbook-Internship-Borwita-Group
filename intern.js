/* ============================================
   INTERN.JS — Intern Pages
   ============================================ */

/* ---------- ATTENDANCE PAGE ---------- */
async function renderAttendancePage() {
  const user = getCurrentUser();
  if (!user) { document.getElementById('content-area').innerHTML = '<p>Please login first.</p>'; return; }

  // Use user session data directly — no fragile cache lookup needed
  const internId = String(user.id || user.ID);

  const content = document.getElementById('content-area');
  content.innerHTML = '<div class="loader-content" style="margin-top: 40px"><div class="spinner"></div><p>Loading attendance data...</p></div>';

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const todayISO = formatDateISO(now);

  // Normalize helpers — GAS may return Date objects or strings
  const normalizeDate = (d) => {
    if (!d) return '';
    if (d instanceof Date) return formatDateISO(d);
    const s = String(d);
    if (s.includes('T')) return s.substring(0, 10);
    return s;
  };
  const normalizeTime = (t) => {
    if (!t) return '';
    if (t instanceof Date) return String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0');
    if (typeof t === 'string' && t.includes('T')) {
      const d = new Date(t);
      return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    }
    return String(t);
  };

  let attendanceList = [];
  let logbookList = [];
  let fetchError = '';
  try {
    const data = await apiCall('getInternMonthlyData', { internId, year, month });
    attendanceList = Array.isArray(data.attendance) ? data.attendance : [];
    logbookList = Array.isArray(data.logbook) ? data.logbook : [];
  } catch (e) {
    console.error('Attendance fetch error:', e);
    fetchError = e.message || 'Unknown error';
    // DON'T return — still render the page so Clock In button works
  }

  const rec = attendanceList.find(a => normalizeDate(a.Date) === todayISO);
  const logEntry = logbookList.find(l => normalizeDate(l.Date) === todayISO);
  const existingLogbook = logEntry ? logEntry.Activity : '';

  content.innerHTML = `
    ${fetchError ? `<div class="alert alert-warning" style="margin-bottom:12px;padding:8px 12px;background:#fff3cd;border-radius:8px;font-size:13px;">⚠️ Could not load history: ${fetchError}. You can still clock in.</div>` : ''}

    <!-- Live Clock -->
    <div class="current-time-display">
      <div class="time" id="live-clock">${formatTime(new Date())}</div>
      <div class="date">${formatDisplayDate(new Date())}</div>
    </div>

    <!-- Clock In / Clock Out -->
    <div class="clock-container">
      <div class="clock-card">
        <div class="clock-label">Clock In</div>
        <div class="clock-time">${rec ? normalizeTime(rec.ClockIn) || '--:--' : '--:--'}</div>
        ${!rec
          ? `<button class="btn btn-primary btn-full" onclick="handleClockIn('${internId}')">
              ${ICONS.clock} Clock In
            </button>`
          : `<div class="clock-status done">Recorded</div>`
        }
      </div>
      <div class="clock-card">
        <div class="clock-label">Clock Out</div>
        <div class="clock-time">${rec?.ClockOut ? normalizeTime(rec.ClockOut) : '--:--'}</div>
        ${rec && !rec.ClockOut
          ? `<button class="btn btn-danger btn-full" onclick="handleClockOut('${internId}', '${normalizeTime(rec.ClockIn)}')">
              ${ICONS.clock} Clock Out
            </button>`
          : rec?.ClockOut
            ? `<div class="clock-status done">Recorded — ${
                rec.Type === 'fullday' ? 'Full Day' :
                rec.Type === 'halfday' ? 'Half Day' :
                'Absent / Leave'
              }</div>`
            : `<div class="clock-status pending">Clock in first</div>`
        }
      </div>
    </div>

    <!-- Daily Logbook -->
    <div class="card">
      <div class="card-header">
        <h3>${ICONS.fileText} Daily Logbook</h3>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label>What did you work on today?</label>
          <textarea class="form-control" id="logbook-text" rows="4" placeholder="Describe your activities today...">${existingLogbook}</textarea>
        </div>
        <button class="btn btn-primary" onclick="handleSubmitLogbook('${internId}')">
          ${ICONS.check} Submit Logbook
        </button>
      </div>
    </div>
  `;

  // Live clock
  if (clockInterval) clearInterval(clockInterval);
  clockInterval = setInterval(() => {
    const el = document.getElementById('live-clock');
    if (el) el.textContent = formatTime(new Date());
  }, 1000);
}

function formatTimeStr(val) {
  if(!val) return '';
  if(val.includes('T')) {
    const d = new Date(val);
    return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  return val;
}

window.handleClockIn = async function(internId) {
  showLoader('Recording Clock In...');
  try {
    const result = await apiCall('clockIn', { internId });
    if (result && result.success) {
      const timeStr = formatTimeStr(result.clockIn) || new Date().toTimeString().substring(0,5);
      showToast('Clock In berhasil jam ' + timeStr, 'success');
      
      // IMMEDIATELY update the clock-in display in the DOM — don't wait for re-render
      const clockTimeEls = document.querySelectorAll('.clock-card .clock-time');
      if (clockTimeEls.length > 0) clockTimeEls[0].textContent = timeStr;
      
      // Replace Clock In button with "Recorded" status
      const clockCards = document.querySelectorAll('.clock-card');
      if (clockCards.length > 0) {
        const btn = clockCards[0].querySelector('button');
        if (btn) btn.outerHTML = '<div class="clock-status done">Recorded</div>';
      }
      // Show Clock Out button
      if (clockCards.length > 1) {
        const pending = clockCards[1].querySelector('.clock-status.pending');
        if (pending) {
          pending.outerHTML = `<button class="btn btn-danger btn-full" onclick="handleClockOut('${internId}', '${timeStr}')">
            ${ICONS.clock} Clock Out
          </button>`;
        }
      }

      // Also try to re-render fully in background (non-critical)
      try { await renderAttendancePage(); } catch(_) {}
    } else {
      showToast(result?.error || 'Already clocked in today', 'danger');
    }
  } catch (e) {
    showToast('Failed: ' + e.message, 'danger');
  } finally {
    hideLoader();
  }
};

window.handleClockOut = async function(internId, clockInTimeStr) {
  const now = new Date();
  
  // Format the clockIn to JS Date object equivalent today
  let cinHours = 0, cinMins = 0;
  if(clockInTimeStr.includes('T')) {
    const d = new Date(clockInTimeStr);
    cinHours = d.getHours();
    cinMins = d.getMinutes();
  } else {
    const parts = clockInTimeStr.split(':');
    cinHours = Number(parts[0]);
    cinMins = Number(parts[1]);
  }
  
  const hoursWorked = (now.getHours() + now.getMinutes()/60) - (cinHours + cinMins/60);

  let forceType = null;
  if (hoursWorked < 3.5) {
    // Less than 3.5 hours — warning: will be marked absent
    const proceed = confirm(
      `Anda baru bekerja ${Math.floor(hoursWorked)} jam ${Math.round((hoursWorked % 1) * 60)} menit.\n\n` +
      `Syarat Half Day: minimal 3.5 jam kerja (4 jam - toleransi 30 menit)\n` +
      `Syarat Full Day: minimal 7.5 jam kerja (8 jam - toleransi 30 menit)\n\n` +
      `Jika tetap Clock Out sekarang, status Anda akan menjadi Absent/Leave.\n\n` +
      `Apakah Anda tetap ingin Clock Out?`
    );
    if (!proceed) return;
    forceType = 'absent';
  }

  showLoader('Recording Clock Out...');
  try {
    const result = await apiCall('clockOut', { internId, forceType });
    if (result && result.success) {
      const label = result.type === 'fullday' ? 'Full Day' : result.type === 'halfday' ? 'Half Day' : 'Absent/Leave';
      showToast(`Clock Out recorded at ${formatTimeStr(result.clockOut)} — ${label}`, 'success');
      await renderAttendancePage();
    } else {
      showToast(result.error || 'Failed to clock out', 'danger');
    }
  } catch (e) {
    showToast('Error clocking out: ' + e.message, 'danger');
  } finally {
    hideLoader();
  }
};

window.handleSubmitLogbook = async function(internId) {
  const text = document.getElementById('logbook-text').value.trim();
  if (!text) { showToast('Please enter your activity', 'danger'); return; }
  
  showLoader('Submitting Logbook...');
  try {
    const result = await addLogbookEntry(internId, text);
    if (result && result.success) {
      showToast('Logbook submitted successfully', 'success');
    } else {
      showToast(result.error || 'Failed to submit logbook', 'danger');
    }
  } catch (e) {
    showToast('Error submitting logbook', 'danger');
  } finally {
    hideLoader();
  }
};

function formatTime(d) {
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0');
}

/* ---------- INTERN DASHBOARD ---------- */
/* ---------- INTERN DASHBOARD ---------- */
async function renderInternDashboard() {
  const user = getCurrentUser();
  const intern = window._usersCache?.find(u => (u.id || u.ID) === (user.id || user.ID));
  if (!intern) return;

  const content = document.getElementById('content-area');
  content.innerHTML = '<div class="loader-content" style="margin-top: 40px"><div class="spinner"></div><p>Loading dashboard...</p></div>';

  const now = new Date();
  let month = window._selectedMonth || now.getMonth() + 1;
  let year = window._selectedYear || now.getFullYear();

  let attendanceList = [];
  let logbookList = [];
  try {
    const data = await apiCall('getInternMonthlyData', { internId: intern.id, year, month });
    attendanceList = Array.isArray(data.attendance) ? data.attendance : [];
    logbookList = Array.isArray(data.logbook) ? data.logbook : [];
    window._currentLogbookList = logbookList; // Store for edit
  } catch (e) {
    content.innerHTML = '<div class="empty-state"><p>Error loading dashboard data</p></div>';
    return;
  }

  const summary = { fullday: 0, halfday: 0, absent: 0 };
  attendanceList.forEach(a => {
    let eff = a.Type;
    if (eff === 'pending') {
      const recordDate = new Date(a.Date);
      if (recordDate.toDateString() !== now.toDateString() || now.getHours() >= 17) {
        eff = 'fullday';
      }
    }
    if (eff === 'fullday') summary.fullday++;
    if (eff === 'halfday') summary.halfday++;
    if (eff === 'absent') summary.absent++;
  });

  const logEntries = logbookList.sort((a,b) => b.Date.localeCompare(a.Date));

  content.innerHTML = `
    <div class="flex-between mb-24">
      <h3 class="section-title" style="margin-bottom:0">Attendance Summary</h3>
      ${monthSelector(month, year, 'refreshInternDashboard()')}
    </div>

    <div class="scorecard-grid">
      <div class="scorecard">
        <div class="scorecard-icon green">${ICONS.sun}</div>
        <div><div class="scorecard-value">${summary.fullday}</div><div class="scorecard-label">Full Day</div></div>
      </div>
      <div class="scorecard">
        <div class="scorecard-icon yellow">${ICONS.moon}</div>
        <div><div class="scorecard-value">${summary.halfday}</div><div class="scorecard-label">Half Day</div></div>
      </div>
      <div class="scorecard">
        <div class="scorecard-icon red">${ICONS.x}</div>
        <div><div class="scorecard-value">${summary.absent}</div><div class="scorecard-label">Absent / Leave</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Logbook Entries</h3>
        <span class="text-sm text-secondary">${logEntries.length} entries</span>
      </div>
      <div class="card-body" style="padding:0">
        ${logEntries.length === 0
          ? `<div class="empty-state">${ICONS.inbox}<p>No logbook entries for this month</p></div>`
          : `<div class="table-wrapper"><table>
              <thead><tr><th>Date</th><th>Activity</th><th>Action</th></tr></thead>
              <tbody>
                ${logEntries.map(e => `
                  <tr>
                    <td style="white-space:nowrap">${formatShortDate(e.Date)}</td>
                    <td>${escapeHtml(e.Activity)}</td>
                    <td>
                      <button class="btn btn-outline btn-sm btn-icon" onclick="editLogbookEntry('${e.ID}')">
                        ${ICONS.edit}
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table></div>`
        }
      </div>
    </div>
  `;
}

window.refreshInternDashboard = () => {
  window._selectedMonth = getSelectedMonth();
  window._selectedYear = getSelectedYear();
  renderInternDashboard();
};

window.editLogbookEntry = function(entryId) {
  const entries = window._currentLogbookList || [];
  const entry = entries.find(e => e.ID === entryId);
  if (!entry) return;

  showModal('Edit Logbook Entry', `
    <div class="form-group">
      <label>Date</label>
      <input type="date" class="form-control" id="edit-logbook-date" value="${entry.Date.substring(0, 10)}">
    </div>
    <div class="form-group">
      <label>Activity</label>
      <textarea class="form-control" id="edit-logbook-activity" rows="4">${escapeHtml(entry.Activity)}</textarea>
    </div>
  `, `
    <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveLogbookEdit('${entryId}')">Save Changes</button>
  `);
};

window.saveLogbookEdit = async function(entryId) {
  const date = document.getElementById('edit-logbook-date').value;
  const activity = document.getElementById('edit-logbook-activity').value.trim();
  if (!activity) { showToast('Activity cannot be empty', 'danger'); return; }
  
  showLoader('Saving logbook...');
  try {
    const result = await updateLogbookEntry(entryId, date, activity);
    if (result && result.success) {
      closeModal();
      showToast('Logbook entry updated', 'success');
      renderInternDashboard();
    } else {
      showToast(result.error || 'Failed to update logbook', 'danger');
    }
  } catch (e) {
    showToast('Error updating logbook', 'danger');
  } finally {
    hideLoader();
  }
};

/* ---------- FEEDBACK PAGE ---------- */
async function renderFeedbackPage() {
  const user = getCurrentUser();
  const intern = window._usersCache?.find(u => (u.id || u.ID) === (user.id || user.ID));
  if (!intern) return;

  const content = document.getElementById('content-area');
  content.innerHTML = '<div class="loader-content" style="margin-top: 40px"><div class="spinner"></div><p>Loading feedback...</p></div>';

  let reviews = [];
  try {
    reviews = await apiCall('getReviewsByIntern', { internId: intern.id });
    window._currentReviews = reviews; // cache for detail view
  } catch (e) {
    content.innerHTML = '<div class="empty-state"><p>Error loading reviews</p></div>';
    return;
  }

  reviews.sort((a,b) => {
    if (a.Year !== b.Year) return Number(b.Year) - Number(a.Year);
    return Number(b.Month) - Number(a.Month);
  });

  if (reviews.length === 0) {
    content.innerHTML = `
      <div class="card">
        <div class="card-body">
          <div class="empty-state">
            ${ICONS.messageSquare}
            <p>No feedback available yet. Your mentor will submit monthly reviews periodically.</p>
          </div>
        </div>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="card mb-24">
      <div class="card-header">
        <h3>Monthly Review Feedback</h3>
        <span class="text-sm text-secondary">${reviews.length} reviews</span>
      </div>
      <div class="card-body" style="padding:0">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Period</th><th>Mentor</th><th>Submitted</th><th>Action</th></tr></thead>
            <tbody>
              ${reviews.map(r => {
                const mentor = window._usersCache?.find(u => u.id === r.MentorID);
                return `
                  <tr>
                    <td>${MONTHS[r.Month-1]} ${r.Year}</td>
                    <td>${mentor?.name || '-'}</td>
                    <td>${formatShortDate(r.CreatedAt)}</td>
                    <td><button class="btn btn-secondary btn-sm" onclick="viewReviewDetail('${r.ID}')">View Detail</button></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

window.viewReviewDetail = function(reviewId) {
  const reviews = window._currentReviews || [];
  const review = reviews.find(r => r.ID === reviewId);
  if (!review) return;

  const findKey = (obj, keyword, ignoreNote = false) => {
    const keys = Object.keys(obj);
    for (let k of keys) {
      if (k.toLowerCase().includes(keyword.toLowerCase())) {
        if (ignoreNote && k.toLowerCase().includes('note')) continue;
        return k;
      }
    }
    return null;
  };

  const parseSoftSkill = (key) => {
    const scoreKey = findKey(review, key, true);
    const noteKey = findKey(review, key + '_Note') || findKey(review, 'Note_' + key);
    
    const rawScore = scoreKey ? review[scoreKey] : null;
    const rawNote = noteKey ? review[noteKey] : null;
    
    let score = 0, note = '';
    if (typeof rawScore === 'string' && rawScore.includes('|')) {
      const p = rawScore.split('|');
      score = parseInt(p[0]) || 0;
      note = p[1] || '';
    } else {
      score = parseInt(rawScore) || 0;
      note = rawNote || '';
    }
    return { score, note };
  };

  const parseHardSkill = (idx) => {
    const nameKey = findKey(review, `HS${idx}_Name`) || findKey(review, `HS_${idx}_Name`);
    const name = nameKey ? review[nameKey] : null;
    if (!name) return null;
    
    const scoreKey = findKey(review, `HS${idx}_Score`, true) || findKey(review, `HS_${idx}_Score`, true) || findKey(review, `HS${idx}`, true);
    const noteKey = findKey(review, `HS${idx}_Note`) || findKey(review, `HS_${idx}_Note`);

    const rawScore = scoreKey ? review[scoreKey] : null;
    const rawNote = noteKey ? review[noteKey] : null;

    let score = 0, note = '';
    if (typeof rawScore === 'string' && rawScore.includes('|')) {
      const p = rawScore.split('|');
      if (p.length === 3) {
         score = parseInt(p[1]) || 0;
         note = p[2] || '';
      } else {
         score = parseInt(p[0]) || 0;
         note = p[1] || '';
      }
    } else {
      score = parseInt(rawScore) || 0;
      note = rawNote || '';
    }
    return { name, score, note };
  };

  const kedisiplinan = parseSoftSkill('Kedisiplinan');
  const adaptasi = parseSoftSkill('Adaptasi');
  const inisiatif = parseSoftSkill('Inisiatif');
  const tanggungJawab = parseSoftSkill('TanggungJawab');

  const hs = [1,2,3,4,5].map(i => parseHardSkill(i)).filter(h => h !== null);

  showModal(`Monthly Review — ${MONTHS[review.Month-1]} ${review.Year}`, `
    <h4 style="margin-bottom:12px; font-size:14px; font-weight:600; color:var(--primary-700)">Soft Skills</h4>
    <table class="eval-table" style="margin-bottom:20px">
      <thead><tr><th>Aspect</th><th>Score</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td>Kedisiplinan</td><td><span class="badge badge-info">${kedisiplinan.score}/5</span></td><td>${escapeHtml(kedisiplinan.note)}</td></tr>
        <tr><td>Adaptasi</td><td><span class="badge badge-info">${adaptasi.score}/5</span></td><td>${escapeHtml(adaptasi.note)}</td></tr>
        <tr><td>Inisiatif</td><td><span class="badge badge-info">${inisiatif.score}/5</span></td><td>${escapeHtml(inisiatif.note)}</td></tr>
        <tr><td>Tanggung Jawab</td><td><span class="badge badge-info">${tanggungJawab.score}/5</span></td><td>${escapeHtml(tanggungJawab.note)}</td></tr>
      </tbody>
    </table>

    <h4 style="margin-bottom:12px; font-size:14px; font-weight:600; color:var(--primary-700)">Hard Skills</h4>
    ${hs.length > 0 ? `
    <table class="eval-table">
      <thead><tr><th>Skill</th><th>Score</th><th>Notes</th></tr></thead>
      <tbody>
        ${hs.map(h => `
          <tr><td>${escapeHtml(h.name)}</td><td><span class="badge badge-info">${h.score}/5</span></td><td>${escapeHtml(h.note)}</td></tr>
        `).join('')}
      </tbody>
    </table>` : '<p class="text-secondary text-sm">No hard skills evaluated.</p>'}
  `);
};

/* ---------- UTILITY ---------- */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
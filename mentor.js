/* ============================================
   MENTOR.JS — Mentor Pages
   ============================================ */

/* ---------- MONTHLY REVIEW ---------- */
async function renderMonthlyReviewPage(user) {
  showLoader('Fetching your interns...');
  let myInterns = [];
  try {
    const rawInterns = await getInternsByMentor(user.id);
    setCachedInterns(rawInterns);
    myInterns = rawInterns.filter(i => String(i.Status || i.status || '').toLowerCase() === 'active');
  } catch(e) {
    showToast('Failed to load interns', 'danger');
  }
  hideLoader();

  const now = new Date();
  let month = now.getMonth() + 1;
  let year = now.getFullYear();
  let activeTab = 'approval';

  function render() {
    const content = document.getElementById('content-area');

    if (myInterns.length === 0) {
      content.innerHTML = `<div class="card"><div class="card-body"><div class="empty-state">${ICONS.users}<p>No active interns assigned to you</p></div></div></div>`;
      return;
    }

    content.innerHTML = `
      <div class="intern-selector">
        <label>Select Intern:</label>
        <select class="form-control" id="review-intern-select" onchange="loadReviewContent()">
          <option value="">— Choose Intern —</option>
          ${myInterns.map(i => `<option value="${i.ID || i.id}">${i.Name || i.name} — ${i.Position || i.position}</option>`).join('')}
        </select>
        ${monthSelector(month, year, 'updateReviewPeriod()')}
      </div>
      <div id="review-tabs-area"></div>
      <div id="review-content-area"></div>
    `;
  }

  window.updateReviewPeriod = () => {
    month = getSelectedMonth();
    year = getSelectedYear();
    loadReviewContent();
  };

  window.switchReviewTab = (tab) => {
    activeTab = tab;
    loadReviewContent();
  };

  window.loadReviewContent = async () => {
    const internId = document.getElementById('review-intern-select').value;
    const tabsArea = document.getElementById('review-tabs-area');
    const contentArea = document.getElementById('review-content-area');
    if (!internId) { tabsArea.innerHTML = ''; contentArea.innerHTML = ''; return; }

    // Find intern data for biodata
    const intern = getInternById(internId);

    // Biodata card
    const contractEnd = intern ? (intern.ContractEnd || intern.contractEnd) : null;
    const daysLeft = contractEnd ? Math.ceil((new Date(contractEnd) - new Date()) / (1000*60*60*24)) : 0;
    const daysColor = daysLeft <= 14 ? 'var(--danger)' : daysLeft <= 30 ? '#d97706' : 'var(--success)';

    tabsArea.innerHTML = `
      ${intern ? `
      <div class="card mb-24" style="border-left:4px solid var(--primary-600)">
        <div class="card-body" style="padding:16px 20px">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:20px; flex-wrap:wrap">
            <div>
              <h3 style="margin:0 0 4px 0; font-size:16px; font-weight:700; color:var(--text-primary)">${intern.Name || intern.name}</h3>
              <p style="margin:0; font-size:13px; color:var(--text-secondary)">${intern.Position || intern.position} · ${intern.Department || intern.department}</p>
            </div>
            <div style="display:flex; gap:8px; align-items:center">
              <span class="badge ${String(intern.Status || intern.status || '').toLowerCase() === 'active' ? 'badge-success' : 'badge-danger'}">
                ${String(intern.Status || intern.status || '').toLowerCase() === 'active' ? 'Active' : 'Inactive'}
              </span>
              <span class="badge" style="background:${daysColor}15; color:${daysColor}; font-weight:600">${daysLeft > 0 ? daysLeft + ' hari tersisa' : 'Kontrak berakhir'}</span>
            </div>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-top:14px; font-size:13px">
            <div><span style="color:var(--text-muted)">Branch:</span> <strong>${intern.Branch || intern.branch}</strong></div>
            <div><span style="color:var(--text-muted)">Phone:</span> <strong>${intern.Phone || intern.phone}</strong></div>
            <div><span style="color:var(--text-muted)">Email:</span> <strong>${intern.Email || intern.email}</strong></div>
            <div><span style="color:var(--text-muted)">SOC:</span> <strong>${formatShortDate(intern.ContractStart || intern.contractStart)}</strong></div>
            <div><span style="color:var(--text-muted)">EOC:</span> <strong>${formatShortDate(contractEnd)}</strong></div>
          </div>
        </div>
      </div>
      ` : ''}

      <div class="tab-bar">
        <div class="tab-item ${activeTab === 'approval' ? 'active' : ''}" onclick="switchReviewTab('approval')">
          ${ICONS.clipboardCheck} <span style="margin-left:6px">Approval</span>
        </div>
        <div class="tab-item ${activeTab === 'review' ? 'active' : ''}" onclick="switchReviewTab('review')">
          ${ICONS.star} <span style="margin-left:6px">Review</span>
        </div>
      </div>
    `;

    if (activeTab === 'approval') {
      await renderApprovalTab(internId, month, year, contentArea);
    } else {
      await renderReviewTab(internId, month, year, contentArea);
    }
  };

  render();
}

/* ---------- APPROVAL TAB ---------- */
async function renderApprovalTab(internId, month, year, container) {
  container.innerHTML = '<div class="loader-content" style="margin-top: 40px"><div class="spinner"></div><p>Loading approval data...</p></div>';

  let attendance = [], logEntries = [], existingApproval = null;
  let summary = { fullday:0, halfday:0, absent:0 };
  const intern = getInternById(internId);

  try {
    const data = await apiCall('getMentorApprovalData', { internId, year, month });
    attendance = (data.attendance || []).sort((a,b) => a.Date.localeCompare(b.Date));
    logEntries = (data.logbook || []).sort((a,b) => b.Date.localeCompare(a.Date));
    existingApproval = data.approval;

    // Calculate summary from attendance records
    const now = new Date();
    attendance.forEach(a => {
      let eff = a.Type;
      if (eff === 'pending') {
        const recordDate = new Date(a.Date);
        if (recordDate.toDateString() !== now.toDateString() || now.getHours() >= 17) {
          eff = 'fullday';
        }
      }
      if (eff === 'fullday') summary.fullday++;
      else if (eff === 'halfday') summary.halfday++;
      else if (eff === 'absent') summary.absent++;
    });
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><p>Error loading approval data</p></div>';
    return;
  }

  // Build a map of date -> attendance type
  const attendanceMap = {};
  attendance.forEach(a => { attendanceMap[a.Date] = a; });

  // Build list of all working days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const maxDay = (year === today.getFullYear() && month === today.getMonth()+1) ? today.getDate() : daysInMonth;
  const workingDays = [];
  for (let d = 1; d <= maxDay; d++) {
    const date = new Date(year, month - 1, d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    workingDays.push(formatDateISO(date));
  }

  const approvalStatusHTML = existingApproval
    ? `<div class="approval-status approved">
         ${ICONS.check} <span>Approved on ${formatShortDate(existingApproval.ApprovedAt)}</span>
       </div>`
    : `<div class="approval-status pending">
         ${ICONS.alertCircle} <span>Pending Approval</span>
       </div>`;

  container.innerHTML = `
    <!-- Approval Status Banner -->
    ${approvalStatusHTML}

    <!-- Attendance Scorecard -->
    <div class="scorecard-grid" style="margin-top:16px">
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

    <!-- Attendance Detail Table -->
    <div class="card mb-24">
      <div class="card-header">
        <h3>Attendance Detail — ${MONTHS[month-1]} ${year}</h3>
        <span class="text-sm text-secondary">${intern?.Name || intern?.name || ''}</span>
      </div>
      <div class="card-body" style="padding:0">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${workingDays.map(dateStr => {
                const rec = attendanceMap[dateStr];
                let statusBadge;
                if (!rec || rec.Type === 'absent') {
                  statusBadge = '<span class="badge badge-danger">Absent</span>';
                } else {
                  let eff = rec.Type;
                  if (eff === 'pending' || (rec.ClockIn && !rec.ClockOut)) {
                    const recordDate = new Date(dateStr);
                    const now = new Date();
                    if (recordDate.toDateString() !== now.toDateString() || now.getHours() >= 17) {
                      eff = 'fullday';
                    } else {
                      eff = 'pending';
                    }
                  }
                  
                  if (eff === 'fullday') statusBadge = '<span class="badge badge-success">Full Day</span>';
                  else if (eff === 'halfday') statusBadge = '<span class="badge badge-warning">Half Day</span>';
                  else if (eff === 'pending') statusBadge = '<span class="badge badge-info">In Progress</span>';
                  else statusBadge = '<span class="badge badge-danger">Absent</span>';
                }
                return `
                  <tr>
                    <td style="white-space:nowrap">${formatShortDate(dateStr)}</td>
                    <td>${rec?.ClockIn ? formatDate(rec.ClockIn) : '—'}</td>
                    <td>${rec?.ClockOut ? formatDate(rec.ClockOut) : '—'}</td>
                    <td>${statusBadge}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Logbook Entries -->
    <div class="card mb-24">
      <div class="card-header">
        <h3>Logbook Entries</h3>
        <span class="text-sm text-secondary">${logEntries.length} entries</span>
      </div>
      <div class="card-body" style="padding:0">
        ${logEntries.length === 0
          ? `<div class="empty-state">${ICONS.inbox}<p>No logbook entries for this month</p></div>`
          : `<div class="table-wrapper"><table>
              <thead><tr><th>Date</th><th>Activity</th><th>Submitted</th></tr></thead>
              <tbody>
                ${logEntries.map(e => `
                  <tr>
                    <td style="white-space:nowrap">${formatShortDate(e.Date)}</td>
                    <td>${escapeHtml(e.Activity)}</td>
                    <td style="white-space:nowrap">${formatShortDate(e.SubmittedAt)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table></div>`
        }
      </div>
    </div>

    <!-- Approve Button -->
    ${!existingApproval ? `
      <button class="btn btn-primary" onclick="mentorApproveAttendance('${internId}', ${month}, ${year})">
        ${ICONS.check} Approve Attendance & Logbook
      </button>
    ` : ''}
  `;

  // Helper to format date just grabbing time if it's full ISO
  function formatDate(val) {
    if(!val) return '';
    if(val.includes('T')) {
      const d = new Date(val);
      return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
    }
    return val;
  }

  // Register global functions for approve
  window.mentorApproveAttendance = async function(iid, m, y) {
    const user = getCurrentUser();
    
    showLoader('Checking review requirements...');
    try {
      const existingReview = await getReview(iid, m, y);

      // If a review row exists for this month, it means it was successfully submitted
      // (The UI submission enforces that all 4 soft skills are filled before saving)
      const hasReviewScores = !!existingReview;

      if (!hasReviewScores) {
        hideLoader();
        showToast('Anda harus mengisi Review terlebih dahulu sebelum melakukan Approval!', 'danger');
        return;
      }
      
      showLoader('Approving attendance and logbook...');
      await saveApproval({
        id: uid('AP'),
        internId: iid,
        mentorId: user.id,
        month: m,
        year: y,
        approvedAt: formatDateISO(new Date()),
        summary: JSON.stringify(summary),
        hasReview: true,
      });
      showToast('Attendance & Logbook approved!', 'success');
      loadReviewContent();
    } catch(e) {
      showToast('Failed to approve', 'danger');
    } finally {
      hideLoader();
    }
  };
}

/* ---------- REVIEW TAB ---------- */
async function renderReviewTab(internId, month, year, container) {
  container.innerHTML = '<div class="loader-content" style="margin-top: 40px"><div class="spinner"></div><p>Loading review data...</p></div>';
  
  let existing = null;
  try {
    existing = await getReview(internId, month, year);
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><p>Error loading review data</p></div>';
    return;
  }

  const softAspects = [
    { key: 'Kedisiplinan', label: 'Kedisiplinan' },
    { key: 'Adaptasi', label: 'Adaptasi' },
    { key: 'Inisiatif', label: 'Inisiatif' },
    { key: 'TanggungJawab', label: 'Tanggung Jawab' },
  ];

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

  container.innerHTML = `
    <div class="card mb-24" style="margin-top:20px">
      <div class="card-header"><h3>Soft Skills Assessment</h3></div>
      <div class="card-body" style="padding:0">
        <table class="eval-table">
          <thead>
            <tr>
              <th style="width:180px">Aspect</th>
              <th style="width:220px">Score (1-5)</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${softAspects.map(a => {
              let score = 0;
              let note = '';
              if (existing) {
                const scoreKey = findKey(existing, a.key, true);
                const noteKey = findKey(existing, a.key + '_Note') || findKey(existing, 'Note_' + a.key);
                
                const rawScore = scoreKey ? existing[scoreKey] : null;
                const rawNote = noteKey ? existing[noteKey] : null;
                
                if (typeof rawScore === 'string' && rawScore.includes('|')) {
                  const parts = rawScore.split('|');
                  score = parseInt(parts[0]) || 0;
                  note = parts[1] || '';
                } else {
                  score = parseInt(rawScore) || 0;
                  note = rawNote || '';
                }
              }
              return `
                <tr>
                  <td style="font-weight:500">${a.label}</td>
                  <td>
                    <div class="rating-group" data-name="soft_${a.key}">
                      ${[1,2,3,4,5].map(n => `
                        <input type="radio" name="soft_${a.key}" id="soft_${a.key}_${n}" value="${n}" ${score === n ? 'checked' : ''}>
                        <label for="soft_${a.key}_${n}">${n}</label>
                      `).join('')}
                    </div>
                  </td>
                  <td><input type="text" class="form-control" id="soft_note_${a.key}" placeholder="Notes (opsional)" value="${note}"></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card mb-24">
      <div class="card-header">
        <h3>Hard Skills Assessment</h3>
        <span class="text-sm text-secondary">Opsional</span>
      </div>
      <div class="card-body" style="padding:0">
        <table class="eval-table">
          <thead>
            <tr>
              <th style="width:180px">Skill Name</th>
              <th style="width:220px">Score (1-5)</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${[1,2,3,4,5].map(i => {
              let name = '';
              let score = 0;
              let note = '';
              if (existing) {
                const nameKey = findKey(existing, `HS${i}_Name`) || findKey(existing, `HS_${i}_Name`);
                const scoreKey = findKey(existing, `HS${i}_Score`, true) || findKey(existing, `HS_${i}_Score`, true) || findKey(existing, `HS${i}`, true);
                const noteKey = findKey(existing, `HS${i}_Note`) || findKey(existing, `HS_${i}_Note`);
                
                name = nameKey ? existing[nameKey] : '';
                const rawScore = scoreKey ? existing[scoreKey] : null;
                const rawNote = noteKey ? existing[noteKey] : null;
                
                if (typeof rawScore === 'string' && rawScore.includes('|')) {
                  const parts = rawScore.split('|');
                  if (parts.length === 3) {
                    score = parseInt(parts[1]) || 0;
                    note = parts[2] || '';
                  } else {
                    score = parseInt(parts[0]) || 0;
                    note = parts[1] || '';
                  }
                } else {
                  score = parseInt(rawScore) || 0;
                  note = rawNote || '';
                }
              }
              return `
                <tr>
                  <td><input type="text" class="form-control" id="hard_name_${i}" placeholder="e.g. JavaScript" value="${name}"></td>
                  <td>
                    <div class="rating-group" data-name="hard_${i}">
                      ${[1,2,3,4,5].map(n => `
                        <input type="radio" name="hard_${i}" id="hard_${i}_${n}" value="${n}" ${score === n ? 'checked' : ''}>
                        <label for="hard_${i}_${n}">${n}</label>
                      `).join('')}
                    </div>
                  </td>
                  <td><input type="text" class="form-control" id="hard_note_${i}" placeholder="Notes (opsional)" value="${note}"></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <button class="btn btn-primary" onclick="submitMonthlyReview('${internId}', ${month}, ${year})">
      ${ICONS.check} ${existing ? 'Update Review' : 'Submit Review'}
    </button>
  `;

  // Toggle: click selected score again to deselect
  container.querySelectorAll('.rating-group').forEach(group => {
    group.querySelectorAll('label').forEach(label => {
      label.addEventListener('click', (e) => {
        const input = document.getElementById(label.getAttribute('for'));
        if (input.checked) {
          e.preventDefault();
          input.checked = false;
        }
      });
    });
  });
}

window.submitMonthlyReview = async function(internId, month, year) {
  const user = getCurrentUser();

  // Collect soft skills (required: at least scores)
  const softKeys = ['Kedisiplinan','Adaptasi','Inisiatif','TanggungJawab'];
  const softSkills = {};
  for (const key of softKeys) {
    const radio = document.querySelector(`input[name="soft_${key}"]:checked`);
    if (!radio) { showToast('Harap isi semua skor Soft Skills terlebih dahulu', 'danger'); return; }
    softSkills[key] = {
      score: parseInt(radio.value),
      note: document.getElementById(`soft_note_${key}`).value.trim()
    };
  }

  // Collect hard skills (optional — only validate if name is filled)
  const hardSkills = [];
  for (let i = 1; i <= 5; i++) {
    const name = document.getElementById(`hard_name_${i}`).value.trim();
    const radio = document.querySelector(`input[name="hard_${i}"]:checked`);
    const note = document.getElementById(`hard_note_${i}`).value.trim();
    if (name) {
      if (!radio) { showToast(`Harap isi skor untuk hard skill "${name}"`, 'danger'); return; }
      hardSkills.push({ name, score: parseInt(radio.value), note });
    }
  }

  const review = {
    id: uid('R'),
    internId, mentorId: user.id, month, year,
    softSkills, hardSkills,
    createdAt: formatDateISO(new Date())
  };

  showLoader('Saving review...');
  try {
    await saveMonthlyReview(review);
    showToast('Monthly review saved successfully!', 'success');
    loadReviewContent();
  } catch(e) {
    showToast('Failed to save review', 'danger');
  } finally {
    hideLoader();
  }
};

/* ---------- FINAL EVALUATION ---------- */
async function renderFinalEvaluationPage() {
  const user = getCurrentUser();
  const rawInterns = await getInternsByMentor(user.id);
  const myInterns = rawInterns.filter(i => String(i.Status || i.status || '').toLowerCase() === 'active');

  const content = document.getElementById('content-area');

  if (myInterns.length === 0) {
    content.innerHTML = `<div class="card"><div class="card-body"><div class="empty-state">${ICONS.users}<p>No active interns assigned to you</p></div></div></div>`;
    return;
  }

  content.innerHTML = `
    <div class="intern-selector">
      <label>Select Intern:</label>
      <select class="form-control" id="eval-intern-select" onchange="loadEvalForm()">
        <option value="">— Choose Intern —</option>
        ${myInterns.map(i => `<option value="${i.ID || i.id}">${i.Name || i.name} — ${i.Position || i.position}</option>`).join('')}
      </select>
    </div>
    <div id="eval-form-area"></div>
  `;
}

window.loadEvalForm = async function() {
  const internId = document.getElementById('eval-intern-select').value;
  const area = document.getElementById('eval-form-area');
  if (!internId) { area.innerHTML = ''; return; }

  area.innerHTML = '<div class="loader-content" style="margin-top: 40px"><div class="spinner"></div><p>Loading evaluation...</p></div>';

  let existing = null;
  try {
    existing = await getFinalEvalByIntern(internId);
    // null = no eval yet, that's fine — we just show an empty form
  } catch (e) {
    console.error('getFinalEvalByIntern error:', e);
    // Only block on real errors (network, auth). For not-found, show empty form.
    const msg = String(e.message || '').toLowerCase();
    if (!msg.includes('not found') && !msg.includes('no data') && !msg.includes('no record') && !msg.includes('undefined')) {
      area.innerHTML = `<div class="empty-state"><p>Error loading evaluation data: ${e.message}</p></div>`;
      return;
    }
    existing = null;
  }

  // Section A categories and sub-aspects
  const sectionA = [
    { category: 'Adaptasi', subs: [
      'Kemampuan beradaptasi dengan lingkungan kerja',
      'Kemampuan beradaptasi dengan rekan kerja',
      'Kemampuan beradaptasi dengan budaya perusahaan'
    ]},
    { category: 'Kedisiplinan', subs: [
      'Ketepatan waktu',
      'Kepatuhan terhadap aturan',
      'Konsistensi kehadiran',
      'Pengelolaan waktu kerja'
    ]},
    { category: 'Inisiatif', subs: [
      'Proaktif dalam bertindak',
      'Memberikan ide dan solusi',
      'Kemauan belajar hal baru'
    ]},
    { category: 'Kerjasama', subs: [
      'Kemampuan bekerja dalam tim',
      'Komunikasi dengan rekan kerja',
      'Kesediaan membantu rekan'
    ]},
    { category: 'Tanggung Jawab', subs: [
      'Menyelesaikan tugas tepat waktu',
      'Kualitas hasil kerja',
      'Bertanggung jawab atas kesalahan'
    ]},
  ];

  let subIndex = 1;

  area.innerHTML = `
    <!-- Section A -->
    <div class="card mb-24">
      <div class="card-header"><h3>Section A — General Assessment</h3></div>
      <div class="card-body" style="padding:0">
        <table class="eval-table">
          <thead><tr><th style="width:40%">Aspect</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr></thead>
          <tbody>
            ${sectionA.map(cat => {
              return `
                <tr class="category-header"><td colspan="6">${cat.category}</td></tr>
                ${cat.subs.map(sub => {
                  const si = subIndex++;
                  const val = existing ? parseInt(existing[`SecA_${si}`]) : null;
                  return `
                    <tr class="sub-row">
                      <td>${sub}</td>
                      ${[1,2,3,4,5].map(n => `
                        <td style="text-align:center">
                          <input type="radio" name="secA_${si}" value="${n}" ${val === n ? 'checked' : ''} style="cursor:pointer">
                        </td>
                      `).join('')}
                    </tr>
                  `;
                }).join('')}
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Section B -->
    <div class="card mb-24">
      <div class="card-header"><h3>Section B — Specific Assessment</h3></div>
      <div class="card-body">
        ${[1,2,3].map(fi => {
          const fname = existing ? existing[`SecB${fi}_Name`] : '';
          const params = ['Kecepatan','Kecekatan','Hasil Kerja','Pemahaman','Penerapan'];
          return `
            <div style="margin-bottom:20px; padding:16px; background:var(--bg); border-radius:var(--radius-md)">
              <div class="form-group">
                <label style="font-weight:600">Function / Field ${fi}</label>
                <input type="text" class="form-control" id="secB_name_${fi}" placeholder="e.g. Web Development" value="${fname || ''}">
              </div>
              <table class="eval-table">
                <thead><tr><th>Parameter</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr></thead>
                <tbody>
                  ${params.map((p, pi) => {
                    const pIndex = pi + 1;
                    const pval = existing ? parseInt(existing[`SecB${fi}_P${pIndex}`]) : null;
                    return `
                      <tr>
                        <td>${p}</td>
                        ${[1,2,3,4,5].map(n => `
                          <td style="text-align:center">
                            <input type="radio" name="secB_${fi}_${pIndex}" value="${n}" ${pval === n ? 'checked' : ''} style="cursor:pointer">
                          </td>
                        `).join('')}
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Section C -->
    <div class="card mb-24">
      <div class="card-header"><h3>Section C — Conclusion</h3></div>
      <div class="card-body">
        <div class="form-group">
          <label>Overall Conclusion</label>
          <select class="form-control" id="secC_conclusion">
            <option value="">— Select —</option>
            ${['Sangat Baik','Baik','Cukup','Kurang Baik'].map(opt =>
              `<option value="${opt}" ${existing?.SecC_Conclusion === opt ? 'selected' : ''}>${opt}</option>`
            ).join('')}
          </select>
        </div>
      </div>
    </div>

    <button class="btn btn-primary" onclick="submitFinalEvaluation('${internId}')">
      ${ICONS.check} ${existing ? 'Update Evaluation' : 'Submit Evaluation'}
    </button>
  `;
};

window.submitFinalEvaluation = async function(internId) {
  const user = getCurrentUser();

  // Section A — 16 sub-aspects (1-indexed based on how we mapped it)
  const sectionA = [];
  for (let i = 1; i <= 16; i++) {
    const radio = document.querySelector(`input[name="secA_${i}"]:checked`);
    if (!radio) { showToast('Please rate all aspects in Section A', 'danger'); return; }
    sectionA.push({ score: parseInt(radio.value) });
  }

  // Section B — 3 functions x 5 params
  const sectionB = [];
  for (let fi = 1; fi <= 3; fi++) {
    const name = document.getElementById(`secB_name_${fi}`).value.trim();
    if (!name) continue; // skip empty functions
    const params = [];
    const paramNames = ['Kecepatan','Kecekatan','Hasil Kerja','Pemahaman','Penerapan'];
    for (let pi = 1; pi <= 5; pi++) {
      const radio = document.querySelector(`input[name="secB_${fi}_${pi}"]:checked`);
      if (!radio) { showToast(`Please rate all parameters for "${name}"`, 'danger'); return; }
      params.push({ name: paramNames[pi-1], score: parseInt(radio.value) });
    }
    sectionB.push({ name, params });
  }

  // Section C
  const conclusion = document.getElementById('secC_conclusion').value;
  if (!conclusion) { showToast('Please select a conclusion', 'danger'); return; }

  const evaluation = {
    id: uid('E'),
    internId, mentorId: user.id,
    sectionA, sectionB, sectionC: conclusion,
    createdAt: formatDateISO(new Date())
  };

  showLoader('Saving evaluation...');
  try {
    await saveFinalEvaluation(evaluation);
    showToast('Final evaluation saved successfully!', 'success');
    loadEvalForm();
  } catch (e) {
    showToast('Failed to save final evaluation', 'danger');
  } finally {
    hideLoader();
  }
};
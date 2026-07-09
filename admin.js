/* ============================================
   ADMIN.JS — Admin Pages
   ============================================ */

async function renderAdminDashboard() {
  const now = new Date();
  let filterMode = 'all';

  function getMentorName(mentorId) {
    const mentor = window._usersCache?.find(u => u.id === mentorId);
    return mentor ? mentor.name : '—';
  }

  async function render() {
    showLoader('Fetching dashboard stats...');
    let stats, allInterns;
    try {
      [stats, allInterns] = await Promise.all([
        getAdminStats(),
        getInterns()
      ]);
    } catch (e) {
      hideLoader();
      showToast('Error fetching admin data', 'danger');
      return;
    }
    hideLoader();

    let filteredInterns;
    switch (filterMode) {
      case 'approval':
        filteredInterns = stats.pendingApprovalInterns;
        break;
      case 'logbook':
        // For simplicity, we just fallback to all if detailed logbook per intern isn't passed.
        // We can just skip 'logbook' detailed filter or implement an endpoint. Let's just use allInterns for now since stats doesn't return list of interns with logbook.
        // Wait, stats only returns logbookCount. We'll show all interns for now if they click it, or we could fetch logbook. Let's just fallback to all.
        filteredInterns = allInterns;
        break;
      case 'expiring':
        filteredInterns = stats.expiringInterns;
        break;
      default:
        filteredInterns = allInterns;
    }

    const content = document.getElementById('content-area');

    content.innerHTML = `
      <!-- Scorecards -->
      <div class="scorecard-grid">
        <div class="scorecard" style="cursor:pointer" onclick="setAdminFilter('all')">
          <div class="scorecard-icon blue">${ICONS.users}</div>
          <div><div class="scorecard-value">${stats.activeInterns}</div><div class="scorecard-label">Active Interns</div></div>
        </div>
        <div class="scorecard" style="cursor:pointer" onclick="setAdminFilter('approval')">
          <div class="scorecard-icon yellow">${ICONS.clipboardCheck}</div>
          <div><div class="scorecard-value">${stats.pendingApprovals}</div><div class="scorecard-label">Pending Approval</div></div>
        </div>
        <div class="scorecard" style="cursor:pointer" onclick="setAdminFilter('expiring')">
          <div class="scorecard-icon red">${ICONS.calendar}</div>
          <div><div class="scorecard-value">${stats.expiringContracts}</div><div class="scorecard-label">Contract Expiring</div></div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <span class="text-sm text-secondary" style="font-weight:500">Filter:</span>
        <select class="form-control" id="admin-filter-select" style="width:auto;min-width:200px" onchange="setAdminFilter(this.value)">
          <option value="all" ${filterMode==='all' ? 'selected' : ''}>All Interns</option>
          <option value="approval" ${filterMode==='approval' ? 'selected' : ''}>Pending Approval (${stats.pendingApprovals})</option>
          <option value="expiring" ${filterMode==='expiring' ? 'selected' : ''}>Contract Expiring (${stats.expiringContracts})</option>
        </select>
        
        <div style="margin-left:16px; position:relative; max-width:280px; width:100%">
          <input type="text" class="form-control" placeholder="Search interns..." onkeyup="adminLiveSearch(this.value)" style="padding-left:36px">
          <div style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-muted); pointer-events:none; display:flex;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
        </div>

        <div style="flex:1"></div>
        <button class="btn btn-sm btn-secondary" onclick="adminDownloadRecap()">
          ${ICONS.download} Download Rekap Gaji
        </button>
      </div>

      <!-- Intern Table -->
      <div class="card">
        <div class="card-header">
          <h3>Intern Directory</h3>
          <span class="text-sm text-secondary">${filteredInterns.length} records</span>
        </div>
        <div class="card-body" style="padding:0">
          ${filteredInterns.length === 0
            ? `<div class="empty-state">${ICONS.inbox}<p>No interns match the current filter</p></div>`
            : `<div class="table-wrapper"><table id="admin-intern-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Position</th><th>Mentor</th><th>Branch</th><th>Department</th>
                    <th>Phone</th><th>Email</th>
                    <th>Status</th><th>Contract Start</th><th>Contract End</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredInterns.map(intern => {
                    const id = intern.ID || intern.id;
                    const name = intern.Name || intern.name;
                    const position = intern.Position || intern.position;
                    const branch = intern.Branch || intern.branch;
                    const dept = intern.Department || intern.department;
                    const phone = intern.Phone || intern.phone;
                    const email = intern.Email || intern.email;
                    
                    // Normalize status to lowercase
                    let rawStatus = intern.Status || intern.status || 'active';
                    const status = String(rawStatus).toLowerCase().trim();
                    
                    const contractStart = intern.ContractStart || intern.contractStart;
                    const contractEnd = intern.ContractEnd || intern.contractEnd;
                    
                    const daysLeft = contractEnd ? Math.ceil((new Date(contractEnd) - now) / (1000*60*60*24)) : 0;
                    const mentorName = intern.MentorName || intern.mentorName || getMentorName(intern.MentorID || intern.mentorId);
                    
                    return `
                      <tr>
                        <td style="font-weight:500; white-space:nowrap">${name}</td>
                        <td style="white-space:nowrap">${position}</td>
                        <td style="white-space:nowrap">${mentorName}</td>
                        <td style="white-space:nowrap">${branch}</td>
                        <td style="white-space:nowrap">${dept}</td>
                        <td style="white-space:nowrap">${phone}</td>
                        <td style="white-space:nowrap">${email}</td>
                        <td>
                          <span class="badge ${status === 'active' ? 'badge-success' : 'badge-danger'}">
                            ${status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style="white-space:nowrap">${formatShortDate(contractStart)}</td>
                        <td style="white-space:nowrap">
                          ${formatShortDate(contractEnd)}
                          ${daysLeft <= 14 && daysLeft >= 0 ? `<br><span class="text-sm" style="color:var(--danger)">${daysLeft} days left</span>` : ''}
                        </td>
                        <td style="white-space:nowrap">
                          <button class="btn btn-sm ${status === 'active' ? 'btn-danger' : 'btn-success'}"
                            id="toggle-btn-${id}"
                            onclick="adminToggleStatus('${id}', '${status}')">
                            ${status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table></div>`
          }
        </div>
      </div>
    `;
  }

  window.setAdminFilter = function(mode) { filterMode = mode; render(); };

  window.adminLiveSearch = function(query) {
    const q = query.toLowerCase();
    const rows = document.querySelectorAll('#admin-intern-table tbody tr');
    rows.forEach(row => {
      // row.innerText gets the text of all columns in that row
      const text = row.innerText.toLowerCase();
      row.style.display = text.includes(q) ? '' : 'none';
    });
  };

  window.adminToggleStatus = async function(internId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    if (newStatus === 'inactive') {
      if (!confirm('Deactivating this intern will prevent them from logging in. Continue?')) return;
    }
    
    showLoader('Updating status...');
    try {
      await updateInternStatus(internId, newStatus);
      showToast('Intern status updated to ' + newStatus, 'success');
      await render();
    } catch (e) {
      showToast('Failed to update status', 'danger');
    } finally {
      hideLoader();
    }
  };

  window.adminDownloadRecap = async function() {
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    showLoader('Generating recap...');
    try {
      const recapData = await getAttendanceRecap(year, month);
      
      let csv = 'Name,Position,Mentor,Department,Full Day,Half Day,Absent\n';
      for (const row of recapData) {
        const mentorName = row.MentorName || '-';
        csv += '"' + (row.Name||'') + '","' + (row.Position||'') + '","' + mentorName + '","' + (row.Department||'') + '",' + (row.fullday||0) + ',' + (row.halfday||0) + ',' + (row.absent||0) + '\n';
      }

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rekap_gaji_' + MONTHS[month-1] + '_' + year + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Rekap gaji downloaded', 'success');
    } catch (e) {
      showToast('Error generating recap', 'danger');
    } finally {
      hideLoader();
    }
  };

  render();
}

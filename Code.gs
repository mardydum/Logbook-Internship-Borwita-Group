/**
 * ============================================
 * INTERNSHIP MANAGEMENT SYSTEM
 * Google Apps Script — Backend API
 * ============================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Google Spreadsheet with a 'Raw' sheet containing intern data
 *    Columns: InternID | Nama | Posisi | Branch | Department | No. WA | Email | MentorID | Mentor | SOC | EOC | Sisa EOC | Status
 * 2. Run syncUsersFromRaw() ONCE from Apps Script to generate the Users sheet
 * 3. Create other sheets by running setupSheets()
 * 4. Deploy as Web App (Execute as: Me, Access: Anyone)
 * 5. Copy the deployment URL into your frontend config
 */

// ====== SPREADSHEET ID ======
// Replace with your Google Spreadsheet ID (from the URL) if using a standalone script
const SPREADSHEET_ID = '15CdlEKCSzHUL3lm7xZSw70FnK30IuNelNtSQBaG130w';

function getActiveSS() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss && ss.getId()) {
      return ss;
    }
  } catch (e) {
    // Fallback to ID
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(name) {
  return getActiveSS().getSheetByName(name);
}

// ====== WEB APP ENTRY POINTS ======
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const action = e.parameter.action;
  let result;

  try {
    switch (action) {
      // Auth
      case 'login':           result = login(e.parameter.password); break;

      // Interns (reads from Raw sheet)
      case 'getInterns':      result = getAllInterns(); break;
      case 'getInternsByMentor': result = getInternsByMentor(e.parameter.mentorId); break;
      case 'updateInternStatus': result = updateInternStatus(e.parameter.internId, e.parameter.status); break;

      // Combined endpoints for performance optimization
      case 'getInternMonthlyData':
        result = {
          attendance: getAttendanceByMonth(e.parameter.internId, e.parameter.year, e.parameter.month),
          logbook: getLogbookByMonth(e.parameter.internId, e.parameter.year, e.parameter.month)
        };
        break;
      case 'getMentorApprovalData':
        result = {
          attendance: getAttendanceByMonth(e.parameter.internId, e.parameter.year, e.parameter.month),
          logbook: getLogbookByMonth(e.parameter.internId, e.parameter.year, e.parameter.month),
          approval: getApproval(e.parameter.internId, e.parameter.month, e.parameter.year)
        };
        break;

      // Attendance
      case 'clockIn':         result = clockIn(e.parameter.internId); break;
      case 'clockOut':        result = clockOut(e.parameter.internId, e.parameter.forceType || null); break;
      case 'getAttendanceByMonth':
        result = getAttendanceByMonth(e.parameter.internId, e.parameter.year, e.parameter.month); break;

      // Logbook
      case 'submitLogbook':   result = submitLogbook(e.parameter.internId, e.parameter.activity); break;
      case 'getLogbook':      result = getLogbookByMonth(e.parameter.internId, e.parameter.year, e.parameter.month); break;
      case 'updateLogbook':   result = updateLogbookEntry(e.parameter.entryId, e.parameter.date, e.parameter.activity); break;

      // Reviews & Approvals
      case 'submitReview':    result = submitMonthlyReview(JSON.parse(e.parameter.data)); break;
      case 'getReview':       result = getReview(e.parameter.internId, e.parameter.month, e.parameter.year); break;
      case 'getReviewsByIntern': result = getReviewsByIntern(e.parameter.internId); break;
      case 'saveApproval':    result = saveApproval(JSON.parse(e.parameter.data)); break;
      case 'getApproval':     result = getApproval(e.parameter.internId, e.parameter.month, e.parameter.year); break;

      // Final Evaluation
      case 'submitFinalEval': result = submitFinalEvaluation(JSON.parse(e.parameter.data)); break;
      case 'getFinalEval':    result = getFinalEvalByIntern(e.parameter.internId); break;

      // Admin
      case 'getAdminStats':   result = getAdminStats(); break;
      case 'getAttendanceRecap': result = getAttendanceRecap(e.parameter.year, e.parameter.month); break;

      // Sync
      case 'syncUsers':       result = syncUsersFromRaw(); break;
      case 'setupAdmin':      result = setupAdminUser(e.parameter.password || 'admin123'); break;
      case 'fixStatuses':     result = fixAllStatuses(); break;

      default: result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ====== AUTH ======
function login(password) {
  const sheet = getSheet('Users');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    const row = rowToObj(headers, data[i]);
    const status = String(row.Status || '').toLowerCase().trim();
    const pwd = String(row.Password || '').trim();
    if (pwd === password && status === 'active') {
      const userName = row.Nama || row.Name || '';
      const role = String(row.Role || '').toLowerCase().trim();
      return { success: true, user: { id: String(row.ID), name: userName, role: role, status: status } };
    }
  }
  return { success: false, error: 'Invalid password or account inactive' };
}

// ====== INTERNS (from Data Intern & Data Mentor sheets) ======
/**
 * Read intern data by joining 'Data Intern' and 'Data Mentor'
 */
function getAllInterns() {
  const internData = getSheetData('Data Intern');
  const mentorData = getSheetData('Data Mentor');
  
  // Build a lookup map: MentorID -> Mentor Name
  const mentorMap = {};
  mentorData.forEach(m => {
    if (m.MentorID) mentorMap[m.MentorID] = m.Mentor;
  });
  
  return internData.map(row => mapRowToIntern(row, mentorMap));
}

function getInternsByMentor(mentorId) {
  return getAllInterns().filter(i => i.MentorID === mentorId);
}

/**
 * Map a Data Intern sheet row to the intern data format expected by the frontend
 */
function mapRowToIntern(row, mentorMap) {
  const rawStatus = String(row.Status || row['Status'] || 'Active').trim();
  const mentorId = String(row['ID Mentor'] || '');
  return {
    ID: String(row.ID || row['ID'] || ''),
    Name: row.Nama || row['Nama'] || '',
    Position: row.Posisi || row['Posisi'] || '',
    Branch: row.Branch || row['Branch'] || '',
    Department: row.Department || row['Department'] || '',
    Phone: row['No. WA'] || row['No WA'] || '',
    Email: row.Email || row['Email'] || '',
    MentorID: mentorId,
    MentorName: mentorMap[mentorId] || '',
    ContractStart: parseDDMMYYYY(row.SOC || row['SOC']),
    ContractEnd: parseDDMMYYYY(row.EOC || row['EOC']),
    DaysRemaining: row['Sisa EOC'] || '',
    Status: rawStatus,
  };
}

function updateInternStatus(internId, status) {
  const sheet = getSheet('Data Intern');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find the Status column in Data Intern
  const statusCol = headers.indexOf('Status');
  if (statusCol < 0) return { success: false, error: 'Status column not found in Data Intern sheet' };
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][headers.indexOf('ID')] === internId) {
      sheet.getRange(i + 1, statusCol + 1).setValue(status);
      
      // We no longer update the Users sheet directly here because the Users
      // sheet is now driven by manual spreadsheet formulas. Changing Data Intern
      // will automatically update Users via your formula!
      
      return { success: true };
    }
  }
  return { success: false, error: 'Intern not found' };
}

// ====== ATTENDANCE ======
function clockIn(internId) {
  const sheet = getSheet('Attendance');
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm');
  
  // Check if already clocked in today
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  for (let i = 1; i < data.length; i++) {
    const row = rowToObj(headers, data[i]);
    if (String(row.InternID) === String(internId) && formatDate(row.Date) === today) {
      return { success: false, error: 'Already clocked in today' };
    }
  }
  
  const id = 'A' + new Date().getTime();
  sheet.appendRow([id, internId, today, now, '', 'pending']);
  return { success: true, clockIn: now };
}

function clockOut(internId, forceType) {
  const sheet = getSheet('Attendance');
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm');
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const clockOutCol = headers.indexOf('ClockOut') + 1;
  const typeCol = headers.indexOf('Type') + 1;
  
  for (let i = 1; i < data.length; i++) {
    const row = rowToObj(headers, data[i]);
    if (String(row.InternID) === String(internId) && formatDate(row.Date) === today && !row.ClockOut) {
      sheet.getRange(i + 1, clockOutCol).setValue(now);

      let type;
      if (forceType) {
        type = forceType;
      } else {
        // Parse clock in time (could be Date object or "HH:mm" string)
        let cinHours, cinMins;
        if (row.ClockIn instanceof Date) {
          cinHours = row.ClockIn.getHours();
          cinMins = row.ClockIn.getMinutes();
        } else {
          const cinParts = String(row.ClockIn).split(':').map(Number);
          cinHours = cinParts[0];
          cinMins = cinParts[1];
        }
        const coutParts = now.split(':').map(Number);
        const hours = (coutParts[0] + coutParts[1]/60) - (cinHours + cinMins/60);
        
        // 30-minute tolerance: fullday >= 7.5h, halfday >= 3.5h
        if (hours >= 7.5) {
          type = 'fullday';
        } else if (hours >= 3.5) {
          type = 'halfday';
        } else {
          type = 'absent';
        }
      }
      
      sheet.getRange(i + 1, typeCol).setValue(type);
      return { success: true, clockOut: now, type: type };
    }
  }
  return { success: false, error: 'No clock-in found for today' };
}

function getAttendanceByMonth(internId, year, month) {
  const prefix = year + '-' + String(month).padStart(2, '0');
  return getSheetData('Attendance').filter(a => String(a.InternID) === String(internId) && formatDate(a.Date).startsWith(prefix));
}

// ====== LOGBOOK ======
function submitLogbook(internId, activity) {
  const sheet = getSheet('Logbook');
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  // Check if already submitted today
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const activityCol = headers.indexOf('Activity') + 1;
  
  for (let i = 1; i < data.length; i++) {
    const row = rowToObj(headers, data[i]);
    if (String(row.InternID) === String(internId) && formatDate(row.Date) === today) {
      sheet.getRange(i + 1, activityCol).setValue(activity);
      return { success: true, updated: true };
    }
  }
  
  const id = 'L' + new Date().getTime();
  sheet.appendRow([id, internId, today, activity, today]);
  return { success: true, created: true };
}

function getLogbookByMonth(internId, year, month) {
  const prefix = year + '-' + String(month).padStart(2, '0');
  return getSheetData('Logbook').filter(l => String(l.InternID) === String(internId) && formatDate(l.Date).startsWith(prefix));
}

function updateLogbookEntry(entryId, date, activity) {
  const sheet = getSheet('Logbook');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][headers.indexOf('ID')]) === String(entryId)) {
      sheet.getRange(i + 1, headers.indexOf('Date') + 1).setValue(date);
      sheet.getRange(i + 1, headers.indexOf('Activity') + 1).setValue(activity);
      return { success: true };
    }
  }
  return { success: false, error: 'Entry not found' };
}

// ====== MONTHLY REVIEWS ======
function submitMonthlyReview(reviewData) {
  const sheet = getSheet('MonthlyReview');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Check if review already exists for this intern/month/year
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][headers.indexOf('InternID')]) === String(reviewData.internId) &&
        data[i][headers.indexOf('Month')] == reviewData.month &&
        data[i][headers.indexOf('Year')] == reviewData.year) {
      // Update existing row
      const row = buildReviewRow(reviewData);
      for (let c = 0; c < row.length; c++) {
        sheet.getRange(i + 1, c + 1).setValue(row[c]);
      }
      return { success: true, updated: true };
    }
  }
  
  // Append new row
  sheet.appendRow(buildReviewRow(reviewData));
  return { success: true, created: true };
}

function buildReviewRow(d) {
  const ss = d.softSkills;
  const hs = d.hardSkills || [];
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  return [
    d.id || ('R' + new Date().getTime()),
    d.internId, d.mentorId, d.month, d.year,
    ss.Kedisiplinan?.score || '', ss.Kedisiplinan?.note || '',
    ss.Adaptasi?.score || '', ss.Adaptasi?.note || '',
    ss.Inisiatif?.score || '', ss.Inisiatif?.note || '',
    ss.TanggungJawab?.score || '', ss.TanggungJawab?.note || '',
    hs[0]?.name || '', hs[0]?.score || '', hs[0]?.note || '',
    hs[1]?.name || '', hs[1]?.score || '', hs[1]?.note || '',
    hs[2]?.name || '', hs[2]?.score || '', hs[2]?.note || '',
    hs[3]?.name || '', hs[3]?.score || '', hs[3]?.note || '',
    hs[4]?.name || '', hs[4]?.score || '', hs[4]?.note || '',
    today
  ];
}

function getReview(internId, month, year) {
  const reviews = getSheetData('MonthlyReview');
  return reviews.find(r => String(r.InternID) === String(internId) && r.Month == month && r.Year == year) || null;
}

function getReviewsByIntern(internId) {
  return getSheetData('MonthlyReview').filter(r => String(r.InternID) === String(internId));
}

// ====== FINAL EVALUATION ======
function submitFinalEvaluation(evalData) {
  const sheet = getSheet('FinalEvaluation');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  const row = [
    evalData.id || ('E' + new Date().getTime()),
    evalData.internId,
    evalData.mentorId,
  ];
  
  // Section A — 16 scores
  for (let i = 0; i < 16; i++) {
    row.push(evalData.sectionA?.[i]?.score || '');
  }
  
  // Section B — 3 functions x (name + 5 params)
  for (let f = 0; f < 3; f++) {
    const func = evalData.sectionB?.[f];
    row.push(func?.name || '');
    for (let p = 0; p < 5; p++) {
      row.push(func?.params?.[p]?.score || '');
    }
  }
  
  // Section C
  row.push(evalData.sectionC || '');
  row.push(today);
  
  // Check for existing
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][headers.indexOf('InternID')]) === String(evalData.internId)) {
      for (let c = 0; c < row.length; c++) {
        sheet.getRange(i + 1, c + 1).setValue(row[c]);
      }
      return { success: true, updated: true };
    }
  }
  
  sheet.appendRow(row);
  return { success: true, created: true };
}

function getFinalEvalByIntern(internId) {
  return getSheetData('FinalEvaluation').find(e => String(e.InternID) === String(internId)) || null;
}

// ====== APPROVALS ======
function getApprovals() {
  return getSheetData('Approvals');
}

function getApproval(internId, month, year) {
  const approvals = getApprovals();
  return approvals.find(a => String(a.InternID) === String(internId) && Number(a.Month) === Number(month) && Number(a.Year) === Number(year)) || null;
}

function saveApproval(approvalData) {
  const sheet = getSheet('Approvals');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  // Check if approval already exists
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][headers.indexOf('InternID')]) === String(approvalData.internId) &&
        data[i][headers.indexOf('Month')] == approvalData.month &&
        data[i][headers.indexOf('Year')] == approvalData.year) {
      // Update existing
      const row = [approvalData.id, approvalData.internId, approvalData.mentorId,
                   approvalData.month, approvalData.year, today, 'approved'];
      for (let c = 0; c < row.length; c++) {
        sheet.getRange(i + 1, c + 1).setValue(row[c]);
      }
      return { success: true, updated: true };
    }
  }

  sheet.appendRow([
    approvalData.id || ('AP' + new Date().getTime()),
    approvalData.internId,
    approvalData.mentorId,
    approvalData.month,
    approvalData.year,
    today,
    'approved'
  ]);
  return { success: true, created: true };
}

// ====== ADMIN ======
function getAdminStats() {
  const interns = getAllInterns();
  const logbook = getSheetData('Logbook');
  const approvals = getSheetData('Approvals');
  
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const prefix = year + '-' + String(month).padStart(2, '0');
  
  const activeInterns = interns.filter(i => String(i.Status || '').toLowerCase() === 'active');
  
  // Pending approvals = active interns without approval this month
  const pendingApprovalInterns = activeInterns.filter(intern => {
    return !approvals.find(a => String(a.InternID) === String(intern.ID) && a.Month == month && a.Year == year);
  });
  
  const logbookCount = logbook.filter(l => formatDate(l.Date).startsWith(prefix)).length;
  
  const limit = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const expiringContracts = activeInterns.filter(i => {
    const end = new Date(i.ContractEnd);
    return end <= limit && end >= now;
  });
  
  return {
    activeInterns: activeInterns.length,
    pendingApprovals: pendingApprovalInterns.length,
    logbookCount: logbookCount,
    expiringContracts: expiringContracts.length,
    pendingApprovalInterns: pendingApprovalInterns,
    expiringInterns: expiringContracts
  };
}

function getAttendanceRecap(year, month) {
  const interns = getAllInterns();
  const attendance = getSheetData('Attendance');
  const prefix = year + '-' + String(month).padStart(2, '0');
  
  return interns.map(intern => {
    const records = attendance.filter(a => String(a.InternID) === String(intern.ID) && formatDate(a.Date).startsWith(prefix));
    let fullday = 0, halfday = 0, absent = 0;
    
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const rec = records.find(r => formatDate(r.Date) === dateStr);
      if (!rec || rec.Type === 'absent') absent++;
      else if (rec.Type === 'fullday') fullday++;
      else if (rec.Type === 'halfday') halfday++;
      else absent++;
    }
    
    return { ...intern, fullday, halfday, absent };
  });
}

// ====== SYNC USERS FROM RAW ======
/**
 * [DISABLED]
 * Users sheet is now managed via manual spreadsheet formulas by the user.
 * This function is disabled to prevent overwriting those formulas.
 */
function syncUsersFromRaw() {
  return { success: false, error: 'Disabled: Users sheet is managed by manual formulas.' };
}

function generateRandomChars(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * [DISABLED]
 * Creates or updates an admin user with a known password.
 * Disabled because Users sheet uses formulas. Please add admin manually.
 */
function setupAdminUser(password) {
  return { success: false, error: 'Disabled: Please configure admin manually in the Users sheet formulas' };
}

/**
 * [DISABLED]
 * Fixes all Status values in Users sheet to lowercase 'active'/'inactive'
 * Disabled because Users sheet uses formulas.
 */
function fixAllStatuses() {
  return { success: false, error: 'Disabled: Status is managed via formulas now.' };
}

// ====== HELPERS ======
function getSheetData(sheetName) {
  const sheet = getSheet(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => rowToObj(headers, row));
}

function rowToObj(headers, row) {
  const obj = {};
  headers.forEach((h, i) => { 
    let val = row[i];
    if (val instanceof Date) {
      // Google Sheets time-only fields have year 1899
      if (val.getFullYear() === 1899) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'HH:mm');
      } else {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
    }
    obj[h] = val; 
  });
  return obj;
}

function formatDate(d) {
  if (d instanceof Date) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(d);
}

/**
 * Parse DD/MM/YYYY date string to YYYY-MM-DD format
 * Also handles Date objects from Google Sheets
 */
function parseDDMMYYYY(value) {
  if (!value) return '';
  
  // If it's already a Date object (Google Sheets auto-parses dates)
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  
  const str = String(value).trim();
  
  // Check if already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  
  // Parse DD/MM/YYYY
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
    return `${year}-${month}-${day}`;
  }
  
  return str;
}

// ====== SHEET SETUP HELPER ======
// Run this function ONCE to create all sheet headers
function setupSheets() {
  const ss = getActiveSS();
  
  const schemas = {
    'Users': ['ID', 'Nama', 'Status', 'Role', 'Password'],
    'Attendance': ['ID', 'InternID', 'Date', 'ClockIn', 'ClockOut', 'Type'],
    'Logbook': ['ID', 'InternID', 'Date', 'Activity', 'SubmittedAt'],
    'Approvals': ['ID', 'InternID', 'MentorID', 'Month', 'Year', 'ApprovedAt', 'Status'],
    'MonthlyReview': [
      'ID', 'InternID', 'MentorID', 'Month', 'Year',
      'SS_Kedisiplinan', 'SS_Kedisiplinan_Note',
      'SS_Adaptasi', 'SS_Adaptasi_Note',
      'SS_Inisiatif', 'SS_Inisiatif_Note',
      'SS_TanggungJawab', 'SS_TanggungJawab_Note',
      'HS1_Name', 'HS1_Score', 'HS1_Note',
      'HS2_Name', 'HS2_Score', 'HS2_Note',
      'HS3_Name', 'HS3_Score', 'HS3_Note',
      'HS4_Name', 'HS4_Score', 'HS4_Note',
      'HS5_Name', 'HS5_Score', 'HS5_Note',
      'CreatedAt'
    ],
    'FinalEvaluation': [
      'ID', 'InternID', 'MentorID',
      'SecA_1', 'SecA_2', 'SecA_3', 'SecA_4', 'SecA_5', 'SecA_6', 'SecA_7', 'SecA_8',
      'SecA_9', 'SecA_10', 'SecA_11', 'SecA_12', 'SecA_13', 'SecA_14', 'SecA_15', 'SecA_16',
      'SecB1_Name', 'SecB1_P1', 'SecB1_P2', 'SecB1_P3', 'SecB1_P4', 'SecB1_P5',
      'SecB2_Name', 'SecB2_P1', 'SecB2_P2', 'SecB2_P3', 'SecB2_P4', 'SecB2_P5',
      'SecB3_Name', 'SecB3_P1', 'SecB3_P2', 'SecB3_P3', 'SecB3_P4', 'SecB3_P5',
      'SecC_Conclusion',
      'CreatedAt'
    ]
  };
  
  for (const [name, headers] of Object.entries(schemas)) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#1e40af')
      .setFontColor('white');
    sheet.setFrozenRows(1);
  }
  
  Logger.log('All sheets created and configured successfully!');
  Logger.log('Next step: Run syncUsersFromRaw() to generate user accounts from Raw data');
}

/* ============================================
   DATA LAYER — API Client for Google Apps Script
   ============================================ */

const API_URL = 'https://script.google.com/macros/s/AKfycbz8tLIbxgTYIAgCWDicfqXUTGekKV0_B6ayh6z9r5cu_cZhWCfXBTjLJ4IzATeQchjb9w/exec';

// Local storage keys for session only
const DB = {
  CURRENT_USER: 'ims_current_user',
};

// ====== API CACHE ======
const _apiCache = {};
const CACHE_TTL = 60000; // 60 seconds

// Actions that modify data should never be cached
const WRITE_ACTIONS = ['login','clockIn','clockOut','submitLogbook','updateLogbook','submitReview','saveApproval','submitFinalEval','updateInternStatus','setupAdmin','fixAllStatuses'];

function clearAllCache() {
  for (const key in _apiCache) delete _apiCache[key];
}

function invalidateCache(prefix) {
  for (const key in _apiCache) {
    if (key.startsWith(prefix + '|') || key === prefix) delete _apiCache[key];
  }
}

/**
 * Generic API Call wrapper with caching for read operations
 */
async function apiCall(action, params = {}) {
  const formData = new URLSearchParams();
  formData.append('action', action);
  
  for (const key in params) {
    if (typeof params[key] === 'object') {
      formData.append(key, JSON.stringify(params[key]));
    } else {
      formData.append(key, params[key]);
    }
  }

  const queryString = formData.toString();
  const requestUrl = API_URL + (API_URL.includes('?') ? '&' : '?') + queryString;
  const cacheKey = action + '|' + queryString;

  // Return cached result for read actions
  const isWrite = WRITE_ACTIONS.includes(action);
  if (!isWrite && _apiCache[cacheKey] && (Date.now() - _apiCache[cacheKey].ts < CACHE_TTL)) {
    return _apiCache[cacheKey].data;
  }

  try {
    const response = await fetch(requestUrl, { method: 'GET' });
    let result;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      result = await response.json();
    } else {
      const text = await response.text();
      let msg = "Google returned HTML instead of JSON. ";
      if (text.includes("<title>Sign in")) msg += "It asked for Google Login. You MUST set 'Who has access' to 'Anyone'.";
      else if (text.includes("ScriptError") || text.includes("SyntaxError")) msg += "There is a Syntax Error in Code.gs.";
      else msg += "First 50 chars: " + text.substring(0, 50).replace(/</g, "&lt;");
      throw new Error(msg);
    }
    
    if (result && result.error) {
      console.error(`API Error [${action}]:`, result.error);
      throw new Error(result.error);
    }
    // Cache read results
    if (!isWrite) {
      _apiCache[cacheKey] = { data: result, ts: Date.now() };
    } else {
      // Write actions invalidate related caches
      clearAllCache();
    }
    return result;
  } catch (err) {
    console.error('Fetch error:', err);
    throw err;
  }
}

/* ---------- INIT & AUTH ---------- */
function initData() {
  // No longer needed to seed local storage, kept for backwards compatibility in app.js
}

async function loginUser(password) {
  const res = await apiCall('login', { password });
  if (res.success && res.user) {
    sessionStorage.setItem(DB.CURRENT_USER, JSON.stringify(res.user));
    return res.user;
  }
  return null;
}

function getCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem(DB.CURRENT_USER)); }
  catch { return null; }
}

function logoutUser() { 
  sessionStorage.removeItem(DB.CURRENT_USER);
  clearAllCache();
  window._usersCache = null;
  _cachedInterns = [];
}

/* ---------- INTERNS ---------- */
async function getInterns() { 
  return await apiCall('getInterns');
}

async function getInternsByMentor(mentorId) {
  return await apiCall('getInternsByMentor', { mentorId });
}

// Kept synchronous just for easy retrieval of the currently viewed intern 
// if we pre-fetched them. In real world, we'd fetch them or cache the list.
let _cachedInterns = [];
function setCachedInterns(list) { _cachedInterns = list; }
function getInternById(internId) {
  return _cachedInterns.find(i => i.ID === internId || i.id === internId);
}

async function updateInternStatus(internId, status) {
  return await apiCall('updateInternStatus', { internId, status });
}

/* ---------- ATTENDANCE ---------- */
async function getAttendanceByInternAndMonth(internId, year, month) {
  return await apiCall('getAttendance', { internId, year, month });
}

async function clockIn(internId) {
  return await apiCall('clockIn', { internId });
}

async function clockOut(internId, forceType = null) {
  return await apiCall('clockOut', { internId, forceType: forceType || '' });
}

/* ---------- LOGBOOK ---------- */
async function getLogbookByInternAndMonth(internId, year, month) {
  return await apiCall('getLogbook', { internId, year, month });
}

async function addLogbookEntry(internId, activity) {
  return await apiCall('submitLogbook', { internId, activity });
}

async function updateLogbookEntry(entryId, date, activity) {
  return await apiCall('updateLogbook', { entryId, date, activity });
}

/* ---------- MONTHLY REVIEWS & APPROVALS ---------- */
async function getReview(internId, month, year) {
  try {
    const res = await apiCall('getReview', { internId, month, year });
    return res || null;
  } catch (e) {
    const msg = String(e.message || '').toLowerCase();
    if (msg.includes('not found') || msg.includes('no data') || msg.includes('no record') || msg.includes('undefined')) {
      return null;
    }
    throw e;
  }
}

async function saveMonthlyReview(reviewData) {
  // reviewData contains internId, mentorId, month, year, softSkills, hardSkills
  return await apiCall('submitReview', { data: reviewData });
}

async function getApproval(internId, month, year) {
  try {
    const res = await apiCall('getApproval', { internId, month, year });
    return res || null;
  } catch (e) {
    const msg = String(e.message || '').toLowerCase();
    if (msg.includes('not found') || msg.includes('no data') || msg.includes('no record') || msg.includes('undefined')) {
      return null;
    }
    throw e;
  }
}

// Since the new backend doesn't have an explicit 'submitApproval' endpoint (it was added to Approvals sheet)
// wait, we need an endpoint for it!
async function saveApproval(approvalData) {
  return await apiCall('saveApproval', { data: approvalData });
}

/* ---------- FINAL EVALUATIONS ---------- */
async function getFinalEvalByIntern(internId) {
  // "Not found" is valid (intern has no eval yet) — return null instead of throwing.
  try {
    const res = await apiCall('getFinalEval', { internId });
    return res || null;
  } catch (e) {
    const msg = String(e.message || '').toLowerCase();
    if (msg.includes('not found') || msg.includes('no data') || msg.includes('no record') || msg.includes('undefined')) {
      return null;
    }
    throw e;
  }
}

async function saveFinalEvaluation(evaluationData) {
  return await apiCall('submitFinalEval', { data: evaluationData });
}

/* ---------- ADMIN HELPERS ---------- */
async function getAdminStats() {
  return await apiCall('getAdminStats');
}

async function getAttendanceRecap(year, month) {
  return await apiCall('getAttendanceRecap', { year, month });
}

/* ---------- UTILITY ---------- */
function formatDateISO(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
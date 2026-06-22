// ── SUPABASE CONFIG ──────────────────────────────────────
// 1. Go to supabase.com → your project → Settings → API
// 2. Paste your Project URL and anon key below
const SUPABASE_URL  = 'https://gvxdabtmksxhujeytofv.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_eERuVHBjTdhkIxpWvCX62A_3bMoXgAn';
const SUPABASE_ANON = SUPABASE_KEY;

const sb = (typeof supabase !== 'undefined')
  ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

let currentUser = null;

// Preview-As mode: admin views the portal as a specific athlete (read-only).
// Set by ?preview_as=<userId> in the URL, guarded by juke_auth.type === 'admin'.
window.PREVIEW_USER_ID = (function(){
  var uid = new URLSearchParams(location.search).get('preview_as');
  if (!uid) return null;
  try { if (JSON.parse(localStorage.getItem('juke_auth') || '{}').type !== 'admin') return null; }
  catch(e) { return null; }
  return uid;
})();

// Load curated school-logo overrides (school-logos bucket → programs.logo_url).
// The resolver auto-repaints any [data-logo] wrappers once the map arrives.
if(sb && window.loadSchoolLogoOverrides) loadSchoolLogoOverrides(sb);

// Auth state listener — fires on page load and on login/logout
if(sb){
  sb.auth.onAuthStateChange(async (event, session) => {
    currentUser = session?.user ?? null;
    // Preview mode: substitute preview athlete's ID so all data reads target their account
    if(window.PREVIEW_USER_ID && currentUser){
      currentUser = Object.assign({}, currentUser, { id: window.PREVIEW_USER_ID });
    }
    if(currentUser && window.JukeOnboarding) JukeOnboarding.start('athlete');
    if(typeof _updateAuthUI === 'function') _updateAuthUI();
    if(currentUser && event === 'SIGNED_IN' && typeof _syncFromCloud === 'function'){
      await _syncFromCloud();
      if(typeof showToast==='function') showToast('Board synced to cloud ✓');
      // Refresh board sync notice now that user is signed in
      if(typeof _renderBoardCols==='function') _renderBoardCols();
    }
    if(currentUser && event === 'INITIAL_SESSION' && typeof _syncFromCloud === 'function'){
      await _syncFromCloud();
    }
    if(currentUser && event === 'INITIAL_SESSION' && typeof initMessaging === 'function') await initMessaging();
  });
  // Fallback: if admin has no Supabase session, bootstrap preview with a stub user
  if(window.PREVIEW_USER_ID){
    setTimeout(async function(){
      if(currentUser) return;
      currentUser = { id: window.PREVIEW_USER_ID, email: '' };
      if(typeof _updateAuthUI === 'function') _updateAuthUI();
      if(typeof _syncFromCloud === 'function') await _syncFromCloud();
    }, 800);
  }
}

// ── SCHOOL DOMAINS ────────────────────────────────────────
// Map lives in js/data-school-domains.js (window.SCHOOL_DOMAINS),
// shared with the coach portals which do not load this file.
const SCHOOL_DOMAINS = window.SCHOOL_DOMAINS || {};

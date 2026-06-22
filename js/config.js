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

// Load curated school-logo overrides (school-logos bucket → programs.logo_url).
// The resolver auto-repaints any [data-logo] wrappers once the map arrives.
if(sb && window.loadSchoolLogoOverrides) loadSchoolLogoOverrides(sb);

// Auth state listener — fires on page load and on login/logout
if(sb){
  sb.auth.onAuthStateChange(async (event, session) => {
    currentUser = session?.user ?? null;
    if(currentUser && window.JukeOnboarding) JukeOnboarding.start('athlete');
    if(typeof _updateAuthUI === 'function') _updateAuthUI();
    if(currentUser && event === 'SIGNED_IN' && typeof _syncFromCloud === 'function'){
      await _syncFromCloud();
      if(typeof showToast==='function') showToast('Board synced to cloud ✓');
      // Refresh board sync notice now that user is signed in
      if(typeof _renderBoardCols==='function') _renderBoardCols();
    }
    if(currentUser && event === 'INITIAL_SESSION' && typeof initMessaging === 'function') await initMessaging();
  });
}

// ── SCHOOL DOMAINS ────────────────────────────────────────
// Map lives in js/data-school-domains.js (window.SCHOOL_DOMAINS),
// shared with the coach portals which do not load this file.
const SCHOOL_DOMAINS = window.SCHOOL_DOMAINS || {};

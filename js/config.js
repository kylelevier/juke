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
// Set by ?preview_as=<userId> in the URL. Guard mirrors admin-portal-init.js:
// accepts juke_auth.type==='admin' OR a Supabase session belonging to an admin email.
window.PREVIEW_USER_ID = (function(){
  var uid = new URLSearchParams(location.search).get('preview_as');
  if (!uid) return null;
  var ADMIN_EMAILS = ['kylelevier@gmail.com'];
  try { if (JSON.parse(localStorage.getItem('juke_auth') || '{}').type === 'admin') return uid; } catch(e) {}
  try {
    var raw = localStorage.getItem('sb-gvxdabtmksxhujeytofv-auth-token');
    if (raw && ADMIN_EMAILS.indexOf(JSON.parse(raw).user.email) !== -1) return uid;
  } catch(e) {}
  return null;
})();

// In preview mode, block any signout so the Supabase session (and thus data access)
// stays intact. signOut would wipe the session from shared localStorage, leaving
// _syncFromCloud unauthenticated and RLS-blocked for the rest of the preview.
if(window.PREVIEW_USER_ID && sb){
  sb.auth.signOut = function(){ return Promise.resolve({error:null}); };
}

// Load curated school-logo overrides (school-logos bucket → programs.logo_url).
// The resolver auto-repaints any [data-logo] wrappers once the map arrives.
if(sb && window.loadSchoolLogoOverrides) loadSchoolLogoOverrides(sb);

// Auth state listener — fires on page load and on login/logout
if(sb){
  sb.auth.onAuthStateChange(async (event, session) => {
    currentUser = session?.user ?? null;
    // Preview mode: sign-out inside the iframe must not collapse the view —
    // restore the stub user immediately and re-sync so Ella's data stays visible.
    if(window.PREVIEW_USER_ID && event === 'SIGNED_OUT'){
      currentUser = { id: window.PREVIEW_USER_ID, email: '' };
      if(typeof _updateAuthUI === 'function') _updateAuthUI();
      if(typeof _syncFromCloud === 'function') await _syncFromCloud();
      return;
    }
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
  // Preview mode: _syncFromCloud may not exist yet when INITIAL_SESSION fires
  // (auth.js loads after config.js). Always re-run it once scripts are ready.
  if(window.PREVIEW_USER_ID){
    setTimeout(async function(){
      if(!currentUser){
        currentUser = { id: window.PREVIEW_USER_ID, email: '' };
        if(typeof _updateAuthUI === 'function') _updateAuthUI();
      }
      if(typeof _syncFromCloud === 'function') await _syncFromCloud();
    }, 800);
  }
}

// ── SCHOOL DOMAINS ────────────────────────────────────────
// Map lives in js/data-school-domains.js (window.SCHOOL_DOMAINS),
// shared with the coach portals which do not load this file.
const SCHOOL_DOMAINS = window.SCHOOL_DOMAINS || {};

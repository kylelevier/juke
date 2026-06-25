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

// Environment flag — true when running locally (dev/staging).
window.JUKE_ENV = {
  dev: location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname.endsWith('.local')
};

// Preview-As mode: admin views a server-provided read-only athlete bundle.
// The target id comes from the URL, but access must be granted by the backend RPC.
window.PREVIEW_TARGET_USER_ID = new URLSearchParams(location.search).get('preview_as') || null;
window.PREVIEW_USER_ID = null;
window.PREVIEW_BUNDLE = null;
window.PREVIEW_PROFILE = null;
window.PREVIEW_ERROR = null;

function _renderPreviewGateError(message){
  window.PREVIEW_ERROR = message || 'Preview could not be loaded.';
  var banner = document.getElementById('preview-mode-banner');
  if (banner) {
    banner.style.display = 'flex';
    banner.style.background = '#7f1d1d';
    var label = document.getElementById('preview-mode-label');
    var notice = document.getElementById('preview-mode-notice');
    if (label) label.textContent = 'Preview unavailable';
    if (notice) notice.textContent = window.PREVIEW_ERROR;
  }
}

async function loadAdminPreviewBundle(){
  if(!window.PREVIEW_TARGET_USER_ID) return null;
  if(window.PREVIEW_BUNDLE) return window.PREVIEW_BUNDLE;
  if(!sb){
    _renderPreviewGateError('Supabase is unavailable.');
    return null;
  }
  try{
    const {data,error}=await sb.rpc('admin_get_athlete_preview', {target_user_id: window.PREVIEW_TARGET_USER_ID});
    if(error){
      _renderPreviewGateError(error.message || 'Preview RPC failed.');
      return null;
    }
    window.PREVIEW_BUNDLE = data || {};
    window.PREVIEW_USER_ID = window.PREVIEW_TARGET_USER_ID;
    window.PREVIEW_PROFILE = window.PREVIEW_BUNDLE.profile || window.PREVIEW_BUNDLE.profile_data || window.PREVIEW_BUNDLE.player_data?.profile || null;
    return window.PREVIEW_BUNDLE;
  }catch(e){
    _renderPreviewGateError(e && e.message ? e.message : 'Preview RPC failed.');
    return null;
  }
}

// In preview mode, block any signout so the Supabase session (and thus data access)
// stays intact. signOut would wipe the session from shared localStorage, leaving
// _syncFromCloud unauthenticated and RLS-blocked for the rest of the preview.
if(window.PREVIEW_TARGET_USER_ID && sb){
  sb.auth.signOut = function(){ return Promise.resolve({error:null}); };
}

// Load curated school-logo overrides (school-logos bucket → programs.logo_url).
// The resolver auto-repaints any [data-logo] wrappers once the map arrives.
if(sb && window.loadSchoolLogoOverrides) loadSchoolLogoOverrides(sb);

// Auth state listener — fires on page load and on login/logout
if(sb){
  sb.auth.onAuthStateChange(async (event, session) => {
    currentUser = session?.user ?? null;
    // Preview mode: never authorize from URL/localStorage. The backend RPC must
    // return a read-only bundle before any athlete data is rendered.
    if(window.PREVIEW_TARGET_USER_ID){
      if(!currentUser){
        _renderPreviewGateError('Admin sign-in required.');
        if(typeof _updateAuthUI === 'function') _updateAuthUI();
        return;
      }
      const previewBundle = await loadAdminPreviewBundle();
      if(!previewBundle){
        if(typeof _updateAuthUI === 'function') _updateAuthUI();
        return;
      }
      if(typeof _updateAuthUI === 'function') _updateAuthUI();
      if(typeof _syncFromCloud === 'function') await _syncFromCloud();
      return;
    }
    if(currentUser){
      try{
        const {data:profile}=await sb.from('user_profiles').select('is_active').eq('id',currentUser.id).maybeSingle();
        if(profile && profile.is_active===false){
          await sb.auth.signOut();
          currentUser=null;
          localStorage.removeItem('juke_auth');
          location.replace('/login.html');
          return;
        }
      }catch(e){}
    }
    if(currentUser && window.JukeOnboarding) JukeOnboarding.start('athlete');
    if(typeof _updateAuthUI === 'function') _updateAuthUI();
    if(currentUser && event === 'SIGNED_IN' && typeof _syncFromCloud === 'function'){
      await _syncFromCloud();
      if(typeof showToast==='function') showToast('Board synced.','info');
      // Refresh board sync notice now that user is signed in
      if(typeof _renderBoardCols==='function') _renderBoardCols();
    }
    if(currentUser && event === 'INITIAL_SESSION' && typeof _syncFromCloud === 'function'){
      await _syncFromCloud();
    }
    if(currentUser && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && typeof initMessaging === 'function') await initMessaging();
  });
  // Preview mode: _syncFromCloud may not exist yet when INITIAL_SESSION fires
  // (auth.js loads after config.js). Always re-run it once scripts are ready.
  if(window.PREVIEW_TARGET_USER_ID){
    setTimeout(async function(){
      if(await loadAdminPreviewBundle() && typeof _syncFromCloud === 'function') await _syncFromCloud();
    }, 800);
  }
}

// ── SCHOOL DOMAINS ────────────────────────────────────────
// Map lives in js/data-school-domains.js (window.SCHOOL_DOMAINS),
// shared with the coach portals which do not load this file.
const SCHOOL_DOMAINS = window.SCHOOL_DOMAINS || {};

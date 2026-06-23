// ── Supabase init (coach portal) ──────────────────────────────
var SUPABASE_URL  = 'https://gvxdabtmksxhujeytofv.supabase.co';
var SUPABASE_KEY  = 'sb_publishable_eERuVHBjTdhkIxpWvCX62A_3bMoXgAn';
var sb = (typeof supabase !== 'undefined')
  ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;
var currentUser = null;

if (sb) {
  sb.auth.onAuthStateChange(function(event, session) {
    currentUser = (session && session.user) ? session.user : null;
    _updateCoachAuthUI();
  });
}

// Load curated school-logo overrides (school-logos bucket → programs.logo_url).
if (sb && window.loadSchoolLogoOverrides) {
  loadSchoolLogoOverrides(sb, function(){ if (typeof loadSchoolLogo === 'function') loadSchoolLogo(); });
}

function _updateCoachAuthUI() {
  var chip    = document.getElementById('juke-user-chip');
  var signinBtn = document.getElementById('coach-signin-btn');
  if (!chip || !signinBtn) return;

  var localAuth = {};
  try { localAuth = JSON.parse(localStorage.getItem('juke_auth') || '{}'); } catch(e) {}

  if (!currentUser && localAuth.name) {
    signinBtn.style.display = 'none';
    if (!chip.innerHTML) chip.style.display = 'none';
    return;
  }

  if (!currentUser) {
    chip.style.display    = 'none';
    chip.innerHTML        = '';
    signinBtn.style.display = '';
    return;
  }

  signinBtn.style.display = 'none';
  chip.style.display = 'flex';

  var auth = localAuth || {};
  var name    = auth.name || currentUser.email || 'Coach';
  var org     = (auth.profiles && auth.profiles[0] && auth.profiles[0].org) || '';
  var initials = name.split(/\s+/).map(function(w){ return w[0]||''; }).join('').slice(0,2).toUpperCase();

  chip.innerHTML =
    '<div class="juke-user-av" style="cursor:pointer;background:#7B2FFF" onclick="_toggleCoachChip()">' + initials + '</div>'
    + '<div id="juke-chip-dd" class="juke-chip-dd">'
      + '<div class="juke-chip-dd-header">'
        + '<div class="juke-chip-dd-name">' + name + '</div>'
        + '<div class="juke-chip-dd-role">Recruiter' + (org ? ' · ' + org : '') + '</div>'
      + '</div>'
      + '<div class="juke-chip-dd-section">'
        + '<button class="juke-chip-dd-item juke-chip-dd-logout" onclick="coachSignOut()">Sign Out</button>'
      + '</div>'
    + '</div>';

  // Close dropdown on outside click
  setTimeout(function(){
    document.addEventListener('click', function closeDD(e){
      var c = document.getElementById('juke-user-chip');
      if (c && !c.contains(e.target)) {
        var dd = document.getElementById('juke-chip-dd');
        if (dd) dd.classList.remove('open');
        document.removeEventListener('click', closeDD);
      }
    });
  }, 0);
}

function _toggleCoachChip() {
  var dd = document.getElementById('juke-chip-dd');
  if (dd) dd.classList.toggle('open');
}

// ── Auth modal helpers ─────────────────────────────────────────
function openCoachAuth() {
  showCoachSignIn();
  var overlay = document.getElementById('coach-auth-overlay');
  overlay.classList.add('open');
  if(window.JukeDialog) window.JukeDialog.open(overlay, {close: closeCoachAuth, focus: document.getElementById('coach-auth-email')});
}

function closeCoachAuth(e) {
  var overlay = document.getElementById('coach-auth-overlay');
  if (!e || e.target === overlay) {
    overlay.classList.remove('open');
    if(window.JukeDialog) window.JukeDialog.close(overlay);
  }
}

function showCoachSignIn() {
  document.getElementById('coach-auth-signin-panel').style.display = '';
  document.getElementById('coach-auth-signup-panel').style.display = 'none';
  document.querySelector('#coach-auth-overlay [role="dialog"]').setAttribute('aria-labelledby','coach-auth-signin-title');
  var m = document.getElementById('coach-auth-msg'); if(m) { m.textContent=''; m.className='coach-auth-msg'; }
}

function showCoachSignUp() {
  document.getElementById('coach-auth-signin-panel').style.display = 'none';
  document.getElementById('coach-auth-signup-panel').style.display = '';
  document.querySelector('#coach-auth-overlay [role="dialog"]').setAttribute('aria-labelledby','coach-auth-signup-title');
  var m = document.getElementById('coach-auth-msg-up'); if(m) { m.textContent=''; m.className='coach-auth-msg'; }
}

async function coachSignIn() {
  if (!sb) return;
  var email = document.getElementById('coach-auth-email').value.trim();
  var pw    = document.getElementById('coach-auth-pw').value;
  var btn   = document.getElementById('coach-auth-btn');
  var msg   = document.getElementById('coach-auth-msg');
  btn.disabled = true; btn.textContent = 'Signing in…'; msg.className = 'coach-auth-msg';
  var r = await sb.auth.signInWithPassword({ email: email, password: pw });
  btn.disabled = false; btn.textContent = 'Sign In';
  if (r.error) { msg.textContent = r.error.message; msg.className = 'coach-auth-msg error'; }
  else if (r.data && r.data.user && !(await _coachEnsureActive(r.data.user.id, msg))) { return; }
  else { closeCoachAuth(); }
}

async function _coachEnsureActive(userId, msg) {
  try {
    var pr = await sb.from('user_profiles').select('is_active').eq('id', userId).maybeSingle();
    if (pr.data && pr.data.is_active === false) {
      await sb.auth.signOut();
      localStorage.removeItem('juke_auth');
      msg.textContent = 'This account has been disabled. Contact JUKE support.';
      msg.className = 'coach-auth-msg error';
      return false;
    }
  } catch(e) {}
  return true;
}

async function coachSignUp() {
  if (!sb) return;
  var email = document.getElementById('coach-auth-email-up').value.trim();
  var pw    = document.getElementById('coach-auth-pw-up').value;
  var btn   = document.getElementById('coach-auth-btn-up');
  var msg   = document.getElementById('coach-auth-msg-up');
  btn.disabled = true; btn.textContent = 'Creating…'; msg.className = 'coach-auth-msg';
  var r = await sb.auth.signUp({ email: email, password: pw });
  btn.disabled = false; btn.textContent = 'Create Account';
  if (r.error) { msg.textContent = r.error.message; msg.className = 'coach-auth-msg error'; }
  else { msg.textContent = 'Account created! Check your email to confirm, then sign in.'; msg.className = 'coach-auth-msg success'; }
}

async function coachSignOut() {
  if (sb) await sb.auth.signOut();
  currentUser = null;
  localStorage.removeItem('juke_auth');
  _updateCoachAuthUI();
  location.replace('../index.html');
}

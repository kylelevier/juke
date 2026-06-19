/**
 * JUKE Internal Dev Bar
 * Persistent portal switcher — loads on all three portals.
 * Handles both auth systems (Supabase for athlete, localStorage for coaches).
 * Auto-logins athlete with stored credentials so switching is always one click.
 */
(function() {
  'use strict';

  // Only render for internal users (flag set by /preview)
  if (localStorage.getItem('_juke_internal') !== '1') return;

  var SB_URL  = 'https://gvxdabtmksxhujeytofv.supabase.co';
  var SB_KEY  = 'sb_publishable_eERuVHBjTdhkIxpWvCX62A_3bMoXgAn';
  var SB_STORE_KEY = 'sb-gvxdabtmksxhujeytofv-auth-token';
  var CRED_KEY     = '_juke_dev_athlete';

  // ── Detect current portal ─────────────────────────────────────────
  var path     = window.location.pathname;
  var PORTAL   = path.indexOf('/athlete') !== -1 ? 'athlete'
               : path.indexOf('/coach')   !== -1 && path.indexOf('/hscoach') === -1 ? 'coach'
               : path.indexOf('/hscoach') !== -1 ? 'hscoach'
               : 'unknown';

  // ── Inject styles ─────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#_jdb{position:fixed;bottom:0;left:0;right:0;z-index:99999;',
      'background:rgba(10,10,12,.94);backdrop-filter:blur(12px);',
      'border-top:1px solid rgba(255,255,255,.1);',
      'font-family:-apple-system,system-ui,sans-serif;',
      'height:48px;display:flex;align-items:center;padding:0 16px;gap:12px;}',

    '#_jdb-logo{font-family:"Archivo Condensed",sans-serif;font-size:13px;font-weight:900;',
      'letter-spacing:.1em;text-transform:uppercase;',
      'background:linear-gradient(90deg,#ff0080,#7b2fff);',
      '-webkit-background-clip:text;-webkit-text-fill-color:transparent;',
      'background-clip:text;flex-shrink:0;}',

    '#_jdb-div{width:1px;height:20px;background:rgba(255,255,255,.12);flex-shrink:0;}',

    '#_jdb-tabs{display:flex;gap:4px;}',

    '._jdb-tab{height:32px;padding:0 13px;border-radius:8px;border:1px solid rgba(255,255,255,.1);',
      'background:transparent;color:rgba(255,255,255,.45);cursor:pointer;',
      'font-family:"Archivo Condensed",sans-serif;font-size:11px;font-weight:700;',
      'letter-spacing:.08em;text-transform:uppercase;transition:all .15s;white-space:nowrap;}',

    '._jdb-tab:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.85);}',
    '._jdb-tab.active{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25);}',
    '._jdb-tab.athlete-tab.active{border-color:rgba(255,0,128,.5);color:#ff0080;background:rgba(255,0,128,.1);}',
    '._jdb-tab.coach-tab.active{border-color:rgba(123,47,255,.5);color:#a064ff;background:rgba(123,47,255,.1);}',
    '._jdb-tab.hs-tab.active{border-color:rgba(0,87,255,.5);color:#4d94ff;background:rgba(0,87,255,.1);}',

    '#_jdb-session{margin-left:auto;display:flex;align-items:center;gap:8px;flex-shrink:0;}',

    '#_jdb-user{font-size:11px;color:rgba(255,255,255,.35);max-width:200px;',
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '#_jdb-user strong{color:rgba(255,255,255,.6);font-weight:600;}',

    '#_jdb-dot{width:7px;height:7px;border-radius:50%;background:#444;flex-shrink:0;}',
    '#_jdb-dot.on{background:#00e050;box-shadow:0 0 5px rgba(0,224,80,.6);}',

    '/* Login panel */',
    '#_jdb-login{display:none;position:fixed;bottom:56px;right:16px;z-index:99999;',
      'background:#1a1a1f;border:1px solid rgba(255,255,255,.15);border-radius:12px;',
      'padding:20px;width:280px;box-shadow:0 8px 32px rgba(0,0,0,.5);}',
    '#_jdb-login h4{font-family:"Archivo Condensed",sans-serif;font-size:14px;font-weight:900;',
      'text-transform:uppercase;letter-spacing:.06em;color:#fff;margin-bottom:4px;}',
    '#_jdb-login p{font-size:11px;color:rgba(255,255,255,.4);margin-bottom:14px;line-height:1.5;}',
    '._jdb-input{width:100%;height:34px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);',
      'border-radius:6px;padding:0 10px;font-size:12px;color:#fff;margin-bottom:8px;box-sizing:border-box;}',
    '._jdb-input:focus{outline:none;border-color:rgba(255,0,128,.5);}',
    '._jdb-input::placeholder{color:rgba(255,255,255,.25);}',
    '#_jdb-login-err{font-size:11px;color:#ff6060;margin-bottom:8px;min-height:14px;}',
    '#_jdb-login-btn{width:100%;height:34px;background:#ff0080;border:0;border-radius:6px;',
      'color:#fff;font-family:"Archivo Condensed",sans-serif;font-size:12px;font-weight:800;',
      'letter-spacing:.08em;text-transform:uppercase;cursor:pointer;}',
    '#_jdb-login-btn:hover{background:#e60073;}',
    '#_jdb-login-cancel{width:100%;margin-top:8px;background:none;border:0;',
      'font-size:11px;color:rgba(255,255,255,.3);cursor:pointer;padding:4px;}',
    '#_jdb-login-cancel:hover{color:rgba(255,255,255,.6);}'
  ].join('');
  document.head.appendChild(style);

  // ── Inject HTML ───────────────────────────────────────────────────
  var bar = document.createElement('div');
  bar.id = '_jdb';
  bar.innerHTML = [
    '<span id="_jdb-logo">Juke</span>',
    '<div id="_jdb-div"></div>',
    '<div id="_jdb-tabs">',
      '<button class="_jdb-tab athlete-tab" id="_jdb-t-athlete" onclick="_jdbGo(\'athlete\')">🏃‍♀️ Athlete</button>',
      '<button class="_jdb-tab coach-tab"   id="_jdb-t-coach"   onclick="_jdbGo(\'coach\')">🏟️ College Coach</button>',
      '<button class="_jdb-tab hs-tab"      id="_jdb-t-hs"      onclick="_jdbGo(\'hscoach\')">📋 HS Coach</button>',
    '</div>',
    '<div id="_jdb-session">',
      '<div id="_jdb-dot"></div>',
      '<div id="_jdb-user">···</div>',
    '</div>'
  ].join('');
  document.body.appendChild(bar);

  // Login panel (for athlete credential setup)
  var loginPanel = document.createElement('div');
  loginPanel.id = '_jdb-login';
  loginPanel.innerHTML = [
    '<h4>Athlete Login</h4>',
    '<p>Enter your test athlete credentials.<br>Saved locally — one time only.</p>',
    '<input class="_jdb-input" id="_jdb-em" type="email" placeholder="Email" autocomplete="email"/>',
    '<input class="_jdb-input" id="_jdb-pw" type="password" placeholder="Password" autocomplete="current-password"/>',
    '<div id="_jdb-login-err"></div>',
    '<button id="_jdb-login-btn" onclick="_jdbAthleteLogin()">Sign in &amp; switch</button>',
    '<button id="_jdb-login-cancel" onclick="_jdbCloseLogin()">Cancel</button>'
  ].join('');
  document.body.appendChild(loginPanel);

  // Give content breathing room above the bar
  document.body.style.paddingBottom = '56px';

  // ── Mark active tab ───────────────────────────────────────────────
  var activeTab = document.getElementById('_jdb-t-' + (PORTAL === 'hscoach' ? 'hs' : PORTAL));
  if (activeTab) activeTab.classList.add('active');

  // ── Session display ───────────────────────────────────────────────
  function refreshStatus() {
    var dot  = document.getElementById('_jdb-dot');
    var user = document.getElementById('_jdb-user');

    if (PORTAL === 'athlete') {
      // Read Supabase session
      var sb = _getSbSession();
      if (sb) {
        dot.className = '_jdb-dot on';
        user.innerHTML = '<strong>' + (sb.name || sb.email) + '</strong> · Athlete';
      } else {
        dot.className = '_jdb-dot';
        user.innerHTML = 'Not signed in';
      }
    } else {
      // Read juke_auth
      var auth = _getCoachAuth();
      if (auth && auth.name) {
        dot.className = '_jdb-dot on';
        var roleLabel = auth.type === 'college_coach' ? 'College Coach' : 'HS Coach';
        user.innerHTML = '<strong>' + auth.name + '</strong> · ' + roleLabel;
      } else {
        dot.className = '_jdb-dot';
        user.innerHTML = 'No session';
      }
    }
  }

  // ── Auth helpers ──────────────────────────────────────────────────
  function _getSbSession() {
    try {
      var raw = localStorage.getItem(SB_STORE_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      var u = d.user || (d.session && d.session.user);
      if (!u) return null;
      var meta = u.user_metadata || {};
      return { email: u.email, name: meta.full_name || meta.name || u.email };
    } catch(e) { return null; }
  }

  function _getCoachAuth() {
    try { return JSON.parse(localStorage.getItem('juke_auth')); } catch(e) { return null; }
  }

  function _setCoachAuth(type) {
    var existing = _getCoachAuth();
    var name = (existing && existing.name) || 'Kyle';
    var auth = { type: type, name: name };
    if (existing && existing.school) auth.school = existing.school;
    localStorage.setItem('juke_auth', JSON.stringify(auth));
  }

  function _getStoredCreds() {
    try { return JSON.parse(localStorage.getItem(CRED_KEY)); } catch(e) { return null; }
  }

  // ── Navigation ────────────────────────────────────────────────────
  window._jdbGo = function(target) {
    if (target === PORTAL || (target === 'hscoach' && PORTAL === 'hscoach')) {
      // Already here — do nothing
      return;
    }

    if (target === 'athlete') {
      _jdbGoAthlete();
    } else if (target === 'coach') {
      _setCoachAuth('college_coach');
      window.location.href = '/coach';
    } else if (target === 'hscoach') {
      _setCoachAuth('hs_coach');
      window.location.href = '/hscoach';
    }
  };

  function _jdbGoAthlete() {
    // 1. Already have a live Supabase session → just navigate
    if (_getSbSession()) {
      window.location.href = '/athlete';
      return;
    }

    // 2. Have stored credentials → auto-login then navigate
    var creds = _getStoredCreds();
    if (creds && creds.email && creds.pass) {
      _jdbAutoLogin(creds.email, creds.pass, function(err) {
        if (err) {
          // Credentials stale — clear and show login panel
          localStorage.removeItem(CRED_KEY);
          _jdbOpenLogin();
        } else {
          window.location.href = '/athlete';
        }
      });
      return;
    }

    // 3. No session, no creds → show login panel
    _jdbOpenLogin();
  }

  // ── Supabase auth (self-contained fetch, no SDK required) ─────────
  function _jdbAutoLogin(email, pass, cb) {
    fetch(SB_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY
      },
      body: JSON.stringify({ email: email, password: pass })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.error || !data.access_token) {
        cb(data.error || 'Login failed');
        return;
      }
      // Write session into Supabase localStorage format
      var session = {
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
        expires_at:    Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
        token_type:    'bearer',
        user:          data.user,
        session: { user: data.user }
      };
      localStorage.setItem(SB_STORE_KEY, JSON.stringify(session));
      cb(null);
    })
    .catch(function(e) { cb(e.message || 'Network error'); });
  }

  // ── Login panel ───────────────────────────────────────────────────
  function _jdbOpenLogin() {
    loginPanel.style.display = 'block';
    setTimeout(function() {
      var em = document.getElementById('_jdb-em');
      if (em) em.focus();
    }, 50);
  }

  window._jdbCloseLogin = function() {
    loginPanel.style.display = 'none';
    document.getElementById('_jdb-login-err').textContent = '';
  };

  window._jdbAthleteLogin = function() {
    var email = (document.getElementById('_jdb-em').value || '').trim();
    var pass  = (document.getElementById('_jdb-pw').value || '').trim();
    var errEl = document.getElementById('_jdb-login-err');
    var btn   = document.getElementById('_jdb-login-btn');

    if (!email || !pass) { errEl.textContent = 'Enter email and password.'; return; }

    btn.textContent = 'Signing in…';
    btn.disabled = true;
    errEl.textContent = '';

    _jdbAutoLogin(email, pass, function(err) {
      btn.textContent = 'Sign in & switch';
      btn.disabled = false;
      if (err) {
        errEl.textContent = typeof err === 'string' ? err : 'Wrong email or password.';
        return;
      }
      // Store credentials for future auto-login
      localStorage.setItem(CRED_KEY, JSON.stringify({ email: email, pass: pass }));
      loginPanel.style.display = 'none';
      window.location.href = '/athlete';
    });
  };

  // Allow Enter key in login fields
  ['_jdb-em', '_jdb-pw'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') window._jdbAthleteLogin();
    });
  });

  // ── Init ──────────────────────────────────────────────────────────
  refreshStatus();

})();

(function(){
  var SUPABASE_URL = 'https://gvxdabtmksxhujeytofv.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_eERuVHBjTdhkIxpWvCX62A_3bMoXgAn';
  var sb = (typeof supabase !== 'undefined') ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
  window._hsSb = sb; // expose for juke-messaging.js (it looks for window.sb)
  window.sb = sb;
  // Load curated school-logo overrides (school-logos bucket → programs.logo_url).
  if (sb && window.loadSchoolLogoOverrides) loadSchoolLogoOverrides(sb);
  var currentUser = null;
  window._hsCurrentUser = null;

  function _updateHsCoachAuthUI(session) {
    var signinBtn = document.getElementById('coach-signin-btn');
    var chip = document.getElementById('juke-user-chip');
    if (!signinBtn) return;
    if (session && session.user) {
      currentUser = session.user;
      window.currentUser = session.user;   // juke-messaging.js reads this global
      window._hsCurrentUser = session.user;
      signinBtn.style.display = 'none';
      // Chip is managed by existing localStorage auth code
    } else {
      currentUser = null;
      window.currentUser = null;
      window._hsCurrentUser = null;
      signinBtn.style.display = '';
    }
  }

  if (sb) {
    sb.auth.getSession().then(function(r){ _updateHsCoachAuthUI(r.data.session); });
    sb.auth.onAuthStateChange(function(event, session){
      _updateHsCoachAuthUI(session);
      if (session && session.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
        if (typeof initMessaging === 'function') setTimeout(initMessaging, 60);
      } else if (event === 'SIGNED_OUT') {
        if (typeof window._msgCleanup === 'function') window._msgCleanup();
      }
    });
  }

  window.openHsCoachAuth = function() {
    showHsCoachSignIn();
    var overlay = document.getElementById('hscoach-auth-overlay');
    overlay.classList.add('open');
    if(window.JukeDialog) window.JukeDialog.open(overlay, {close: closeHsCoachAuth, focus: document.getElementById('hscoach-signin-email')});
  };
  window.closeHsCoachAuth = function() {
    var overlay = document.getElementById('hscoach-auth-overlay');
    overlay.classList.remove('open');
    if(window.JukeDialog) window.JukeDialog.close(overlay);
  };
  window.showHsCoachSignIn = function() {
    document.getElementById('hscoach-signin-panel').style.display = '';
    document.getElementById('hscoach-signup-panel').style.display = 'none';
    document.querySelector('#hscoach-auth-overlay [role="dialog"]').setAttribute('aria-labelledby','hscoach-signin-title');
  };
  window.showHsCoachSignUp = function() {
    document.getElementById('hscoach-signin-panel').style.display = 'none';
    document.getElementById('hscoach-signup-panel').style.display = '';
    document.querySelector('#hscoach-auth-overlay [role="dialog"]').setAttribute('aria-labelledby','hscoach-signup-title');
  };

  function _setMsg(id, text, type) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'coach-auth-msg ' + (type || '');
  }

  window.hsCoachSignIn = async function() {
    if (!sb) return;
    var email = document.getElementById('hscoach-signin-email').value.trim();
    var pw = document.getElementById('hscoach-signin-pw').value;
    if (!email || !pw) { _setMsg('hscoach-signin-msg', 'Please fill in all fields.', 'error'); return; }
    var btn = document.getElementById('hscoach-signin-btn');
    btn.disabled = true; btn.textContent = 'Signing in…';
    var r = await sb.auth.signInWithPassword({ email: email, password: pw });
    btn.disabled = false; btn.textContent = 'Sign In';
    if (r.error) { _setMsg('hscoach-signin-msg', r.error.message, 'error'); return; }
    if (r.data && r.data.user) {
      try {
        var pr = await sb.from('user_profiles').select('is_active').eq('id', r.data.user.id).maybeSingle();
        if (pr.data && pr.data.is_active === false) {
          await sb.auth.signOut();
          localStorage.removeItem('juke_auth');
          _setMsg('hscoach-signin-msg', 'This account has been disabled. Contact JUKE support.', 'error');
          return;
        }
      } catch(e) {}
    }
    _setMsg('hscoach-signin-msg', 'Signed in!', 'success');
    setTimeout(closeHsCoachAuth, 600);
  };

  window.hsCoachSignUp = async function() {
    if (!sb) return;
    var name = document.getElementById('hscoach-signup-name').value.trim();
    var email = document.getElementById('hscoach-signup-email').value.trim();
    var pw = document.getElementById('hscoach-signup-pw').value;
    var org = document.getElementById('hscoach-signup-org').value.trim();
    if (!name || !email || !pw) { _setMsg('hscoach-signup-msg', 'Name, email, and password are required.', 'error'); return; }
    var btn = document.getElementById('hscoach-signup-btn');
    btn.disabled = true; btn.textContent = 'Creating account…';
    var r = await sb.auth.signUp({
      email: email, password: pw,
      options: { data: { full_name: name, role: 'hs_coach', org: org } }
    });
    btn.disabled = false; btn.textContent = 'Create Account';
    if (r.error) { _setMsg('hscoach-signup-msg', r.error.message, 'error'); return; }
    _setMsg('hscoach-signup-msg', 'Account created! Check your email to confirm, then sign in.', 'success');
  };

  window.hsCoachSignOut = async function() {
    if (sb) await sb.auth.signOut();
    localStorage.removeItem('juke_auth');
    location.replace('../index.html');
  };

  // Close overlay on backdrop click
  document.getElementById('hscoach-auth-overlay').addEventListener('click', function(e){
    if (e.target === this) closeHsCoachAuth();
  });
})();

// ── JUKE USER CHIP ──
(function(){
  var auth=null;
  try{auth=JSON.parse(localStorage.getItem('juke_auth'));}catch(e){}
  if(!auth) return;
  var chip=document.getElementById('juke-user-chip');
  if(!chip) return;
  var parts=auth.name.trim().split(' ');
  var inits=(parts[0][0]+(parts.length>1?parts[parts.length-1][0]:'')).toUpperCase();
  var RL={athlete:'Athlete',college_coach:'Recruiter',hs_coach:'Coach'};
  var activeProfile=null;
  if(auth.profiles&&auth.profiles.length){
    var apid=auth.activeProfileId||auth.profiles[0].id;
    activeProfile=auth.profiles.find(function(p){return p.id===apid;})||auth.profiles[0];
  }
  var roleOrg=activeProfile&&activeProfile.org?'Coach · '+activeProfile.org:'Coach';
  var profilesHTML='';
  if(auth.profiles&&auth.profiles.length){
    profilesHTML+='<div class="juke-chip-dd-divider"></div><div class="juke-chip-dd-section">';
    auth.profiles.forEach(function(p){
      var isA=p.id===(auth.activeProfileId||'');
      profilesHTML+='<button class="juke-chip-dd-profile'+(isA?' is-active':'')+'"'
        +(isA?'':' onclick="switchProfile(\''+p.id+'\')"')+'>'
        +'<span class="jcp-dot'+(isA?' on':'')+'"></span>'
        +'<span class="jcp-info"><span class="jcp-org">'+(p.org||RL[p.type]||p.type)+'</span><span class="jcp-role">'+(RL[p.type]||p.type)+'</span></span>'
        +(isA?'<span class="jcp-check">✓</span>':'')
        +'</button>';
    });
    profilesHTML+='</div>';
  }
  chip.innerHTML=
    '<div class="juke-user-av">'+inits+'</div>'
    +'<span class="juke-user-name">'+parts[0]+'</span>'
    +'<div class="juke-chip-dd" id="juke-chip-dd">'
      +'<div class="juke-chip-dd-header">'
        +'<div class="juke-chip-dd-name">'+auth.name+'</div>'
        +'<div class="juke-chip-dd-role">'+roleOrg+'</div>'
      +'</div>'
      +profilesHTML
      +'<div class="juke-chip-dd-section">'
        +'<button class="juke-chip-dd-item" onclick="location.href=\'../preview.html\'">+ Add Account</button>'
      +'</div>'
      +'<div class="juke-chip-dd-divider"></div>'
      +'<button class="juke-chip-dd-item juke-chip-dd-logout" onclick="jukeLogout()">Log Out</button>'
    +'</div>';
  chip.style.display='flex';
  chip.addEventListener('click',function(e){
    if(e.target.closest('.juke-chip-dd')) return;
    document.getElementById('juke-chip-dd').classList.toggle('open');
  });
  document.addEventListener('click',function(e){
    if(!e.target.closest('#juke-user-chip')){
      var dd=document.getElementById('juke-chip-dd');
      if(dd) dd.classList.remove('open');
    }
  });
})();

function switchProfile(profileId){
  try{
    var auth=JSON.parse(localStorage.getItem('juke_auth'));
    if(!auth) return;
    auth.activeProfileId=profileId;
    localStorage.setItem('juke_auth',JSON.stringify(auth));
    var p=auth.profiles.find(function(x){return x.id===profileId;});
    if(!p) return;
    var portals={athlete:'athlete.html',college_coach:'coach.html',hs_coach:'hscoach.html'};
    location.href=portals[p.type]||'../preview.html';
  }catch(e){}
}
function jukeLogout(){localStorage.removeItem('juke_auth');location.replace('../index.html');}

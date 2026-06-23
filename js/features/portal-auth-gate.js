// Shared portal auth gate.
// Verifies Supabase session, role, and active status before a protected portal renders.
(function(){
  var SUPABASE_URL='https://gvxdabtmksxhujeytofv.supabase.co';
  var SUPABASE_KEY='sb_publishable_eERuVHBjTdhkIxpWvCX62A_3bMoXgAn';
  var PORTALS={
    athlete:'/pages/athlete.html',
    college_coach:'/pages/coach.html',
    hs_coach:'/pages/hscoach.html',
    admin:'/pages/admin.html'
  };

  function redirect(path){
    location.replace(path);
  }

  function ensureStyles(){
    if(document.getElementById('juke-portal-gate-styles')) return;
    var style=document.createElement('style');
    style.id='juke-portal-gate-styles';
    style.textContent=[
      'html.juke-gating body > :not(#juke-portal-gate){visibility:hidden!important}',
      '#juke-portal-gate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:#f7f2ea;color:#221b18;font-family:Archivo,Arial,sans-serif}',
      '#juke-portal-gate .gate-box{width:min(360px,calc(100vw - 48px));padding:24px;border:1px solid rgba(34,27,24,.16);border-radius:10px;background:#fff;box-shadow:0 20px 70px rgba(34,27,24,.12)}',
      '#juke-portal-gate .gate-title{font-weight:700;font-size:15px;margin-bottom:6px}',
      '#juke-portal-gate .gate-msg{font-size:13px;line-height:1.45;color:#6b625d}'
    ].join('');
    document.head.appendChild(style);
  }

  function showGate(title, msg){
    ensureStyles();
    document.documentElement.classList.add('juke-gating');
    var gate=document.getElementById('juke-portal-gate');
    if(!gate){
      gate=document.createElement('div');
      gate.id='juke-portal-gate';
      document.body.insertBefore(gate,document.body.firstChild);
    }
    gate.innerHTML='<div class="gate-box"><div class="gate-title">'+title+'</div><div class="gate-msg">'+msg+'</div></div>';
  }

  function clearGate(){
    var gate=document.getElementById('juke-portal-gate');
    if(gate) gate.remove();
    document.documentElement.classList.remove('juke-gating');
  }

  function failAndRedirect(title, msg, path){
    showGate(title,msg);
    setTimeout(function(){ redirect(path); }, 650);
  }

  function safeNext(){
    return encodeURIComponent(location.pathname+location.search);
  }

  function normalizeAuth(user, profile, role){
    var name=(profile&&profile.display_name)||user.user_metadata?.full_name||user.email||'User';
    var org=(profile&&profile.org)||user.user_metadata?.org||'';
    localStorage.setItem('juke_auth',JSON.stringify({
      name:name,
      type:role,
      activeProfileId:'primary',
      profiles:[{id:'primary',type:role,org:org}]
    }));
    return role;
  }

  window.JukePortalGate={
    verify:async function(requiredRole){
      showGate('Checking access','Verifying your JUKE session and portal permissions.');
      var client=(typeof supabase!=='undefined')?supabase.createClient(SUPABASE_URL,SUPABASE_KEY):null;
      if(!client){
        failAndRedirect('Sign in required','Supabase is unavailable. Sending you to sign in.','/login.html?next='+safeNext());
        return;
      }

      try{
        var sessionRes=await client.auth.getSession();
        var session=sessionRes&&sessionRes.data?sessionRes.data.session:null;
        if(!session||!session.user){
          localStorage.removeItem('juke_auth');
          failAndRedirect('Sign in required','Sending you to sign in.','/login.html?next='+safeNext());
          return;
        }

        var user=session.user;
        var pr=await client.from('user_profiles')
          .select('role,is_active,display_name,org')
          .eq('id',user.id)
          .maybeSingle();
        var profile=pr&&!pr.error?pr.data:null;

        if(profile&&profile.is_active===false){
          await client.auth.signOut();
          localStorage.removeItem('juke_auth');
          failAndRedirect('Account inactive','This account is inactive. Sending you to sign in.','/login.html');
          return;
        }

        var role=(profile&&profile.role)||user.user_metadata?.juke_role||'athlete';
        if(role!==requiredRole){
          failAndRedirect('Switching portal','Sending you to the correct JUKE portal.',PORTALS[role]||'/preview.html');
          return;
        }

        normalizeAuth(user,profile,role);
        clearGate();
      }catch(e){
        localStorage.removeItem('juke_auth');
        failAndRedirect('Access check failed','Sending you to sign in.','/login.html?next='+safeNext());
      }
    }
  };
})();

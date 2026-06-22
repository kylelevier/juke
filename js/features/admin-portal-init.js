(function(){
  var ADMIN_EMAILS = ['kylelevier@gmail.com'];

  // Allow entry if juke_auth.type is 'admin'
  var auth = null;
  try { auth = JSON.parse(localStorage.getItem('juke_auth')); } catch(e) {}
  if (auth && auth.type === 'admin') return;

  // Also allow entry if a Supabase session belongs to an admin email
  try {
    var raw = localStorage.getItem('sb-gvxdabtmksxhujeytofv-auth-token');
    if (raw) {
      var email = JSON.parse(raw).user.email;
      if (ADMIN_EMAILS.indexOf(email) !== -1) return;
    }
  } catch(e) {}

  // No valid session at all — go to login
  if (!auth || !auth.name) { location.replace('/login.html'); return; }

  // Has a non-admin session — go to their portal instead of a dead end
  var portals = { athlete: '/athlete', college_coach: '/coach', hs_coach: '/hscoach' };
  location.replace(portals[auth.type] || '/preview');
})();

(function(){
  var auth = null;
  try { auth = JSON.parse(localStorage.getItem('juke_auth')); } catch(e) {}
  if (!auth || !auth.name) { location.replace('/login.html'); return; }
  if (auth.type !== 'admin') { location.replace('/login.html'); return; }
})();

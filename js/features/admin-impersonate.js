// ── Admin Portal — Impersonate / Preview As ───────────────────────────────────

(function(){

  var _impersonating = null;

  window.initAdminImpersonate = function() {
    if (_impersonating) return;
    var wrap = document.getElementById('admin-impersonate-result');
    if (wrap && !wrap.innerHTML.trim()) {
      wrap.innerHTML = '<div class="admin-empty">Search for an athlete to preview their board and profile.</div>';
    }
  };

  window.adminImpersonateSearch = async function() {
    var q = (document.getElementById('admin-impersonate-q') || {}).value || '';
    var wrap = document.getElementById('admin-impersonate-suggestions');
    if (!q.trim() || !sb) { if (wrap) wrap.innerHTML = ''; return; }

    var r = await sb.from('athlete_profiles').select('user_id, profile_data').limit(200);
    if (r.error || !r.data) { if (wrap) wrap.innerHTML = ''; return; }

    var lq = q.toLowerCase();
    var matches = r.data.filter(function(row){
      var pd = row.profile_data || {};
      return ((pd['p-fname'] || '') + ' ' + (pd['p-lname'] || '')).toLowerCase().includes(lq);
    }).slice(0, 8);

    if (!matches.length) { if (wrap) wrap.innerHTML = ''; return; }

    var html = '';
    matches.forEach(function(row){
      var pd = row.profile_data || {};
      var name = ((pd['p-fname'] || '') + ' ' + (pd['p-lname'] || '')).trim() || row.user_id;
      var pos  = (pd.positions || []).join(', ') || '';
      var school = pd['p-school'] || '';
      html += '<div class="admin-suggest-item" onclick="adminStartImpersonate(\'' + row.user_id + '\',' + JSON.stringify(name).replace(/"/g, '&quot;') + ')">'
        + '<span class="admin-suggest-name">' + _esc(name) + '</span>'
        + '<span class="admin-suggest-meta">' + _esc([pos, school].filter(Boolean).join(' · ')) + '</span>'
        + '</div>';
    });
    if (wrap) wrap.innerHTML = html;
  };

  window.adminStartImpersonate = function(userId, displayName) {
    var sugWrap = document.getElementById('admin-impersonate-suggestions');
    if (sugWrap) sugWrap.innerHTML = '';
    var qInput = document.getElementById('admin-impersonate-q');
    if (qInput) qInput.value = displayName || userId;

    _impersonating = userId;
    _showExitBtn(displayName);

    var wrap = document.getElementById('admin-impersonate-result');
    if (!wrap) return;
    wrap.innerHTML = '<iframe'
      + ' src="/athlete?preview_as=' + encodeURIComponent(userId) + '&preview_t=' + Date.now() + '"'
      + ' class="admin-preview-iframe"'
      + ' sandbox="allow-scripts allow-same-origin allow-forms"'
      + ' title="Preview as ' + _esc(displayName || userId) + '"'
      + '></iframe>';
  };

  window.adminExitImpersonate = function() {
    _impersonating = null;
    var wrap = document.getElementById('admin-impersonate-result');
    if (wrap) wrap.innerHTML = '<div class="admin-empty">Search for an athlete to preview their board and profile.</div>';
    var exitBtn = document.getElementById('admin-impersonate-exit');
    if (exitBtn) exitBtn.style.display = 'none';
    var qInput = document.getElementById('admin-impersonate-q');
    if (qInput) qInput.value = '';
    var sugWrap = document.getElementById('admin-impersonate-suggestions');
    if (sugWrap) sugWrap.innerHTML = '';
  };

  function _showExitBtn(name) {
    var btn = document.getElementById('admin-impersonate-exit');
    if (btn) { btn.style.display = ''; btn.textContent = 'Exit Preview' + (name ? ' (' + name + ')' : ''); }
  }

function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();

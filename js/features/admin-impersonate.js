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

    var r = await sb.from('athlete_profiles').select('user_id, profile_data').limit(30);
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
      html += '<div class="admin-suggest-item" onclick="adminStartImpersonate(' + JSON.stringify(row.user_id) + ',' + JSON.stringify(name) + ')">'
        + '<span class="admin-suggest-name">' + _esc(name) + '</span>'
        + '<span class="admin-suggest-meta">' + _esc([pos, school].filter(Boolean).join(' · ')) + '</span>'
        + '</div>';
    });
    if (wrap) wrap.innerHTML = html;
  };

  window.adminStartImpersonate = async function(userId, displayName) {
    var sugWrap = document.getElementById('admin-impersonate-suggestions');
    if (sugWrap) sugWrap.innerHTML = '';
    var qInput = document.getElementById('admin-impersonate-q');
    if (qInput) qInput.value = displayName || userId;

    var wrap = document.getElementById('admin-impersonate-result');
    if (wrap) wrap.innerHTML = '<div class="admin-loading">Loading preview for ' + _esc(displayName || userId) + '…</div>';

    _impersonating = userId;
    _showExitBtn(displayName);

    if (!sb) return;

    var results = await Promise.all([
      sb.from('athlete_profiles').select('*').eq('user_id', userId).single(),
      sb.from('player_programs').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
      sb.from('player_data').select('*').eq('user_id', userId).single()
    ]);

    var apRes = results[0], ppRes = results[1], pdRes = results[2];
    if (!wrap) return;

    var html = '<div class="admin-impersonate-banner">Previewing as <strong>' + _esc(displayName || userId) + '</strong> — read only</div>';

    // Profile card
    if (!apRes.error && apRes.data) {
      html += _renderMiniProfileCard(apRes.data);
    } else {
      html += '<div class="admin-notice">No published profile.</div>';
    }

    // Board
    var programs = (ppRes.data || []);
    if (programs.length) {
      // Group by stage
      var stages = ['saved','contacting','applied','offered','committed','archived'];
      var byStage = {};
      stages.forEach(function(s){ byStage[s] = []; });
      programs.forEach(function(pp){ (byStage[pp.stage] || (byStage['saved'] = byStage['saved'] || [])).push(pp); });

      html += '<div class="admin-section-hd">Board (' + programs.length + ' schools)</div>';
      html += '<div class="admin-board-preview">';
      stages.forEach(function(stage){
        var items = byStage[stage] || [];
        if (!items.length) return;
        html += '<div class="admin-board-col">'
          + '<div class="admin-board-col-hd stage-' + stage + '">' + stage.charAt(0).toUpperCase() + stage.slice(1) + ' <span class="admin-board-col-count">' + items.length + '</span></div>';
        items.forEach(function(pp){
          html += '<div class="admin-board-item">'
            + '<div class="admin-board-item-school">' + _esc(pp.program_id || 'Unknown') + '</div>'
            + (pp.last_contact_date ? '<div class="admin-dim">Last contact: ' + pp.last_contact_date + '</div>' : '')
            + (pp.next_action ? '<div class="admin-dim">Next: ' + _esc(pp.next_action) + '</div>' : '')
            + '</div>';
        });
        html += '</div>';
      });
      html += '</div>';
    } else {
      html += '<div class="admin-notice">No board data found.</div>';
    }

    // Fit prefs from player_data
    if (!pdRes.error && pdRes.data && pdRes.data.fit) {
      var fit = pdRes.data.fit;
      html += '<div class="admin-section-hd">Fit Preferences</div>'
        + '<div class="admin-fit-grid">';
      Object.keys(fit).forEach(function(k){
        var v = fit[k];
        if (v) html += '<div class="admin-fit-chip"><span class="admin-dim">' + _esc(k) + '</span> ' + _esc(String(v)) + '</div>';
      });
      html += '</div>';
    }

    wrap.innerHTML = html;
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

  function _renderMiniProfileCard(row) {
    var pd = row.profile_data || {};
    var name   = ((pd['p-fname'] || '') + ' ' + (pd['p-lname'] || '')).trim() || 'Unknown';
    var pos    = (pd.positions || []).join(' / ') || '—';
    var school = pd['p-school'] || '—';
    var gpa    = pd['p-gpa'] || '—';
    var gradyr = pd['p-gradyr'] || '—';
    var forty  = pd['p-forty'] || '—';
    var height = pd['p-height'] || '—';
    var weight = pd['p-weight'] || '—';
    var disc   = row.is_discoverable ? 'Published' : 'Hidden';

    return '<div class="admin-profile-card">'
      + '<div class="admin-profile-card-hd">'
        + '<div class="admin-profile-card-name">' + _esc(name) + '</div>'
        + '<div class="admin-profile-card-meta">' + _esc(pos) + ' · ' + _esc(school) + '</div>'
        + '<div class="admin-profile-card-badges"><span class="admin-badge ' + (row.is_discoverable ? 'admin-badge-athlete' : 'admin-badge-unknown') + '">' + disc + '</span></div>'
      + '</div>'
      + '<div class="admin-profile-card-stats">'
        + _stat('GPA', gpa) + _stat('Grad', gradyr) + _stat('Height', height) + _stat('Weight', weight) + _stat('40-Yd', forty)
      + '</div>'
      + '</div>';
  }

  function _stat(label, val) {
    return '<div class="admin-stat"><div class="admin-stat-val">' + _esc(String(val)) + '</div><div class="admin-stat-lbl">' + label + '</div></div>';
  }

  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();

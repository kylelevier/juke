// ── Admin Portal — User Management + Profile Inspector ────────────────────────

(function(){

  var _usersLoaded = false;
  var _allUsers    = [];
  var _userFilter  = '';
  var _roleFilter  = '';

  // ── 1. USER MANAGEMENT TAB ────────────────────────────────────────────────

  window.initAdminUsers = function() {
    if (_usersLoaded) { _renderUsers(); return; }
    _loadUsers();
  };

  var _userPage     = 1;
  var _userPageSize = 50;
  var _userTotal    = 0;
  var _userSearchTimer = null;

  async function _loadUsers() {
    var wrap = document.getElementById('admin-users-wrap');
    if (wrap) wrap.innerHTML = '<div class="admin-loading">Loading users…</div>';
    if (!sb) { if (wrap) wrap.innerHTML = '<div class="admin-empty">Supabase not available.</div>'; return; }

    var r = await sb.rpc('admin_search_users', {
      p_query: _userFilter, p_role: _roleFilter,
      p_page: _userPage, p_page_size: _userPageSize
    });
    if (r.error) {
      if (wrap) wrap.innerHTML = '<div class="admin-empty">Error: ' + _esc(r.error.message) + '</div>';
      return;
    }
    var result = r.data || {};
    _allUsers  = result.data || [];
    _userTotal = result.total || 0;
    _usersLoaded = true;
    _renderUsers();
  }

  function _renderUsers() {
    var wrap = document.getElementById('admin-users-wrap');
    if (!wrap) return;
    var rows = _allUsers;

    if (!rows.length) {
      wrap.innerHTML = '<div class="admin-empty">No users found.</div>';
      return;
    }

    var html = '<table class="admin-table"><thead><tr>'
      + '<th>Name</th><th>Role</th><th>Org</th><th>Created</th><th></th>'
      + '</tr></thead><tbody>';

    rows.forEach(function(u){
      var date = u.created_at ? u.created_at.slice(0, 10) : '—';
      var role = u.role || '—';
      var roleCls = 'admin-badge-' + (u.role || 'unknown');
      html += '<tr>'
        + '<td><span class="admin-user-name">' + _esc(u.display_name || u.email || u.id) + '</span></td>'
        + '<td><span class="admin-badge ' + roleCls + '">' + _esc(role) + '</span></td>'
        + '<td>' + _esc(u.org || '—') + '</td>'
        + '<td class="admin-dim">' + date + '</td>'
        + '<td class="admin-actions">'
          + (u.role === 'athlete'
            ? '<button class="admin-action-btn" onclick="adminViewProfile(\'' + u.id + '\')">View Profile</button>'
            : '')
          + '<button class="admin-action-btn warn" onclick="adminDeactivateUser(\'' + u.id + '\',' + JSON.stringify(u.display_name || u.id).replace(/"/g, '&quot;') + ')">Deactivate</button>'
        + '</td>'
        + '</tr>';
    });

    html += '</tbody></table>';

    // Pagination
    var totalPages = Math.ceil(_userTotal / _userPageSize) || 1;
    if (totalPages > 1) {
      html += '<div class="admin-pagination">'
        + '<span class="admin-dim">Page ' + _userPage + ' of ' + totalPages + ' (' + _userTotal + ' users)</span>'
        + (_userPage > 1 ? '<button class="admin-action-btn" onclick="adminUserPage(' + (_userPage-1) + ')">← Prev</button>' : '')
        + (_userPage < totalPages ? '<button class="admin-action-btn" onclick="adminUserPage(' + (_userPage+1) + ')">Next →</button>' : '')
        + '</div>';
    }

    wrap.innerHTML = html;
  }

  window.adminUserPage = function(page) {
    _userPage = page;
    _usersLoaded = false;
    _loadUsers();
  };

  window.adminFilterUsers = function(q) {
    _userFilter = q;
    _userPage = 1;
    clearTimeout(_userSearchTimer);
    _userSearchTimer = setTimeout(function(){ _usersLoaded = false; _loadUsers(); }, 350);
  };

  window.adminFilterUserRole = function(role) {
    _roleFilter = role;
    _userPage = 1;
    _usersLoaded = false;
    _loadUsers();
  };

  window.adminRefreshUsers = function() {
    _usersLoaded = false;
    _userPage = 1;
    _loadUsers();
  };

  window.adminViewProfile = function(userId) {
    adminSwitchTab('profiles');
    _loadProfileById(userId);
  };

  window.adminDeactivateUser = async function(userId, name) {
    if (!confirm('Deactivate "' + name + '"? This hides their profile and blocks portal access.')) return;
    if (!sb) { adminToast('Supabase not available', 'err'); return; }
    adminToast('Deactivating user...', '');
    try {
      var results = await Promise.all([
        sb.from('user_profiles').update({ is_active: false }).eq('id', userId),
        sb.from('athlete_profiles').update({ is_discoverable: false }).eq('user_id', userId)
      ]);
      var firstErr = results.find(function(r){ return r && r.error; });
      if (firstErr) {
        adminToast('Could not fully deactivate: ' + firstErr.error.message + '. Use the Supabase dashboard for auth disable.', 'err');
        return;
      }

      if (!sb.rpc) {
        adminToast('Profile hidden, but auth disable RPC is unavailable. Use the Supabase dashboard to block login.', 'err');
        if (typeof adminAudit === 'function') adminAudit('user.deactivate.partial', 'user', userId, { name: name, reason: 'rpc_unavailable' });
        _usersLoaded = false;
        _loadUsers();
        return;
      }

      var disabled = await sb.rpc('admin_disable_user', { target_user_id: userId });
      if (disabled && disabled.error) {
        adminToast('Profile hidden, but auth disable failed: ' + disabled.error.message, 'err');
        if (typeof adminAudit === 'function') adminAudit('user.deactivate.partial', 'user', userId, { name: name, reason: disabled.error.message });
        _usersLoaded = false;
        _loadUsers();
        return;
      }

      adminToast('User deactivated and auth disabled.', 'ok');
      if (typeof adminAudit === 'function') adminAudit('user.deactivate', 'user', userId, { name: name });
      _usersLoaded = false;
      _loadUsers();
    } catch(e) {
      adminToast('Deactivate failed: ' + (e && e.message ? e.message : 'Unknown error'), 'err');
    }
  };

  // ── 2. PROFILE INSPECTOR TAB ──────────────────────────────────────────────

  var _profileUserId = null;

  window.initAdminProfiles = function() {
    if (_profileUserId) return;
    var wrap = document.getElementById('admin-profile-result');
    if (wrap && !wrap.innerHTML) wrap.innerHTML = '<div class="admin-empty">Search for an athlete above to inspect their profile.</div>';
  };

  window.adminSearchProfile = async function() {
    var q = (document.getElementById('admin-profile-q') || {}).value || '';
    var wrap = document.getElementById('admin-profile-result');
    if (!q.trim()) { if (wrap) wrap.innerHTML = '<div class="admin-empty">Enter a name to search.</div>'; return; }
    if (!sb) { if (wrap) wrap.innerHTML = '<div class="admin-empty">Supabase not available.</div>'; return; }
    if (wrap) wrap.innerHTML = '<div class="admin-loading">Searching…</div>';

    var r = await sb.rpc('admin_search_profiles', { p_query: q, p_page: 1, p_page_size: 50 });
    if (r.error) { if (wrap) wrap.innerHTML = '<div class="admin-empty">Error: ' + _esc(r.error.message) + '</div>'; return; }

    var result  = r.data || {};
    var matches = result.data || [];

    if (!matches.length) { if (wrap) wrap.innerHTML = '<div class="admin-empty">No athlete profiles matched "' + _esc(q) + '".</div>'; return; }

    var total = result.total || matches.length;
    var html = (total > matches.length ? '<div class="admin-notice">Showing first ' + matches.length + ' of ' + total + ' matches. Refine your search to narrow results.</div>' : '')
      + '<div class="admin-profile-list">';
    matches.forEach(function(row){
      var pd = row.profile_data || {};
      var name = ((pd['p-fname'] || pd.fname || '') + ' ' + (pd['p-lname'] || pd.lname || '')).trim() || row.user_id;
      var school = pd['p-school'] || pd.school || '—';
      var pos = (pd.positions || pd._positions || []).join(', ') || '—';
      html += '<div class="admin-profile-pick" onclick="adminLoadProfile(\'' + row.user_id + '\')">'
        + '<div class="admin-profile-pick-name">' + _esc(name) + '</div>'
        + '<div class="admin-profile-pick-meta">' + _esc(school) + ' · ' + _esc(pos) + '</div>'
        + '</div>';
    });
    html += '</div>';
    if (wrap) wrap.innerHTML = html;
  };

  window.adminLoadProfile = function(userId) {
    _profileUserId = userId;
    _loadProfileById(userId);
  };

  function _loadProfileById(userId) {
    adminSwitchTab('profiles');
    var wrap = document.getElementById('admin-profile-result');
    if (wrap) wrap.innerHTML = '<div class="admin-loading">Loading profile…</div>';
    if (!sb) return;

    Promise.all([
      sb.from('athlete_profiles').select('*').eq('user_id', userId).maybeSingle(),
      sb.from('player_programs').select('id,stage,last_contact_date,next_action,next_action_date,program_id,programs(school,state)').eq('user_id', userId).order('updated_at', { ascending: false }),
      sb.from('player_data').select('profile,pipeline').eq('user_id', userId).maybeSingle()
    ]).then(function(results){
      var apRes = results[0], ppRes = results[1], pdRes = results[2];
      if (!wrap) return;

      var html = '';

      if (apRes.error || !apRes.data) {
        if (pdRes && pdRes.data && pdRes.data.profile) {
          html += _renderProfileCard({ profile_data: pdRes.data.profile, is_discoverable: false, updated_at: '' });
        } else {
          html += '<div class="admin-notice">No athlete profile found for this user.</div>';
        }
      } else {
        html += _renderProfileCard(apRes.data);
      }

      if (!ppRes.error && ppRes.data && ppRes.data.length) {
        html += '<div class="admin-section-hd">Board (' + ppRes.data.length + ' schools)</div>';
        html += '<table class="admin-table admin-board-table"><thead><tr>'
          + '<th>School</th><th>Stage</th><th>Last Contact</th><th>Next Action</th>'
          + '</tr></thead><tbody>';
        ppRes.data.forEach(function(pp){
          var schoolName = (pp.programs && pp.programs.school) || pp.program_id || '—';
          var schoolState = (pp.programs && pp.programs.state) ? ' <span class="admin-dim">(' + _esc(pp.programs.state) + ')</span>' : '';
          html += '<tr>'
            + '<td>' + _esc(schoolName) + schoolState + '</td>'
            + '<td><span class="admin-stage-badge stage-' + _esc(pp.stage || '') + '">' + _esc(pp.stage || '—') + '</span></td>'
            + '<td class="admin-dim">' + (pp.last_contact_date || '—') + '</td>'
            + '<td class="admin-dim">' + _esc(pp.next_action || '—') + '</td>'
            + '</tr>';
        });
        html += '</tbody></table>';
      } else if (pdRes && pdRes.data && pdRes.data.pipeline && Object.keys(pdRes.data.pipeline).length) {
        var pipe = pdRes.data.pipeline || {};
        var names = Object.keys(pipe).sort();
        html += '<div class="admin-section-hd">Board (' + names.length + ' schools)</div>';
        html += '<table class="admin-table admin-board-table"><thead><tr>'
          + '<th>School</th><th>Stage</th><th>Last Contact</th><th>Next Action</th>'
          + '</tr></thead><tbody>';
        names.forEach(function(name){
          html += '<tr>'
            + '<td>' + _esc(name) + '</td>'
            + '<td><span class="admin-stage-badge stage-' + _esc(pipe[name] || '') + '">' + _esc(pipe[name] || '—') + '</span></td>'
            + '<td class="admin-dim">—</td><td class="admin-dim">—</td>'
            + '</tr>';
        });
        html += '</tbody></table>';
      } else {
        html += '<div class="admin-notice">No board data for this user.</div>';
      }

      wrap.innerHTML = html;
    });
  }

  function _renderProfileCard(row) {
    var pd = row.profile_data || {};
    var name = ((pd['p-fname'] || '') + ' ' + (pd['p-lname'] || '')).trim() || 'Unknown';
    var pos  = (pd.positions || []).join(' / ') || '—';
    var school = pd['p-school'] || '—';
    var city   = pd['p-city'] || '';
    var state  = pd['p-state'] || '';
    var gpa    = pd['p-gpa'] || '—';
    var gradyr = pd['p-gradyr'] || '—';
    var forty  = pd['p-forty'] || '—';
    var height = pd['p-height'] || '—';
    var weight = pd['p-weight'] || '—';
    var disc   = row.is_discoverable ? '<span class="admin-badge admin-badge-athlete">Published</span>' : '<span class="admin-badge admin-badge-unknown">Hidden</span>';
    var updated = row.updated_at ? row.updated_at.slice(0, 10) : '—';
    var highlight = pd['p-highlight'] || '';
    var intro = pd['p-intro'] || '';

    return '<div class="admin-profile-card">'
      + '<div class="admin-profile-card-hd">'
        + '<div class="admin-profile-card-name">' + _esc(name) + '</div>'
        + '<div class="admin-profile-card-meta">' + _esc(pos) + ' · ' + _esc(school) + (city ? ' · ' + _esc(city + (state ? ', ' + state : '')) : '') + '</div>'
        + '<div class="admin-profile-card-badges">' + disc + ' <span class="admin-dim">Updated ' + updated + '</span></div>'
      + '</div>'
      + '<div class="admin-profile-card-stats">'
        + _stat('GPA', gpa) + _stat('Grad', gradyr) + _stat('Height', height) + _stat('Weight', weight) + _stat('40-Yd', forty)
      + '</div>'
      + (intro ? '<div class="admin-profile-card-bio">' + _esc(intro) + '</div>' : '')
      + (highlight ? '<div class="admin-profile-card-link"><a href="' + _esc(highlight) + '" target="_blank" rel="noopener">Highlight Film ↗</a></div>' : '')
      + '</div>';
  }

  function _stat(label, val) {
    return '<div class="admin-stat"><div class="admin-stat-val">' + _esc(String(val)) + '</div><div class="admin-stat-lbl">' + label + '</div></div>';
  }

  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();

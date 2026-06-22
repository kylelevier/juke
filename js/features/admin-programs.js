// ── Admin Portal — School/Program Manager + Logo Manager ─────────────────────

(function(){

  var _programs     = [];
  var _progLoaded   = false;
  var _progFilter   = '';
  var _editingId    = null;

  // ── 4. PROGRAMS TAB ──────────────────────────────────────────────────────

  window.initAdminPrograms = function() {
    if (_progLoaded) { _renderPrograms(); return; }
    _loadPrograms();
  };

  async function _loadPrograms() {
    var wrap = document.getElementById('admin-programs-wrap');
    if (wrap) wrap.innerHTML = '<div class="admin-loading">Loading programs…</div>';
    if (!sb) { if (wrap) wrap.innerHTML = '<div class="admin-empty">Supabase not available.</div>'; return; }

    var r = await sb.from('programs').select('*').order('school', { ascending: true });
    if (r.error) {
      if (wrap) wrap.innerHTML = '<div class="admin-empty">Error: ' + _esc(r.error.message) + '</div>';
      return;
    }
    _programs = r.data || [];
    _progLoaded = true;
    _renderPrograms();
  }

  function _renderPrograms() {
    var wrap = document.getElementById('admin-programs-wrap');
    if (!wrap) return;

    var q = _progFilter.toLowerCase();
    var rows = _programs.filter(function(p){
      return !q || (p.school || '').toLowerCase().includes(q) || (p.state || '').toLowerCase().includes(q);
    });

    if (!rows.length) {
      wrap.innerHTML = '<div class="admin-empty">No programs found.</div>';
      return;
    }

    var html = '<table class="admin-table"><thead><tr>'
      + '<th>School</th><th>State</th><th>Division</th><th>Logo</th><th></th>'
      + '</tr></thead><tbody>';

    rows.forEach(function(p){
      var isEditing = _editingId === p.id;
      if (isEditing) {
        html += '<tr class="admin-editing-row">'
          + '<td><input class="admin-inline-input" id="edit-school-' + p.id + '" value="' + _esc(p.school || '') + '"/></td>'
          + '<td><input class="admin-inline-input short" id="edit-state-' + p.id + '" value="' + _esc(p.state || '') + '" maxlength="2"/></td>'
          + '<td><select class="admin-inline-select" id="edit-div-' + p.id + '">'
            + _divOptions(p.division)
          + '</select></td>'
          + '<td class="admin-dim">' + (p.logo_url ? '<img class="admin-logo-thumb" src="' + _esc(p.logo_url) + '" alt="">' : '—') + '</td>'
          + '<td class="admin-actions">'
            + '<button class="admin-action-btn ok" onclick="adminSaveProgram(' + p.id + ')">Save</button>'
            + '<button class="admin-action-btn" onclick="adminCancelEdit()">Cancel</button>'
          + '</td>'
          + '</tr>';
      } else {
        html += '<tr>'
          + '<td>' + _esc(p.school || '—') + '</td>'
          + '<td>' + _esc(p.state || '—') + '</td>'
          + '<td>' + _esc(p.division || '—') + '</td>'
          + '<td>' + (p.logo_url ? '<img class="admin-logo-thumb" src="' + _esc(p.logo_url) + '" alt="">' : '<span class="admin-dim">—</span>') + '</td>'
          + '<td class="admin-actions">'
            + '<button class="admin-action-btn" onclick="adminEditProgram(' + p.id + ')">Edit</button>'
            + '<button class="admin-action-btn warn" onclick="adminDeleteProgram(' + p.id + ',' + JSON.stringify(p.school) + ')">Delete</button>'
          + '</td>'
          + '</tr>';
      }
    });

    html += '</tbody></table>';
    wrap.innerHTML = html;
  }

  function _divOptions(current) {
    var opts = ['', 'NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'NJCAA'];
    return opts.map(function(o){
      return '<option value="' + _esc(o) + '"' + (o === current ? ' selected' : '') + '>' + (o || 'Select…') + '</option>';
    }).join('');
  }

  window.adminFilterPrograms = function(q) {
    _progFilter = q;
    _renderPrograms();
  };

  window.adminRefreshPrograms = function() {
    _progLoaded = false;
    _editingId  = null;
    _loadPrograms();
  };

  window.adminEditProgram = function(id) {
    _editingId = id;
    _renderPrograms();
  };

  window.adminCancelEdit = function() {
    _editingId = null;
    _renderPrograms();
  };

  window.adminSaveProgram = async function(id) {
    var school   = (document.getElementById('edit-school-' + id) || {}).value || '';
    var state    = (document.getElementById('edit-state-' + id) || {}).value || '';
    var division = (document.getElementById('edit-div-' + id) || {}).value || '';
    if (!school.trim()) { adminToast('School name required', 'err'); return; }
    if (!sb) return;

    var r = await sb.from('programs').update({ school: school.trim(), state: state.trim(), division: division || null }).eq('id', id);
    if (r.error) { adminToast('Save failed: ' + r.error.message, 'err'); return; }

    var prog = _programs.find(function(p){ return p.id === id; });
    if (prog) { prog.school = school.trim(); prog.state = state.trim(); prog.division = division || null; }
    _editingId = null;
    adminToast('Program saved.', 'ok');
    _renderPrograms();
  };

  window.adminDeleteProgram = async function(id, name) {
    if (!confirm('Delete "' + name + '"? This cannot be undone.')) return;
    if (!sb) return;
    var r = await sb.from('programs').delete().eq('id', id);
    if (r.error) { adminToast('Delete failed: ' + r.error.message, 'err'); return; }
    _programs = _programs.filter(function(p){ return p.id !== id; });
    adminToast('Program deleted.', 'ok');
    _renderPrograms();
  };

  // ── ADD PROGRAM MODAL ─────────────────────────────────────────────────────

  window.adminOpenAddProgram = function() {
    var overlay = document.getElementById('admin-add-program-overlay');
    if (overlay) {
      overlay.classList.add('open');
      var inp = document.getElementById('add-prog-school');
      if (inp) { inp.value = ''; inp.focus(); }
      var msg = document.getElementById('add-prog-msg');
      if (msg) msg.textContent = '';
    }
  };

  window.adminCloseAddProgram = function(e) {
    var overlay = document.getElementById('admin-add-program-overlay');
    if (!e || e.target === overlay) overlay && overlay.classList.remove('open');
  };

  window.adminSubmitAddProgram = async function() {
    var school   = (document.getElementById('add-prog-school') || {}).value || '';
    var state    = (document.getElementById('add-prog-state') || {}).value || '';
    var division = (document.getElementById('add-prog-div') || {}).value || '';
    var msg      = document.getElementById('add-prog-msg');
    if (!school.trim()) { if (msg) { msg.textContent = 'School name required.'; msg.className = 'admin-form-msg err'; } return; }
    if (!sb) return;

    var r = await sb.from('programs').insert({ school: school.trim(), state: state.trim() || null, division: division || null }).select().single();
    if (r.error) {
      if (msg) { msg.textContent = r.error.message; msg.className = 'admin-form-msg err'; }
      return;
    }
    _programs.unshift(r.data);
    adminToast('Program added.', 'ok');
    adminCloseAddProgram();
    _renderPrograms();
  };

  // ── 5. LOGOS TAB ──────────────────────────────────────────────────────────

  var _logosLoaded = false;
  var _logoFilter  = '';

  window.initAdminLogos = function() {
    if (_logosLoaded) { _renderLogoList(); return; }
    _loadLogoPrograms();
  };

  async function _loadLogoPrograms() {
    var wrap = document.getElementById('admin-school-list');
    if (wrap) wrap.innerHTML = '<div class="admin-loading">Loading programs…</div>';
    if (!sb) return;

    if (!_progLoaded) {
      var r = await sb.from('programs').select('id,school,logo_url').order('school', { ascending: true });
      if (!r.error) { _programs = r.data || []; _progLoaded = true; }
    }
    _logosLoaded = true;
    _renderLogoList();
    if (typeof initAdminLogoDropzones === 'function') initAdminLogoDropzones();
  }

  function _renderLogoList() {
    var wrap = document.getElementById('admin-school-list');
    if (!wrap) return;
    var q = _logoFilter.toLowerCase();
    var rows = _programs.filter(function(p){
      return !q || (p.school || '').toLowerCase().includes(q);
    });
    if (!rows.length) { wrap.innerHTML = '<div class="admin-empty">No programs.</div>'; return; }
    wrap.innerHTML = rows.map(function(p){
      return '<div class="admin-logo-row">'
        + '<div class="admin-logo-school-name">' + _esc(p.school) + '</div>'
        + (typeof adminLogoCell === 'function' ? adminLogoCell(p.school) : '')
        + '</div>';
    }).join('');
    if (typeof initAdminLogoDropzones === 'function') initAdminLogoDropzones();
  }

  window.adminFilterLogos = function(q) {
    _logoFilter = q;
    _renderLogoList();
  };

  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();

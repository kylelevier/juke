// ── Admin Portal — School/Program Manager + Logo Manager ─────────────────────

(function(){

  var _programs     = [];
  var _progLoaded   = false;
  var _progFilter   = '';
  var _editingId    = null;

  var PROGRAM_FIELD_LABELS = {
    school: 'School',
    state: 'State',
    governing_body: 'Governing Body',
    division: 'Division',
    flag_football_conference: 'Flag Football Conference',
    varsity_or_club: 'Varsity or Club',
    school_type: 'School Type',
    region: 'Region',
    scholarship_available: 'Scholarship Available',
    school_size_enrollment: 'School Size',
    hbcu: 'HBCU',
    notes: 'Notes',
    religious_affiliation: 'Religious Affiliation',
    estimated_cost_of_attendance: 'Est. Cost of Attendance',
    avg_financial_aid_award: 'Avg Financial Aid Award',
    athlete_interest_recruiting_form: 'Athlete Interest / Recruiting Form',
    logo_url: 'Logo URL'
  };
  var PROGRAM_EDIT_EXCLUDE = {
    id: true,
    created_at: true,
    updated_at: true
  };
  var PROGRAM_CANONICAL_FIELDS = [
    'school','state','governing_body','division','flag_football_conference','varsity_or_club',
    'school_type','region','scholarship_available','school_size_enrollment','hbcu','notes',
    'religious_affiliation','estimated_cost_of_attendance','avg_financial_aid_award',
    'athlete_interest_recruiting_form','logo_url'
  ];

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
          + '<td colspan="5">' + _programEditorHtml(p) + '</td>'
          + '</tr>';
      } else {
        html += '<tr>'
          + '<td>' + _esc(p.school || '—') + '</td>'
          + '<td>' + _esc(p.state || '—') + '</td>'
          + '<td>' + _esc(p.division || '—') + '</td>'
          + '<td class="admin-dim">' + (p.logo_url ? '<img class="admin-logo-thumb" src="' + _esc(p.logo_url) + '" alt="">' : '—') + '</td>'
          + '<td class="admin-actions">'
            + '<button class="admin-action-btn" onclick="adminEditProgram(' + p.id + ')">Edit</button>'
          + '</td>'
          + '</tr>';
      }
    });

    html += '</tbody></table>';
    wrap.innerHTML = html;
  }

  function _editableProgramFields(p) {
    var seen = {};
    var fields = [];
    var actual = Object.keys(p || {});
    PROGRAM_CANONICAL_FIELDS.concat(actual).forEach(function(k){
      if (actual.indexOf(k) === -1) return;
      if (seen[k] || PROGRAM_EDIT_EXCLUDE[k]) return;
      seen[k] = true;
      fields.push(k);
    });
    return fields;
  }

  function _programEditorHtml(p) {
    var fields = _editableProgramFields(p);
    var html = '<div class="admin-program-editor">';
    html += '<div class="admin-program-editor-hd">'
      + '<div><div class="admin-program-editor-title">' + _esc(p.school || 'Program') + '</div>'
      + '<div class="admin-dim">Edit the full program row. Blank values are saved as empty fields.</div></div>'
      + '<div class="admin-actions"><button class="admin-action-btn ok" onclick="adminSaveProgram(' + p.id + ')">Save</button>'
      + '<button class="admin-action-btn" onclick="adminCancelEdit()">Cancel</button></div>'
      + '</div>';
    html += '<div class="admin-program-grid">';
    fields.forEach(function(k){
      var val = p[k] == null ? '' : p[k];
      var label = PROGRAM_FIELD_LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, function(c){ return c.toUpperCase(); });
      var isLong = String(val).length > 80 || /notes|url|form|logo/.test(k);
      html += '<label class="admin-program-field"><span>' + _esc(label) + '</span>';
      if (isLong) {
        html += '<textarea class="admin-inline-input admin-program-textarea" data-program-field="' + _esc(k) + '">' + _esc(val) + '</textarea>';
      } else {
        html += '<input class="admin-inline-input" data-program-field="' + _esc(k) + '" value="' + _esc(val) + '"/>';
      }
      html += '</label>';
    });
    html += '</div></div>';
    return html;
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
    var row = document.querySelector('.admin-editing-row');
    var patch = {};
    row && row.querySelectorAll('[data-program-field]').forEach(function(el){
      patch[el.getAttribute('data-program-field')] = el.value.trim();
    });
    var school = patch.school || '';
    if (!school.trim()) { adminToast('School name required', 'err'); return; }
    if (!sb) return;

    var r = await sb.from('programs').update(patch).eq('id', id).select().single();
    if (r.error) { adminToast('Save failed: ' + r.error.message, 'err'); return; }

    var prog = _programs.find(function(p){ return p.id === id; });
    if (prog) Object.assign(prog, r.data || patch);
    _editingId = null;
    adminToast('Program saved.', 'ok');
    if (typeof adminAudit === 'function') adminAudit('program.update', 'program', id, { school: school.trim(), fields: Object.keys(patch) });
    _renderPrograms();
  };

  window.adminDeleteProgram = async function(id, name) {
    adminToast('Program deletion is disabled.', 'err');
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
    if (typeof adminAudit === 'function') adminAudit('program.create', 'program', r.data && r.data.id, { school: school.trim() });
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

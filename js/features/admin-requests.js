// ── Admin Portal — Coach Access Requests ─────────────────────────────────────
(function () {
  var _loaded = false;

  window.initAdminRequests = function () {
    if (_loaded) { _load(); return; }
    _loaded = true;
    _load();
  };

  async function _load() {
    var wrap = document.getElementById('admin-requests-wrap');
    if (!wrap) return;
    if (!sb) { wrap.innerHTML = '<div class="admin-empty">Supabase not available.</div>'; return; }
    wrap.innerHTML = '<div class="admin-loading">Loading requests…</div>';

    var { data, error } = await sb
      .from('coach_access_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      wrap.innerHTML = '<div class="admin-empty">Could not load requests: ' + _esc(error.message) + '</div>';
      return;
    }

    if (!data || !data.length) {
      wrap.innerHTML = '<div class="admin-empty">No coach access requests yet.</div>';
      return;
    }

    var pending  = data.filter(function(r){ return r.status === 'pending'; });
    var reviewed = data.filter(function(r){ return r.status !== 'pending'; });

    var html = '';

    if (pending.length) {
      html += '<div class="req-section-title">Pending (' + pending.length + ')</div>';
      html += pending.map(_renderRow).join('');
    }

    if (reviewed.length) {
      html += '<div class="req-section-title" style="margin-top:24px">Reviewed (' + reviewed.length + ')</div>';
      html += reviewed.map(_renderRow).join('');
    }

    wrap.innerHTML = html;
  }

  function _renderRow(r) {
    var statusBadge = {
      pending:  '<span class="req-badge req-badge--pending">Pending</span>',
      approved: '<span class="req-badge req-badge--approved">Approved</span>',
      denied:   '<span class="req-badge req-badge--denied">Denied</span>',
      applied:  '<span class="req-badge req-badge--applied">Approved · Activated</span>'
    }[r.status] || r.status;

    var roleLabel = r.role_requested === 'college_coach' ? 'College Recruiter' : 'HS / Youth Coach';
    var date = new Date(r.created_at).toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' });

    var actions = '';
    if (r.status === 'pending') {
      actions = '<div class="req-actions">'
        + '<button class="req-btn req-btn--approve" onclick="adminApproveRequest(\'' + r.id + '\',\'approved\')">Approve</button>'
        + '<button class="req-btn req-btn--deny"   onclick="adminApproveRequest(\'' + r.id + '\',\'denied\')">Deny</button>'
        + '</div>';
    }

    return '<div class="req-row" id="req-' + r.id + '">'
      + '<div class="req-row-top">'
        + '<div class="req-name">' + _esc(r.name) + '</div>'
        + statusBadge
      + '</div>'
      + '<div class="req-meta">' + _esc(roleLabel) + ' · ' + _esc(r.org) + (r.title ? ' · ' + _esc(r.title) : '') + '</div>'
      + '<div class="req-email">' + _esc(r.email) + '</div>'
      + (r.message ? '<div class="req-msg">"' + _esc(r.message) + '"</div>' : '')
      + '<div class="req-date">Submitted ' + date + '</div>'
      + actions
      + '</div>';
  }

  window.adminApproveRequest = async function (id, action) {
    var row = document.getElementById('req-' + id);
    if (row) row.style.opacity = '0.5';

    var { error } = await sb.rpc('admin_approve_coach_request', {
      p_request_id: id,
      p_action: action
    });

    if (error) {
      if (row) row.style.opacity = '';
      adminToast('Action failed: ' + error.message, 'err');
      return;
    }

    adminToast(action === 'approved' ? 'Request approved — coach access granted.' : 'Request denied.');
    _load();
  };

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}());

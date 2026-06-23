// ── Admin Portal — Nav + Supabase init ────────────────────────────────────────
var SUPABASE_URL = 'https://gvxdabtmksxhujeytofv.supabase.co';
var SUPABASE_KEY = 'sb_publishable_eERuVHBjTdhkIxpWvCX62A_3bMoXgAn';
var sb = (typeof supabase !== 'undefined')
  ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;
var currentUser = null;

if (sb) {
  sb.auth.onAuthStateChange(function(event, session) {
    currentUser = (session && session.user) ? session.user : null;
    _verifyAdminAccess();
    _updateAdminChip();
  });
}

if (sb && window.loadSchoolLogoOverrides) {
  loadSchoolLogoOverrides(sb, function(){});
}

function _updateAdminChip() {
  var chip = document.getElementById('admin-user-chip');
  if (!chip) return;
  var auth = {};
  try { auth = JSON.parse(localStorage.getItem('juke_auth') || '{}'); } catch(e) {}
  var name = auth.name || (currentUser && currentUser.email) || 'Admin';
  var initials = name.split(/\s+/).map(function(w){ return w[0] || ''; }).join('').slice(0, 2).toUpperCase();
  chip.innerHTML =
    '<div class="admin-chip-av" onclick="_toggleAdminChip()">' + initials + '</div>'
    + '<div id="admin-chip-dd" class="juke-chip-dd">'
      + '<div class="juke-chip-dd-header">'
        + '<div class="juke-chip-dd-name">' + name + '</div>'
        + '<div class="juke-chip-dd-role">Admin</div>'
      + '</div>'
      + '<div class="juke-chip-dd-section">'
        + '<button class="juke-chip-dd-item juke-chip-dd-logout" onclick="adminSignOut()">Sign Out</button>'
      + '</div>'
    + '</div>';
  chip.style.display = 'flex';

  setTimeout(function(){
    document.addEventListener('click', function closeDD(e){
      if (!chip.contains(e.target)) {
        var dd = document.getElementById('admin-chip-dd');
        if (dd) dd.classList.remove('open');
        document.removeEventListener('click', closeDD);
      }
    });
  }, 0);
}

function _toggleAdminChip() {
  var dd = document.getElementById('admin-chip-dd');
  if (dd) dd.classList.toggle('open');
}

async function _verifyAdminAccess() {
  if (!sb || !currentUser) return;
  try {
    var r = await sb.from('user_profiles').select('role,is_active').eq('id', currentUser.id).maybeSingle();
    if (!r.error && r.data) {
      if (r.data.is_active === false || r.data.role !== 'admin') {
        await sb.auth.signOut();
        localStorage.removeItem('juke_auth');
        location.replace('/login.html');
      }
    }
  } catch(e) {}
}

async function adminAudit(action, targetType, targetId, details) {
  if (!sb) return;
  var payload = {
    action: action,
    target_type: targetType || null,
    target_id: targetId == null ? null : String(targetId),
    details: details || {},
    admin_user_id: currentUser && currentUser.id ? currentUser.id : null,
    created_at: new Date().toISOString()
  };
  try {
    await sb.from('admin_audit_events').insert(payload);
  } catch(e) {}
  try {
    var local = JSON.parse(localStorage.getItem('juke_admin_audit_pending') || '[]');
    local.unshift(payload);
    localStorage.setItem('juke_admin_audit_pending', JSON.stringify(local.slice(0, 100)));
  } catch(e) {}
}

async function adminSignOut() {
  if (sb) await sb.auth.signOut();
  localStorage.removeItem('juke_auth');
  location.replace('../index.html');
}

// ── Tab switcher ───────────────────────────────────────────────────────────────
function adminSwitchTab(id) {
  document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
  document.querySelectorAll('.tab-content').forEach(function(c){ c.classList.remove('active'); });
  var btn = document.getElementById('tab-' + id);
  var content = document.getElementById('content-' + id);
  if (btn) btn.classList.add('active');
  if (content) content.classList.add('active');

  if (id === 'users')       { if (typeof initAdminUsers === 'function') initAdminUsers(); }
  if (id === 'profiles')    { if (typeof initAdminProfiles === 'function') initAdminProfiles(); }
  if (id === 'impersonate') { if (typeof initAdminImpersonate === 'function') initAdminImpersonate(); }
  if (id === 'programs')    { if (typeof initAdminPrograms === 'function') initAdminPrograms(); }
  if (id === 'logos')       { if (typeof initAdminLogos === 'function') initAdminLogos(); }
  if (id === 'calendar')    { if (typeof initAdminCalendar  === 'function') initAdminCalendar(); }
  if (id === 'requests')    { if (typeof initAdminRequests  === 'function') initAdminRequests(); }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function adminToast(msg, type) {
  var t = document.createElement('div');
  t.className = 'admin-toast' + (type === 'err' ? ' err' : type === 'ok' ? ' ok' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function(){ t.classList.add('visible'); }, 10);
  setTimeout(function(){ t.classList.remove('visible'); setTimeout(function(){ t.remove(); }, 300); }, 3000);
}

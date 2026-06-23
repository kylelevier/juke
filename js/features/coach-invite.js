// ── ATHLETE INVITE MODAL ──────────────────────────────────────────────────────
// Calls the `invite-athletes` Supabase edge function, which sends a Loops
// transactional email to each address. Set up required secrets in Supabase:
//   LOOPS_API_KEY          — your Loops API key
//   LOOPS_TRANSACTIONAL_ID — the transactional email template ID from Loops
//
// The template receives these data variables:
//   coachName  — full name of the sending coach
//   coachOrg   — school / org name
//   signupUrl  — JUKE signup URL

const _INVITE_MAX = 10;

function openInviteModal() {
  const overlay = document.getElementById('invite-modal-overlay');
  if (!overlay) return;
  _resetInviteModal();
  overlay.classList.add('open');
  if (window.JukeDialog) window.JukeDialog.open(overlay, { close: closeInviteModal });
  const first = overlay.querySelector('.invite-email-input');
  if (first) setTimeout(() => first.focus(), 60);
}

function closeInviteModal() {
  const overlay = document.getElementById('invite-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  if (window.JukeDialog) window.JukeDialog.close(overlay);
}

function _resetInviteModal() {
  const list = document.getElementById('invite-email-list');
  if (list) {
    list.innerHTML = `<div class="invite-email-row">
      <input class="invite-email-input" type="email" placeholder="athlete@email.com" autocomplete="off">
      <button class="invite-email-rm" onclick="removeInviteRow(this)" tabindex="-1" aria-label="Remove">×</button>
    </div>`;
  }
  _setInviteMsg('', '');
  document.getElementById('invite-submit-btn').disabled = false;
  document.getElementById('invite-submit-btn').textContent = 'Send Invites';
  document.getElementById('invite-modal-form-view').style.display = '';
  document.getElementById('invite-modal-success-view').style.display = 'none';
  _updateAddRowBtn();
}

function addInviteRow() {
  const list = document.getElementById('invite-email-list');
  if (!list) return;
  if (list.children.length >= _INVITE_MAX) return;
  const row = document.createElement('div');
  row.className = 'invite-email-row';
  row.innerHTML = `<input class="invite-email-input" type="email" placeholder="athlete@email.com" autocomplete="off">
    <button class="invite-email-rm" onclick="removeInviteRow(this)" tabindex="-1" aria-label="Remove">×</button>`;
  list.appendChild(row);
  row.querySelector('input').focus();
  _updateAddRowBtn();
}

function removeInviteRow(btn) {
  const list = document.getElementById('invite-email-list');
  if (!list || list.children.length <= 1) return;
  btn.closest('.invite-email-row').remove();
  _updateAddRowBtn();
}

function _updateAddRowBtn() {
  const list = document.getElementById('invite-email-list');
  const btn = document.getElementById('invite-add-row');
  if (!list || !btn) return;
  btn.style.display = list.children.length >= _INVITE_MAX ? 'none' : '';
}

function _setInviteMsg(text, type) {
  const el = document.getElementById('invite-modal-msg');
  if (!el) return;
  el.textContent = text;
  el.className = 'invite-modal-msg' + (type ? ' ' + type : '');
}

function _getCoachMeta() {
  try {
    const auth = JSON.parse(localStorage.getItem('juke_auth') || '{}');
    const profile = (auth.profiles || [])[0] || {};
    return { name: auth.name || 'Your coach', org: profile.org || '' };
  } catch (e) {
    return { name: 'Your coach', org: '' };
  }
}

async function submitInvites() {
  const inputs = document.querySelectorAll('#invite-email-list .invite-email-input');
  const emails = [...inputs]
    .map(i => i.value.trim().toLowerCase())
    .filter(e => e.length > 0);

  if (!emails.length) {
    _setInviteMsg('Enter at least one email address.', 'error');
    return;
  }

  const invalid = emails.filter(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (invalid.length) {
    _setInviteMsg(`Invalid email${invalid.length > 1 ? 's' : ''}: ${invalid.join(', ')}`, 'error');
    return;
  }

  const btn = document.getElementById('invite-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  _setInviteMsg('', '');

  const { name: coachName, org: coachOrg } = _getCoachMeta();

  try {
    const client = window.sb;
    if (!client) throw new Error('Not connected');

    const { data: { session } } = await client.auth.getSession();
    if (!session) throw new Error('Not signed in');

    const SUPABASE_URL = 'https://gvxdabtmksxhujeytofv.supabase.co';
    const res = await fetch(`${SUPABASE_URL}/functions/v1/invite-athletes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ emails, coachName, coachOrg }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `Server error ${res.status}`);

    const sent = result.sent ?? emails.length;
    const sub = document.getElementById('invite-success-sub');
    if (sub) {
      sub.textContent = `${sent} invite${sent !== 1 ? 's' : ''} sent successfully.` +
        (result.errors?.length ? ` ${result.errors.length} failed.` : '');
    }
    document.getElementById('invite-modal-form-view').style.display = 'none';
    document.getElementById('invite-modal-success-view').style.display = '';
  } catch (err) {
    console.error('Invite error:', err);
    _setInviteMsg(err.message || 'Something went wrong. Please try again.', 'error');
    btn.disabled = false;
    btn.textContent = 'Send Invites';
  }
}

// Close on backdrop click
document.addEventListener('click', function (e) {
  const overlay = document.getElementById('invite-modal-overlay');
  if (overlay && e.target === overlay) closeInviteModal();
});

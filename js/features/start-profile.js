const START_SUPABASE_URL = 'https://gvxdabtmksxhujeytofv.supabase.co';
const START_SUPABASE_KEY = 'sb_publishable_eERuVHBjTdhkIxpWvCX62A_3bMoXgAn';
const startSb = (typeof supabase !== 'undefined')
  ? supabase.createClient(START_SUPABASE_URL, START_SUPABASE_KEY)
  : null;

const START_NEXT = '/pages/athlete.html?start=profile-edit';

function startSetStatus(message, isError){
  const el = document.getElementById('start-status');
  if(!el) return;
  el.textContent = message || '';
  el.className = 'start-status' + (isError ? ' error' : '');
}

function splitName(name){
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return {
    fname: parts.shift() || '',
    lname: parts.join(' ')
  };
}

function startReadDraft(){
  const name = document.getElementById('start-name').value.trim();
  const city = document.getElementById('start-city').value.trim();
  const state = document.getElementById('start-state').value;
  const names = splitName(name);
  return {
    fname: names.fname,
    lname: names.lname,
    school: document.getElementById('start-school').value.trim(),
    city: city && state ? city + ', ' + state : city || state,
    gradyr: document.getElementById('start-gradyr').value,
    startedAt: new Date().toISOString()
  };
}

function startSaveDraft(){
  const draft = startReadDraft();
  const existing = JSON.parse(localStorage.getItem('juke_player') || '{}') || {};
  localStorage.setItem('juke_start_profile_draft', JSON.stringify(draft));
  localStorage.setItem('juke_profile_edit_on_arrival', '1');
  localStorage.setItem('juke_player', JSON.stringify(Object.assign({}, existing, draft)));
  return draft;
}

async function startContinue(event){
  event.preventDefault();
  const form = document.getElementById('start-form');
  if(!form.reportValidity()) return;
  if(!startSb){
    startSetStatus('Google sign-in is not available right now.', true);
    return;
  }
  const btn = document.getElementById('start-google-btn');
  btn.disabled = true;
  startSaveDraft();
  startSetStatus('Opening Google sign-in...');

  const { data } = await startSb.auth.getSession();
  if(data && data.session){
    window.location.href = START_NEXT;
    return;
  }

  const next = encodeURIComponent(START_NEXT);
  const { error } = await startSb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/login.html?next=' + next }
  });
  if(error){
    startSetStatus(error.message, true);
    btn.disabled = false;
  }
}

document.getElementById('start-form').addEventListener('submit', startContinue);

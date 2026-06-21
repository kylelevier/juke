// ── AUTH UI ──────────────────────────────────────────────
function openAuthModal(mode){
  if(mode==='signout'){_doSignOut();return;}
  const modal=document.getElementById('auth-modal-overlay');
  if(!modal)return;
  modal.classList.add('open');
  showSignIn();
  const focusTarget=document.getElementById('auth-email')||modal.querySelector('.auth-submit')||modal.querySelector('button');
  if(window.JukeDialog) window.JukeDialog.open(modal, {close: closeAuthModal, focus: focusTarget});
}
function closeAuthModal(e){
  const modal=document.getElementById('auth-modal-overlay');
  if(e&&e.target!==modal)return;
  modal.classList.remove('open');
  if(window.JukeDialog) window.JukeDialog.close(modal);
}
function showSignIn(){
  const signin=document.getElementById('auth-panel-signin');
  const signup=document.getElementById('auth-panel-signup');
  const msg=document.getElementById('auth-msg');
  const dialog=document.querySelector('#auth-modal-overlay [role="dialog"]');
  if(signin) signin.style.display='';
  if(signup) signup.style.display='none';
  if(msg) msg.className='auth-msg';
  if(dialog) dialog.setAttribute('aria-labelledby','auth-signin-title');
}
function showSignUp(){
  const signin=document.getElementById('auth-panel-signin');
  const signup=document.getElementById('auth-panel-signup');
  const msg=document.getElementById('auth-msg-up');
  const dialog=document.querySelector('#auth-modal-overlay [role="dialog"]');
  if(signin) signin.style.display='none';
  if(signup) signup.style.display='';
  if(msg) msg.className='auth-msg';
  if(dialog) dialog.setAttribute('aria-labelledby', signup ? 'auth-signup-title' : 'auth-signin-title');
}
function _updateAuthUI(){
  const signedin=!!currentUser;
  const signInBtn=document.getElementById('auth-signin-btn');
  const userChip=document.getElementById('auth-user-chip');
  const emailDisplay=document.getElementById('auth-email-display');
  if(signInBtn) signInBtn.style.display=signedin?'none':'';
  if(userChip)  userChip.style.display=signedin?'flex':'none';
  if(emailDisplay&&signedin) emailDisplay.textContent=currentUser.email;
}
function _showSyncBadge(){
  const b=document.getElementById('cloud-sync-badge');
  if(!b)return;
  b.classList.add('show');
  setTimeout(()=>b.classList.remove('show'),2000);
}

// ── AUTH ACTIONS ─────────────────────────────────────────
async function handleSignIn(){
  if(!sb){alert('Supabase not configured — add your URL and key to the file.');return;}
  const emailEl=document.getElementById('auth-email');
  const pwEl=document.getElementById('auth-password');
  const btn=document.getElementById('auth-submit-btn');
  const msg=document.getElementById('auth-msg');
  if(!emailEl||!pwEl||!btn||!msg){
    console.warn('JUKE email sign-in controls are not present in this modal.');
    alert('Use Continue with Google to sign in.');
    return;
  }
  const email=emailEl.value.trim();
  const pw=pwEl.value;
  btn.disabled=true;btn.textContent='Signing in…';msg.className='auth-msg';
  const {error}=await sb.auth.signInWithPassword({email,password:pw});
  btn.disabled=false;btn.textContent='Sign In';
  if(error){msg.textContent=error.message;msg.className='auth-msg error';}
  else{closeAuthModal();}
}
async function handleSignUp(){
  if(!sb){alert('Supabase not configured — add your URL and key to the file.');return;}
  const emailEl=document.getElementById('auth-email-up');
  const pwEl=document.getElementById('auth-password-up');
  const btn=document.getElementById('auth-submit-up-btn');
  const msg=document.getElementById('auth-msg-up');
  if(!emailEl||!pwEl||!btn||!msg){
    console.warn('JUKE email sign-up controls are not present in this modal.');
    alert('Use Continue with Google to create your account.');
    return;
  }
  const email=emailEl.value.trim();
  const pw=pwEl.value;
  btn.disabled=true;btn.textContent='Creating account…';msg.className='auth-msg';
  const {error}=await sb.auth.signUp({email,password:pw});
  btn.disabled=false;btn.textContent='Create Account';
  if(error){msg.textContent=error.message;msg.className='auth-msg error';}
  else{msg.textContent='Account created! Check your email to confirm, then sign in.';msg.className='auth-msg success';}
}
async function _doSignOut(){
  if(!sb)return;
  await sb.auth.signOut();
  currentUser=null;
  _updateAuthUI();
}

// ── CLOUD SAVE ───────────────────────────────────────────
function _getFitPrefs(){
  const ids=['pf-div','pf-gov','pf-vc','pf-region','pf-state','pf-gpa','pf-major','pf-type','pf-net','pf-rel','pf-hbcu'];
  const prefs={};
  ids.forEach(id=>{const el=document.getElementById(id);if(el)prefs[id]=el.value;});
  return prefs;
}
async function cloudSave(){
  if(!sb||!currentUser)return;
  const profile=lsGet('juke_player');
  const payload={
    user_id:currentUser.id,
    profile,
    pipeline:lsGet('juke_status'),
    notes:lsGet('juke_notes'),
    fit:_getFitPrefs(),
  };
  const {error}=await sb.from('player_data').upsert(payload,{onConflict:'user_id'});
  if(error){
    console.error('JUKE cloud save failed:', error);
    showToast?.('Cloud save failed. Your changes are saved on this device.');
    return;
  }
  await _syncPublishedAthleteProfile(profile);
  _showSyncBadge();
}

async function _syncPublishedAthleteProfile(profile){
  if(!sb||!currentUser)return;
  const publish=lsGet('juke_publish');
  if(!publish?.on)return;
  const pd=Object.assign({}, profile||{});
  const avatar=lsGet('juke_avatar');
  const banner=lsGet('juke_banner');
  const recs=lsGet('juke_endorsements');
  pd._offers=Object.keys(lsGet('juke_offers'));
  pd._positions=pd.positions||pd._positions||[];
  pd._avatar=typeof avatar==='string'?avatar:'';
  pd._banner=typeof banner==='string'?banner:'';
  pd._recommendations=(Array.isArray(recs)?recs:[]).filter(e=>e&&e.status==='endorsed');
  pd['pf-div']=document.getElementById('pf-div')?.value||'';
  pd['pf-region']=document.getElementById('pf-region')?.value||'';
  ['p-fname','p-lname','p-email','p-gradyr','p-gpa','p-height','p-forty','p-vertical',
   'p-city','p-school','p-major','p-highlight','p-gamefilm','p-phone'].forEach(id=>{
    pd[id]=document.getElementById(id)?.value||pd[id]||'';
  });
  const {error}=await sb.from('athlete_profiles').upsert({
    user_id:currentUser.id,
    profile_data:pd,
    is_discoverable:true,
    updated_at:new Date().toISOString()
  },{onConflict:'user_id'});
  if(error) console.error('JUKE publish sync failed:', error);
}

// ── CLOUD LOAD ───────────────────────────────────────────
function _applyFitPrefs(prefs){
  if(!prefs)return;
  Object.entries(prefs).forEach(([id,val])=>{
    const el=document.getElementById(id);
    if(el)el.value=val;
  });
  recalcFit();applyFilters();
}
async function _syncFromCloud(){
  if(!sb||!currentUser)return;
  const {data,error}=await sb.from('player_data').select('*').eq('user_id',currentUser.id).single();
  if(error){
    if(error.code !== 'PGRST116') console.error('JUKE cloud load failed:', error);
    return;
  }
  if(!data)return;
  if(data.profile&&Object.keys(data.profile).length){
    lsSet('juke_player',data.profile);
    if(typeof loadPlayerProfile === 'function') loadPlayerProfile();
    if(typeof profileAwards !== 'undefined' && !profileAwards.length && typeof addAward === 'function') addAward();
    if(typeof profileUpdate === 'function') profileUpdate();
  }
  if(data.pipeline&&Object.keys(data.pipeline).length){
    statusData=data.pipeline;
    lsSet('juke_status',statusData);
  }
  if(data.notes&&Object.keys(data.notes).length){
    adminNotes=data.notes;
    lsSet('juke_notes',adminNotes);
  }
  if(data.fit)_applyFitPrefs(data.fit);
  if(typeof render === 'function') render();
  if(document.getElementById('tab-pipeline')?.classList.contains('active')||
     document.getElementById('content-pipeline')?.style.display!=='none') renderPipeline();
  _showSyncBadge();
  if(typeof checkJukeLoginAlerts === 'function') setTimeout(checkJukeLoginAlerts, 2000);
}

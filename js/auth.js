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
  else{
    const user=(await sb.auth.getUser()).data?.user;
    if(user){
      try{
        const {data:profile}=await sb.from('user_profiles').select('is_active').eq('id',user.id).maybeSingle();
        if(profile&&profile.is_active===false){
          await sb.auth.signOut();
          localStorage.removeItem('juke_auth');
          msg.textContent='This account has been disabled. Contact JUKE support.';
          msg.className='auth-msg error';
          return;
        }
      }catch(e){}
    }
    closeAuthModal();
  }
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
  if(sb) await sb.auth.signOut();
  currentUser=null;
  localStorage.removeItem('juke_auth');
  _updateAuthUI();
  location.replace('../index.html');
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
  if(window.PREVIEW_TARGET_USER_ID)return;
  const profile=lsGet('juke_player');
  const payload={
    user_id:currentUser.id,
    profile,
    pipeline:lsGet('juke_status'),
    notes:lsGet('juke_notes'),
    fit:_getFitPrefs(),
    readiness:lsGet('juke_readiness'),
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
  const pd=buildPublicAthleteProfile(profile, {shareContact: !!publish.shareContact});

  // If avatar or banner are absent locally (different device / cleared storage),
  // fetch the existing Supabase value so we don't silently wipe photos.
  if(!pd._avatar||!pd._banner){
    const {data:existing}=await sb.from('athlete_profiles')
      .select('profile_data')
      .eq('user_id',currentUser.id)
      .maybeSingle();
    if(existing?.profile_data){
      if(!pd._avatar) pd._avatar=existing.profile_data._avatar||'';
      if(!pd._banner) pd._banner=existing.profile_data._banner||'';
    }
  }
  const {error}=await sb.rpc('publish_athlete_profile',{p_profile_data:pd});
  if(error) console.error('JUKE publish sync failed:', error);
}

function _profilePick(profile, keys){
  for(const key of keys){
    const el=document.getElementById(key);
    if(el&&el.value) return el.value;
    if(profile&&profile[key]) return profile[key];
  }
  return '';
}

function buildPublicAthleteProfile(profile, opts){
  opts=opts||{};
  profile=profile||{};
  const pd={};
  [
    ['p-fname',['p-fname','fname']],['p-lname',['p-lname','lname']],['p-gradyr',['p-gradyr','gradyr']],
    ['p-city',['p-city','city']],['p-school',['p-school','school']],['p-club-team',['p-club-team','clubTeam']],['p-gpa',['p-gpa','gpa']],
    ['p-sat',['p-sat','sat']],['p-act',['p-act','act']],['p-major',['p-major','major']],['p-honors',['p-honors','honors']],
    ['p-height',['p-height','height']],['p-weight',['p-weight','weight']],['p-forty',['p-forty','forty']],
    ['p-vertical',['p-vertical','vertical']],['p-twenty',['p-twenty','twenty']],['p-broad',['p-broad','broad']],['p-shuttle',['p-shuttle','shuttle']],
    ['p-verified-source',['p-verified-source','verifiedSource']],['p-verified-date',['p-verified-date','verifiedDate']],
    ['p-event-name',['p-event-name','eventName']],['p-event-date',['p-event-date','eventDate']],['p-event-location',['p-event-location','eventLocation']],['p-event-source',['p-event-source','eventSource']],
    ['p-highlight',['p-highlight','highlight']],['p-gamefilm',['p-gamefilm','gamefilm']],['p-profileurl',['p-profileurl','profileurl']],
    ['p-intro',['p-intro','intro']],['p-word1',['p-word1','word1']],['p-word2',['p-word2','word2']],['p-word3',['p-word3','word3']],
    ['p-sport1',['p-sport1','sport1']],['p-sport1pos',['p-sport1pos','sport1pos']],['p-sport2',['p-sport2','sport2']],['p-sport2pos',['p-sport2pos','sport2pos']],
    ['s-gp',['s-gp','gp']],['s-comp',['s-comp','comp']],['s-att',['s-att','att']],['s-ptd',['s-ptd','ptd']],['s-pyds',['s-pyds','pyds']],
    ['s-int',['s-int','int']],['s-rec',['s-rec','rec']],['s-ryds',['s-ryds','ryds']],['s-rtd',['s-rtd','rtd']],
    ['s-ruyds',['s-ruyds','ruyds']],['s-rutd',['s-rutd','rutd']],['s-flags',['s-flags','flags']],['s-def-int',['s-def-int','defint']],
    ['s-sacks',['s-sacks','sacks']],['s-dtd',['s-dtd','dtd']]
  ].forEach(([out,keys])=>{ const val=_profilePick(profile,keys); if(val) pd[out]=val; });

  pd._positions=profile.positions||profile._positions||[];
  pd.positions=pd._positions;
  pd.divisions=profile.divisions||[];
  pd.awards=Array.isArray(profile.awards)?profile.awards.filter(Boolean):[];
  pd.events=Array.isArray(profile.events)?profile.events:[];
  pd.verifiedMeasurables=profile.verifiedMeasurables||null;
  pd._offers=Object.keys(lsGet('juke_offers'));
  const avatar=lsGet('juke_avatar');
  const banner=lsGet('juke_banner');
  pd._avatar=typeof avatar==='string'?avatar:'';
  pd._banner=typeof banner==='string'?banner:'';
  pd._contact_public=!!opts.shareContact;
  if(opts.shareContact){
    [['p-email',['p-email','email']],['p-phone',['p-phone','phone']],['p-parent',['p-parent','parent']],['p-club-coach',['p-club-coach','clubCoach']]]
      .forEach(([out,keys])=>{ const val=_profilePick(profile,keys); if(val) pd[out]=val; });
  }
  return pd;
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
  let data=null;
  if(window.PREVIEW_TARGET_USER_ID){
    const bundle = window.PREVIEW_BUNDLE || (typeof loadAdminPreviewBundle === 'function' ? await loadAdminPreviewBundle() : null);
    if(!bundle) return;
    const playerData = bundle.player_data || {};
    data = {
      profile: bundle.profile || bundle.profile_data || playerData.profile || {},
      pipeline: bundle.pipeline || playerData.pipeline || {},
      notes: bundle.notes || playerData.notes || {},
      fit: bundle.fit || playerData.fit || null,
      readiness: bundle.readiness || playerData.readiness || null
    };
  } else {
    const cloudRes=await sb.from('player_data').select('*').eq('user_id',currentUser.id).maybeSingle();
    if(cloudRes.error){
      if(cloudRes.error.code !== 'PGRST116') console.error('JUKE cloud load failed:', cloudRes.error);
    }else{
      data=cloudRes.data;
    }
  }
  if(!data)data={};
  if(!window.PREVIEW_TARGET_USER_ID && typeof migrateLocalBoardDraftIfNeeded === 'function'){
    const migratedPipeline=await migrateLocalBoardDraftIfNeeded(data.pipeline||{});
    if(migratedPipeline&&Object.keys(migratedPipeline).length) data.pipeline=migratedPipeline;
  }
  if(data.profile&&Object.keys(data.profile).length){
    if(window.PREVIEW_USER_ID){
      window.PREVIEW_PROFILE=data.profile;
      if(typeof renderPreviewAthleteChip === 'function') renderPreviewAthleteChip(data.profile);
    }
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
  if(data.readiness&&Object.keys(data.readiness).length){
    lsSet('juke_readiness',data.readiness);
    if(typeof renderReadiness==='function'&&document.getElementById('content-readiness')?.classList.contains('active'))renderReadiness();
  }
  if(typeof render === 'function') render();
  if(document.getElementById('tab-pipeline')?.classList.contains('active')||
     document.getElementById('content-pipeline')?.style.display!=='none') renderPipeline();
  _showSyncBadge();
  if(typeof checkJukeLoginAlerts === 'function') setTimeout(checkJukeLoginAlerts, 2000);
}

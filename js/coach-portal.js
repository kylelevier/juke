// ── GATE ─────────────────────────────────────────────────────
function unlockCoachPortal(){
  const pw = (document.getElementById('coach-pw-input').value||'').trim();
  if(pw !== COACH_PW){
    (function(){var _e=document.getElementById('coach-gate-err');if(_e)_e.style.display='block'})();
    return;
  }
  coachUnlocked = true;
  (function(){var _e=document.getElementById('coach-gate');if(_e)_e.style.display='none'})();
  (function(){var _e=document.getElementById('coach-portal');if(_e)_e.style.display='block'})();
  _updateCoachSavedCount();
  loadCoachAthletes();
}

function lockCoachPortal(){
  coachUnlocked = false;
  (function(){var _e=document.getElementById('coach-gate');if(_e)_e.style.display='flex'})();
  (function(){var _e=document.getElementById('coach-portal');if(_e)_e.style.display='none'})();
  document.getElementById('coach-pw-input').value='';
  (function(){var _e=document.getElementById('coach-gate-err');if(_e)_e.style.display='none'})();
}

// ── LOAD ATHLETES FROM SUPABASE ───────────────────────────────
async function loadCoachAthletes(){
  const grid = document.getElementById('coach-grid');
  if(grid) grid.innerHTML='<div style="padding:48px;text-align:center;color:var(--text-muted);font-family:\'Archivo Condensed\',sans-serif;font-size:13px;letter-spacing:.06em;grid-column:1/-1">Loading athletes…</div>';

  let athletes = [];
  let liveData = false;

  if(sb){
    try{
      const {data,error} = await sb
        .from('athlete_profiles')
        .select('id,profile_data,published_at,updated_at')
        .eq('is_discoverable',true)
        .order('updated_at',{ascending:false});
      if(!error && data){
        athletes = data.map(row=>({...row.profile_data, _id:row.id, _published:row.published_at}));
        liveData = true;
      }
    }catch(e){}
  }

  const notice = document.getElementById('coach-setup-notice');
  if(!liveData){
    if(notice) notice.style.display='block';
    athletes = _coachDemoAthletes();
  } else {
    if(notice) notice.style.display='none';
  }

  coachAthletes = athletes;
  const ts = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const el = document.getElementById('coach-last-refresh');
  if(el) el.textContent = 'Refreshed '+ts;
  filterCoachAthletes();
}

// ── FILTER ────────────────────────────────────────────────────
function filterCoachAthletes(){
  const s      = (document.getElementById('cf-search')?.value||'').toLowerCase();
  const pos    = document.getElementById('cf-pos')?.value||'';
  const gradyr = document.getElementById('cf-gradyr')?.value||'';
  const minGpa = parseFloat(document.getElementById('cf-gpa')?.value)||0;
  const region = document.getElementById('cf-region')?.value||'';
  const div    = document.getElementById('cf-div')?.value||'';

  coachFiltered = coachAthletes.filter(a=>{
    const name   = ((a['p-fname']||'')+' '+(a['p-lname']||'')).toLowerCase();
    const city   = (a['p-city']||'').toLowerCase();
    const school = (a['p-school']||'').toLowerCase();
    const major  = (a['p-major']||'').toLowerCase();
    const positions = a._positions || [];
    const gpa    = parseFloat(a['p-gpa'])||0;

    if(s && ![name,city,school,major].some(x=>x.includes(s))) return false;
    if(pos && !positions.map(p=>p.toLowerCase()).includes(pos.toLowerCase())) return false;
    if(gradyr && (a['p-gradyr']||'') !== gradyr) return false;
    if(minGpa>0 && gpa < minGpa) return false;
    if(region && (a['pf-region']||'') !== region) return false;
    if(div && (a['pf-div']||'') !== div) return false;
    return true;
  });
  _renderCoachBrowse();
}

function resetCoachFilters(){
  ['cf-search','cf-pos','cf-gradyr','cf-gpa','cf-region','cf-div'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.value='';
  });
  filterCoachAthletes();
}

// ── RENDER BROWSE ─────────────────────────────────────────────
function _renderCoachBrowse(){
  const grid  = document.getElementById('coach-grid');
  const empty = document.getElementById('coach-browse-empty');
  const cnt   = document.getElementById('coach-result-count');
  if(cnt) cnt.textContent = coachFiltered.length;
  if(!coachFiltered.length){
    if(grid) grid.innerHTML='';
    if(empty) empty.style.display='block';
  } else {
    if(empty) empty.style.display='none';
    if(grid)  grid.innerHTML = coachFiltered.map(a=>_coachCard(a)).join('');
  }
}

// ── RENDER SAVED ──────────────────────────────────────────────
function _renderCoachSaved(){
  const savedIds = Object.keys(coachSaves);
  const saved    = coachAthletes.filter(a=>savedIds.includes(String(a._id||a['p-email']||'')));
  const grid     = document.getElementById('coach-saved-grid');
  const empty    = document.getElementById('coach-saved-empty');
  _updateCoachSavedCount();
  if(!saved.length){
    if(grid) grid.innerHTML='';
    if(empty) empty.style.display='block';
  } else {
    if(empty) empty.style.display='none';
    if(grid)  grid.innerHTML = saved.map(a=>_coachCard(a)).join('');
  }
}

// ── ATHLETE CARD ──────────────────────────────────────────────
function _coachCard(a){
  const id       = String(a._id || a['p-email'] || Math.random().toString(36).slice(2));
  const saved    = !!coachSaves[id];
  const name     = [a['p-fname'],a['p-lname']].filter(Boolean).join(' ')||'Unknown Athlete';
  const city     = a['p-city']||'—';
  const gradyr   = a['p-gradyr']||'—';
  const school   = a['p-school']||'—';
  const gpa      = a['p-gpa']||'—';
  const height   = a['p-height']||'—';
  const forty    = a['p-forty']||'—';
  const vertical = a['p-vertical']||'—';
  const divPref  = a['pf-div']||'—';
  const regPref  = a['pf-region']||'—';
  const positions= a._positions||[];
  const hl       = a['p-highlight']||'';
  const gf       = a['p-gamefilm']||'';
  const email    = a['p-email']||'';
  const phone    = a['p-phone']||'';
  const major    = a['p-major']||'';
  const note     = (coachSaves[id]?.note)||'';
  const posTags  = positions.slice(0,5).map(p=>'<span class="tag tag-pos">'+p+'</span>').join('');

  return '<div class="coach-athlete-card'+(saved?' saved':'')+'" id="ccard-'+id+'">'+
    '<div class="coach-card-hd">'+
      '<div>'+
        '<div class="coach-card-name">'+name+'</div>'+
        '<div class="coach-card-sub">'+school+' &nbsp;&middot;&nbsp; '+city+' &nbsp;&middot;&nbsp; \''+gradyr.slice(-2)+'</div>'+
      '</div>'+
      '<button class="coach-save-btn'+(saved?' saved':'')+'" onclick="toggleCoachSave(\''+id+'\')" title="'+(saved?'Unsave':'Save athlete')+'">'+(saved?'⭐':'☆')+'</button>'+
    '</div>'+
    '<div class="coach-card-tags">'+(posTags||'<span style="font-size:11px;color:var(--text-dim)">No position listed</span>')+'</div>'+
    '<div class="coach-card-stats">'+
      '<div class="coach-stat-box"><div class="coach-stat-val">'+gpa+'</div><div class="coach-stat-lbl">GPA</div></div>'+
      '<div class="coach-stat-box"><div class="coach-stat-val">'+forty+'</div><div class="coach-stat-lbl">40-Yd</div></div>'+
      '<div class="coach-stat-box"><div class="coach-stat-val">'+vertical+'</div><div class="coach-stat-lbl">Vertical</div></div>'+
    '</div>'+
    '<div class="coach-card-details">'+
      '<div><div class="coach-detail-lbl">Height</div><div class="coach-detail-val">'+height+'</div></div>'+
      '<div><div class="coach-detail-lbl">Major</div><div class="coach-detail-val">'+(major||'—')+'</div></div>'+
      '<div><div class="coach-detail-lbl">Div. Interest</div><div class="coach-detail-val">'+divPref+'</div></div>'+
      '<div><div class="coach-detail-lbl">Region</div><div class="coach-detail-val">'+regPref+'</div></div>'+
    '</div>'+
    '<div class="coach-card-ft">'+
      (hl?'<a class="coach-film-link" href="'+hl+'" target="_blank" rel="noopener">🎬 Highlights ↗</a>':'')+
      (gf?'<a class="coach-film-link" href="'+gf+'" target="_blank" rel="noopener">🎥 Game Film ↗</a>':'')+
      (email?'<a class="coach-film-link" href="mailto:'+email+'">✉ Email</a>':'')+
      (phone?'<span style="font-size:12px;color:var(--text-muted)">'+phone+'</span>':'')+
    '</div>'+
    (saved?'<div class="coach-note-wrap"><textarea class="coach-note-input" rows="2" placeholder="Private note about this athlete…" onchange="updateCoachNote(\''+id+'\',this.value)">'+note+'</textarea></div>':'')+
  '</div>';
}

// ── SAVE / UNSAVE ─────────────────────────────────────────────
function toggleCoachSave(id){
  if(coachSaves[id]){ delete coachSaves[id]; }
  else { coachSaves[id]={savedAt:new Date().toISOString(),note:''}; }
  lsSet('juke_coach_saves',coachSaves);
  _updateCoachSavedCount();
  if(coachCurrentSub==='browse') filterCoachAthletes();
  else _renderCoachSaved();
}

function updateCoachNote(id,note){
  if(coachSaves[id]) coachSaves[id].note=note;
  lsSet('juke_coach_saves',coachSaves);
}

function clearAllCoachSaves(){
  if(!confirm('Clear all saved athletes?')) return;
  coachSaves={};
  lsSet('juke_coach_saves',coachSaves);
  _updateCoachSavedCount();
  _renderCoachSaved();
}

function _updateCoachSavedCount(){
  const n=Object.keys(coachSaves).length;
  ['coach-saved-count','coach-saved-list-count'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.textContent=n;
  });
}

// ── SUB-TABS ──────────────────────────────────────────────────
function switchCoachSub(tab){
  coachCurrentSub=tab;
  ['browse','saved'].forEach(t=>{
    const btn=document.getElementById('csub-'+t);
    const view=document.getElementById('coach-view-'+t);
    if(btn) btn.classList.toggle('active',t===tab);
    if(view) view.style.display=t===tab?'block':'none';
  });
  if(tab==='saved') _renderCoachSaved();
}

// ── PUBLISH ATHLETE PROFILE ───────────────────────────────────
async function handlePublishToggle(){
  const toggle = document.getElementById('publish-toggle');
  const pill   = document.getElementById('publish-pill');
  const status = document.getElementById('publish-status');
  const consent = document.getElementById('publish-contact-consent');
  if(!currentUser){
    toggle.checked=false;
    openAuthModal('signin');
    return;
  }
  const on = toggle.checked;
  const prior = lsGet('juke_publish')||{};
  const shareContact = !!(consent&&consent.checked);
  if(on){
    const profile=lsGet('juke_player');
    const pd=typeof buildPublicAthleteProfile==='function'
      ? buildPublicAthleteProfile(profile,{shareContact})
      : {...profile};
    const visible=[
      'Name, class year, city, school/team',
      'Positions, athletic metrics, academics, stats, film links, awards, and story fields',
      'Board offer schools if tracked'
    ];
    visible.push(shareContact?'Contact fields: email, phone, parent, and club coach':'Contact fields: not shared');
    if(!confirm('Publish this recruiter-visible profile?\n\n'+visible.join('\n')+'\n\nYou can unpublish later.')){
      toggle.checked=!!prior.on;
      return;
    }
  }else if(!confirm('Unpublish your profile? Recruiters will no longer find it in search.')){
    toggle.checked=true;
    return;
  }
  if(status){status.textContent='';status.className='publish-status';}
  if(pill){ pill.textContent=on?'Publishing…':'Removing…'; pill.className='publish-live-pill draft'; }

  const pd = typeof buildPublicAthleteProfile==='function'
    ? buildPublicAthleteProfile(lsGet('juke_player'),{shareContact})
    : {...lsGet('juke_player')};

  if(sb){
    const r = on
      ? await sb.rpc('publish_athlete_profile', {p_profile_data: pd})
      : await sb.rpc('unpublish_athlete_profile');
    if(r.error){
      if(status){status.textContent=(on?'Publish':'Unpublish')+' failed: '+r.error.message;status.className='publish-status err';}
      else alert('Error publishing: '+r.error.message);
      toggle.checked=!!prior.on;
      if(consent) consent.checked=!!prior.shareContact;
      if(pill){ pill.textContent=prior.on?'● Live':'Draft'; pill.className='publish-live-pill '+(prior.on?'live':'draft'); }
      return;
    }
  }
  if(pill){ pill.textContent=on?'● Live':'Draft'; pill.className='publish-live-pill '+(on?'live':'draft'); }
  lsSet('juke_publish',{on,shareContact:on&&shareContact,publishedAt:on?new Date().toISOString():prior.publishedAt||null});
  if(status){status.textContent=on?'Profile published.':'Profile unpublished.';status.className='publish-status ok';}
  if(on&&!prior.publishedAt&&window.JukeOnboarding){
    JukeOnboarding.mark('athlete','profilePublished');
    JukeOnboarding.showGoLiveCelebration();
  }
  _showSyncBadge();
  renderProfileView();
}

async function handlePublishContactConsent(){
  const consent=document.getElementById('publish-contact-consent');
  const status=document.getElementById('publish-status');
  const publish=lsGet('juke_publish')||{};
  const shareContact=!!(consent&&consent.checked);
  if(!publish.on){
    lsSet('juke_publish',{...publish,shareContact:false});
    return;
  }
  if(!confirm('Update the contact fields shown on your live recruiter-visible profile?')){
    if(consent) consent.checked=!!publish.shareContact;
    return;
  }
  publish.shareContact=shareContact;
  lsSet('juke_publish',publish);
  if(!sb||!currentUser) return;
  const pd=typeof buildPublicAthleteProfile==='function'
    ? buildPublicAthleteProfile(lsGet('juke_player'),{shareContact})
    : {...lsGet('juke_player')};
  const {error}=await sb.from('athlete_profiles')
    .update({profile_data:pd,updated_at:new Date().toISOString()})
    .eq('user_id',currentUser.id);
  if(error){
    publish.shareContact=!shareContact;
    lsSet('juke_publish',publish);
    if(consent) consent.checked=!!publish.shareContact;
    if(status){status.textContent='Contact visibility update failed: '+error.message;status.className='publish-status err';}
    return;
  }
  if(status){status.textContent='Contact visibility updated.';status.className='publish-status ok';}
  _showSyncBadge();
}

// Restore publish state on load
(function _restorePublish(){
  const p=lsGet('juke_publish');
  const consent=document.getElementById('publish-contact-consent');
  if(consent){ consent.checked=!!p?.shareContact; }
  if(p?.on){
    const toggle=document.getElementById('publish-toggle');
    const pill=document.getElementById('publish-pill');
    if(toggle){ toggle.checked=true; }
    if(pill){ pill.textContent='● Live'; pill.className='publish-live-pill live'; }
  }
})();

// ── DEMO ATHLETES (shown when Supabase table not yet set up) ──
function _coachDemoAthletes(){
  return [
    {_id:'d1','p-fname':'Jordan','p-lname':'Rivera','p-city':'Dallas, TX','p-school':'Lincoln HS / JUKE Elite','p-gradyr':'2026','p-gpa':'3.8','p-height':'5\'7"','p-forty':'4.7s','p-vertical':'26"','p-major':'Kinesiology','p-email':'jrivera@example.com','p-phone':'(214) 555-0101','pf-div':'Division II','pf-region':'South','_positions':['QB','Utility'],'p-highlight':'https://hudl.com','p-gamefilm':''},
    {_id:'d2','p-fname':'Aaliyah','p-lname':'Thompson','p-city':'Atlanta, GA','p-school':'Westside HS','p-gradyr':'2026','p-gpa':'3.5','p-height':'5\'6"','p-forty':'4.9s','p-vertical':'22"','p-major':'Business','p-email':'athompson@example.com','p-phone':'','pf-div':'Division I','pf-region':'Southeast','_positions':['WR','CB'],'p-highlight':'','p-gamefilm':''},
    {_id:'d3','p-fname':'Maya','p-lname':'Chen','p-city':'Los Angeles, CA','p-school':'Valley FC','p-gradyr':'2027','p-gpa':'4.0','p-height':'5\'5"','p-forty':'4.8s','p-vertical':'24"','p-major':'Pre-Med','p-email':'mchen@example.com','p-phone':'(310) 555-0201','pf-div':'Division III','pf-region':'West','_positions':['RB','S'],'p-highlight':'https://hudl.com','p-gamefilm':'https://hudl.com'},
    {_id:'d4','p-fname':'Brianna','p-lname':'Foster','p-city':'Chicago, IL','p-school':'North Side Elite','p-gradyr':'2027','p-gpa':'3.2','p-height':'5\'8"','p-forty':'4.6s','p-vertical':'28"','p-major':'Communications','p-email':'bfoster@example.com','p-phone':'','pf-div':'Division I','pf-region':'Midwest','_positions':['Rusher','LB'],'p-highlight':'https://hudl.com','p-gamefilm':''},
    {_id:'d5','p-fname':'Kayla','p-lname':'Washington','p-city':'Miami, FL','p-school':'Suncoast HS','p-gradyr':'2025','p-gpa':'3.6','p-height':'5\'4"','p-forty':'5.0s','p-vertical':'20"','p-major':'Marketing','p-email':'','p-phone':'','pf-div':'NAIA','pf-region':'Southeast','_positions':['WR'],'p-highlight':'','p-gamefilm':''},
    {_id:'d6','p-fname':'Destiny','p-lname':'Morales','p-city':'Houston, TX','p-school':'Bayou City Ballers','p-gradyr':'2028','p-gpa':'3.9','p-height':'5\'9"','p-forty':'4.5s','p-vertical':'30"','p-major':'Exercise Science','p-email':'dmorales@example.com','p-phone':'(713) 555-0303','pf-div':'Division I','pf-region':'South','_positions':['QB'],'p-highlight':'https://hudl.com','p-gamefilm':'https://hudl.com'},
    {_id:'d7','p-fname':'Sofia','p-lname':'Reyes','p-city':'Phoenix, AZ','p-school':'Desert Storm FC','p-gradyr':'2026','p-gpa':'3.4','p-height':'5\'6"','p-forty':'4.8s','p-vertical':'23"','p-major':'Nursing','p-email':'sreyes@example.com','p-phone':'','pf-div':'Division II','pf-region':'West','_positions':['Center','OL'],'p-highlight':'','p-gamefilm':''},
    {_id:'d8','p-fname':'Imani','p-lname':'Jackson','p-city':'Charlotte, NC','p-school':'CLT Speed FC','p-gradyr':'2027','p-gpa':'3.7','p-height':'5\'7"','p-forty':'4.7s','p-vertical':'25"','p-major':'Psychology','p-email':'ijackson@example.com','p-phone':'(704) 555-0404','pf-div':'Division II','pf-region':'Southeast','_positions':['S','CB'],'p-highlight':'https://hudl.com','p-gamefilm':''},
  ];
}


// ════════════════════════════════════════════════
//  PROGRAM PROFILE PANEL
// ════════════════════════════════════════════════
let _ppCurrent = null;

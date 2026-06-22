(function(){
  const ROLE_LABELS={
    athlete:'Athlete',
    college_coach:'Recruiter',
    hs_coach:'Coach'
  };

  const DEFAULTS={
    athlete:{
      accountCreated:false,
      quickStartDone:false,
      firstSchoolSaved:false,
      boardViewed:false,
      profileStarted:false
    },
    college_coach:{
      firstLogin:false,
      setupDone:false,
      firstAthleteAdded:false,
      firstStageMove:false,
      firstActionLogged:false
    },
    hs_coach:{
      firstLogin:false,
      setupDone:false,
      rosterViewed:false,
      firstRecommendation:false,
      firstOutreach:false
    }
  };

  function readJson(key, fallback){
    try{
      const raw=localStorage.getItem(key);
      return raw?JSON.parse(raw):fallback;
    }catch(e){return fallback;}
  }

  function writeJson(key, value){
    try{localStorage.setItem(key, JSON.stringify(value));}catch(e){}
  }

  function activeCoachAuth(){
    const auth=readJson('juke_auth', null);
    if(!auth) return null;
    const profiles=Array.isArray(auth.profiles)?auth.profiles:[];
    const active=profiles.find(p=>p.id===auth.activeProfileId)||profiles[0]||{};
    return {
      id:active.id||auth.email||auth.name||active.org,
      email:auth.email,
      org:active.org,
      name:auth.name
    };
  }

  function userKey(role){
    if(role==='athlete'&&window.currentUser){
      return currentUser.id||currentUser.email||'athlete';
    }
    const coach=activeCoachAuth();
    if(coach&&(coach.id||coach.email||coach.org)) return coach.id||coach.email||coach.org;
    return 'alpha_device';
  }

  function safeKey(value){
    return String(value||'alpha_device').toLowerCase().replace(/[^a-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'')||'alpha_device';
  }

  function storageKey(role){
    return 'juke_onboarding_'+role+'_'+safeKey(userKey(role));
  }

  function defaultState(role){
    return {
      role,
      roleLabel:ROLE_LABELS[role]||role,
      milestones:Object.assign({}, DEFAULTS[role]||{}),
      startedAt:null,
      updatedAt:null,
      dismissed:{}
    };
  }

  function get(role){
    role=role||window.JUKE_PORTAL_TYPE||'athlete';
    const state=Object.assign(defaultState(role), readJson(storageKey(role), {}));
    state.milestones=Object.assign({}, DEFAULTS[role]||{}, state.milestones||{});
    state.dismissed=state.dismissed||{};
    return state;
  }

  function set(role, state){
    state.updatedAt=new Date().toISOString();
    writeJson(storageKey(role), state);
    return state;
  }

  function event(role, name, data){
    role=role||window.JUKE_PORTAL_TYPE||'athlete';
    const key=storageKey(role)+'_events';
    const events=readJson(key, []);
    events.push({name, role, at:new Date().toISOString(), data:data||{}});
    writeJson(key, events.slice(-100));
  }

  function mark(role, milestone, data){
    role=role||window.JUKE_PORTAL_TYPE||'athlete';
    const state=get(role);
    if(state.milestones[milestone]) return state;
    state.milestones[milestone]=true;
    set(role, state);
    event(role, milestone, data);
    return state;
  }

  function start(role){
    role=role||window.JUKE_PORTAL_TYPE||'athlete';
    const state=get(role);
    if(!state.startedAt){
      state.startedAt=new Date().toISOString();
      set(role, state);
      event(role, 'onboarding_started');
    }
    if(role==='athlete') mark(role, 'accountCreated');
    if(role==='college_coach'||role==='hs_coach') mark(role, 'firstLogin');
  }

  function dismiss(role, key){
    const state=get(role);
    state.dismissed[key]=true;
    set(role, state);
    event(role, key+'_dismissed');
  }

  function setSelect(id, value){
    const el=document.getElementById(id);
    if(el) el.value=value;
  }

  function buildYearOptions(){
    const year=new Date().getFullYear();
    let html='<option value="">Grad year</option>';
    for(let y=year;y<=year+6;y++) html+='<option value="'+y+'">'+y+'</option>';
    return html;
  }

  function openAthleteQuickStart(){
    const role='athlete';
    const state=get(role);
    if(state.milestones.quickStartDone) return;
    if(document.getElementById('onboarding-athlete-modal')) return;
    const overlay=document.createElement('div');
    overlay.className='onboarding-overlay';
    overlay.id='onboarding-athlete-modal';
    overlay.innerHTML=
      '<div class="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-athlete-title">'+
        '<button class="onboarding-close" aria-label="Close" onclick="JukeOnboarding.closeAthleteQuickStart(true)">×</button>'+
        '<div class="onboarding-kicker">Quick Start</div>'+
        '<div class="onboarding-title" id="onboarding-athlete-title">Make the program list yours</div>'+
        '<div class="onboarding-sub">Three choices tune your matches. You can change them anytime.</div>'+
        '<div class="onboarding-grid">'+
          '<label class="onboarding-field"><span>Sport</span><select id="onb-sport"><option value="Flag Football">Flag Football</option><option value="Soccer">Soccer</option><option value="Basketball">Basketball</option><option value="Track">Track & Field</option><option value="Volleyball">Volleyball</option></select></label>'+
          '<label class="onboarding-field"><span>Grad Year</span><select id="onb-grad">'+buildYearOptions()+'</select></label>'+
          '<label class="onboarding-field"><span>Target Level</span><select id="onb-division"><option value="">Not sure</option><option value="Division I">D1</option><option value="Division II">D2</option><option value="Division III">D3</option><option value="NAIA">NAIA</option></select></label>'+
        '</div>'+
        '<div class="onboarding-actions">'+
          '<button class="onboarding-secondary" onclick="JukeOnboarding.closeAthleteQuickStart(true)">Skip</button>'+
          '<button class="onboarding-primary" onclick="JukeOnboarding.completeAthleteQuickStart()">Show Matches</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(overlay);
    setTimeout(()=>overlay.classList.add('open'),0);
    const grad=document.getElementById('p-gradyr')?.value;
    if(grad) setSelect('onb-grad', grad);
  }

  function closeAthleteQuickStart(skipped){
    const modal=document.getElementById('onboarding-athlete-modal');
    if(modal) modal.remove();
    if(skipped) dismiss('athlete', 'quickStart');
  }

  function completeAthleteQuickStart(){
    const sport=document.getElementById('onb-sport')?.value||'';
    const grad=document.getElementById('onb-grad')?.value||'';
    const division=document.getElementById('onb-division')?.value||'';
    if(sport) setSelect('p-sport1', sport);
    if(grad) setSelect('p-gradyr', grad);
    if(division==='NAIA'){
      setSelect('pf-gov', 'NAIA');
      setSelect('f-gov', 'NAIA');
      setSelect('pf-div', '');
      setSelect('f-div', '');
    }else if(division){
      setSelect('pf-div', division);
      setSelect('f-div', division);
      setSelect('pf-gov', 'NCAA');
    }
    if(typeof saveProfile==='function') saveProfile();
    if(typeof recalcFit==='function') recalcFit();
    if(typeof applyFilters==='function') applyFilters();
    if(typeof switchTab==='function') switchTab('finder');
    mark('athlete', 'quickStartDone', {sport, gradYear:grad, division:division||'Not sure'});
    event('athlete', 'finder_prefilter_applied', {sport, gradYear:grad, division:division||'Not sure'});
    closeAthleteQuickStart(false);
  }

  function maybeShowAthleteQuickStart(){
    const state=get('athlete');
    if(state.milestones.quickStartDone||state.milestones.firstSchoolSaved||state.dismissed.quickStart) return;
    setTimeout(openAthleteQuickStart, 450);
  }

  function init(){
    const role=window.JUKE_PORTAL_TYPE||'athlete';
    start(role);
    if(role==='athlete') maybeShowAthleteQuickStart();
    if(role==='college_coach'){
      const p=window.coachProfile||{};
      if(p.school&&((p.div||p.conf||p.loc)||p.title)) mark(role, 'setupDone', {school:p.school});
    }
    if(role==='hs_coach'){
      mark(role, 'rosterViewed');
      const p=readJson('juke_hs_profile', null);
      if(p&&(p.school||p.league)) mark(role, 'setupDone', {school:p.school});
    }
  }

  window.JukeOnboarding={
    get,
    event,
    mark,
    start,
    dismiss,
    init,
    openAthleteQuickStart,
    closeAthleteQuickStart,
    completeAthleteQuickStart
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

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
      profileStarted:false,
      profilePublished:false,
      firstOffer:false
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
    const grad=document.getElementById('p-gradyr')?.value||(JSON.parse(localStorage.getItem('juke_player')||'{}').gradyr||'');
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
    // Don't interrupt when the user arrived from start.html to edit their profile
    const params=new URLSearchParams(window.location.search);
    if(params.get('start')==='profile-edit'||localStorage.getItem('juke_profile_edit_on_arrival')==='1') return;
    // Suppress for returning signed-in users — their cloud data supersedes the empty localStorage state
    if(typeof currentUser !== 'undefined' && currentUser) return;
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

  function _esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

  function showFirstWinCelebration(schoolName){
    if(document.getElementById('fw-overlay')) return;
    var avatarRaw=localStorage.getItem('juke_avatar');
    var avatarSrc=avatarRaw?JSON.parse(avatarRaw):null;
    var bannerRaw=localStorage.getItem('juke_banner');
    var bannerSrc=bannerRaw?JSON.parse(bannerRaw):null;
    var p=readJson('juke_player',{});
    var fname=p.fname||p['p-fname']||'';
    var lname=p.lname||p['p-lname']||'';
    var initials=((fname[0]||'')+(lname[0]||'')).toUpperCase()||'?';

    var avatarHtml=avatarSrc
      ?'<img class="fw-av-img" src="'+_esc(avatarSrc)+'" alt=""/>'
      :'<span class="fw-av-initials">'+_esc(initials)+'</span>';

    var heroInner=bannerSrc
      ?'<div class="fw-hero-img" style="background-image:url('+_esc(bannerSrc)+')"></div><div class="fw-hero-scrim"></div>'
      :'';

    var overlay=document.createElement('div');
    overlay.className='fw-overlay';
    overlay.id='fw-overlay';
    overlay.innerHTML=
      '<div class="fw-confetti" id="fw-confetti"></div>'
      +'<div class="fw-card" role="dialog" aria-modal="true" aria-label="First school saved">'
        +'<div class="fw-hero">'+heroInner+'<div class="fw-av">'+avatarHtml+'</div></div>'
        +'<div class="fw-body">'
          +'<div class="fw-kicker">First Save ✦</div>'
          +'<div class="fw-headline">Your recruiting<br>journey starts now.</div>'
          +'<div class="fw-school-chip">'+_esc(schoolName)+'</div>'
          +'<div class="fw-sub">One program on your board. Keep building your list to compare fit and track interest from coaches.</div>'
          +'<button class="fw-cta" onclick="JukeOnboarding.closeFirstWin(true)">Let\'s go →</button>'
        +'</div>'
        +'<div class="fw-progress-bar"><div class="fw-progress-fill" id="fw-progress-fill"></div></div>'
      +'</div>';
    document.body.appendChild(overlay);

    var COLORS=['#ff0080','#7b2fff','#ffd700','#ffffff','#ff4aa2','#a78bfa','#fb923c','#34d399'];
    var wrap=document.getElementById('fw-confetti');
    for(var i=0;i<32;i++){
      var el=document.createElement('div');
      el.className='fw-particle';
      el.style.cssText=
        'left:'+Math.random()*100+'%;'
        +'top:'+(-(Math.random()*15+2))+'%;'
        +'background:'+COLORS[Math.floor(Math.random()*COLORS.length)]+';'
        +'width:'+(Math.random()*5+3)+'px;'
        +'height:'+(Math.random()*9+4)+'px;'
        +'animation-delay:'+(Math.random()*1.4).toFixed(2)+'s;'
        +'animation-duration:'+(Math.random()*1.6+2).toFixed(2)+'s;'
        +'border-radius:'+(Math.random()>.5?'50%':'2px')+';';
      wrap.appendChild(el);
    }

    setTimeout(function(){overlay.classList.add('open');},30);

    var fill=document.getElementById('fw-progress-fill');
    if(fill) fill.style.animation='fw-drain 5s linear forwards';
    overlay._timer=setTimeout(function(){closeFirstWin(false);},5000);
  }

  function closeFirstWin(goToBoard){
    var overlay=document.getElementById('fw-overlay');
    if(!overlay) return;
    if(overlay._timer) clearTimeout(overlay._timer);
    overlay.classList.remove('open');
    setTimeout(function(){if(overlay.parentNode) overlay.parentNode.removeChild(overlay);},300);
    if(goToBoard&&typeof switchTab==='function') switchTab('pipeline');
  }

  function _spawnConfetti(wrapperId, colors, count){
    var wrap=document.getElementById(wrapperId);
    if(!wrap) return;
    for(var i=0;i<count;i++){
      var el=document.createElement('div');
      el.className='fw-particle';
      el.style.cssText=
        'left:'+Math.random()*100+'%;'
        +'top:'+(-(Math.random()*15+2))+'%;'
        +'background:'+colors[Math.floor(Math.random()*colors.length)]+';'
        +'width:'+(Math.random()*5+3)+'px;'
        +'height:'+(Math.random()*9+4)+'px;'
        +'animation-delay:'+(Math.random()*1.4).toFixed(2)+'s;'
        +'animation-duration:'+(Math.random()*1.6+2).toFixed(2)+'s;'
        +'border-radius:'+(Math.random()>.5?'50%':'2px')+';';
      wrap.appendChild(el);
    }
  }

  function _openCelebration(id, html, autoDismissFn, delay){
    if(document.getElementById(id)) return;
    var overlay=document.createElement('div');
    overlay.className='fw-overlay';
    overlay.id=id;
    overlay.innerHTML=html;
    document.body.appendChild(overlay);
    setTimeout(function(){overlay.classList.add('open');},30);
    var fill=overlay.querySelector('.fw-progress-fill');
    if(fill) fill.style.animation='fw-drain '+delay+'s linear forwards';
    overlay._timer=setTimeout(function(){autoDismissFn(false);},delay*1000);
  }

  function showGoLiveCelebration(){
    var avatarRaw=localStorage.getItem('juke_avatar');
    var avatarSrc=avatarRaw?JSON.parse(avatarRaw):null;
    var bannerRaw=localStorage.getItem('juke_banner');
    var bannerSrc=bannerRaw?JSON.parse(bannerRaw):null;
    var p=readJson('juke_player',{});
    var fname=p.fname||p['p-fname']||'';
    var lname=p.lname||p['p-lname']||'';
    var initials=((fname[0]||'')+(lname[0]||'')).toUpperCase()||'?';
    var avatarHtml=avatarSrc
      ?'<img class="fw-av-img" src="'+_esc(avatarSrc)+'" alt=""/>'
      :'<span class="fw-av-initials">'+_esc(initials)+'</span>';
    var heroInner=bannerSrc
      ?'<div class="fw-hero-img" style="background-image:url('+_esc(bannerSrc)+')"></div><div class="fw-hero-scrim"></div>'
      :'';
    var html=
      '<div class="fw-confetti" id="fw-live-confetti"></div>'
      +'<div class="fw-card" role="dialog" aria-modal="true" aria-label="Profile is live">'
        +'<div class="fw-hero">'+heroInner+'<div class="fw-av">'+avatarHtml+'</div></div>'
        +'<div class="fw-body">'
          +'<div class="fw-kicker fw-kicker--live">You\'re Live ✦</div>'
          +'<div class="fw-headline">Coaches can<br>find you now.</div>'
          +'<div class="fw-live-pill"><span class="fw-live-dot"></span>Profile Published</div>'
          +'<div class="fw-sub">Your profile is in front of every verified recruiter on JUKE. Keep it updated — active profiles get more attention.</div>'
          +'<button class="fw-cta" onclick="JukeOnboarding.closeGoLive(true)">See my profile →</button>'
        +'</div>'
        +'<div class="fw-progress-bar"><div class="fw-progress-fill"></div></div>'
      +'</div>';
    _openCelebration('fw-live-overlay', html, closeGoLive, 6);
    _spawnConfetti('fw-live-confetti',['#ff0080','#7b2fff','#fff','#ff4aa2','#a78bfa','#c084fc','#e879f9'],30);
  }

  function closeGoLive(goToProfile){
    var overlay=document.getElementById('fw-live-overlay');
    if(!overlay) return;
    if(overlay._timer) clearTimeout(overlay._timer);
    overlay.classList.remove('open');
    setTimeout(function(){if(overlay.parentNode) overlay.parentNode.removeChild(overlay);},300);
    if(goToProfile&&typeof switchTab==='function') switchTab('profile');
  }

  function showFirstOfferCelebration(schoolName){
    var domain=(window.SCHOOL_DOMAINS&&window.SCHOOL_DOMAINS[schoolName])||null;
    var initials=(schoolName||'?').split(/\s+/).map(function(w){return w[0]||'';}).join('').slice(0,3).toUpperCase();
    var logoHtml=domain
      ?'<img class="fw-offer-logo-img" src="https://logo.clearbit.com/'+_esc(domain)+'" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
        +'<div class="fw-offer-logo-fb" style="display:none">'+_esc(initials)+'</div>'
      :'<div class="fw-offer-logo-fb">'+_esc(initials)+'</div>';
    var html=
      '<div class="fw-confetti" id="fw-offer-confetti"></div>'
      +'<div class="fw-card fw-card--offer" role="dialog" aria-modal="true" aria-label="First offer received">'
        +'<div class="fw-hero fw-hero--offer">'
          +'<div class="fw-offer-glow"></div>'
          +'<div class="fw-offer-logo">'+logoHtml+'</div>'
        +'</div>'
        +'<div class="fw-body">'
          +'<div class="fw-kicker fw-kicker--offer">Offer Received 🏆</div>'
          +'<div class="fw-headline">'+_esc(schoolName)+'<br>wants you.</div>'
          +'<div class="fw-sub">Review the full offer, understand the package, and give yourself time to decide. You\'ve earned this.</div>'
          +'<button class="fw-cta fw-cta--offer" onclick="JukeOnboarding.closeFirstOffer(true)">Review my board →</button>'
        +'</div>'
        +'<div class="fw-progress-bar fw-progress-bar--offer"><div class="fw-progress-fill fw-progress-fill--offer"></div></div>'
      +'</div>';
    _openCelebration('fw-offer-overlay', html, closeFirstOffer, 7);
    _spawnConfetti('fw-offer-confetti',['#ffd700','#ff9800','#fff','#fbbf24','#f59e0b','#fb923c','#fde68a'],36);
  }

  function closeFirstOffer(goToBoard){
    var overlay=document.getElementById('fw-offer-overlay');
    if(!overlay) return;
    if(overlay._timer) clearTimeout(overlay._timer);
    overlay.classList.remove('open');
    setTimeout(function(){if(overlay.parentNode) overlay.parentNode.removeChild(overlay);},300);
    if(goToBoard&&typeof switchTab==='function') switchTab('pipeline');
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
    completeAthleteQuickStart,
    showFirstWinCelebration,
    closeFirstWin,
    showGoLiveCelebration,
    closeGoLive,
    showFirstOfferCelebration,
    closeFirstOffer
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

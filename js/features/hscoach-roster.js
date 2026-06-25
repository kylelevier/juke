// ──────────────────────────────────────────────
// LOCALSTORAGE HELPERS
// ──────────────────────────────────────────────
const ls  = key => { try { return JSON.parse(localStorage.getItem('juke_hs_'+key)); } catch(e){ return null; } };
const lss = (key,val) => { try { localStorage.setItem('juke_hs_'+key, JSON.stringify(val)); } catch(e){} };

// ──────────────────────────────────────────────
// SAMPLE DATA
// ──────────────────────────────────────────────
const ATHLETES = [
  {id:1, fname:'Camryn', lname:'Wells',       pos:['WR','PR'], year:2026, gpa:3.9, height:"5'6\"", forty:'4.38', vertical:'32"', school:'DeSoto HS', state:'TX', programs:[{name:'N. Arizona',div:'NCAA D1',stage:'contacted'},{name:'Texas A&M',div:'NCAA D1',stage:'saved'},{name:'UNLV',div:'NCAA D1',stage:'saved'},{name:'Colorado St.',div:'NCAA D1',stage:'contacted'},{name:'Boise State',div:'NCAA D1',stage:'saved'}], bio:'3× All-State WR. Elite separation route runner with top-10% 40 time. Academic All-State 2024.'},
  {id:2, fname:'Destiny', lname:'Okafor',     pos:['QB'],      year:2025, gpa:3.7, height:"5'9\"", forty:'4.62', vertical:'28"', school:'DeSoto HS', state:'TX', programs:[{name:'Ole Miss',div:'NCAA D1',stage:'applied'},{name:'Arkansas St.',div:'NCAA D1',stage:'contacted'},{name:'UTSA',div:'NCAA D1',stage:'saved'}], bio:'Dual-threat QB. 3,200 passing yards, 31 TDs. District MVP two consecutive seasons.'},
  {id:3, fname:'Amara',   lname:'Johnson',    pos:['CB','S'],  year:2026, gpa:3.5, height:"5'5\"", forty:'4.45', vertical:'30"', school:'DeSoto HS', state:'TX', programs:[{name:'Maryland',div:'NCAA D1',stage:'saved'},{name:'Howard',div:'NCAA D1',stage:'saved'}], bio:'Shutdown corner with 12 INTs over two seasons. Also contributes as a safety.'},
  {id:4, fname:'Taylor',  lname:'Brooks',     pos:['WR'],      year:2027, gpa:3.8, height:"5'7\"", forty:'4.41', vertical:'31"', school:'DeSoto HS', state:'TX', programs:[{name:'UNLV',div:'NCAA D1',stage:'saved'}], bio:'Underclassman with D1 upside. Long speed, strong hands, keeps improving every week.'},
  {id:5, fname:'Maya',    lname:'Chen',       pos:['RB','KR'], year:2026, gpa:4.0, height:"5'4\"", forty:'4.52', vertical:'27"', school:'DeSoto HS', state:'TX', programs:[], bio:'Valedictorian-track RB. Elite vision and lateral agility. Needs exposure.'},
  {id:6, fname:'Jasmine', lname:'Rivera',     pos:['LB'],      year:2025, gpa:3.2, height:"5'8\"", forty:'4.48', vertical:'29"', school:'DeSoto HS', state:'TX', programs:[{name:'Ole Miss',div:'NCAA D1',stage:'saved'},{name:'Auburn',div:'NCAA D1',stage:'contacted'},{name:'Louisiana',div:'NCAA D1',stage:'saved'},{name:'Grambling',div:'NCAA D1',stage:'contacted'}], bio:'Physical LB with great instincts. 40+ flag pulls last season. Underrated by the ratings systems.'},
  {id:7, fname:'Keara',   lname:'Thomas',     pos:['S'],       year:2027, gpa:3.6, height:"5'6\"", forty:'4.55', vertical:'26"', school:'DeSoto HS', state:'TX', programs:[{name:'FIU',div:'NCAA D1',stage:'saved'}], bio:'Versatile safety with strong coverage skills and leadership qualities beyond her years.'},
  {id:8, fname:'Brianna', lname:'Washington', pos:['QB','WR'], year:2026, gpa:3.4, height:"5'8\"", forty:'4.49', vertical:'28"', school:'DeSoto HS', state:'TX', programs:[], bio:'Dual-position weapon. Can play QB or slot WR at the next level. Needs film to circulate.'},
];

const HS_DEMO_ATHLETES = ATHLETES.map(a=>({
  ...a,
  pos:[...a.pos],
  programs:a.programs.map(p=>({...p}))
}));

const ACTIVITY = [
  {id:1, school:'Northern Arizona',  abbr:'NAU', domain:'nau.edu',          div:'NCAA D1 – Big Sky',       athletes:[1,2], date:'2 days ago'},
  {id:2, school:'Texas A&M',         abbr:'A&M', domain:'tamu.edu',         div:'NCAA D1 – SEC',            athletes:[1],   date:'4 days ago'},
  {id:3, school:'Ole Miss',          abbr:'OM',  domain:'olemiss.edu',      div:'NCAA D1 – SEC',            athletes:[2,6], date:'5 days ago'},
  {id:4, school:'Maryland',          abbr:'UMD', domain:'umd.edu',          div:'NCAA D1 – Big Ten',        athletes:[3],   date:'1 week ago'},
  {id:5, school:'Auburn',            abbr:'AU',  domain:'auburn.edu',       div:'NCAA D1 – SEC',            athletes:[6],   date:'1 week ago'},
  {id:6, school:'UNLV',              abbr:'UNLV',domain:'unlv.edu',         div:'NCAA D1 – Mountain West',  athletes:[1,4], date:'10 days ago'},
];

const STAGE_LABELS = {none:'No Contact',saved:'Saved',interested:'Saved',contacted:'Contacted',applied:'Applied',offered:'Offered',committed:'Committed'};
const STAGE_COLORS = {saved:'#0057FF',interested:'#0057FF',contacted:'#7B2FFF',applied:'#FF4500',offered:'#FF0080',committed:'#00E050'}; // interested kept as compat alias

let _hsLiveProfilesLoaded = false;
let _hsRosterSource = 'demo';
let _hsAuthRetryAttached = false;

// Recommendations are backend-owned. This cache is only for immediate UI updates
// after a successful submit in the current session.
let endorsements = {};

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
function el(id){ return document.getElementById(id); }

function hsSameId(a,b){ return String(a)===String(b); }
function hsFindAthlete(id){ return ATHLETES.find(a=>hsSameId(a.id,id)); }
function hsJsArg(value){
  return "'" + String(value).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,' ') + "'";
}
function hsEsc(value){
  return String(value ?? '').replace(/[&<>"']/g, c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  })[c]);
}

function _hsProfileField(p, shortKey, longKey){
  return p?.[shortKey] || p?.[longKey] || '';
}

function _hsNumber(value){
  const n=parseFloat(value);
  return Number.isFinite(n)?n:0;
}

function _hsNormalizeOrg(value){
  return String(value||'')
    .toLowerCase()
    .replace(/&/g,' and ')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\b(high|school|hs|club|team|girls|womens|women|flag|football|program)\b/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function _hsSchoolTargets(){
  const out=[];
  const add=v=>{ if(v&&!out.includes(v)) out.push(v); };
  add(el('hs-school')?.value);
  const saved=ls('profile');
  add(saved?.school);
  try{
    const auth=JSON.parse(localStorage.getItem('juke_auth'));
    const apid=auth?.activeProfileId||auth?.profiles?.[0]?.id;
    const ap=(auth?.profiles||[]).find(p=>p.id===apid)||auth?.profiles?.[0];
    add(ap?.org);
    add(auth?.school);
  }catch(e){}
  return out.map(_hsNormalizeOrg).filter(Boolean);
}

function _hsSchoolCandidates(value){
  return String(value||'')
    .split(/[\/|;]+|\s+-\s+/)
    .map(_hsNormalizeOrg)
    .filter(Boolean);
}

function _hsSchoolMatchesCoach(profileSchool){
  const targets=_hsSchoolTargets();
  if(!targets.length) return false;
  const schools=_hsSchoolCandidates(profileSchool);
  return schools.some(school=>targets.some(target=>{
    if(!school||!target) return false;
    return school===target || school.includes(target) || target.includes(school);
  }));
}

function _hsMapPublishedAthlete(row, idx){
  const p=row.profile_data||{};
  const fname=_hsProfileField(p,'fname','p-fname');
  const lname=_hsProfileField(p,'lname','p-lname');
  const name=(fname+' '+lname).trim() || p.name || 'Unnamed Athlete';
  const nameParts=name.split(/\s+/);
  const cityState=_hsProfileField(p,'city','p-city');
  const parts=cityState.split(',').map(x=>x.trim()).filter(Boolean);
  const offers=Array.isArray(p._offers)?p._offers:[];
  const programs=offers.map(school=>({name:school, div:'Offer', stage:'offered'}));
  return {
    id:'live_'+(row.user_id||row.id||idx),
    _userId:row.user_id||'',
    _live:true,
    _publishedAt:row.published_at||row.updated_at,
    fname:fname || nameParts[0] || 'Unnamed',
    lname:lname || nameParts.slice(1).join(' '),
    pos:p.positions||p._positions||['ATH'],
    year:parseInt(_hsProfileField(p,'gradyr','p-gradyr'))||new Date().getFullYear(),
    gpa:_hsNumber(_hsProfileField(p,'gpa','p-gpa')),
    height:_hsProfileField(p,'height','p-height')||'',
    forty:_hsProfileField(p,'forty','p-forty')||'',
    vertical:_hsProfileField(p,'vertical','p-vertical')||'',
    twenty:_hsProfileField(p,'twenty','p-twenty')||p.verifiedMeasurables?.twenty?.value||'',
    shuttle:_hsProfileField(p,'shuttle','p-shuttle')||p.verifiedMeasurables?.shuttle?.value||'',
    broad:_hsProfileField(p,'broad','p-broad')||p.verifiedMeasurables?.broad?.value||'',
    verifiedSource:p.verifiedSource||p['p-verified-source']||p.verifiedMeasurables?.twenty?.source||p.verifiedMeasurables?.shuttle?.source||p.verifiedMeasurables?.broad?.source||'',
    verifiedDate:p.verifiedDate||p['p-verified-date']||p.verifiedMeasurables?.twenty?.verifiedAt||p.verifiedMeasurables?.shuttle?.verifiedAt||p.verifiedMeasurables?.broad?.verifiedAt||'',
    verifiedMeasurables:p.verifiedMeasurables||null,
    school:_hsProfileField(p,'school','p-school')||'',
    clubTeam:_hsProfileField(p,'clubTeam','p-club-team')||'',
    state:(parts[1]||p.state||'').toUpperCase(),
    programs,
    bio:p.intro||p.bio||'',
    highlight:_hsProfileField(p,'highlight','p-highlight')||'',
    gamefilm:_hsProfileField(p,'gamefilm','p-gamefilm')||'',
    avatar:p._avatar||p.avatar||'',
    banner:p._banner||p.banner||'',
    recommendations:p._recommendations||[]
  };
}

function _hsApplyRoster(athletes, source){
  ATHLETES.splice(0, ATHLETES.length, ...athletes);
  _hsRosterSource=source;
  var banner=el('demo-roster-banner');
  if(banner) banner.style.display=(source==='demo')?'':'none';
  updateHSCard();
  renderRoster();
  renderActivity();
  renderOutreachAthletes();
}

async function loadPublishedHsRoster(){
  if(_hsLiveProfilesLoaded) return;
  const client=window.sb||window._hsSb||null;
  const cu=window.currentUser||window._hsCurrentUser||null;
  if(!client||!cu) return _hsRetryAfterAuth();
  try{
    // Use server-side school-matched RPC (replaces client-side fuzzy matching)
    const {data,error}=await client.rpc('get_hs_roster');
    if(error){
      // RPC not available or school not set — fall through to demo
      if(!/not authenticated|school not set/i.test(error.message||''))
        console.warn('JUKE HS live roster load failed:', error);
      return;
    }
    const live=(data||[])
      .map(_hsMapPublishedAthlete)
      .filter(a=>a.fname!=='Unnamed');
    _hsLiveProfilesLoaded=true;
    if(live.length) _hsApplyRoster(live,'live');
    else _hsApplyRoster(HS_DEMO_ATHLETES.map(a=>({...a,pos:[...a.pos],programs:a.programs.map(p=>({...p}))})),'demo');
  }catch(e){
    console.warn('JUKE HS live roster load failed:', e);
  }
}

function athleteStatus(a){
  if(!a.programs.length) return 'none';
  const stages = a.programs.map(p=>p.stage);
  if(stages.includes('committed')) return 'committed';
  if(stages.includes('offered'))   return 'offered';
  if(stages.includes('applied'))   return 'applied';
  if(stages.includes('contacted')) return 'contacted';
  return 'saved';
}

function statusColor(st){
  return STAGE_COLORS[st] || 'transparent';
}

function logoUrl(domain){ return 'https://logo.clearbit.com/'+domain; }

function initials(a){ return (a.fname[0]+(a.lname?a.lname[0]:'')).toUpperCase(); }

function _hsRetryAfterAuth(){
  if(_hsAuthRetryAttached) return;
  _hsAuthRetryAttached=true;
  document.addEventListener('juke:auth-ready', function(){
    loadPublishedHsRoster();
    _hsLoadProfileFromBackend();
  });
}

// ── SEED SCHOOL FROM ACTIVE AUTH PROFILE ─────────────────────────────────────
function seedSchoolFromAuth(){
  try{
    var auth=JSON.parse(localStorage.getItem('juke_auth'));
    if(!auth||!auth.profiles) return;
    var apid=auth.activeProfileId||auth.profiles[0].id;
    var ap=auth.profiles.find(function(p){return p.id===apid;})||auth.profiles[0];
    if(!ap) return;
    var abbr=ap.abbr||(ap.org||'').split(/\s+/).map(function(w){return w[0];}).join('').slice(0,3).toUpperCase()||'HS';
    var abbrEl=document.getElementById('hd-abbr');
    if(abbrEl) abbrEl.textContent=abbr;
    var nameEl=document.getElementById('hd-school-short');
    if(nameEl) nameEl.textContent=(ap.org||'').length>14?(ap.org||'').slice(0,12)+'…':(ap.org||'Your School');
    // Seed form school field if not set from saved profile
    var schoolEl=document.getElementById('hs-school');
    if(schoolEl&&!ls('profile')&&ap.org) schoolEl.value=ap.org;
    var fnameEl=document.getElementById('hs-fname');
    if(fnameEl&&!ls('profile')&&auth.name){
      var parts=auth.name.split(' ');
      fnameEl.value=parts[0]||'';
      var lnameEl=document.getElementById('hs-lname');
      if(lnameEl&&parts.length>1) lnameEl.value=parts.slice(1).join(' ');
    }
  }catch(e){}
}

// ──────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', ()=>{
  // Restore saved profile
  const saved = ls('profile');
  if(saved){
    if(saved.fname) el('hs-fname').value = saved.fname;
    if(saved.lname) el('hs-lname').value = saved.lname;
    if(saved.title) el('hs-title').value = saved.title;
    if(saved.school) el('hs-school').value = saved.school;
    if(saved.city) el('hs-city').value = saved.city;
    if(saved.state) el('hs-state').value = saved.state;
    if(saved.league) el('hs-league').value = saved.league;
    if(saved.bio) el('hs-bio').value = saved.bio;
  }
  // Restore banner/logo photos
  const banner = ls('banner');
  if(banner){ renderBannerPhoto(banner); }
  const logo = ls('logo');
  if(logo){ renderLogoPhoto(logo); }

  seedSchoolFromAuth();
  updateHSCard();
  renderRoster();
  renderActivity();
  renderOutreachAthletes();
  setTimeout(loadPublishedHsRoster, 120);
  setTimeout(_hsLoadProfileFromBackend, 300);
});

// ──────────────────────────────────────────────
// ── ENDORSEMENT REQUESTS ─────────────────────────────────
function escEnd(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function hsInitials(name){return(name||'').split(' ').map(function(w){return w[0]||'';}).join('').slice(0,2).toUpperCase();}
let _hsRecommendationRequests = [];

function hsMissingRecommendationsBackend(error){
  var msg=(error&&(error.message||error.details||error.hint))||'';
  return error&&(error.code==='PGRST202'||/function .*not found|could not find.*function/i.test(msg));
}

async function loadEndorsementRequests(){
  var panel=document.getElementById('end-req-panel');
  var cards=document.getElementById('end-req-cards');
  var badge=document.getElementById('end-req-badge');
  if(!panel||!cards) return;
  panel.style.display='';
  cards.innerHTML='<div class="end-req-none">Loading recommendation requests...</div>';
  const client=window.sb||window._hsSb||null;
  if(!client){
    badge.style.display='none';
    cards.innerHTML='<div class="end-req-none">Sign in to review recommendation requests.</div>';
    return;
  }
  const {data,error}=await client.rpc('list_recommendation_requests');
  if(error){
    badge.style.display='none';
    cards.innerHTML='<div class="end-req-none">'
      +(hsMissingRecommendationsBackend(error)
        ? 'Recommendation backend is not configured yet.'
        : 'Could not load recommendation requests.')
      +'</div>';
    return;
  }
  _hsRecommendationRequests=data||[];
  var pending=_hsRecommendationRequests.filter(function(e){return (e.status||'pending')==='pending';});
  if(pending.length){
    badge.style.display='';
    badge.textContent=pending.length+' pending';
    cards.innerHTML=pending.map(function(e){
      var athleteName=e.athlete_name||e.athleteName||'Athlete';
      var note=e.note||e.coachNote||'';
      return '<div class="end-pending-card" id="endcard-'+escEnd(e.id)+'">'
        +'<div class="epc-athlete-row">'
        +'<div class="epc-av">'+hsInitials(athleteName)+'</div>'
        +'<div><div class="epc-name">'+escEnd(athleteName)+'</div>'
        +(note?'<div class="epc-note">&#8220;'+escEnd(note)+'&#8221;</div>':'')
        +'</div></div>'
        +'<label class="epc-label">Your recommendation</label>'
        +'<textarea class="epc-textarea" id="endtext-'+escEnd(e.id)+'" placeholder="What makes this athlete stand out? What will a college program be getting?"></textarea>'
        +'<div class="epc-actions">'
        +'<button class="epc-submit-btn" onclick="submitHSEndorsement(\''+escEnd(e.id)+'\')">Submit Recommendation</button>'
        +'<span class="epc-success" id="endsuccess-'+escEnd(e.id)+'" style="display:none">✓ Submitted</span>'
        +'</div></div>';
    }).join('');
  } else {
    badge.style.display='none';
    cards.innerHTML='<div class="end-req-none">No recommendation requests need review right now.</div>';
  }
}

async function submitHSEndorsement(id){
  var textEl=document.getElementById('endtext-'+id);
  var text=textEl?textEl.value.trim():'';
  if(!text){alert('Please write a recommendation before submitting.');return;}
  const client=window.sb||window._hsSb||null;
  if(!client){alert('Sign in to submit recommendations.');return;}
  var btn=document.querySelector('#endcard-'+CSS.escape(id)+' .epc-submit-btn');
  if(btn){btn.disabled=true;btn.textContent='Submitting...';}
  const {error}=await client.rpc('submit_recommendation', {
    request_id:id,
    recommendation_text:text,
    traits:[]
  });
  if(btn){btn.disabled=false;btn.textContent='Submit Recommendation';}
  if(error){
    alert(hsMissingRecommendationsBackend(error)
      ? 'Recommendation submission is not configured yet. Ask an admin to deploy submit_recommendation.'
      : 'Could not submit recommendation: '+error.message);
    return;
  }
  var ok=document.getElementById('endsuccess-'+id);
  if(ok)ok.style.display='inline';
  setTimeout(function(){
    var card=document.getElementById('endcard-'+id);
    if(card)card.style.display='none';
    loadEndorsementRequests();
  },1600);
}

// TAB SWITCHING
// ──────────────────────────────────────────────
function switchHsTab(id){
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  const content = el('content-'+id);
  const btn = el('tab-'+id);
  if(content) content.classList.add('active');
  if(btn) btn.classList.add('active');
  if(id==='activity'){
    loadEndorsementRequests();
    if(typeof loadHsActivity==='function') loadHsActivity();
  }
}

// ──────────────────────────────────────────────
// VIEW TOGGLES
// ──────────────────────────────────────────────
let rosterView = 'cards';
let activityView = 'cards';

function setRosterView(v){
  rosterView = v;
  el('roster-grid').style.display         = v==='cards' ? '' : 'none';
  el('roster-table-wrap').style.display   = v==='table' ? '' : 'none';
  el('roster-vtog-cards').classList.toggle('active', v==='cards');
  el('roster-vtog-table').classList.toggle('active', v==='table');
  renderRoster();
}

function setActivityView(v){
  activityView = v;
  el('activity-grid').style.display        = v==='cards' ? '' : 'none';
  el('activity-table-wrap').style.display  = v==='table' ? '' : 'none';
  el('activity-vtog-cards').classList.toggle('active', v==='cards');
  el('activity-vtog-table').classList.toggle('active', v==='table');
  renderActivity();
}

// ──────────────────────────────────────────────
// PROFILE CARD
// ──────────────────────────────────────────────
function updateHSCard(){
  const fname  = el('hs-fname')?.value||'';
  const lname  = el('hs-lname')?.value||'';
  const title  = el('hs-title')?.value||'';
  const school = el('hs-school')?.value||'';
  const city   = el('hs-city')?.value||'';
  const state  = el('hs-state')?.value||'';
  const league = el('hs-league')?.value||'';
  const bio    = el('hs-bio')?.value||'';
  const abbr   = school.split(' ').map(w=>w[0]).join('').slice(0,3).toUpperCase();

  if(el('hs-display-name'))  el('hs-display-name').textContent = [fname,lname].filter(Boolean).join(' ')||'Your Name';
  if(el('hs-display-title')) el('hs-display-title').textContent = [title, school].filter(Boolean).join(' · ');
  if(el('hs-pill-loc'))      el('hs-pill-loc').textContent = [city,state].filter(Boolean).join(', ')||'Location';
  if(el('hs-pill-league'))   el('hs-pill-league').textContent = league||'League';
  if(el('hs-display-bio'))   el('hs-display-bio').textContent = bio;
  if(el('hd-abbr'))          el('hd-abbr').textContent = abbr||'HS';
  if(el('hd-school-short'))  el('hd-school-short').textContent = school.length>14 ? school.slice(0,12)+'…' : (school||'Your School');
  if(el('coach-logo-init'))  el('coach-logo-init').textContent = abbr[0]||'?';

  // Update stats — show zeros when no live athletes are loaded yet
  const isLive = _hsRosterSource === 'live';
  const endorsed = isLive ? Object.keys(endorsements).length : 0;
  const withInterest = isLive ? ATHLETES.filter(a=>a.programs.length>0).length : 0;
  const rosterCount = isLive ? ATHLETES.length : 0;
  const seniorCount = isLive ? ATHLETES.filter(a=>a.year===2025).length : 0;
  setText('hs-stat-roster', rosterCount);
  setText('hs-stat-roster-summary', rosterCount);
  setText('hs-stat-seniors', seniorCount);
  setText('hs-stat-seniors-summary', seniorCount);
  setText('hs-stat-interest', withInterest);
  setText('hs-stat-interest-summary', withInterest);
  setText('hs-stat-endorsed', endorsed);
  setText('hs-stat-endorsed-summary', endorsed);
  const countEl = el('roster-count');
  if(countEl) countEl.textContent = isLive ? ATHLETES.length+' live athlete'+(ATHLETES.length!==1?'s':'') : '';
  renderRosterAttention();
}

function setText(id, value){
  const node = el(id);
  if(node) node.textContent = value;
}

function renderRosterAttention(){
  const list = el('roster-attention-list');
  if(!list) return;

  if(_hsRosterSource !== 'live'){
    list.innerHTML = '<div class="roster-attention-empty">Athletes from your school who publish their profile will appear here.</div>';
    return;
  }

  const seniors = ATHLETES.filter(a=>a.year===2025);
  const seniorsNoInterest = seniors.filter(a=>!a.programs.length);
  const unendorsedSeniors = seniors.filter(a=>!endorsements[a.id]);
  const noInterest = ATHLETES.filter(a=>!a.programs.length);
  const items = [];

  if(unendorsedSeniors.length){
    items.push({
      label: 'Senior recommendations',
      value: `${unendorsedSeniors.length} pending`,
      tone: 'urgent'
    });
  }
  if(seniorsNoInterest.length){
    items.push({
      label: 'Seniors without college interest',
      value: `${seniorsNoInterest.length} athlete${seniorsNoInterest.length!==1?'s':''}`,
      tone: 'warn'
    });
  }
  if(noInterest.length){
    items.push({
      label: 'Athletes needing outreach',
      value: `${noInterest.length} ready`,
      tone: 'info'
    });
  }

  if(!items.length){
    list.innerHTML = '<div class="roster-attention-empty">Roster is caught up.</div>';
    return;
  }

  list.innerHTML = items.slice(0,3).map(item=>`
    <div class="roster-attention-item ${item.tone}">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join('');
}

function saveHSProfile(){
  const profile={
    fname:  el('hs-fname')?.value||'',
    lname:  el('hs-lname')?.value||'',
    title:  el('hs-title')?.value||'',
    school: el('hs-school')?.value||'',
    city:   el('hs-city')?.value||'',
    state:  el('hs-state')?.value||'',
    league: el('hs-league')?.value||'',
    bio:    el('hs-bio')?.value||'',
  };
  lss('profile', profile);
  if(window.JukeOnboarding){
    JukeOnboarding.mark('hs_coach','setupDone',{school:profile.school});
  }
  // Backend write
  const client=window.sb||window._hsSb||null;
  const cu=window.currentUser||null;
  if(client&&cu){
    client.from('hs_coach_profiles').upsert({
      user_id:cu.id, fname:profile.fname, lname:profile.lname,
      title:profile.title, school:profile.school, city:profile.city,
      state:profile.state, league:profile.league, bio:profile.bio,
      updated_at:new Date().toISOString()
    },{onConflict:'user_id'}).then(({error})=>{
      if(error) console.warn('JUKE hs coach profile write failed:',error);
    });
  }
  const msg = el('hs-save-msg');
  if(msg){ msg.classList.add('show'); setTimeout(()=>msg.classList.remove('show'),2200); }
}

// Load HS coach profile from backend and populate form
async function _hsLoadProfileFromBackend(){
  const client=window.sb||window._hsSb||null;
  const cu=window.currentUser||null;
  if(!client||!cu) return _hsRetryAfterAuth();
  try{
    const {data,error}=await client.from('hs_coach_profiles').select('*').eq('user_id',cu.id).maybeSingle();
    if(error||!data) return;
    // Populate form fields only if they don't already have values from localStorage
    const saved=ls('profile');
    if(!saved){
      if(data.fname&&el('hs-fname')) el('hs-fname').value=data.fname;
      if(data.lname&&el('hs-lname')) el('hs-lname').value=data.lname;
      if(data.title&&el('hs-title')) el('hs-title').value=data.title;
      if(data.school&&el('hs-school')) el('hs-school').value=data.school;
      if(data.city&&el('hs-city')) el('hs-city').value=data.city;
      if(data.state&&el('hs-state')) el('hs-state').value=data.state;
      if(data.league&&el('hs-league')) el('hs-league').value=data.league;
      if(data.bio&&el('hs-bio')) el('hs-bio').value=data.bio;
      // Persist to localStorage so subsequent loads are fast
      lss('profile',{fname:data.fname,lname:data.lname,title:data.title,
        school:data.school,city:data.city,state:data.state,league:data.league,bio:data.bio});
      updateHSCard();
    }
    // Load banner/logo from Storage if not already set locally
    if(data.banner_url&&!ls('banner')) renderBannerPhoto(data.banner_url);
    if(data.logo_url&&!ls('logo')) renderLogoPhoto(data.logo_url);
  }catch(e){
    console.warn('JUKE hs coach profile load failed:',e);
  }
}

// ──────────────────────────────────────────────
// PHOTO UPLOAD
// ──────────────────────────────────────────────
async function _hsUploadMedia(file, slot){
  const client=window.sb||window._hsSb||null;
  const cu=window.currentUser||null;
  if(!client||!cu) return null;
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
  const path=`${cu.id}/${slot}.${ext}`;
  const {error}=await client.storage.from('hs-coach-media').upload(path,file,{upsert:true,contentType:file.type});
  if(error){ console.warn('JUKE hs media upload failed:',error); return null; }
  const {data:{publicUrl}}=client.storage.from('hs-coach-media').getPublicUrl(path);
  // Persist url to hs_coach_profiles
  const col=slot==='banner'?'banner_url':'logo_url';
  client.from('hs_coach_profiles').upsert({user_id:cu.id,[col]:publicUrl,updated_at:new Date().toISOString()},{onConflict:'user_id'})
    .then(({error:e})=>{ if(e) console.warn('JUKE hs media url save failed:',e); });
  return publicUrl;
}

async function handleBanner(input){
  const file = input.files[0]; if(!file) return;
  const url = await _hsUploadMedia(file,'banner');
  if(url){ renderBannerPhoto(url); return; }
  // Fallback: base64 localStorage
  const reader = new FileReader();
  reader.onload = e => { lss('banner', e.target.result); renderBannerPhoto(e.target.result); };
  reader.readAsDataURL(file);
}
function renderBannerPhoto(src){
  const banner = el('coach-banner'); if(!banner) return;
  const existing = banner.querySelector('img.banner-img'); if(existing) existing.remove();
  const ph = el('coach-banner-ph'); if(ph) ph.style.display='none';
  const img = document.createElement('img'); img.src=src; img.alt='Banner'; img.className='banner-img';
  banner.insertBefore(img, banner.firstChild);
}
async function handleLogo(input){
  const file = input.files[0]; if(!file) return;
  const url = await _hsUploadMedia(file,'logo');
  if(url){ renderLogoPhoto(url); return; }
  const reader = new FileReader();
  reader.onload = e => { lss('logo', e.target.result); renderLogoPhoto(e.target.result); };
  reader.readAsDataURL(file);
}
function renderLogoPhoto(src){
  const circle = el('coach-logo-circle'); if(!circle) return;
  const existing = circle.querySelector('img.logo-img'); if(existing) existing.remove();
  const init = el('coach-logo-init'); if(init) init.style.display='none';
  const img = document.createElement('img'); img.src=src; img.alt='Logo'; img.className='logo-img';
  img.style.cssText='width:100%;height:100%;object-fit:contain;display:block;';
  circle.insertBefore(img, circle.firstChild);
}

// ──────────────────────────────────────────────
// ROSTER RENDERING
// ──────────────────────────────────────────────
let selectedPositions = new Set();

const HS_FLAG_POSITION_ALIASES = {
  C: ['C','Center','OL'],
  DB: ['DB','CB','Corner','Cornerback'],
  Rusher: ['Rusher','Rush','LB','Linebacker'],
  Utility: ['Utility','ATH','Athlete','PR','KR','Returner']
};

function hsNormalizeFlagPosition(pos){
  const raw=String(pos||'').trim();
  if(!raw) return '';
  for(const [canonical, aliases] of Object.entries(HS_FLAG_POSITION_ALIASES)){
    if(aliases.map(a=>a.toLowerCase()).includes(raw.toLowerCase())) return canonical;
  }
  return raw;
}

function hsFlagPositionMatches(athletePositions, selected){
  const selectedNorm=hsNormalizeFlagPosition(selected);
  return (athletePositions||[]).some(p=>hsNormalizeFlagPosition(p)===selectedNorm);
}

function hsFlagPositionLabel(pos){
  return hsNormalizeFlagPosition(pos);
}

function hsAthleteSearchText(a){
  return [
    a.fname,
    a.lname,
    a.school,
    a.state,
    a.year,
    ...(a.pos||[]).map(hsFlagPositionLabel),
    a.bio,
    ...(a.programs||[]).map(p=>[p.name,p.div,p.stage].filter(Boolean).join(' '))
  ].filter(Boolean).join(' ').toLowerCase();
}

function toggleRosterPos(chip, pos){
  if(selectedPositions.has(pos)){ selectedPositions.delete(pos); chip.classList.remove('active'); }
  else { selectedPositions.add(pos); chip.classList.add('active'); }
  renderRoster();
}

function filteredAthletes(){
  const q      = (el('roster-search')?.value||'').toLowerCase();
  const year   = el('f-year')?.value||'';
  const status = el('f-status')?.value||'';
  return ATHLETES.filter(a=>{
    if(q && !hsAthleteSearchText(a).includes(q)) return false;
    if(year && String(a.year)!==year) return false;
    if(status && athleteStatus(a)!==status) return false;
    if(selectedPositions.size && ![...selectedPositions].some(pos=>hsFlagPositionMatches(a.pos,pos))) return false;
    return true;
  });
}

function renderRoster(){
  const athletes = filteredAthletes();
  const countEl = el('roster-count');
  if(countEl) countEl.textContent = athletes.length+(_hsRosterSource==='live'?' live':'')+' athlete'+(athletes.length!==1?'s':'');

  if(rosterView==='cards') renderRosterCards(athletes);
  else renderRosterTable(athletes);
}

function renderRosterCards(athletes){
  const grid = el('roster-grid'); if(!grid) return;
  if(!athletes.length){ grid.innerHTML='<div class="empty-state"><div class="empty-state-title">No matching athletes</div><div class="empty-state-sub">Clear the search or filters to return to the full roster.</div></div>'; return; }
  const isDemoRoster = _hsRosterSource !== 'live';
  grid.innerHTML = athletes.map(a=>{
    const st = athleteStatus(a);
    const endorsed = endorsements[a.id];
    const stLabel  = STAGE_LABELS[st]||'';
    const stColor  = STAGE_COLORS[st]||'';
    const intCount = a.programs.length;
    const idArg = hsJsArg(a.id);
    return `<div class="roster-card st-${st}${isDemoRoster?' is-demo':''}" onclick="openSP(${idArg})">
      ${isDemoRoster?'<div class="demo-card-badge">Demo</div>':''}
      ${endorsed?'<div class="endorse-badge">Recommended</div>':''}
      <div class="rc-hd">
        <div class="rc-av">${a.avatar?`<img src="${hsEsc(a.avatar)}" alt="${hsEsc(a.fname+' '+a.lname)}">`:`<div class="rc-av-init">${initials(a)}</div>`}</div>
        <div>
          <div class="rc-name">${hsEsc(a.fname)} ${hsEsc(a.lname)}</div>
          <div class="rc-school">${hsEsc(a.school)} · ${hsEsc(a.state)}</div>
        </div>
      </div>
      <div class="rc-pills">
        ${a.pos.map((p,i)=>`<span class="rc-pos">${hsEsc(hsFlagPositionLabel(p))}</span>`).join('')}
        <span class="rc-year">${a.year}</span>
        ${st!=='none'?`<span style="font-family:'Archivo Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:2px 8px;border-radius:20px;border:1.5px solid ${stColor};color:${stColor};background:${stColor}18;">${stLabel}</span>`:''}
      </div>
      <div class="rc-stats">
        ${a.gpa?`<span class="v">${a.gpa}</span> GPA`:''}${a.height?` · <span class="v">${a.height}</span>`:''}${a.forty?` · <span class="v">${a.forty}</span> 40`:''}
      </div>
      <div class="rc-interest">
        ${intCount===0
          ? `<span class="rc-interest-none">${isDemoRoster?'Demo data: ':''}No college interest yet</span>`
          : `<span class="rc-interest-some">${isDemoRoster?'Demo: ':''}📍 ${intCount} program${intCount!==1?'s':''} interested</span>`}
      </div>
      <div class="rc-ft" onclick="event.stopPropagation()">
        <button class="rc-btn primary" onclick="openEndorse(${idArg})">${endorsed?'✓ Recommended':'Recommend'}</button>
        <button class="rc-btn" onclick="openSP(${idArg})">View Profile</button>
        <button class="rc-btn blue" onclick="openOutreachFor(${idArg})">Outreach →</button>
      </div>
    </div>`;
  }).join('');
}

function renderRosterTable(athletes){
  const tbody = el('roster-tbody'); if(!tbody) return;
  if(!athletes.length){ tbody.innerHTML='<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text-dim)">No matching athletes. Clear the search or filters to return to the full roster.</td></tr>'; return; }
  const isDemoRoster = _hsRosterSource !== 'live';
  tbody.innerHTML = athletes.map(a=>{
    const st       = athleteStatus(a);
    const stColor  = STAGE_COLORS[st]||'#ccc';
    const stLabel  = STAGE_LABELS[st]||'No Contact';
    const endorsed = endorsements[a.id];
    const idArg = hsJsArg(a.id);
    return `<tr class="${isDemoRoster?'rt-demo-row':''}">
      <td><div class="rt-av">${initials(a)}</div></td>
      <td>
        <div class="rt-name" style="cursor:pointer" onclick="openSP(${idArg})">${hsEsc(a.fname)} ${hsEsc(a.lname)}</div>
        ${isDemoRoster?'<span class="rt-demo-badge">Demo</span>':''}
        ${endorsed?'<span style="font-size:9px;color:#00a03a;font-weight:600">✓ Recommended</span>':''}
      </td>
      <td><div class="rt-pos-row">${a.pos.map(p=>`<span class="rt-pos">${hsEsc(hsFlagPositionLabel(p))}</span>`).join('')}</div></td>
      <td>${a.year}</td>
      <td>${a.gpa||'—'}</td>
      <td>${a.forty||'—'}</td>
      <td><span class="rt-int ${a.programs.length?'some':'none'}">${a.programs.length||'0'}</span></td>
      <td>
        <span class="rt-status-dot" style="background:${stColor}"></span>
        <span class="rt-status-text">${stLabel}</span>
      </td>
      <td>
        <div class="rt-actions" onclick="event.stopPropagation()">
          <button class="rt-btn primary" onclick="openEndorse(${idArg})">${endorsed?'✓':'Recommend'}</button>
          <button class="rt-btn blue" onclick="openOutreachFor(${idArg})">Outreach</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ──────────────────────────────────────────────
// COLLEGE ACTIVITY
// ──────────────────────────────────────────────

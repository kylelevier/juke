// ── DATA ─────────────────────────────────────────────────────────────────────

const ATHLETES = [
  {id:1,name:"Camryn Wells",pos:["WR","PR"],year:2026,gpa:3.9,state:"TX",city:"Dallas",height:"5'6\"",forty:"4.38",vertical:"32\"",twenty:"3.08",shuttle:"4.24",broad:"8'8\"",verifiedSource:"USA Football Talent ID",verifiedDate:"Feb 2026",events:[{name:"USA Football Talent ID - Dallas",date:"Feb 2026",location:"Dallas, TX",source:"USA Football",verified:true}],school:"DeSoto HS",division:"D1",sports:["Track","Soccer"],bio:"3× All-State WR. 89 catches for 1,240 yards in 2024. Track star with 4.38 speed.",highlight:"https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
  {id:2,name:"Destiny Okafor",pos:["QB"],year:2025,gpa:3.7,state:"FL",city:"Miami",height:"5'9\"",forty:"4.62",vertical:"28\"",school:"Miami Central HS",division:"D1",sports:["Basketball"],bio:"Dual-threat QB with D1 upside. 24 TDs, 4 INTs. Committed football IQ."},
  {id:3,name:"Maya Thornton",pos:["CB","S"],year:2026,gpa:4.0,state:"CA",city:"Inglewood",height:"5'7\"",forty:"4.44",vertical:"30\"",twenty:"3.16",shuttle:"4.31",broad:"8'2\"",verifiedSource:"USA Football Talent ID",verifiedDate:"Mar 2026",events:[{name:"USA Football Talent ID - Los Angeles",date:"Mar 2026",location:"Los Angeles, CA",source:"USA Football",verified:true}],school:"Inglewood HS",division:"D1",sports:["Soccer","Basketball"],bio:"2024 SoCal Defensive POY. 12 INTs. Lockdown corner with elite instincts.",highlight:"https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
  {id:4,name:"Jayla Monroe",pos:["RB","WR"],year:2027,gpa:3.5,state:"GA",city:"Atlanta",height:"5'5\"",forty:"4.41",vertical:"31\"",school:"Westlake HS",division:"D2",sports:["Soccer"],bio:"Explosive playmaker. 900 rush yards + 40 catches in 2024. Makes people miss."},
  {id:5,name:"Simone Reeves",pos:["QB","WR"],year:2026,gpa:3.8,state:"OH",city:"Columbus",height:"5'8\"",forty:"4.55",vertical:"29\"",school:"Dublin Jerome HS",division:"D1",sports:["Volleyball"],bio:"72% completion rate, 1,800 yards. Elite IQ and composure under pressure.",highlight:"https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
  {id:6,name:"Imani Clarke",pos:["S","LB"],year:2025,gpa:3.6,state:"TX",city:"Houston",height:"5'8\"",forty:"4.51",vertical:"33\"",school:"Klein Oak HS",division:"D1",sports:["Track","Soccer"],bio:"Rangy safety with closing speed. 8 sacks from LB. Elite athlete."},
  {id:7,name:"Taylor Brooks",pos:["WR","KR"],year:2026,gpa:3.4,state:"AZ",city:"Phoenix",height:"5'5\"",forty:"4.35",vertical:"34\"",twenty:"3.02",shuttle:"4.18",broad:"8'10\"",verifiedSource:"USA Football Talent ID",verifiedDate:"Nov 2025",events:[{name:"USA Football Talent ID - Phoenix",date:"Nov 2025",location:"Phoenix, AZ",source:"USA Football",verified:true}],school:"Desert Vista HS",division:"D1",sports:["Track"],bio:"Fastest player in AZ. Track sprinter. Can take any touch to the house."},
  {id:8,name:"Nia Washington",pos:["QB"],year:2027,gpa:4.0,state:"NC",city:"Charlotte",height:"5'10\"",forty:"4.68",vertical:"27\"",school:"Providence Day School",division:"D1",sports:["Basketball"],bio:"Top-ranked 2027 QB. Strong arm, high IQ, exceptional leader on and off the field."},
];

let _coachLiveProfilesLoaded = false;

function _coachProfileField(p, shortKey, longKey){
  return p?.[shortKey] || p?.[longKey] || '';
}

function _coachNumber(value){
  const n=parseFloat(value);
  return Number.isFinite(n)?n:0;
}

function coachSameId(a, b){
  return String(a)===String(b);
}

function coachHasId(list, id){
  return (list||[]).some(x=>coachSameId(x,id));
}

function findCoachAthlete(id){
  return ATHLETES.find(a=>coachSameId(a.id,id));
}

function isDemoAthlete(a){
  return !!a && !a._live;
}

function escHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  })[c]);
}

function _coachMapPublishedAthlete(row, idx){
  const p=row.profile_data||{};
  const fname=_coachProfileField(p,'fname','p-fname');
  const lname=_coachProfileField(p,'lname','p-lname');
  const name=(fname+' '+lname).trim() || p.name || 'Unnamed Athlete';
  const cityState=_coachProfileField(p,'city','p-city');
  const parts=cityState.split(',').map(x=>x.trim()).filter(Boolean);
  const positions=p.positions||p._positions||[];
  const div=(p.divisions&&p.divisions[0]) || p['pf-div'] || p.division || '';
  const events=Array.isArray(p.events) ? p.events : [];
  const mappedEvents=events.length ? events : (p.eventName||p['p-event-name'] ? [{
    name:p.eventName||p['p-event-name']||'',
    date:p.eventDate||p['p-event-date']||'',
    location:p.eventLocation||p['p-event-location']||'',
    source:p.eventSource||p['p-event-source']||'',
    verified:(p.eventSource||p['p-event-source']||'')==='USA Football'
  }] : []);
  return {
    id:'live_'+(row.user_id||row.id||idx),
    _userId:row.user_id||'',
    name,
    pos:positions.length?positions:['ATH'],
    year:parseInt(_coachProfileField(p,'gradyr','p-gradyr'))||new Date().getFullYear(),
    gpa:_coachNumber(_coachProfileField(p,'gpa','p-gpa')),
    state:(parts[1]||p.state||'').toUpperCase(),
    city:parts[0]||p.city||'',
    height:_coachProfileField(p,'height','p-height')||'',
    forty:_coachProfileField(p,'forty','p-forty')||'',
    vertical:_coachProfileField(p,'vertical','p-vertical')||'',
    twenty:_coachProfileField(p,'twenty','p-twenty')||p.verifiedMeasurables?.twenty?.value||'',
    shuttle:_coachProfileField(p,'shuttle','p-shuttle')||p.verifiedMeasurables?.shuttle?.value||'',
    broad:_coachProfileField(p,'broad','p-broad')||p.verifiedMeasurables?.broad?.value||'',
    verifiedSource:p.verifiedSource||p['p-verified-source']||p.verifiedMeasurables?.twenty?.source||p.verifiedMeasurables?.shuttle?.source||p.verifiedMeasurables?.broad?.source||'',
    verifiedDate:p.verifiedDate||p['p-verified-date']||p.verifiedMeasurables?.twenty?.verifiedAt||p.verifiedMeasurables?.shuttle?.verifiedAt||p.verifiedMeasurables?.broad?.verifiedAt||'',
    verifiedMeasurables:p.verifiedMeasurables||null,
    events:mappedEvents.filter(ev=>ev&&ev.name),
    school:_coachProfileField(p,'school','p-school')||'',
    division:div.replace('Division ','D')||'',
    sports:[p.sport1,p.sport2].filter(Boolean),
    bio:p.intro||p.bio||'',
    highlight:_coachProfileField(p,'highlight','p-highlight')||'',
    gamefilm:_coachProfileField(p,'gamefilm','p-gamefilm')||'',
    avatar:p._avatar||p.avatar||'',
    banner:p._banner||p.banner||'',
    offers:p._offers||[],
    recommendations:p._recommendations||[],
    _live:true,
    _publishedAt:row.published_at||row.updated_at
  };
}

async function loadPublishedAthletes(){
  if(!window.sb||_coachLiveProfilesLoaded) return;
  try{
    const {data,error}=await sb
      .from('athlete_profiles')
      .select('id,user_id,profile_data,published_at,updated_at')
      .eq('is_discoverable',true)
      .order('updated_at',{ascending:false});
    if(error){
      console.warn('JUKE coach live athlete load failed:', error);
      return;
    }
    const live=(data||[]).map(_coachMapPublishedAthlete).filter(a=>a.name!=='Unnamed Athlete');
    const existing=new Set(ATHLETES.map(a=>String(a.id)));
    live.forEach(a=>{
      if(!existing.has(String(a.id))){
        ATHLETES.unshift(a);
        existing.add(String(a.id));
      }
    });
    _coachLiveProfilesLoaded=true;
    filterAthletes();
    if(typeof renderCoachFeed==='function') renderCoachFeed();
  }catch(e){
    console.warn('JUKE coach live athlete load failed:', e);
  }
}

const COACH_PIPELINE_STAGES = [
  {key:"identified", label:"Watch",        color:"#888888"},
  {key:"evaluating", label:"Evaluate",     color:"#7B2FFF"},
  {key:"contacting", label:"Contacted",    color:"#0057FF"},
  {key:"recruiting", label:"Active Recruit",color:"#FF6B00"},
  {key:"offer",      label:"Offer",        color:"#FF0080"},
  {key:"committed",  label:"Committed",     color:"#00E050"},
];

// ── STORAGE ──────────────────────────────────────────────────────────────────
function ls(k){try{return JSON.parse(localStorage.getItem('juke_coach_'+k))||null;}catch{return null;}}
function lss(k,v){try{localStorage.setItem('juke_coach_'+k,JSON.stringify(v));}catch{}}

let coachProfile = ls('profile') || {name:"Recruiter Sarah Mitchell",title:"Head Flag Football Coach",school:"Northern Arizona University",div:"NCAA D1",conf:"Big Sky Conference",loc:"Flagstaff, AZ",seasons:5,bio:"Building a program that develops champions on and off the field. NAU Flag Football is a fast-growing D1 program with a commitment to academic excellence and athletic development. We are actively recruiting skilled playmakers for the 2025–26 roster."};
// Migrate old pipeline keys if present (contacted→contacting, visit→recruiting)
(function _migratePipeline(){
  const raw = ls('pipeline');
  if(!raw) return;
  if(raw.contacted && !raw.contacting){ raw.contacting = raw.contacted; delete raw.contacted; lss('pipeline', raw); }
  if(raw.visit     && !raw.recruiting){ raw.recruiting  = raw.visit;     delete raw.visit;     lss('pipeline', raw); }
})();
function _defaultCoachPipeline(){
  const has=id=>ATHLETES.some(a=>coachSameId(a.id,id));
  return {
    identified:[1,7].filter(has),
    evaluating:[],
    contacting:[3,5].filter(has),
    recruiting:[2].filter(has),
    offer:[6].filter(has),
    committed:[]
  };
}
let coachPipeline = ls('pipeline') || _defaultCoachPipeline();
// Boards = named labels (no embedded athlete lists — membership lives in coachTags)
let coachBoards = ls('boards2') || [{id:1,name:"2026 Watch List"},{id:2,name:"QB Targets"}];
// coachTags: { athleteId: [boardId, boardId, ...] }
function _defaultCoachTags(){
  const has=id=>ATHLETES.some(a=>coachSameId(a.id,id));
  const tags={};
  if(has(1)) tags[1]=[1];
  if(has(3)) tags[3]=[1];
  if(has(7)) tags[7]=[1];
  if(has(2)) tags[2]=[2];
  if(has(5)) tags[5]=[2];
  if(has(8)) tags[8]=[2];
  return tags;
}
let coachTags = ls('tags') || _defaultCoachTags();
let coachNotes        = ls('notes')        || {};
let coachNextActions  = ls('next_actions') || {};
let coachLastActivity = ls('last_activity')|| {};
let coachEvaluations  = ls('evaluations')  || {};
let coachNeeds        = ls('needs')        || [
  {id:1,classYear:'2027',position:'DB',priority:'High',slotType:'Roster spot',minGpa:'3.4',region:'Any',notes:'Can cover slot receivers and close space quickly.',visibility:'program_private'},
  {id:2,classYear:'2026',position:'QB',priority:'Medium',slotType:'Roster spot',minGpa:'3.5',region:'South',notes:'Decision maker with short-area mobility.',visibility:'program_private'}
];
let activePos = new Set();
let activeBoardFilter = null; // null = All Pipeline
let _spId = null;

const FLAG_POSITION_ALIASES = {
  C: ['C','Center','OL'],
  DB: ['DB','CB','Corner','Cornerback'],
  Rusher: ['Rusher','Rush','LB','Linebacker'],
  Utility: ['Utility','ATH','Athlete','PR','KR','Returner']
};

const REGION_GROUPS = {
  south: ['AL','AR','FL','GA','KY','LA','MS','NC','OK','SC','TN','TX','VA','WV'],
  southeast: ['AL','FL','GA','MS','NC','SC','TN'],
  southwest: ['AZ','NM','OK','TX'],
  west: ['AK','AZ','CA','CO','HI','ID','MT','NV','NM','OR','UT','WA','WY'],
  midwest: ['IA','IL','IN','KS','MI','MN','MO','ND','NE','OH','SD','WI'],
  northeast: ['CT','DE','MA','MD','ME','NH','NJ','NY','PA','RI','VT','DC']
};

function normalizeFlagPosition(pos){
  const raw=String(pos||'').trim();
  if(!raw) return '';
  for(const [canonical, aliases] of Object.entries(FLAG_POSITION_ALIASES)){
    if(aliases.map(a=>a.toLowerCase()).includes(raw.toLowerCase())) return canonical;
  }
  return raw;
}

function flagPositionMatches(athletePositions, selected){
  const selectedNorm=normalizeFlagPosition(selected);
  return (athletePositions||[]).some(p=>normalizeFlagPosition(p)===selectedNorm);
}

function flagPositionLabel(pos){
  return normalizeFlagPosition(pos);
}

function coachAthleteSearchText(a){
  return [
    a.name,
    a.school,
    a.city,
    a.state,
    a.year,
    a.division,
    a.twenty,
    a.shuttle,
    a.broad,
    a.verifiedSource,
    a.verifiedDate,
    ...athleteEvents(a).flatMap(ev=>[ev.name,ev.date,ev.location,ev.source,ev.verified?'verified':'']),
    ...(a.pos||[]).map(flagPositionLabel),
    ...(a.sports||[]),
    a.bio
  ].filter(Boolean).join(' ').toLowerCase();
}

function verifiedValue(a, key){
  return a?.verifiedMeasurables?.[key]?.value || a?.[key] || '';
}

function verifiedMeta(a){
  const src=a?.verifiedSource || a?.verifiedMeasurables?.twenty?.source || a?.verifiedMeasurables?.shuttle?.source || a?.verifiedMeasurables?.broad?.source || '';
  const date=a?.verifiedDate || a?.verifiedMeasurables?.twenty?.verifiedAt || a?.verifiedMeasurables?.shuttle?.verifiedAt || a?.verifiedMeasurables?.broad?.verifiedAt || '';
  return {src,date, isVerified: !!(src||date)};
}

function verifiedBadge(a){
  const meta=verifiedMeta(a);
  if(!meta.isVerified) return '';
  const label=meta.src || 'USA Football';
  return `<span class="coach-verified-badge">Verified: ${escHtml(label)}</span>`;
}

function athleteEvents(a){
  if(Array.isArray(a?.events)) return a.events.filter(ev=>ev&&ev.name);
  return [];
}

function primaryEvent(a){
  return athleteEvents(a)[0] || null;
}

function eventBadge(a){
  const ev=primaryEvent(a);
  if(!ev) return '';
  const label=ev.source==='USA Football' ? ev.name.replace(/^USA Football\s*/i,'USAF ') : ev.name;
  return `<span class="coach-event-badge">${escHtml(label)}</span>`;
}

function evaluationCount(athleteId){
  return (coachEvaluations[String(athleteId)]||[]).length;
}

function evaluationBadge(athleteId){
  const count=evaluationCount(athleteId);
  return count ? `<span class="coach-eval-badge">${count} Eval${count===1?'':'s'}</span>` : '';
}

function activeCoachNeeds(){
  return Array.isArray(coachNeeds) ? coachNeeds : [];
}

function needMatchesAthlete(need, athlete){
  if(!need||!athlete) return false;
  const classOk=!need.classYear || String(need.classYear)===String(athlete.year);
  const posOk=!need.position || flagPositionMatches(athlete.pos||[], need.position);
  const gpaOk=!need.minGpa || (parseFloat(athlete.gpa)||0) >= (parseFloat(need.minGpa)||0);
  const region=String(need.region||'').toLowerCase();
  const state=String(athlete.state||'').toUpperCase();
  const regionOk=!region || region==='any' || region==='open' || String(athlete.state||'').toLowerCase()===region || String(athlete.city||'').toLowerCase().includes(region) || (REGION_GROUPS[region]||[]).includes(state);
  return classOk && posOk && gpaOk && regionOk;
}

function matchingNeedsForAthlete(athlete){
  return activeCoachNeeds().filter(n=>needMatchesAthlete(n, athlete));
}

function needsMatchBadge(athlete){
  const matches=matchingNeedsForAthlete(athlete);
  if(!matches.length) return '';
  const top=matches[0];
  return `<span class="coach-need-match-badge">${escHtml(top.classYear||'Open')} ${escHtml(top.position||'Need')} Match</span>`;
}

// ── TABS ─────────────────────────────────────────────────────────────────────
function switchTab(tab){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  document.getElementById('tab-'+tab).classList.add('active');
  document.getElementById('content-'+tab).classList.add('active');
  if(tab==='feed')     renderCoachFeed();
  if(tab==='pipeline'){renderBoardChips();renderPipeline();}
  if(tab==='analytics')renderActivityFeed();
  if(tab==='profile')  loadProfileForm();
}

// ── ATHLETE SEARCH ────────────────────────────────────────────────────────────
function togglePos(el, pos){
  el.classList.toggle('active');
  if(activePos.has(pos)) activePos.delete(pos);
  else activePos.add(pos);
  filterAthletes();
}

let _prospectView = 'card';
let _sortKey = null;
let _sortDir = 1;

function setProspectView(view, btn){
  _prospectView = view;
  document.querySelectorAll('.vt-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  document.getElementById('athlete-grid').style.display = view==='card' ? '' : 'none';
  document.getElementById('prospect-table-wrap').style.display = view==='table' ? '' : 'none';
  filterAthletes();
}

function sortProspects(key){
  if(_sortKey===key) _sortDir *= -1;
  else { _sortKey=key; _sortDir=1; }
  // update header arrows
  document.querySelectorAll('.prospect-table thead th').forEach(th=>{
    th.classList.remove('sorted');
    const arrow=th.querySelector('.sort-arrow');
    if(arrow) arrow.textContent='↕';
  });
  const idx = ['name','pos','year','gpa','twenty','shuttle','broad'].indexOf(key);
  if(idx>=0){
    const ths = document.querySelectorAll('.prospect-table thead th');
    if(ths[idx]){
      ths[idx].classList.add('sorted');
      const arrow=ths[idx].querySelector('.sort-arrow');
      if(arrow) arrow.textContent = _sortDir===1?'↑':'↓';
    }
  }
  filterAthletes();
}

function filterAthletes(){
  const q = (document.getElementById('search-q').value||'').toLowerCase();
  const yr = document.getElementById('f-year').value;
  const st = document.getElementById('f-state').value;
  const gpaMin = parseFloat((document.getElementById('f-gpa')||{}).value||'') || 0;
  const div = ((document.getElementById('f-div')||{}).value||'');
  const sport = ((document.getElementById('f-sport')||{}).value||'');
  let results = ATHLETES.filter(a=>{
    if(q && !coachAthleteSearchText(a).includes(q)) return false;
    if(yr && a.year !== parseInt(yr)) return false;
    if(st && a.state !== st) return false;
    if(activePos.size > 0 && ![...activePos].some(pos=>flagPositionMatches(a.pos,pos))) return false;
    if(gpaMin > 0 && (a.gpa||0) < gpaMin) return false;
    if(div && a.division !== div) return false;
    if(sport && !(a.sports||[]).includes(sport)) return false;
    return true;
  });
  if(_sortKey){
    results = [...results].sort((a,b)=>{
      let av = a[_sortKey], bv = b[_sortKey];
      if(_sortKey==='pos') { av=flagPositionLabel(a.pos[0])||''; bv=flagPositionLabel(b.pos[0])||''; }
      if(_sortKey==='twenty'||_sortKey==='shuttle'||_sortKey==='broad'||_sortKey==='forty'||_sortKey==='vertical') {
        av=parseFloat(verifiedValue(a,_sortKey)||av)||0;
        bv=parseFloat(verifiedValue(b,_sortKey)||bv)||0;
      }
      if(typeof av==='string') return av.localeCompare(bv)*_sortDir;
      return (av-bv)*_sortDir;
    });
  }
  if(_prospectView==='table'){
    document.getElementById('prospect-tbody').innerHTML = results.map(a=>athleteTableRow(a)).join('');
  } else {
    document.getElementById('athlete-grid').innerHTML = results.map(a=>athleteCard(a)).join('');
  }
}

function athleteTableRow(a){
  const stage = getPipelineStage(a.id);
  const endorsed = getEndorsementForAthlete(a.name).length > 0;
  const needBadge = needsMatchBadge(a);
  const evBadge = eventBadge(a);
  const demo = isDemoAthlete(a);
  const aid = jsArg(a.id);
  const stageBadge = stage
    ? `<span style="font-family:'Archivo Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:2px 8px;border-radius:20px;border:1.5px solid ${stage.color};color:${stage.color};background:${stage.color}18">${stage.label}</span>`
    : '<span style="color:var(--text-dim);font-size:11px;">—</span>';
  return `<tr class="${demo?'pt-demo-row':''}" onclick="openAthlete(${aid})">
    <td>
      <div class="pt-name">${a.name}${demo?' <span class="pt-demo-badge">Demo</span>':''}${endorsed?' <span style="font-size:9px;color:#00A040">✓ Recommended</span>':''}</div>
      <div class="pt-school">${a.school} · ${a.city}, ${a.state}</div>
      ${needBadge||evBadge?`<div class="pt-badge-row">${needBadge}${evBadge}</div>`:''}
    </td>
    <td><div class="pt-pos">${a.pos.map(p=>`<span class="a-pos-pill">${flagPositionLabel(p)}</span>`).join('')}</div></td>
    <td><span class="a-year-pill">'${String(a.year).slice(2)}</span></td>
    <td class="pt-stat">${a.gpa}</td>
    <td class="pt-meas">${escHtml(verifiedValue(a,'twenty')||'—')}</td>
    <td class="pt-meas">${escHtml(verifiedValue(a,'shuttle')||'—')}</td>
    <td class="pt-meas">${escHtml(verifiedValue(a,'broad')||'—')}</td>
    <td>${stageBadge}</td>
    <td onclick="event.stopPropagation()">
      <div class="pt-actions">
        <button class="pt-act-btn" onclick="openAthlete(${aid})">View</button>
        <button class="pt-act-btn${stage?' primary':''}" onclick="openAthlete(${aid});setTimeout(()=>document.getElementById('sp-stage-row')?.scrollIntoView({behavior:'scroll'}),300)">${stage?stage.label:'+ Board'}</button>
      </div>
    </td>
  </tr>`;
}

function initials(name){return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();}
function jsArg(value){
  return JSON.stringify(value).replace(/"/g,'&quot;');
}

// ── COACH ENDORSEMENTS (read from shared localStorage) ────
function getAllEndorsements(){try{return JSON.parse(localStorage.getItem('juke_endorsements'))||[];}catch(e){return[];}}
function getEndorsementForAthlete(name){
  return getAllEndorsements().filter(function(e){
    return e.status==='endorsed' && (e.athleteName||'').toLowerCase()===name.toLowerCase();
  });
}
function getPipelineStage(id){
  for(const s of COACH_PIPELINE_STAGES){ if(coachHasId(coachPipeline[s.key],id)) return s; }
  return null;
}

// ── FIT SCORE ─────────────────────────────────────────────────────────────────
function fitScore(a){
  let score = 0;
  const gpa = parseFloat(a.gpa)||0;
  if(gpa>=4.0)score+=25; else if(gpa>=3.8)score+=22; else if(gpa>=3.5)score+=18; else if(gpa>=3.0)score+=12;
  const twenty = parseFloat(verifiedValue(a,'twenty'))||0;
  const forty = parseFloat(a.forty)||5.0;
  if(twenty){
    if(twenty<=3.05)score+=30; else if(twenty<=3.15)score+=25; else if(twenty<=3.3)score+=18; else if(twenty<=3.45)score+=12; else score+=5;
  } else {
    if(forty<=4.35)score+=30; else if(forty<=4.45)score+=25; else if(forty<=4.55)score+=18; else if(forty<=4.65)score+=12; else score+=5;
  }
  const shuttle = parseFloat(verifiedValue(a,'shuttle'))||0;
  const vert = parseInt(a.vertical)||0;
  if(shuttle){
    if(shuttle<=4.15)score+=20; else if(shuttle<=4.35)score+=16; else if(shuttle<=4.55)score+=12; else score+=6;
  } else {
    if(vert>=34)score+=20; else if(vert>=30)score+=16; else if(vert>=26)score+=12; else score+=6;
  }
  if(a.division==='D1')score+=15; else if(a.division==='D2')score+=10;
  if(a.year>=2026)score+=10;
  return Math.min(99, score);
}

// ── RELATIVE TIME ─────────────────────────────────────────────────────────────
function _relTime(ts){
  const m = Math.floor((Date.now()-ts)/60000);
  if(m<1) return 'Just now';
  if(m<60) return m+'m ago';
  const h = Math.floor(m/60);
  if(h<24) return h+'h ago';
  return Math.floor(h/24)+'d ago';
}

function pipelineBadgeHtml(id){
  const s = getPipelineStage(id);
  if(!s) return '';
  return `<div class="pipeline-badge" style="color:${s.color};border-color:${s.color};background:${s.color}18">${s.label}</div>`;
}

function athleteCard(a){
  const stage = getPipelineStage(a.id);
  const endorsed = getEndorsementForAthlete(a.name).length > 0;
  const demo = isDemoAthlete(a);
  const aid = jsArg(a.id);
  return `<div class="athlete-card${demo?' is-demo':''}" onclick="openAthlete(${aid})">
    ${demo?'<div class="demo-card-badge">Demo</div>':''}
    ${pipelineBadgeHtml(a.id)}
    <div class="athlete-card-hd">
      <div class="athlete-av"><div class="athlete-av-init">${initials(a.name)}</div></div>
      <div>
        <div class="athlete-card-name">${a.name}</div>
        <div class="athlete-card-school">${a.school} · ${a.city}, ${a.state}</div>
      </div>
    </div>
    <div class="athlete-pos-row">
      ${a.pos.map(p=>`<span class="a-pos-pill">${flagPositionLabel(p)}</span>`).join('')}
      <span class="a-year-pill">'${String(a.year).slice(2)}</span>
      ${endorsed?'<span class="coach-verified-badge">✓ Recommended</span>':''}
      ${evaluationBadge(a.id)}
      ${needsMatchBadge(a)}
      ${eventBadge(a)}
    </div>
    <div class="athlete-stats-line">GPA <span>${a.gpa}</span> &nbsp;·&nbsp; ${a.height} &nbsp;·&nbsp; 20yd <span>${escHtml(verifiedValue(a,'twenty')||'—')}</span> &nbsp;·&nbsp; 5-10-5 <span>${escHtml(verifiedValue(a,'shuttle')||'—')}</span> &nbsp;·&nbsp; Broad <span>${escHtml(verifiedValue(a,'broad')||'—')}</span></div>
    ${verifiedBadge(a)}
    <div class="athlete-card-ft">
      <button class="ac-btn" onclick="event.stopPropagation();openAthlete(${aid})">View</button>
      <button class="ac-btn${stage?' primary':''}" onclick="event.stopPropagation();openAthlete(${aid});document.getElementById('sp-stage-row').scrollIntoView({behavior:'smooth'})">${stage?stage.label:'+ Board'}</button>
    </div>
  </div>`;
}

// ── BOARDS ────────────────────────────────────────────────────────────────────
function athletesBoardIds(athleteId){
  const key=Object.keys(coachTags).find(k=>coachSameId(k,athleteId));
  return key ? (coachTags[key]||[]) : [];
}
function athleteInBoard(athleteId, boardId){
  return coachHasId(athletesBoardIds(athleteId),boardId);
}
function toggleAthleteBoard(athleteId, boardId){
  if(!coachTags[athleteId]) coachTags[athleteId]=[];
  const idx=coachTags[athleteId].findIndex(id=>coachSameId(id,boardId));
  if(idx>-1) coachTags[athleteId].splice(idx,1);
  else coachTags[athleteId].push(boardId);
  lss('tags',coachTags);
  renderBoardChips();
  if(activeBoardFilter!==null) renderPipeline();
  openAthlete(athleteId);
}
function newBoard(){
  const name=prompt('Board name (e.g. "2027 DB/Rushers", "Priority Targets"):');
  if(!name||!name.trim()) return;
  const b={id:Date.now(),name:name.trim()};
  coachBoards.push(b);
  lss('boards2',coachBoards);
  renderBoardChips();
}
function removeBoard(boardId){
  if(!confirm('Delete this board? Athletes will be removed from it.')) return;
  coachBoards=coachBoards.filter(b=>!coachSameId(b.id,boardId));
  Object.keys(coachTags).forEach(aid=>{
    coachTags[aid]=(coachTags[aid]||[]).filter(bid=>!coachSameId(bid,boardId));
  });
  lss('boards2',coachBoards);
  lss('tags',coachTags);
  if(activeBoardFilter===boardId) setBoardFilter(null);
  else renderBoardChips();
}
function boardAthleteCount(boardId){
  const allPl=Object.values(coachPipeline).flat();
  return allPl.filter(id=>athleteInBoard(id,boardId)).length;
}
function renderBoardSummary(){
  const row=document.getElementById('board-summary-row');
  if(!row) return;
  const allIds=Object.values(coachPipeline).flat();
  const liveCount=allIds.filter(id=>findCoachAthlete(id)?._live).length;
  const activeCount=[...(coachPipeline.contacting||[]),...(coachPipeline.recruiting||[]),...(coachPipeline.offer||[])].length;
  const nextActionCount=allIds.filter(id=>coachNextActions[id]).length;
  const boardCount=coachBoards.length;
  const needsCount=activeCoachNeeds().length;
  row.innerHTML=[
    {num:allIds.length,lbl:'On Board',tone:'dark'},
    {num:activeCount,lbl:'Active Recruits',tone:'blue'},
    {num:nextActionCount,lbl:'Next Actions',tone:'pink'},
    {num:liveCount,lbl:'Live Profiles',tone:'green'},
    {num:boardCount,lbl:'Lists',tone:'gray'},
    {num:needsCount,lbl:'Needs',tone:'purple'}
  ].map(s=>`<div class="board-summary-card ${s.tone}">
    <div class="board-summary-num">${s.num}</div>
    <div class="board-summary-lbl">${s.lbl}</div>
  </div>`).join('');
}
function renderBoardChips(){
  const row=document.getElementById('board-filter-row');
  if(!row) return;
  let html=`<button class="bfchip${activeBoardFilter===null?' active':''}" onclick="setBoardFilter(null)">Full Board</button>`;
  html+=coachBoards.map(b=>{
    const cnt=boardAthleteCount(b.id);
    const isActive=activeBoardFilter===b.id;
    return `<button class="bfchip${isActive?' active':''}" onclick="setBoardFilter(${b.id})">${b.name}<span class="bfc-count">${cnt}</span><span class="bfc-rm" onclick="event.stopPropagation();removeBoard(${b.id})" title="Delete board">×</span></button>`;
  }).join('');
  html+=`<button class="bfchip bfc-add" onclick="newBoard()">+ New Board</button>`;
  row.innerHTML=html;
}
function setBoardFilter(boardId){
  activeBoardFilter=boardId;
  renderBoardChips();
  renderPipeline();
}

// ── PIPELINE (KANBAN) ─────────────────────────────────────────────────────────
let _dragId = null;

function renderPipeline(){
  renderBoardSummary();
  const filterIds = activeBoardFilter!==null
    ? Object.values(coachPipeline).flat().filter(id=>athleteInBoard(id,activeBoardFilter))
    : null;

  document.getElementById('pipeline-wrap').innerHTML = COACH_PIPELINE_STAGES.map(s=>{
    let ids = coachPipeline[s.key]||[];
    if(filterIds) ids=ids.filter(id=>coachHasId(filterIds,id));

    const cards = ids.map(id=>{
      const a = findCoachAthlete(id);
      if(!a) return '';
      const boardNames = athletesBoardIds(id)
        .map(bid=>{ const b=coachBoards.find(x=>coachSameId(x.id,bid)); return b?b.name:''; }).filter(Boolean);
      const la = coachLastActivity[id];
      const laText = la ? _relTime(la.ts) : 'No recent activity';
      const na = coachNextActions[id]||'';
      const fs = fitScore(a);
      const fitHtml = fs>=80
        ? `<span class="pl-fit">${fs}</span>`
        : '';
      const posText=(a.pos||[]).map(flagPositionLabel).join('/');
      const meta=[posText, `'${String(a.year).slice(2)}`, a.state].filter(Boolean).join(' · ');
      const schoolLine=[a.school, a.city].filter(Boolean).join(' · ');
      return `<div class="pl-card${isDemoAthlete(a)?' is-demo':''}" draggable="true" data-athlete-id="${escHtml(id)}"
          style="border-left-color:${s.color}"
          ondragstart="_onDragStart(event,${jsArg(id)})"
          ondragend="_onDragEnd(event)"
          onclick="openAthlete(${jsArg(id)})">
        <div class="pl-card-hd">
          <div class="pl-av">${escHtml(initials(a.name))}</div>
          <div style="flex:1;min-width:0">
            <div class="pl-name">${escHtml(a.name)}</div>
            <div class="pl-meta">${escHtml(meta)}</div>
          </div>
          ${fitHtml}
        </div>
        <div class="pl-school">${escHtml(schoolLine||a.school||'')}</div>
        ${na?`<div class="pl-na"><span class="pl-na-arrow">→</span>${escHtml(na)}</div>`:''}
        <div class="pl-card-foot">
          <span class="pl-last">${escHtml(laText)}</span>
          ${evaluationBadge(id)}
          ${isDemoAthlete(a)?'<span class="pl-demo">Demo</span>':''}
          ${a._live?'<span class="pl-live">Live profile</span>':''}
        </div>
        ${boardNames.length?`<div class="pl-board-tags">${boardNames.map(n=>`<span class="pl-board-tag">${escHtml(n)}</span>`).join('')}</div>`:''}
      </div>`;
    }).join('');

    const total = (coachPipeline[s.key]||[]).length;
    const shown = ids.length;
    const countLabel = filterIds&&shown!==total ? `${shown}/${total}` : String(total);
    const isEmpty = ids.length === 0;

    return `<div class="pl-col${isEmpty?' pl-col-empty':''}"
        id="pl-col-${s.key}"
        ondragover="_onDragOver(event)"
        ondragleave="_onDragLeave(event)"
        ondrop="_onDrop(event,'${s.key}')">
      <div class="pl-col-hd">
        <div class="pl-col-dot" style="background:${s.color}"></div>
        <div class="pl-col-name">${s.label}</div>
        ${isEmpty?`<div class="pl-col-count">0</div>`:`<div class="pl-col-count">${countLabel}</div>`}
      </div>
      <div class="pl-cards" id="pl-cards-${s.key}">
        ${isEmpty?`<div class="pl-empty">Drop athletes here</div>`:`${cards}`}
      </div>
    </div>`;
  }).join('');
  updateHeaderStats();
}

// ── DRAG HANDLERS ─────────────────────────────────────────────────────────────
function _onDragStart(e, id){
  _dragId = id;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(()=>{ const el=e.target; if(el) el.classList.add('dragging'); }, 0);
}
function _onDragEnd(e){ e.target.classList.remove('dragging'); }
function _onDragOver(e){
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('pl-col-over');
}
function _onDragLeave(e){ e.currentTarget.classList.remove('pl-col-over'); }
function _onDrop(e, stageKey){
  e.preventDefault();
  e.currentTarget.classList.remove('pl-col-over');
  if(_dragId==null) return;
  _setStageKey(_dragId, stageKey);
  _dragId = null;
}

// Shared stage-write used by drag-drop and setStage() in coach-profile.js
function _setStageKey(id, stageKey){
  const hadStage = !!getPipelineStage(id);
  for(const s of COACH_PIPELINE_STAGES){
    coachPipeline[s.key] = (coachPipeline[s.key]||[]).filter(x=>!coachSameId(x,id));
  }
  if(stageKey&&!coachHasId(coachPipeline[stageKey],id))(coachPipeline[stageKey]=coachPipeline[stageKey]||[]).push(id);
  if(window.JukeOnboarding){
    if(!hadStage) JukeOnboarding.mark('college_coach','firstAthleteAdded',{athleteId:id,stage:stageKey});
    if(hadStage) JukeOnboarding.mark('college_coach','firstStageMove',{athleteId:id,stage:stageKey});
  }
  coachLastActivity[id] = {ts:Date.now(), type:'stage',
    text: COACH_PIPELINE_STAGES.find(s=>s.key===stageKey)?.label||''};
  lss('pipeline', coachPipeline);
  lss('last_activity', coachLastActivity);
  renderPipeline();
  filterAthletes();
  updateHeaderStats();
}

// addToBoard: opens slide-over (boards are managed there now)
function addToBoard(athleteId){ openAthlete(athleteId); }

// renderAnalytics() replaced by renderActivityFeed() in coach-feed.js

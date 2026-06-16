// ── DATA ─────────────────────────────────────────────────────────────────────

const ATHLETES = [
  {id:1,name:"Camryn Wells",pos:["WR","PR"],year:2026,gpa:3.9,state:"TX",city:"Dallas",height:"5'6\"",forty:"4.38",vertical:"32\"",school:"DeSoto HS",division:"D1",sports:["Track","Soccer"],bio:"3× All-State WR. 89 catches for 1,240 yards in 2024. Track star with 4.38 speed."},
  {id:2,name:"Destiny Okafor",pos:["QB"],year:2025,gpa:3.7,state:"FL",city:"Miami",height:"5'9\"",forty:"4.62",vertical:"28\"",school:"Miami Central HS",division:"D1",sports:["Basketball"],bio:"Dual-threat QB with D1 upside. 24 TDs, 4 INTs. Committed football IQ."},
  {id:3,name:"Maya Thornton",pos:["CB","S"],year:2026,gpa:4.0,state:"CA",city:"Inglewood",height:"5'7\"",forty:"4.44",vertical:"30\"",school:"Inglewood HS",division:"D1",sports:["Soccer","Basketball"],bio:"2024 SoCal Defensive POY. 12 INTs. Lockdown corner with elite instincts."},
  {id:4,name:"Jayla Monroe",pos:["RB","WR"],year:2027,gpa:3.5,state:"GA",city:"Atlanta",height:"5'5\"",forty:"4.41",vertical:"31\"",school:"Westlake HS",division:"D2",sports:["Soccer"],bio:"Explosive playmaker. 900 rush yards + 40 catches in 2024. Makes people miss."},
  {id:5,name:"Simone Reeves",pos:["QB","WR"],year:2026,gpa:3.8,state:"OH",city:"Columbus",height:"5'8\"",forty:"4.55",vertical:"29\"",school:"Dublin Jerome HS",division:"D1",sports:["Volleyball"],bio:"72% completion rate, 1,800 yards. Elite IQ and composure under pressure."},
  {id:6,name:"Imani Clarke",pos:["S","LB"],year:2025,gpa:3.6,state:"TX",city:"Houston",height:"5'8\"",forty:"4.51",vertical:"33\"",school:"Klein Oak HS",division:"D1",sports:["Track","Soccer"],bio:"Rangy safety with closing speed. 8 sacks from LB. Elite athlete."},
  {id:7,name:"Taylor Brooks",pos:["WR","KR"],year:2026,gpa:3.4,state:"AZ",city:"Phoenix",height:"5'5\"",forty:"4.35",vertical:"34\"",school:"Desert Vista HS",division:"D1",sports:["Track"],bio:"Fastest player in AZ. Track sprinter. Can take any touch to the house."},
  {id:8,name:"Nia Washington",pos:["QB"],year:2027,gpa:4.0,state:"NC",city:"Charlotte",height:"5'10\"",forty:"4.68",vertical:"27\"",school:"Providence Day School",division:"D1",sports:["Basketball"],bio:"Top-ranked 2027 QB. Strong arm, high IQ, exceptional leader on and off the field."},
];

const COACH_PIPELINE_STAGES = [
  {key:"identified", label:"Identified",    color:"#888"},
  {key:"contacted",  label:"Contacted",     color:"#7B2FFF"},
  {key:"visit",      label:"Visit Scheduled",color:"#FF4500"},
  {key:"offer",      label:"Offer Extended", color:"#0057FF"},
  {key:"committed",  label:"Committed",     color:"#00E050"},
];

// ── STORAGE ──────────────────────────────────────────────────────────────────
function ls(k){try{return JSON.parse(localStorage.getItem('juke_coach_'+k))||null;}catch{return null;}}
function lss(k,v){try{localStorage.setItem('juke_coach_'+k,JSON.stringify(v));}catch{}}

let coachProfile = ls('profile') || {name:"Coach Sarah Mitchell",title:"Head Flag Football Coach",school:"Northern Arizona University",div:"NCAA D1",conf:"Big Sky Conference",loc:"Flagstaff, AZ",seasons:5,bio:"Building a program that develops champions on and off the field. NAU Flag Football is a fast-growing D1 program with a commitment to academic excellence and athletic development. We are actively recruiting skilled playmakers for the 2025–26 roster."};
let coachPipeline = ls('pipeline') || {identified:[1,7],contacted:[3,5],visit:[2],offer:[6],committed:[]};
// Boards = named labels (no embedded athlete lists — membership lives in coachTags)
let coachBoards = ls('boards2') || [{id:1,name:"2026 Watch List"},{id:2,name:"QB Targets"}];
// coachTags: { athleteId: [boardId, boardId, ...] }
let coachTags = ls('tags') || {1:[1],3:[1],7:[1],2:[2],5:[2],8:[2]};
let coachNotes = ls('notes') || {};
let activePos = new Set();
let activeBoardFilter = null; // null = All Pipeline
let _spId = null;

// ── TABS ─────────────────────────────────────────────────────────────────────
function switchTab(tab){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  document.getElementById('tab-'+tab).classList.add('active');
  document.getElementById('content-'+tab).classList.add('active');
  if(tab==='feed')     renderCoachFeed();
  if(tab==='pipeline'){renderBoardChips();renderPipeline();}
  if(tab==='analytics')renderAnalytics();
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
    th.querySelector('.sort-arrow').textContent='↕';
  });
  const idx = ['name','pos','year','gpa','forty','vertical','state'].indexOf(key);
  if(idx>=0){
    const ths = document.querySelectorAll('.prospect-table thead th');
    if(ths[idx]){
      ths[idx].classList.add('sorted');
      ths[idx].querySelector('.sort-arrow').textContent = _sortDir===1?'↑':'↓';
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
    if(q && !a.name.toLowerCase().includes(q) && !a.school.toLowerCase().includes(q) && !a.city.toLowerCase().includes(q)) return false;
    if(yr && a.year !== parseInt(yr)) return false;
    if(st && a.state !== st) return false;
    if(activePos.size > 0 && !a.pos.some(p=>activePos.has(p))) return false;
    if(gpaMin > 0 && (a.gpa||0) < gpaMin) return false;
    if(div && a.division !== div) return false;
    if(sport && !(a.sports||[]).includes(sport)) return false;
    return true;
  });
  if(_sortKey){
    results = [...results].sort((a,b)=>{
      let av = a[_sortKey], bv = b[_sortKey];
      if(_sortKey==='pos') { av=a.pos[0]||''; bv=b.pos[0]||''; }
      if(_sortKey==='forty'||_sortKey==='vertical') { av=parseFloat(av)||0; bv=parseFloat(bv)||0; }
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
  const stageBadge = stage
    ? `<span style="font-family:'Archivo Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:2px 8px;border-radius:20px;border:1.5px solid ${stage.color};color:${stage.color};background:${stage.color}18">${stage.label}</span>`
    : '<span style="color:var(--text-dim);font-size:11px;">—</span>';
  return `<tr onclick="openAthlete(${a.id})">
    <td>
      <div class="pt-name">${a.name}${endorsed?' <span style="font-size:9px;color:#00A040">✓</span>':''}</div>
      <div class="pt-school">${a.school} · ${a.city}, ${a.state}</div>
    </td>
    <td><div class="pt-pos">${a.pos.map(p=>`<span class="a-pos-pill">${p}</span>`).join('')}</div></td>
    <td><span class="a-year-pill">'${String(a.year).slice(2)}</span></td>
    <td class="pt-stat">${a.gpa}</td>
    <td class="pt-meas">${a.forty}</td>
    <td class="pt-meas">${a.vertical}</td>
    <td class="pt-meas">${a.state}</td>
    <td>${stageBadge}</td>
    <td onclick="event.stopPropagation()">
      <div class="pt-actions">
        <button class="pt-act-btn" onclick="openAthlete(${a.id})">View</button>
        <button class="pt-act-btn${stage?' primary':''}" onclick="openAthlete(${a.id});setTimeout(()=>document.getElementById('sp-stage-row')?.scrollIntoView({behavior:'scroll'}),300)">${stage?stage.label:'+ Pipeline'}</button>
      </div>
    </td>
  </tr>`;
}

function initials(name){return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();}

// ── COACH ENDORSEMENTS (read from shared localStorage) ────
function getAllEndorsements(){try{return JSON.parse(localStorage.getItem('juke_endorsements'))||[];}catch(e){return[];}}
function getEndorsementForAthlete(name){
  return getAllEndorsements().filter(function(e){
    return e.status==='endorsed' && (e.athleteName||'').toLowerCase()===name.toLowerCase();
  });
}
// Seed demo endorsement for Camryn Wells if not present
(function seedCoachDemoEndorsement(){
  var all=getAllEndorsements();
  if(!all.some(function(e){return e.id==='end_coach_demo';})){
    all.push({id:'end_coach_demo',athleteProfileId:'demo',athleteName:'Camryn Wells',coachName:'Marcus Johnson',coachSchool:'DeSoto HS',coachTitle:'Head Coach',coachNote:'',status:'endorsed',endorsementText:'Camryn is the most complete receiver I have coached in 12 years. She reads coverage before the snap, creates separation at every level of the route tree, and brings the same intensity to every practice rep. Any program getting her is getting a program changer — on the field and in the locker room.',submittedAt:'May 2026',requestedAt:'Apr 2026'});
    try{localStorage.setItem('juke_endorsements',JSON.stringify(all));}catch(e){}
  }
})();

function getPipelineStage(id){
  for(const s of COACH_PIPELINE_STAGES){ if((coachPipeline[s.key]||[]).includes(id)) return s; }
  return null;
}

function pipelineBadgeHtml(id){
  const s = getPipelineStage(id);
  if(!s) return '';
  return `<div class="pipeline-badge" style="color:${s.color};border-color:${s.color};background:${s.color}18">${s.label}</div>`;
}

function athleteCard(a){
  const stage = getPipelineStage(a.id);
  const endorsed = getEndorsementForAthlete(a.name).length > 0;
  return `<div class="athlete-card" onclick="openAthlete(${a.id})">
    ${pipelineBadgeHtml(a.id)}
    <div class="athlete-card-hd">
      <div class="athlete-av"><div class="athlete-av-init">${initials(a.name)}</div></div>
      <div>
        <div class="athlete-card-name">${a.name}</div>
        <div class="athlete-card-school">${a.school} · ${a.city}, ${a.state}</div>
      </div>
    </div>
    <div class="athlete-pos-row">
      ${a.pos.map(p=>`<span class="a-pos-pill">${p}</span>`).join('')}
      <span class="a-year-pill">'${String(a.year).slice(2)}</span>
      ${endorsed?'<span class="coach-verified-badge">✓ Coach Verified</span>':''}
    </div>
    <div class="athlete-stats-line">GPA <span>${a.gpa}</span> &nbsp;·&nbsp; ${a.height} &nbsp;·&nbsp; 40yd <span>${a.forty}</span> &nbsp;·&nbsp; Vert <span>${a.vertical}</span></div>
    <div class="athlete-card-ft">
      <button class="ac-btn" onclick="event.stopPropagation();openAthlete(${a.id})">View</button>
      <button class="ac-btn${stage?' primary':''}" onclick="event.stopPropagation();openAthlete(${a.id});document.getElementById('sp-stage-row').scrollIntoView({behavior:'smooth'})">${stage?stage.label:'+ Pipeline'}</button>
    </div>
  </div>`;
}

// ── BOARDS ────────────────────────────────────────────────────────────────────
function athletesBoardIds(athleteId){
  return coachTags[athleteId]||[];
}
function athleteInBoard(athleteId, boardId){
  return athletesBoardIds(athleteId).includes(boardId);
}
function toggleAthleteBoard(athleteId, boardId){
  if(!coachTags[athleteId]) coachTags[athleteId]=[];
  const idx=coachTags[athleteId].indexOf(boardId);
  if(idx>-1) coachTags[athleteId].splice(idx,1);
  else coachTags[athleteId].push(boardId);
  lss('tags',coachTags);
  renderBoardChips();
  if(activeBoardFilter!==null) renderPipeline();
  openAthlete(athleteId);
}
function newBoard(){
  const name=prompt('Board name (e.g. "2026 QBs", "Priority Targets"):');
  if(!name||!name.trim()) return;
  const b={id:Date.now(),name:name.trim()};
  coachBoards.push(b);
  lss('boards2',coachBoards);
  renderBoardChips();
}
function removeBoard(boardId){
  if(!confirm('Delete this board? Athletes will be removed from it.')) return;
  coachBoards=coachBoards.filter(b=>b.id!==boardId);
  Object.keys(coachTags).forEach(aid=>{
    coachTags[aid]=(coachTags[aid]||[]).filter(bid=>bid!==boardId);
  });
  lss('boards2',coachBoards);
  lss('tags',coachTags);
  if(activeBoardFilter===boardId) setBoardFilter(null);
  else renderBoardChips();
}
function boardAthleteCount(boardId){
  const allPl=Object.values(coachPipeline).flat();
  return allPl.filter(id=>(coachTags[id]||[]).includes(boardId)).length;
}
function renderBoardChips(){
  const row=document.getElementById('board-filter-row');
  if(!row) return;
  let html=`<button class="bfchip${activeBoardFilter===null?' active':''}" onclick="setBoardFilter(null)">All Pipeline</button>`;
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

// ── PIPELINE ─────────────────────────────────────────────────────────────────
function renderPipeline(){
  const filterSet = activeBoardFilter!==null
    ? new Set(Object.values(coachPipeline).flat().filter(id=>(coachTags[id]||[]).includes(activeBoardFilter)))
    : null;

  document.getElementById('pipeline-wrap').innerHTML = COACH_PIPELINE_STAGES.map(s=>{
    let ids = coachPipeline[s.key]||[];
    if(filterSet) ids=ids.filter(id=>filterSet.has(id));
    const cards = ids.map(id=>{
      const a = ATHLETES.find(x=>x.id===id);
      if(!a) return '';
      const boardNames=(coachTags[id]||[]).map(bid=>{const b=coachBoards.find(x=>x.id===bid);return b?b.name:'';}).filter(Boolean);
      return `<div class="pl-card" style="border-left-color:${s.color}" onclick="openAthlete(${id})">
        <div class="pl-card-hd">
          <div class="pl-av">${initials(a.name)}</div>
          <div>
            <div class="pl-name">${a.name}</div>
            <div class="pl-meta">${a.pos.join(' · ')} · '${String(a.year).slice(2)} · ${a.state}</div>
          </div>
        </div>
        <div class="pl-last">${a.school}</div>
        ${boardNames.length?`<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">${boardNames.map(n=>`<span style="font-family:'Archivo Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:2px 7px;border-radius:20px;background:var(--columbia-bg);border:1px solid var(--columbia-bd);color:var(--columbia)">${n}</span>`).join('')}</div>`:''}
      </div>`;
    }).join('');
    const total=(coachPipeline[s.key]||[]).length;
    const shown=ids.length;
    const countLabel=filterSet&&shown!==total?`${shown}/${total}`:String(total);
    return `<div class="pl-col">
      <div class="pl-col-hd">
        <div class="pl-col-dot" style="background:${s.color}"></div>
        <div class="pl-col-name">${s.label}</div>
        <div class="pl-col-count">${countLabel}</div>
      </div>
      <div class="pl-cards">${cards||`<div class="pl-empty">${filterSet?'None in this board':'No athletes yet'}</div>`}</div>
    </div>`;
  }).join('');
  updateHeaderStats();
}

// addToBoard: opens slide-over (boards are managed there now)
function addToBoard(athleteId){ openAthlete(athleteId); }

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
function renderAnalytics(){
  const totalPipeline = Object.values(coachPipeline).flat().length;
  const stats = [
    {num:142,lbl:'Profile Views',delta:'+18 this week'},
    {num:totalPipeline,lbl:'In Pipeline',delta:''},
    {num:24,lbl:'Messages Sent',delta:'+6 this week'},
    {num:(coachPipeline.committed||[]).length,lbl:'Committed',delta:''},
  ];
  document.getElementById('analytics-stats').innerHTML = stats.map(s=>`
    <div class="an-stat">
      <div class="an-stat-num">${s.num}</div>
      <div class="an-stat-lbl">${s.lbl}</div>
      ${s.delta?`<div class="an-stat-delta">${s.delta}</div>`:''}
    </div>`).join('');

  const recent = [
    {name:"Camryn Wells",action:"Added your program to pipeline",time:"2h ago",stage:"Interested",color:"#0057FF"},
    {name:"Simone Reeves",action:"Viewed your program profile",time:"5h ago",stage:"Viewing",color:"#888"},
    {name:"Maya Thornton",action:"Opened your recruiting message",time:"1d ago",stage:"Contacted",color:"#7B2FFF"},
    {name:"Taylor Brooks",action:"Saved your program to watchlist",time:"2d ago",stage:"Interested",color:"#0057FF"},
    {name:"Nia Washington",action:"Viewed your program profile",time:"3d ago",stage:"Viewing",color:"#888"},
  ];
  document.getElementById('an-table').innerHTML = `
    <div class="an-table-hd"><div class="an-table-title">Recent Athlete Activity</div></div>
    ${recent.map(r=>`<div class="an-row">
      <div class="board-av" style="flex-shrink:0;width:32px;height:32px;font-size:12px">${initials(r.name)}</div>
      <div class="an-row-name">${r.name}<br><span class="an-row-meta">${r.action}</span></div>
      <div style="flex-shrink:0;text-align:right">
        <div class="an-row-badge" style="color:${r.color};background:${r.color}18;border:1px solid ${r.color}44">${r.stage}</div>
        <div class="an-row-meta" style="margin-top:3px">${r.time}</div>
      </div>
    </div>`).join('')}`;
}

// ── TABS ────────────────────────────────────────────────
function _closeAllOverlays(){
  // Board detail panel
  if(typeof closeBoardDetail==='function'){
    const bd=document.getElementById('bd-panel');
    if(bd&&bd.classList.contains('open')) closeBoardDetail();
  }
  // School workspace drawer
  if(typeof closeWorkspace==='function'){
    const ws=document.getElementById('ws-overlay');
    if(ws&&ws.classList.contains('open')) closeWorkspace();
  }
  // Program profile slide-over (finder)
  if(typeof closeProgramProfile==='function'){
    const pp=document.getElementById('pp-overlay');
    if(pp&&pp.classList.contains('open')) closeProgramProfile();
  }
  // Compare modal
  const cm=document.getElementById('compare-modal');
  if(cm&&cm.classList.contains('open')) cm.classList.remove('open');
}

function switchTab(t){
  _closeAllOverlays();
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  document.getElementById('tab-'+t).classList.add('active');
  document.getElementById('content-'+t).classList.add('active');
  if(t==='feed')renderFeed();
  if(t==='pipeline'){
    if(window.JukeOnboarding) JukeOnboarding.mark('athlete','boardViewed');
    renderPipeline();
  }
  if(t==='coaches'&&coachUnlocked)filterCoachAthletes();
  if(t==='profile')setTimeout(renderProfileView,0);
  if(t==='readiness'&&typeof renderReadiness==='function')renderReadiness();
  if(t==='calendar'&&typeof renderCalendar==='function')renderCalendar();
}

// ── COMMITTED BANNER ─────────────────────────────────────
function updateCommittedBanner(){
  const sd=lsGet('juke_status');
  const committedSchool=Object.keys(sd).find(k=>sd[k]==='committed');
  const banner=document.getElementById('committed-banner');
  if(!banner) return;
  if(committedSchool){
    banner.classList.add('show');
    const nameEl=document.getElementById('committed-school-name');
    if(nameEl) nameEl.textContent=committedSchool;
    const logoWrap=document.getElementById('committed-logo-wrap');
    if(logoWrap){
      const ph='<span style="font-size:10px;color:rgba(255,255,255,.5);font-weight:700">'+committedSchool.slice(0,3).toUpperCase()+'</span>';
      if(window.paintSchoolLogo) window.paintSchoolLogo(logoWrap, committedSchool, ph);
      else logoWrap.innerHTML=ph;
    }
  } else {
    banner.classList.remove('show');
  }
}

function updateOfferStrip(){
  const strip=document.getElementById('offer-strip');
  if(!strip) return;
  const grouped={saved:[],contacting:[],applied:[],offered:[],committed:[]};
  Object.entries(statusData||{}).forEach(([school,stage])=>{
    if(grouped[stage]) grouped[stage].push(school);
  });
  const sections=PIPELINE_STAGES
    .filter(stage=>(grouped[stage.key]||[]).length)
    .map(stage=>{
      const logos=grouped[stage.key].slice(0,8).map(school=>{
        const initials=school.split(/\s+/).map(w=>w[0]||'').join('').slice(0,3).toUpperCase();
        const domain=SCHOOL_DOMAINS[school];
        const logo=domain
          ? `<img src="https://logo.clearbit.com/${domain}" alt="" onerror="this.parentNode.innerHTML='<span class=&quot;offer-logo-chip-initials&quot;>${initials}</span>'">`
          : `<span class="offer-logo-chip-initials">${initials}</span>`;
        return `<button class="offer-logo-chip" title="${school}" onclick="switchTab('pipeline');setTimeout(()=>openBoardDetail('${esc(school)}'),0)">${logo}</button>`;
      }).join('');
      return `<div class="offer-strip-section"><span class="offer-strip-label ls-${stage.key}">${stage.label}</span><div class="offer-strip-logos">${logos}</div></div>`;
    });
  strip.innerHTML=sections.join('');
  strip.classList.toggle('show', sections.length>0);
}

// ── MILESTONE TIMELINE ────────────────────────────────────
function recordMilestone(school,statusKey){
  if(!school||!statusKey||statusKey==='none') return;
  const raw=lsGet('juke_timeline');
  const tl=Array.isArray(raw)?raw:[];
  tl.unshift({school,status:statusKey,ts:Date.now()});
  lsSet('juke_timeline',tl.slice(0,50));
}

function renderMilestoneRail(){
  const rail=document.getElementById('milestone-rail');
  if(!rail) return;
  const tl=lsGet('juke_timeline')||[];
  if(!tl.length){rail.innerHTML='';return;}
  const fmt=ts=>{
    const d=new Date(ts),now=new Date(),diff=Math.floor((now-d)/86400000);
    if(diff===0)return'Today';if(diff===1)return'Yesterday';
    if(diff<7)return diff+'d ago';
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  };
  const stageLabel={saved:'Saved',contacting:'Contacting',applied:'Applied',offered:'Offered',committed:'Committed',archived:'Archived',contacted:'Contacting',engaged:'Contacting',visit:'Contacting',offer:'Offered'};
  rail.innerHTML=tl.map(ev=>{
    const initials=ev.school.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const domain=SCHOOL_DOMAINS[ev.school]??null;
    const logoHtml=domain?'<img src="https://logo.clearbit.com/'+domain+'" onerror="this.parentNode.textContent=\''+initials+'\'" loading="lazy"/>':initials;
    return'<div class="ms-card" onclick="openBoardDetail(\''+esc(ev.school)+'\')">'+'<div class="ms-card-top"><div class="ms-logo">'+logoHtml+'</div><div class="ms-school">'+ev.school+'</div></div>'+'<span class="ms-badge ms-'+ev.status+'">'+(stageLabel[ev.status]||ev.status)+'</span>'+'<div class="ms-date">'+fmt(ev.ts)+'</div>'+'</div>';
  }).join('');
}

// ── STAGE MIGRATION ──────────────────────────────────────
// Collapses 8-stage model → 5-stage Momentum Engine
const STAGE_MIGRATION_MAP={
  contacted:'contacting', engaged:'contacting', visit:'contacting',
  offer:'offered',
  // pre-8-stage legacy keys
  interested:'saved', dream_schools:'saved', top_choices:'saved',
  contact_made:'contacting', active_conversation:'contacting',
  visit_planned:'contacting', offer_received:'offered', closed:'archived',
};

function _migrateStages(){
  const sd=lsGet('juke_status');
  if(!sd)return;
  let changed=false;
  Object.entries(sd).forEach(([school,stage])=>{
    if(STAGE_MIGRATION_MAP[stage]){sd[school]=STAGE_MIGRATION_MAP[stage];changed=true;}
  });
  if(changed){lsSet('juke_status',sd);Object.assign(statusData,sd);}
}

// ── MOMENTUM SYSTEM ───────────────────────────────────────
// Thresholds are stage-aware: offers expire fast, saved schools are slow-burn.
// active = within threshold.active days of last contact
// cooling = active..cooling days  stalled = beyond cooling
const MOMENTUM_THRESHOLDS={
  offered:    {active:3,  cooling:7 },  // offers move fast — 3d active, 7d stalled
  applied:    {active:7,  cooling:21},  // application window
  contacting: {active:7,  cooling:30},  // relationship building
  saved:      {active:14, cooling:45},  // wishlist, lower urgency
  committed:  {active:30, cooling:60},  // relationship maintenance
};

function _calcMomentum(schoolName){
  const stage=statusData[schoolName]||'saved';
  const lcd=(_boardMeta[schoolName]||{}).last_contact_date;
  const t=MOMENTUM_THRESHOLDS[stage]||MOMENTUM_THRESHOLDS.contacting;

  if(!lcd){
    // Stage-aware label when no contact has ever been logged
    if(stage==='offered'||stage==='applied')
      return{level:stage==='offered'?'stalled':'cooling',days:null,label:'No contact logged'};
    return{level:'none',days:null,label:'Not started'};
  }

  const days=Math.floor((new Date()-new Date(lcd+'T00:00:00'))/(1000*60*60*24));
  if(days<=0)  return{level:'active',days:0,label:'Active today'};
  if(days<=t.active)  return{level:'active',  days,label:`${days}d ago`};
  if(days<=t.cooling) return{level:'cooling', days,label:`${days}d ago`};
  return{level:'stalled',days,label:`${days}d ago`};
}

function _stageLabel(key){
  const s=PIPELINE_STAGES.find(s=>s.key===key);
  if(s)return s.label;
  const fallback={contacted:'Contacting',engaged:'Contacting',visit:'Contacting',offer:'Offered',archived:'Archived'};
  return fallback[key]||(key?key.charAt(0).toUpperCase()+key.slice(1):'');
}

// ── NEXT MOVE ENGINE ─────────────────────────────────────
// V1: Rules determine WHAT. Copy explains WHY.
// V2: AI personalizes and drafts outreach.
const NEXT_MOVE_RULES={
  saved:{
    none:    {action:'Send an intro email to the coach',      reason:'You haven\'t contacted this program yet.'},
    active:  {action:'Share your latest highlights',          reason:'Great timing — keep the relationship warm.'},
    cooling: {action:'Check in with the coaching staff',      reason:'Stay on their radar.'},
    stalled: {action:'Reach out before this goes cold',       reason:'Relationships need consistent contact.'},
  },
  contacting:{
    none:    {action:'Follow up with the coaching staff',     reason:'Keep the conversation going.'},
    active:  {action:'Ask about scheduling a campus visit',   reason:'You have momentum — take the next step.'},
    cooling: {action:'Send a follow-up message',              reason:'It\'s been a while — stay visible.'},
    stalled: {action:'Re-engage before they move on',         reason:'Don\'t let this relationship go cold.'},
  },
  applied:{
    none:    {action:'Email the coach about your application',reason:'Let them know you\'ve applied.'},
    active:  {action:'Ask about next steps in the process',   reason:'Good communication — keep it going.'},
    cooling: {action:'Follow up on your application',         reason:'Check in and show continued interest.'},
    stalled: {action:'Contact the coaching staff now',        reason:'Don\'t go silent during the application process.'},
  },
  offered:{
    none:    {action:'Review and understand the full offer',  reason:'Know exactly what\'s on the table.'},
    active:  {action:'Move toward making a decision',         reason:'You\'re engaged — keep moving forward.'},
    cooling: {action:'Request a decision deadline',           reason:'Clarify your timeline with the coaching staff.'},
    stalled: {action:'Decide or ask for more time',           reason:'Don\'t leave an offer waiting.'},
  },
  committed:{
    none:    {action:'Connect with your future coach',        reason:'Build the relationship before you arrive.'},
    active:  {action:'Stay in touch with the team',           reason:'Build relationships before the season starts.'},
    cooling: {action:'Reach out to future teammates',         reason:'Warm up relationships before you arrive.'},
    stalled: {action:'Check in with the coaching staff',      reason:'Stay connected with your future program.'},
  },
};

function _getNextMove(stage,momentum){
  const rules=NEXT_MOVE_RULES[stage]||NEXT_MOVE_RULES.saved;
  return rules[momentum.level]||rules.none;
}

const STAGE_DESC={
  dream_schools:'Programs worth exploring.',
  interested:'Programs on your radar.',
  contact_made:"Schools you've reached out to.",
  active_conversation:'Conversations with coaches.',
  visit_planned:'Visits scheduled or planned.',
  applied:'Applications in progress.',
  offer_received:'Opportunities to compare.',
  top_choices:'Your strongest options.',
  committed:'Your next chapter.',
  closed:'Programs no longer in play.'
};
function _makeBoardProfileChip(){
  const d=lsGet('juke_player');
  let score=0;
  if(d.fname&&d.lname)score+=10;
  if(d.gradyr)score+=5;
  if((d.positions||d._positions||[]).length)score+=10;
  if(d.height)score+=5;
  if(d.gpa)score+=10;
  if(d.highlight)score+=25;
  if(d.intro)score+=15;
  if(d.gp)score+=10;
  if(d.school)score+=5;
  if(d.sat||d.act)score+=5;
  score=Math.min(100,score);
  const col=score<40?'#FF4D4D':score<70?'#FF9800':'var(--columbia)';
  const tip=score===100?'Profile complete ✓':score>50?'Keep going — coaches are checking':'Start your profile so coaches can find you';
  return`<div class="pipeline-stat board-profile-chip" onclick="switchTab('profile')" title="${tip}"><div class="pipeline-stat-num" style="color:${col};font-size:16px">${score}%</div><div class="pipeline-stat-lbl">Profile</div></div>`;
}

// ── DRAG HANDLERS ────────────────────────────────────────
function _pdMove(e){
  if(!_pd.clone) return;
  const x=e.clientX-_pd.ox,y=e.clientY-_pd.oy;
  _pd.clone.style.left=x+'px';_pd.clone.style.top=y+'px';
  if(!_pd.moved&&(Math.abs(e.clientX-_pd.sx)>4||Math.abs(e.clientY-_pd.sy)>4)){_pd.moved=true;_pd.card.classList.add('juke-dragging');}
  if(_pd.over){_pd.over.classList.remove('juke-drag-over');_pd.over=null;}
  _pd.clone.style.visibility='hidden';
  const hit=document.elementFromPoint(e.clientX,e.clientY);
  _pd.clone.style.visibility='';
  const col=hit&&hit.closest('.pipeline-col-body');
  if(col&&col!==_pd.card.parentElement){col.classList.add('juke-drag-over');_pd.over=col;}
}
function _pdUp(e){
  document.removeEventListener('mousemove',_pdMove);
  document.removeEventListener('mouseup',_pdUp);
  if(_pd.over)_pd.over.classList.remove('juke-drag-over');
  if(_pd.clone){_pd.clone.remove();_pd.clone=null;}
  if(!_pd.card){_pd={card:null,clone:null,ox:0,oy:0,over:null,moved:false};return;}
  _pd.card.classList.remove('juke-dragging');
  const targetBody=_pd.over;
  const school=_pd.card.dataset.school;
  const sourceBody=_pd.card.parentElement;
  _pd={card:null,clone:null,ox:0,oy:0,over:null,moved:false};
  if(!targetBody||!school) return;
  const targetStage=targetBody.dataset.stage;
  // Move card in DOM
  targetBody.querySelector('.pipeline-empty-col')?.remove();
  targetBody.appendChild(document.querySelector(`.pipeline-card[data-school="${CSS.escape(school)}"]`));
  if(!sourceBody.querySelector('.pipeline-card')){
    const ph=document.createElement('div');ph.className='pipeline-empty-col';ph.textContent='Drop cards here';
    sourceBody.appendChild(ph);
  }
  // Update card stage class
  const movedCard=targetBody.querySelector(`.pipeline-card[data-school="${CSS.escape(school)}"]`);
  if(movedCard){
    [...movedCard.classList].filter(c=>c.startsWith('status-')).forEach(c=>movedCard.classList.remove(c));
    movedCard.classList.add('status-'+targetStage);
  }
  // Refresh col counts
  document.querySelectorAll('.pipeline-col').forEach(col=>{
    const b=col.querySelector('.pipeline-col-body'),cnt=col.querySelector('.pipeline-col-count');
    if(b&&cnt)cnt.textContent=b.querySelectorAll('.pipeline-card').length;
  });
  // Persist
  recordMilestone(school,targetStage);
  saveBoardStage(school,targetStage); // data.js — updates localStorage + Supabase
  cloudSave();
}

// ── BOARD RENDER ─────────────────────────────────────────
// _boardMeta holds enriched data from Supabase: {schoolName: {...fields}}
let _boardMeta={};

async function renderPipeline(){
  _migrateStages();
  renderMilestoneRail();
  // Load Supabase records in background; board renders immediately from localStorage
  if(sb&&currentUser){
    loadAllBoardRecords().then(meta=>{
      _boardMeta=meta;
      // Sync stages from Supabase back to statusData (source of truth)
      let changed=false;
      Object.entries(meta).forEach(([name,row])=>{
        if(row.stage&&row.stage!==statusData[name]){statusData[name]=row.stage;changed=true;}
      });
      if(changed)lsSet('juke_status',statusData);
      _renderBoardCols();
    });
  }
  _renderBoardCols();
}

function _renderBoardCols(){
  // ── Signed-out notice ──
  let syncBar=document.getElementById('board-sync-notice');
  if(!syncBar){
    syncBar=document.createElement('div');
    syncBar.id='board-sync-notice';
    const colsEl=document.getElementById('pipeline-cols');
    colsEl.parentNode.insertBefore(syncBar,document.getElementById('pipeline-summary'));
  }
  if(!sb||!currentUser){
    const hasLocal=Object.keys(statusData||{}).length>0;
    syncBar.innerHTML=hasLocal
      ?'<div class="board-sync-bar board-sync-local">📱 Your board is saved locally — <button class="board-sync-link" onclick="openAuthModal(\'signin\')">sign in</button> to back it up to the cloud and access it from any device.</div>'
      :'<div class="board-sync-bar board-sync-local">📱 Sign in to save your board to the cloud. <button class="board-sync-link" onclick="openAuthModal(\'signin\')">Sign in →</button></div>';
  } else {
    syncBar.innerHTML=''; // signed in — hide notice
  }

  const schoolsByStage={};
  PIPELINE_STAGES.forEach(s=>schoolsByStage[s.key]=[]);
  Object.entries(statusData).forEach(([school,status])=>{
    if(schoolsByStage[status])schoolsByStage[status].push(school);
  });

  // ── Board command center ──
  const savedCount=schoolsByStage.saved?.length||0;
  const totalCount=Object.values(schoolsByStage).reduce((sum,list)=>sum+list.length,0);
  const activeStageKeys=['contacting','applied','offered'];
  const activeSchools=activeStageKeys.flatMap(k=>schoolsByStage[k]||[]);
  const stalledList=activeSchools.filter(n=>_calcMomentum(n).level==='stalled');
  const coolingList=activeSchools.filter(n=>_calcMomentum(n).level==='cooling');
  const offerCount=schoolsByStage['offered']?.length||0;
  const needsAttn=[...stalledList,...coolingList];
  const profilePct=(document.getElementById('pvc-pct')?.textContent||'0%').trim();
  const topSchool=Object.keys(statusData||{})[0]||'';
  const nextText=topSchool
    ? `Review ${topSchool}, then decide whether to contact the coach.`
    : 'Save a program from Programs to start building your board.';

  document.getElementById('pipeline-summary').innerHTML=`
    <div class="board-cmd-main">
      <div class="board-cmd-kicker">My Board</div>
      <div class="board-cmd-title">${totalCount?`${totalCount} program${totalCount!==1?'s':''} on your list`:'Start your recruiting list'}</div>
      <div class="board-cmd-sub">${nextText}</div>
    </div>
    <div class="board-cmd-metrics">
      <div class="board-cmd-stat">
        <div class="board-cmd-num">${savedCount}</div>
        <div class="board-cmd-lbl">Saved</div>
      </div>
      <div class="board-cmd-stat${stalledList.length?' board-cmd-urgent':''}">
        <div class="board-cmd-num">${needsAttn.length}</div>
        <div class="board-cmd-lbl">Needs Action</div>
      </div>
      <div class="board-cmd-stat">
        <div class="board-cmd-num">${profilePct}</div>
        <div class="board-cmd-lbl">Profile</div>
      </div>
      ${offerCount?`<div class="board-cmd-stat board-cmd-gold"><div class="board-cmd-num">${offerCount}</div><div class="board-cmd-lbl">Offers</div></div>`:''}
    </div>
    <div class="board-cmd-actions">
      <button class="board-cmd-primary" onclick="switchTab('finder')">Find Programs</button>
      <button class="board-cmd-show-empty" onclick="_toggleEmptyStages(this)" data-showing="">Show empty stages</button>
    </div>
  `;

  _renderAttentionStrip(needsAttn);

  const colsEl=document.getElementById('pipeline-cols');
  colsEl.innerHTML='';
  if(!totalCount){
    colsEl.innerHTML=`
      <div class="board-empty-state">
        <div class="board-empty-kicker">First Move</div>
        <div class="board-empty-title">Make Your First Moves</div>
        <div class="board-empty-copy">Save three programs, compare fit, then move one to Contacting when you are ready to reach out.</div>
        <button class="board-empty-btn" onclick="switchTab('finder')">Find Programs</button>
      </div>`;
    return;
  }
  PIPELINE_STAGES.forEach(stage=>{
    const schools=schoolsByStage[stage.key].map(name=>RAW.find(r=>r.School===name)).filter(Boolean);
    const col=document.createElement('div');
    col.className='pipeline-col'+(schools.length===0?' pipeline-col--empty':'');
    col.innerHTML=`<div class="pipeline-col-hd"><div class="pipeline-col-hd-text"><span class="pipeline-col-title" style="color:${stage.color}">${stage.label}</span><div class="pipeline-col-sub">${STAGE_DESC[stage.key]||''}</div></div><span class="pipeline-col-count">${schools.length}</span></div>`;
    const body=document.createElement('div');
    body.className='pipeline-col-body';
    body.dataset.stage=stage.key;
    if(!schools.length){
      const ph=document.createElement('div');ph.className='pipeline-empty-col';ph.textContent='Drop programs here';
      body.appendChild(ph);
      col.style.display='none'; // collapse empty stages by default
    } else {
      schools.forEach(r=>body.appendChild(buildPipelineCard(r,stage.key)));
    }
    col.appendChild(body);
    colsEl.appendChild(col);
  });
}

// ── ATTENTION STRIP ──────────────────────────────────────
function _renderAttentionStrip(needsList){
  let strip=document.getElementById('board-attn-strip');
  if(!strip){
    strip=document.createElement('div');
    strip.id='board-attn-strip';
    const colsEl=document.getElementById('pipeline-cols');
    colsEl.parentNode.insertBefore(strip,colsEl);
  }
  if(!needsList.length){strip.innerHTML='';return;}
  // Sort by: (1) stage urgency — offered first, (2) momentum level — stalled before cooling,
  // (3) days since contact descending, (4) overdue next_action_date
  const STAGE_RANK={offered:0,applied:1,contacting:2,saved:3,committed:4};
  const MOMENTUM_RANK={stalled:0,cooling:1};
  const sorted=[...needsList].sort((a,b)=>{
    const sa=STAGE_RANK[statusData[a]]??9,sb=STAGE_RANK[statusData[b]]??9;
    if(sa!==sb) return sa-sb;
    const ma=_calcMomentum(a),mb=_calcMomentum(b);
    const ra=MOMENTUM_RANK[ma.level]??9,rb=MOMENTUM_RANK[mb.level]??9;
    if(ra!==rb) return ra-rb;
    // Within same stage+momentum: most days elapsed first
    const da=ma.days??999,db=mb.days??999;
    return db-da;
  });
  const top=sorted.slice(0,5);
  strip.innerHTML=`<div class="board-attn-hd">⚠ Needs Attention</div><div class="board-attn-cards">${
    top.map(name=>{
      const m=_boardMeta[name]||{};
      const na=m.next_action||'No next action set';
      const nad=m.next_action_date;
      const daysOver=nad?Math.ceil((new Date()-new Date(nad+'T00:00:00'))/(1000*60*60*24)):0;
      return`<div class="board-attn-card" onclick="openBoardDetail('${esc(name)}')">
        <div class="board-attn-school">${name}</div>
        <div class="board-attn-task">${na}</div>
        ${nad&&daysOver>0?`<div class="board-attn-age overdue">${daysOver}d overdue</div>`:'<div class="board-attn-age">No date set</div>'}
      </div>`;
    }).join('')}${sorted.length>5?`<div class="board-attn-more">+${sorted.length-5} more</div>`:''}</div>`;
}

// ── CONTACTED TODAY ──────────────────────────────────────
// Quick recovery: one tap on card resets momentum to Active.
async function _markContactedToday(schoolName,btn){
  btn.disabled=true;
  const today=new Date().toISOString().split('T')[0];
  _boardMeta[schoolName]=Object.assign(_boardMeta[schoolName]||{},{last_contact_date:today});
  await saveBoardContact(schoolName,{lastContactDate:today});
  // Re-render this card in place
  const card=document.querySelector(`.pipeline-card[data-school="${CSS.escape(schoolName)}"]`);
  const r=RAW.find(x=>x.School===schoolName);
  const stage=statusData[schoolName]||'saved';
  if(card&&r) card.replaceWith(buildPipelineCard(r,stage));
  // Refresh attention strip with updated momentum data
  const activeStageKeys=['contacting','applied','offered'];
  const activeSchools=activeStageKeys.flatMap(k=>
    Object.entries(statusData).filter(([,v])=>v===k).map(([s])=>s)
  );
  const needsAttn=activeSchools.filter(n=>
    ['stalled','cooling'].includes(_calcMomentum(n).level)
  );
  _renderAttentionStrip(needsAttn);
  showToast('Marked as contacted today');
}

// ── EMPTY STAGE TOGGLE ───────────────────────────────────
function _toggleEmptyStages(btn){
  const showing=btn.dataset.showing==='1';
  document.querySelectorAll('.pipeline-col--empty').forEach(c=>{c.style.display=showing?'none':'';});
  btn.dataset.showing=showing?'':'1';
  btn.textContent=showing?'Show empty stages':'Hide empty stages';
}

// ── CARD BUILD ───────────────────────────────────────────
// Card answers four questions:
//  1. What school is this?   → name + logo
//  2. Where am I?            → stage pill
//  3. Is momentum growing?   → colored dot + label
//  4. What do I do next?     → Next Move action text
function buildPipelineCard(r,stageKey){
  const meta=_boardMeta[r.School]||{};
  const momentum=_calcMomentum(r.School);
  const userAction=meta.next_action;
  const move=userAction?{action:userAction,reason:null}:_getNextMove(stageKey,momentum);
  const moveExtra=userAction?'pc-move-custom':(momentum.level==='stalled'?'pc-move-stalled':'');

  const card=document.createElement('div');
  card.className=`pipeline-card status-${stageKey}`;
  card.dataset.school=r.School;

  card.innerHTML=`
    <div class="pc-header">
      <div class="pc-logo school-logo-wrap school-logo-sm" data-logo="${r.School}"><div class="school-logo-initials">🏈</div></div>
      <div class="pc-name-block">
        <div class="pc-name">${r.School}</div>
        ${r.State?`<div class="pc-school-meta">${r.State}${r.Region?' · '+r.Region:''}</div>`:''}
      </div>
      <span class="pipeline-drag-handle" title="Drag to move">⠿</span>
    </div>
    <div class="pc-momentum pc-m-${momentum.level}">
      <span class="pc-m-dot"></span>
      <span class="pc-m-lbl">${momentum.label}</span>
    </div>
    <div class="pc-move${moveExtra?' '+moveExtra:''}">
      <div class="pc-move-action">${move.action}</div>
      ${move.reason?`<div class="pc-move-reason">${move.reason}</div>`:''}
    </div>
    <div class="pc-footer">
      <div class="pc-card-tags">
        <span class="pc-stage-pill">${_stageLabel(stageKey)}</span>
        ${r['Governing Body']||r['Division']?`<span class="pc-meta-pill">${[r['Governing Body'],(r['Division']||'').replace('Division ','D')].filter(Boolean).join(' ')}</span>`:''}
        ${r['Varsity or Club']?`<span class="pc-meta-pill">${r['Varsity or Club']}</span>`:''}
      </div>
      ${stageKey!=='committed'?`<button class="pc-contacted-btn" onclick="event.stopPropagation();_markContactedToday('${r.School.replace(/'/g,"\\'")}',this)" title="Mark as contacted today">✓ Reached out</button>`:''}
    </div>
  `;

  fetchSchoolLogo(r.School,card.querySelector('.pc-logo'));

  // ── Drag ──
  card.addEventListener('mousedown',e=>{
    if(e.button!==0) return;
    const rect=card.getBoundingClientRect();
    _pd.card=card;_pd.sx=e.clientX;_pd.sy=e.clientY;
    _pd.ox=e.clientX-rect.left;_pd.oy=e.clientY-rect.top;_pd.moved=false;
    _pd.clone=card.cloneNode(true);
    _pd.clone.className=card.className+' juke-drag-clone';
    _pd.clone.style.width=rect.width+'px';
    _pd.clone.style.left=rect.left+'px';_pd.clone.style.top=rect.top+'px';
    document.body.appendChild(_pd.clone);
    document.addEventListener('mousemove',_pdMove);
    document.addEventListener('mouseup',_pdUp);
    e.preventDefault();
  });

  // ── Click → detail panel ──
  card.addEventListener('click',e=>{
    if(_pd.moved) return;
    if(e.target.classList.contains('pipeline-drag-handle')) return;
    openBoardDetail(r.School);
  });

  return card;
}

// ── DATE HELPERS ─────────────────────────────────────────
function _fmtDate(iso){
  if(!iso) return '';
  const d=new Date(iso+'T00:00:00');
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}
function _isOverdue(iso){
  if(!iso) return false;
  return new Date(iso+'T00:00:00')<new Date();
}
function esc(s){return String(s).replace(/'/g,"\\'");}

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

const ACTIVITY = [
  {id:1, school:'Northern Arizona',  abbr:'NAU', domain:'nau.edu',          div:'NCAA D1 – Big Sky',       athletes:[1,2], date:'2 days ago'},
  {id:2, school:'Texas A&M',         abbr:'A&M', domain:'tamu.edu',         div:'NCAA D1 – SEC',            athletes:[1],   date:'4 days ago'},
  {id:3, school:'Ole Miss',          abbr:'OM',  domain:'olemiss.edu',      div:'NCAA D1 – SEC',            athletes:[2,6], date:'5 days ago'},
  {id:4, school:'Maryland',          abbr:'UMD', domain:'umd.edu',          div:'NCAA D1 – Big Ten',        athletes:[3],   date:'1 week ago'},
  {id:5, school:'Auburn',            abbr:'AU',  domain:'auburn.edu',       div:'NCAA D1 – SEC',            athletes:[6],   date:'1 week ago'},
  {id:6, school:'UNLV',              abbr:'UNLV',domain:'unlv.edu',         div:'NCAA D1 – Mountain West',  athletes:[1,4], date:'10 days ago'},
];

const STAGE_LABELS = {none:'No Contact',saved:'Saved',interested:'Saved',contacted:'Contacted',applied:'Applied',committed:'Committed'};
const STAGE_COLORS = {saved:'#0057FF',interested:'#0057FF',contacted:'#7B2FFF',applied:'#FF4500',committed:'#00E050'}; // interested kept as compat alias

// Endorsements stored in localStorage
let endorsements = ls('endorsements') || {};

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
function el(id){ return document.getElementById(id); }

function athleteStatus(a){
  if(!a.programs.length) return 'none';
  const stages = a.programs.map(p=>p.stage);
  if(stages.includes('committed')) return 'committed';
  if(stages.includes('applied'))   return 'applied';
  if(stages.includes('contacted')) return 'contacted';
  return 'saved';
}

function statusColor(st){
  return STAGE_COLORS[st] || 'transparent';
}

function logoUrl(domain){ return 'https://logo.clearbit.com/'+domain; }

function initials(a){ return (a.fname[0]+(a.lname?a.lname[0]:'')).toUpperCase(); }

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
});

// ──────────────────────────────────────────────
// ── ENDORSEMENT REQUESTS ─────────────────────────────────
function escEnd(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function hsInitials(name){return(name||'').split(' ').map(function(w){return w[0]||'';}).join('').slice(0,2).toUpperCase();}

function loadEndorsementRequests(){
  var all=[];try{all=JSON.parse(localStorage.getItem('juke_endorsements'))||[];}catch(e){}
  var pending=all.filter(function(e){return e.status==='pending';});
  var panel=document.getElementById('end-req-panel');
  var cards=document.getElementById('end-req-cards');
  var badge=document.getElementById('end-req-badge');
  if(!panel||!cards) return;
  if(pending.length){
    panel.style.display='';
    badge.textContent=pending.length+' pending';
    cards.innerHTML=pending.map(function(e){
      return '<div class="end-pending-card" id="endcard-'+escEnd(e.id)+'">'
        +'<div class="epc-athlete-row">'
        +'<div class="epc-av">'+hsInitials(e.athleteName)+'</div>'
        +'<div><div class="epc-name">'+escEnd(e.athleteName||'Athlete')+'</div>'
        +(e.coachNote?'<div class="epc-note">&#8220;'+escEnd(e.coachNote)+'&#8221;</div>':'')
        +'</div></div>'
        +'<label class="epc-label">Your endorsement</label>'
        +'<textarea class="epc-textarea" id="endtext-'+escEnd(e.id)+'" placeholder="What makes this athlete stand out? What will a college program be getting?"></textarea>'
        +'<div class="epc-actions">'
        +'<button class="epc-submit-btn" onclick="submitHSEndorsement(\''+escEnd(e.id)+'\')">Submit Endorsement</button>'
        +'<span class="epc-success" id="endsuccess-'+escEnd(e.id)+'" style="display:none">✓ Submitted</span>'
        +'</div></div>';
    }).join('');
  } else {
    panel.style.display='';
    badge.style.display='none';
    cards.innerHTML='<div class="end-req-none">No recommendation requests need review right now.</div>';
  }
}

function submitHSEndorsement(id){
  var textEl=document.getElementById('endtext-'+id);
  var text=textEl?textEl.value.trim():'';
  if(!text){alert('Please write an endorsement before submitting.');return;}
  var all=[];try{all=JSON.parse(localStorage.getItem('juke_endorsements'))||[];}catch(e){}
  var idx=all.findIndex(function(e){return e.id===id;});
  if(idx<0)return;
  all[idx].status='endorsed';
  all[idx].endorsementText=text;
  all[idx].submittedAt=new Date().toLocaleDateString('en-US',{month:'short',year:'numeric'});
  try{localStorage.setItem('juke_endorsements',JSON.stringify(all));}catch(e){}
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
  if(id==='activity') loadEndorsementRequests();
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

  // Update stats
  const endorsed = Object.keys(endorsements).length;
  const withInterest = ATHLETES.filter(a=>a.programs.length>0).length;
  setText('hs-stat-roster', ATHLETES.length);
  setText('hs-stat-roster-summary', ATHLETES.length);
  setText('hs-stat-seniors', ATHLETES.filter(a=>a.year===2025).length);
  setText('hs-stat-seniors-summary', ATHLETES.filter(a=>a.year===2025).length);
  setText('hs-stat-interest', withInterest);
  setText('hs-stat-interest-summary', withInterest);
  setText('hs-stat-endorsed', endorsed);
  setText('hs-stat-endorsed-summary', endorsed);
  renderRosterAttention();
}

function setText(id, value){
  const node = el(id);
  if(node) node.textContent = value;
}

function renderRosterAttention(){
  const list = el('roster-attention-list');
  if(!list) return;

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
  lss('profile',{
    fname:  el('hs-fname')?.value,
    lname:  el('hs-lname')?.value,
    title:  el('hs-title')?.value,
    school: el('hs-school')?.value,
    city:   el('hs-city')?.value,
    state:  el('hs-state')?.value,
    league: el('hs-league')?.value,
    bio:    el('hs-bio')?.value,
  });
  const msg = el('hs-save-msg');
  if(msg){ msg.classList.add('show'); setTimeout(()=>msg.classList.remove('show'),2200); }
}

// ──────────────────────────────────────────────
// PHOTO UPLOAD
// ──────────────────────────────────────────────
function handleBanner(input){
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e => { lss('banner', e.target.result); renderBannerPhoto(e.target.result); };
  reader.readAsDataURL(file);
}
function renderBannerPhoto(dataUrl){
  const banner = el('coach-banner'); if(!banner) return;
  const existing = banner.querySelector('img.banner-img'); if(existing) existing.remove();
  const ph = el('coach-banner-ph'); if(ph) ph.style.display='none';
  const img = document.createElement('img'); img.src=dataUrl; img.alt='Banner'; img.className='banner-img';
  banner.insertBefore(img, banner.firstChild);
}
function handleLogo(input){
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e => { lss('logo', e.target.result); renderLogoPhoto(e.target.result); };
  reader.readAsDataURL(file);
}
function renderLogoPhoto(dataUrl){
  const circle = el('coach-logo-circle'); if(!circle) return;
  const existing = circle.querySelector('img.logo-img'); if(existing) existing.remove();
  const init = el('coach-logo-init'); if(init) init.style.display='none';
  const img = document.createElement('img'); img.src=dataUrl; img.alt='Logo'; img.className='logo-img';
  img.style.cssText='width:100%;height:100%;object-fit:contain;display:block;';
  circle.insertBefore(img, circle.firstChild);
}

// ──────────────────────────────────────────────
// ROSTER RENDERING
// ──────────────────────────────────────────────
let selectedPositions = new Set();

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
    const name = (a.fname+' '+a.lname).toLowerCase();
    if(q && !name.includes(q)) return false;
    if(year && String(a.year)!==year) return false;
    if(status && athleteStatus(a)!==status) return false;
    if(selectedPositions.size && !a.pos.some(p=>selectedPositions.has(p))) return false;
    return true;
  });
}

function renderRoster(){
  const athletes = filteredAthletes();
  const countEl = el('roster-count');
  if(countEl) countEl.textContent = athletes.length+' athlete'+(athletes.length!==1?'s':'');

  if(rosterView==='cards') renderRosterCards(athletes);
  else renderRosterTable(athletes);
}

function renderRosterCards(athletes){
  const grid = el('roster-grid'); if(!grid) return;
  if(!athletes.length){ grid.innerHTML='<div class="empty-state"><div class="empty-state-title">No matching athletes</div><div class="empty-state-sub">Clear the search or filters to return to the full roster.</div></div>'; return; }
  grid.innerHTML = athletes.map(a=>{
    const st = athleteStatus(a);
    const endorsed = endorsements[a.id];
    const stLabel  = STAGE_LABELS[st]||'';
    const stColor  = STAGE_COLORS[st]||'';
    const intCount = a.programs.length;
    return `<div class="roster-card st-${st}" onclick="openSP(${a.id})">
      ${endorsed?'<div class="endorse-badge">Endorsed</div>':''}
      <div class="rc-hd">
        <div class="rc-av"><div class="rc-av-init">${initials(a)}</div></div>
        <div>
          <div class="rc-name">${a.fname} ${a.lname}</div>
          <div class="rc-school">${a.school} · ${a.state}</div>
        </div>
      </div>
      <div class="rc-pills">
        ${a.pos.map((p,i)=>`<span class="rc-pos">${p}</span>`).join('')}
        <span class="rc-year">${a.year}</span>
        ${st!=='none'?`<span style="font-family:'Archivo Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:2px 8px;border-radius:20px;border:1.5px solid ${stColor};color:${stColor};background:${stColor}18;">${stLabel}</span>`:''}
      </div>
      <div class="rc-stats">
        ${a.gpa?`<span class="v">${a.gpa}</span> GPA`:''}${a.height?` · <span class="v">${a.height}</span>`:''}${a.forty?` · <span class="v">${a.forty}</span> 40`:''}
      </div>
      <div class="rc-interest">
        ${intCount===0
          ? '<span class="rc-interest-none">No college interest yet</span>'
          : `<span class="rc-interest-some">📍 ${intCount} program${intCount!==1?'s':''} interested</span>`}
      </div>
      <div class="rc-ft" onclick="event.stopPropagation()">
        <button class="rc-btn primary" onclick="openEndorse(${a.id})">${endorsed?'✓ Endorsed':'Endorse'}</button>
        <button class="rc-btn" onclick="openSP(${a.id})">View Profile</button>
        <button class="rc-btn blue" onclick="openOutreachFor(${a.id})">Outreach →</button>
      </div>
    </div>`;
  }).join('');
}

function renderRosterTable(athletes){
  const tbody = el('roster-tbody'); if(!tbody) return;
  if(!athletes.length){ tbody.innerHTML='<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text-dim)">No matching athletes. Clear the search or filters to return to the full roster.</td></tr>'; return; }
  tbody.innerHTML = athletes.map(a=>{
    const st       = athleteStatus(a);
    const stColor  = STAGE_COLORS[st]||'#ccc';
    const stLabel  = STAGE_LABELS[st]||'No Contact';
    const endorsed = endorsements[a.id];
    return `<tr>
      <td><div class="rt-av">${initials(a)}</div></td>
      <td>
        <div class="rt-name" style="cursor:pointer" onclick="openSP(${a.id})">${a.fname} ${a.lname}</div>
        ${endorsed?'<span style="font-size:9px;color:#00a03a;font-weight:600">✓ Endorsed</span>':''}
      </td>
      <td><div class="rt-pos-row">${a.pos.map(p=>`<span class="rt-pos">${p}</span>`).join('')}</div></td>
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
          <button class="rt-btn primary" onclick="openEndorse(${a.id})">${endorsed?'✓':'Endorse'}</button>
          <button class="rt-btn blue" onclick="openOutreachFor(${a.id})">Outreach</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ──────────────────────────────────────────────
// COLLEGE ACTIVITY
// ──────────────────────────────────────────────

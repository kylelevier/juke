// ── ATHLETE SLIDE-OVER ────────────────────────────────────────────────────────

// Convert a YouTube watch/short URL to an embed URL; return null for non-YouTube
function _toYtEmbed(url){
  if(!url) return null;
  try{
    const u = new URL(url);
    let vid = null;
    if(u.hostname.includes('youtube.com')) vid = u.searchParams.get('v');
    else if(u.hostname === 'youtu.be') vid = u.pathname.slice(1);
    if(!vid) return null;
    return 'https://www.youtube.com/embed/'+vid+'?rel=0&modestbranding=1';
  }catch(e){ return null; }
}

// Returns {highlight, gamefilm} URLs for an athlete, reading from localStorage for demo athlete
function _getFilmUrls(a){
  if(a.id === 2){
    try{
      const p = JSON.parse(localStorage.getItem('juke_player')||'{}');
      return {highlight: p['p-highlight']||'', gamefilm: p['p-gamefilm']||''};
    }catch(e){}
  }
  return {highlight: a.highlight||'', gamefilm: a.gamefilm||''};
}

function _athleteRecommendations(a){
  const local = getEndorsementForAthlete(a.name);
  const live = (a.recommendations||[]).filter(e=>e&&e.status==='endorsed');
  const seen = new Set();
  return [...live, ...local].filter(e=>{
    const key=[e.coachName,e.coachSchool,e.endorsementText].join('|');
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Renders the film section HTML (empty string if no film URLs)
function _renderFilmSection(highlight, gamefilm){
  if(!highlight && !gamefilm) return '';
  const embedUrl = _toYtEmbed(highlight);
  const isYt = !!embedUrl;
  const isHudl = highlight && highlight.includes('hudl.com');

  let filmHtml = '';
  if(embedUrl){
    filmHtml = `<div class="sp-film-embed-wrap">
      <iframe class="sp-film-embed" src="${embedUrl}" frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen loading="lazy"></iframe>
    </div>`;
  } else if(highlight){
    // Hudl or other — show a prominent link button
    const label = isHudl ? '▶ Watch on Hudl' : '▶ Watch Highlight Reel';
    filmHtml = `<a href="${highlight}" target="_blank" rel="noopener" class="sp-film-link-btn">${label}</a>`;
  }

  const gameLinkHtml = gamefilm
    ? `<a href="${gamefilm}" target="_blank" rel="noopener" class="sp-film-game-link">Game film ↗</a>`
    : '';

  return `<div class="sp-section sp-film-section">
    <div class="sp-section-title">Film</div>
    ${filmHtml}
    ${gameLinkHtml}
  </div>`;
}

function getAthleteBio(a){
  // For the demo athlete (Destiny Okafor, id 2), prefer the bio the athlete wrote in their portal
  if(a.id===2){
    try{
      const p=JSON.parse(localStorage.getItem('juke_player'));
      if(p&&p.intro&&p.intro.trim())return p.intro.trim();
    }catch(e){}
  }
  return a.bio;
}
function openAthlete(id){
  _spId = id;
  const a = typeof findCoachAthlete === 'function'
    ? findCoachAthlete(id)
    : ATHLETES.find(x=>String(x.id)===String(id));
  if(!a) return;
  const stage = getPipelineStage(id);
  const aid = typeof jsArg === 'function' ? jsArg(id) : JSON.stringify(id);
  const note = coachNotes[id]||'';
  const nextAction = coachNextActions[id]||'';
  const {highlight, gamefilm} = _getFilmUrls(a);
  let avatarSrc = a.avatar||'';
  if(id===2) avatarSrc = localStorage.getItem('juke_avatar')||avatarSrc;
  try{ if(avatarSrc&&avatarSrc[0]==='"') avatarSrc=JSON.parse(avatarSrc); }catch(e){}
  const avContent = avatarSrc
    ? `<img src="${avatarSrc}" alt="${escHtml(a.name)}">`
    : initials(a.name);
  let _offerSchools = Array.isArray(a.offers) ? a.offers : [];
  if(id===2){
    try{ _offerSchools=Object.keys(JSON.parse(localStorage.getItem('juke_offers')||'{}')); }catch(e){}
  }
  const bannerStyle = a.banner ? ` style="background-image:url('${String(a.banner).replace(/'/g,'%27')}');background-size:cover;background-position:center;"` : '';
  const offersShowcase = _offerSchools.length ? `
    <div class="pp-offers-showcase" style="padding:14px 20px;border-bottom:1px solid var(--border);background:#fffbeb;">
      <div class="pp-offers-showcase-title" style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#92400e;margin-bottom:10px;">Offers Received</div>
      <div class="pp-offers-grid" style="display:flex;flex-wrap:wrap;gap:8px;">
        ${_offerSchools.map(s=>`<span style="background:linear-gradient(135deg,#f6d365 0%,#c8972a 50%,#f6d365 100%);color:#5c3a00;font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px;box-shadow:0 1px 4px rgba(180,120,0,.3);text-shadow:0 1px 0 rgba(255,255,255,.25);">${escHtml(s)}</span>`).join('')}
      </div>
    </div>` : '';
  const posWatermark = a.pos[0]||'';
  document.getElementById('sp-title').textContent = a.name;
  document.getElementById('sp-body').innerHTML = `
    ${offersShowcase}
    <div class="sp-profile-banner"${bannerStyle}>
      <div class="sp-banner-watermark">${posWatermark}</div>
    </div>
    <div class="sp-profile-av">${avContent}</div>
    <div class="sp-name-block">
      <div class="sp-name">${a.name}</div>
      <div class="sp-school">${a.school} · ${a.city}, ${a.state}</div>
    </div>
    <div class="sp-pos-row">
      ${a.pos.map(p=>`<span class="a-pos-pill">${p}</span>`).join('')}
      <span class="a-year-pill">'${String(a.year).slice(2)}</span>
      <span class="a-year-pill">GPA ${a.gpa}</span>
    </div>
    <div class="sp-divider"></div>
    <div class="sp-section">
      <div class="sp-section-title">Measurables</div>
      <div class="sp-measurables">
        <div class="sp-meas"><div class="sp-meas-val">${a.height}</div><div class="sp-meas-lbl">Height</div></div>
        <div class="sp-meas"><div class="sp-meas-val">${a.forty}</div><div class="sp-meas-lbl">40-Yard</div></div>
        <div class="sp-meas"><div class="sp-meas-val">${a.vertical}</div><div class="sp-meas-lbl">Vertical</div></div>
        <div class="sp-meas"><div class="sp-meas-val">${a.gpa}</div><div class="sp-meas-lbl">GPA</div></div>
      </div>
    </div>
    <div class="sp-section">
      <div class="sp-section-title">About</div>
      <div class="sp-bio">${getAthleteBio(a)}</div>
    </div>
    ${_renderFilmSection(highlight, gamefilm)}
    ${(()=>{
      const ends = _athleteRecommendations(a);
      if(!ends.length) return '';
      return '<div class="sp-section"><div class="sp-section-title">Coach Recommendation</div>'
        + ends.map(e=>`<div class="sp-endorsement"><div class="sp-end-coach">— ${e.coachName}, ${e.coachTitle||'Coach'}${e.coachSchool?' · '+e.coachSchool:''}</div><div class="sp-end-text">&#8220;${e.endorsementText}&#8221;</div></div>`).join('')
        + '</div>';
    })()}
    <div class="sp-divider"></div>
    <div class="sp-section">
      <div class="sp-section-title">Recruiting Stage</div>
      <div class="sp-stage-row" id="sp-stage-row">
        ${COACH_PIPELINE_STAGES.map(s=>`<button class="sp-stage-btn${stage&&stage.key===s.key?' active s-'+s.key:''}" onclick="setStage(${aid},'${s.key}')">${s.label}</button>`).join('')}
        ${stage?`<button class="sp-stage-btn" onclick="removeFromPipeline(${aid})" style="color:var(--text-dim)">✕ Remove</button>`:''}
      </div>
    </div>
    <div class="sp-section">
      <div class="sp-section-title">Next Action</div>
      <input class="sp-na-input" id="sp-next-action"
        placeholder="Watch film, send message, schedule visit…"
        value="${nextAction.replace(/"/g,'&quot;')}"
        oninput="_saveNextAction(${aid},this.value)"/>
      <div class="sp-na-examples">
        ${['Watch film','Send message','Schedule visit','Request transcript','Make offer'].map(ex=>
          `<button class="sp-na-ex" onclick="document.getElementById('sp-next-action').value='${ex}';_saveNextAction(${aid},'${ex}')">${ex}</button>`
        ).join('')}
      </div>
    </div>
    <div class="sp-section">
      <div class="sp-section-title">Boards</div>
      ${coachBoards.length
        ? `<div class="sp-tag-row">${coachBoards.map(b=>`<span class="sp-tag-chip${athleteInBoard(id,b.id)?' in-board':''}" onclick="toggleAthleteBoard(${aid},${b.id})">${athleteInBoard(id,b.id)?'✓ ':''} ${b.name}</span>`).join('')}</div>`
        : `<div style="font-size:12px;color:var(--text-dim);font-style:italic">No boards yet — <span style="color:var(--columbia);cursor:pointer" onclick="newBoard()">create one</span></div>`
      }
    </div>
    <div class="sp-section">
      <div class="sp-section-title">Notes</div>
      <textarea class="sp-note-area" id="sp-note" oninput="saveNote(${aid},this.value)" placeholder="Add recruiting notes…">${note}</textarea>
    </div>
    <div class="sp-actions">
      <button class="sp-action-btn primary" onclick="messageAthlete(${aid})">Message</button>
    </div>
  `;
  const overlay = document.getElementById('sp-overlay');
  overlay.classList.add('open');
  if(window.JukeDialog) window.JukeDialog.open(overlay, {close: closeSP});
  document.body.style.overflow='hidden';
}

function messageAthlete(id){
  const a = typeof findCoachAthlete === 'function'
    ? findCoachAthlete(id)
    : ATHLETES.find(x=>String(x.id)===String(id));
  if(!a) return;
  if(typeof currentUser === 'undefined' || !currentUser){
    if(typeof openCoachAuth === 'function') openCoachAuth();
    else if(typeof showToast === 'function') showToast('Sign in to message athletes');
    return;
  }
  if(!a._userId){
    if(typeof showToast === 'function') showToast('This demo athlete is not connected to a messaging account');
    return;
  }
  closeSP();
  if(typeof openNewMsg === 'function') openNewMsg(a._userId);
  else if(window.openNewMsg) window.openNewMsg(a._userId);
}

function openCoachNewMessage(){
  if(typeof currentUser === 'undefined' || !currentUser){
    if(typeof openCoachAuth === 'function') openCoachAuth();
    else if(typeof showToast === 'function') showToast('Sign in to start a conversation');
    return;
  }
  if(typeof openNewMsg === 'function') openNewMsg();
  else if(window.openNewMsg) window.openNewMsg();
}

function setStage(id, stageKey){
  _setStageKey(id, stageKey); // writes activity, persists, re-renders board
  openAthlete(id);
}

function removeFromPipeline(id){
  for(const s of COACH_PIPELINE_STAGES){ coachPipeline[s.key]=(coachPipeline[s.key]||[]).filter(x=>String(x)!==String(id)); }
  lss('pipeline',coachPipeline);
  filterAthletes();
  updateHeaderStats();
  openAthlete(id);
}

function saveNote(id, val){
  coachNotes[id] = val;
  lss('notes', coachNotes);
  if(val.trim()){
    coachLastActivity[id] = {ts:Date.now(), type:'note', text:val.slice(0,80)};
    lss('last_activity', coachLastActivity);
  }
}

function _saveNextAction(id, val){
  const v = val.trim();
  if(v) coachNextActions[id] = v; else delete coachNextActions[id];
  if(v && window.JukeOnboarding){
    JukeOnboarding.mark('college_coach','firstActionLogged',{athleteId:id,action:v});
    JukeOnboarding.event('college_coach','next_action_logged',{athleteId:id});
  }
  lss('next_actions', coachNextActions);
  coachLastActivity[id] = {ts:Date.now(), type:'action', text:v};
  lss('last_activity', coachLastActivity);
  // Refresh board card if pipeline tab is visible
  if(document.getElementById('content-pipeline')?.classList.contains('active')) renderPipeline();
}

function closeSP(e){
  const overlay = document.getElementById('sp-overlay');
  if(e&&e.target!==overlay)return;
  overlay.classList.remove('open');
  if(window.JukeDialog) window.JukeDialog.close(overlay);
  document.body.style.overflow='';
  _spId=null;
}

// ── COACH PROFILE CARD ────────────────────────────────────────────────────────
function updateHeaderStats(){
  const total = Object.values(coachPipeline).flat().length;
  const committed = (coachPipeline.committed||[]).length;
  const el = id=>document.getElementById(id);
  if(el('cs-pipeline')) el('cs-pipeline').textContent = total;
  if(el('cs-committed')) el('cs-committed').textContent = committed;
}

function updateCoachCard(){
  const p = coachProfile;
  const el = id=>document.getElementById(id);
  if(el('coach-display-name')) el('coach-display-name').textContent = p.name||'Coach Name';
  if(el('coach-display-title')) el('coach-display-title').textContent = [p.title,p.school].filter(Boolean).join(' · ');
  if(el('coach-display-bio'))  el('coach-display-bio').textContent  = p.bio||'';
  if(el('coach-pill-div'))     el('coach-pill-div').textContent     = p.div||'';
  if(el('coach-pill-conf'))    el('coach-pill-conf').textContent    = p.conf||'';
  if(el('coach-pill-loc'))     el('coach-pill-loc').textContent     = p.loc||'';
  if(el('hd-school-name-short')) el('hd-school-name-short').textContent = (p.school||'').split(' ').slice(-2).join(' ');
  if(el('hd-school-abbr'))     el('hd-school-abbr').textContent    = (p.school||'?').split(' ').map(w=>w[0]).join('').slice(0,3).toUpperCase();
  const logoInit = el('coach-logo-init');
  if(logoInit) logoInit.textContent = (p.school||'?')[0].toUpperCase();
}

// ── PROFILE FORM ─────────────────────────────────────────────────────────────
function loadProfileForm(){
  const p = coachProfile;
  ['name','title','school','conf','loc','bio'].forEach(k=>{
    const el=document.getElementById('p-'+k);
    if(el) el.value=p[k]||'';
  });
  const divEl=document.getElementById('p-div');
  if(divEl) divEl.value=p.div||'';
  const seasEl=document.getElementById('p-seasons');
  if(seasEl) seasEl.value=p.seasons||'';
}

function profileUpdate(){
  coachProfile.name    = document.getElementById('p-name')?.value||coachProfile.name;
  coachProfile.title   = document.getElementById('p-title')?.value||coachProfile.title;
  coachProfile.school  = document.getElementById('p-school')?.value||coachProfile.school;
  coachProfile.div     = document.getElementById('p-div')?.value||coachProfile.div;
  coachProfile.conf    = document.getElementById('p-conf')?.value||coachProfile.conf;
  coachProfile.loc     = document.getElementById('p-loc')?.value||coachProfile.loc;
  coachProfile.seasons = document.getElementById('p-seasons')?.value||coachProfile.seasons;
  coachProfile.bio     = document.getElementById('p-bio')?.value||coachProfile.bio;
  updateCoachCard();
}

function saveProfile(){
  profileUpdate();
  lss('profile',coachProfile);
  if(window.JukeOnboarding && coachProfile.school){
    JukeOnboarding.mark('college_coach','setupDone',{school:coachProfile.school});
  }
  const msg=document.getElementById('save-msg');
  if(msg){msg.classList.add('show');setTimeout(()=>msg.classList.remove('show'),2000);}
}

// ── PHOTO UPLOADS ─────────────────────────────────────────────────────────────
function handleBanner(input){
  const file=input.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=e=>{
    lss('banner',e.target.result);
    renderBanner(e.target.result);
  };
  r.readAsDataURL(file);
}
function renderBanner(url){
  const z=document.getElementById('coach-banner');if(!z)return;
  const ex=z.querySelector('img.banner-img');if(ex)ex.remove();
  const ph=document.getElementById('coach-banner-ph');if(ph)ph.style.display='none';
  const img=document.createElement('img');
  img.src=url;img.className='banner-img';
  z.insertBefore(img,z.firstChild);
}
function handleLogo(input){
  const file=input.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=e=>{
    lss('logo',e.target.result);
    renderLogo(e.target.result);
  };
  r.readAsDataURL(file);
}
function renderLogo(url){
  const c=document.getElementById('coach-logo-circle');if(!c)return;
  const ex=c.querySelector('img');if(ex)ex.remove();
  const init=document.getElementById('coach-logo-init');if(init)init.style.display='none';
  const img=document.createElement('img');img.src=url;img.alt='School logo';
  img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:contain;';
  c.insertBefore(img,c.firstChild);
}

// ── HEADER SCHOOL LOGO ────────────────────────────────────────────────────────
function loadSchoolLogo(){
  const school = coachProfile.school||'';
  if(!school) return;
  const domains = {
    'Northern Arizona University':'nau.edu',
    'University of Arizona':'arizona.edu',
    'Arizona State University':'asu.edu',
    'University of Oregon':'uoregon.edu',
    'UCLA':'ucla.edu',
  };
  const d = Object.entries(domains).find(([k])=>school.toLowerCase().includes(k.toLowerCase()));
  if(!d) return;
  const wrap = document.getElementById('hd-school-logo-wrap');
  if(!wrap) return;
  const img = document.createElement('img');
  img.src = 'https://logo.clearbit.com/'+d[1];
  img.style.cssText='width:100%;height:100%;object-fit:contain;';
  img.onerror=()=>img.remove();
  wrap.innerHTML='';
  wrap.appendChild(img);
}

// ── SEED SCHOOL FROM ACTIVE AUTH PROFILE ─────────────────────────────────────
function seedSchoolFromAuth(){
  try{
    var auth=JSON.parse(localStorage.getItem('juke_auth'));
    if(!auth||!auth.profiles) return;
    var apid=auth.activeProfileId||auth.profiles[0].id;
    var ap=auth.profiles.find(function(p){return p.id===apid;})||auth.profiles[0];
    if(!ap) return;
    // Update header chip directly from auth profile
    var abbr=ap.abbr||(ap.org||'').split(/\s+/).map(function(w){return w[0];}).join('').slice(0,3).toUpperCase()||'?';
    var abbrEl=document.getElementById('hd-school-abbr');
    if(abbrEl) abbrEl.textContent=abbr;
    var nameEl=document.getElementById('hd-school-name-short');
    if(nameEl) nameEl.textContent=(ap.org||'').split(' ').slice(-2).join(' ')||(ap.org||'');
    // Seed coachProfile.school if not already set
    if(!coachProfile.school&&ap.org) coachProfile.school=ap.org;
    if(!coachProfile.name&&auth.name) coachProfile.name=auth.name;
  }catch(e){}
}

// ── INIT ─────────────────────────────────────────────────────────────────────
(function init(){
  seedSchoolFromAuth();
  updateCoachCard();
  updateHeaderStats();
  filterAthletes();
  if(typeof loadPublishedAthletes==='function') loadPublishedAthletes();
  loadSchoolLogo();
  renderBoardChips();
  const savedBanner=ls('banner');
  if(savedBanner) renderBanner(savedBanner);
  const savedLogo=ls('logo');
  if(savedLogo) renderLogo(savedLogo);
  renderCoachFeed();
})();

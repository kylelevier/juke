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

function _athleteEvents(a){
  if(typeof athleteEvents === 'function') return athleteEvents(a);
  return Array.isArray(a?.events) ? a.events.filter(ev=>ev&&ev.name) : [];
}

function _renderEventAttendance(a){
  const events=_athleteEvents(a);
  if(!events.length) return '';
  return `<div class="sp-section sp-events-section">
    <div class="sp-section-title">Event Attendance</div>
    <div class="sp-event-list">
      ${events.map(ev=>`
        <div class="sp-event-card">
          <div class="sp-event-name">${escHtml(ev.name||'Event')}</div>
          <div class="sp-event-meta">${[ev.date,ev.location,ev.source].filter(Boolean).map(escHtml).join(' · ')}</div>
          ${ev.verified?'<span class="sp-event-verified">Verified</span>':''}
        </div>`).join('')}
    </div>
  </div>`;
}

function _evaluationEventField(a, currentYear){
  const events=_athleteEvents(a);
  if(!events.length){
    return `<input id="sp-eval-event" value="USA Football Talent ID - ${currentYear}" placeholder="USA Football Talent ID - Dallas">`;
  }
  return `<select id="sp-eval-event">
    ${events.map(ev=>`<option value="${escHtml(ev.name)}">${escHtml(ev.name)}</option>`).join('')}
    <option value="Private evaluation">Private evaluation</option>
  </select>`;
}

function _coachEvaluationList(id){
  const key = String(id);
  return Array.isArray(coachEvaluations[key]) ? coachEvaluations[key] : [];
}

function _evaluationGradeOptions(selected){
  return [1,2,3,4,5].map(n=>`<option value="${n}" ${String(selected||'')===String(n)?'selected':''}>${n}</option>`).join('');
}

function _renderEvaluations(id, a){
  const aid = typeof jsArg === 'function' ? jsArg(id) : JSON.stringify(id);
  const evals = _coachEvaluationList(id);
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().slice(0,10);
  const cards = evals.length
    ? `<div class="sp-eval-list">${evals.map(ev=>`
        <div class="sp-eval-card">
          <div class="sp-eval-card-hd">
            <div>
              <div class="sp-eval-event">${escHtml(ev.eventName||'Private Evaluation')}</div>
              <div class="sp-eval-meta">${[ev.eventDate, ev.evaluatedPosition, ev.flagFit].filter(Boolean).map(escHtml).join(' · ')}</div>
            </div>
            <button class="sp-eval-remove" title="Delete evaluation" onclick="deleteEvaluation(${aid},'${escHtml(ev.id)}')">×</button>
          </div>
          <div class="sp-eval-grades">
            <span>Athletic ${escHtml(ev.grades?.athletic||'—')}</span>
            <span>Skill ${escHtml(ev.grades?.skill||'—')}</span>
            <span>Coachability ${escHtml(ev.grades?.coachability||'—')}</span>
          </div>
          ${ev.notes?`<div class="sp-eval-notes">${escHtml(ev.notes)}</div>`:''}
        </div>`).join('')}</div>`
    : '<div class="sp-eval-empty">No private evaluations saved yet.</div>';

  return `<div class="sp-section sp-eval-section">
    <div class="sp-section-title">Private Evaluations</div>
    ${cards}
    <div class="sp-eval-form">
      <div class="sp-eval-form-grid">
        <label class="sp-eval-field"><span>Event / Camp</span>${_evaluationEventField(a, currentYear)}</label>
        <label class="sp-eval-field"><span>Date</span><input id="sp-eval-date" type="date" value="${today}"></label>
        <label class="sp-eval-field"><span>Position</span><select id="sp-eval-pos">${(a.pos||['Utility']).map(p=>`<option value="${escHtml(p)}">${escHtml(p)}</option>`).join('')}</select></label>
        <label class="sp-eval-field"><span>Flag Fit</span><select id="sp-eval-fit"><option>High</option><option>Medium</option><option>Developmental</option></select></label>
        <label class="sp-eval-field"><span>Athletic</span><select id="sp-eval-athletic">${_evaluationGradeOptions(4)}</select></label>
        <label class="sp-eval-field"><span>Skill</span><select id="sp-eval-skill">${_evaluationGradeOptions(4)}</select></label>
        <label class="sp-eval-field"><span>Coachability</span><select id="sp-eval-coachability">${_evaluationGradeOptions(4)}</select></label>
      </div>
      <textarea class="sp-eval-notes-input" id="sp-eval-notes-input" placeholder="Private scouting notes for your program only..."></textarea>
      <button class="sp-eval-save" onclick="saveEvaluation(${aid})">Save Private Evaluation</button>
    </div>
  </div>`;
}

function openAthlete(id){
  _spId = id;
  const a = typeof findCoachAthlete === 'function'
    ? findCoachAthlete(id)
    : ATHLETES.find(x=>String(x.id)===String(id));
  if(!a) return;
  // Log view event — fire-and-forget, live athletes only
  const _lvUid = typeof _athleteUserId==='function'?_athleteUserId(id):null;
  if(_lvUid&&window.sb&&_coachUser())
    _coachFire(()=>window.sb.rpc('log_athlete_view',{p_athlete_user_id:_lvUid}));
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
        <div class="sp-meas"><div class="sp-meas-val">${a.height||'—'}</div><div class="sp-meas-lbl">Height</div></div>
        <div class="sp-meas"><div class="sp-meas-val">${escHtml(verifiedValue(a,'twenty')||'—')}</div><div class="sp-meas-lbl">20-Yard</div></div>
        <div class="sp-meas"><div class="sp-meas-val">${escHtml(verifiedValue(a,'shuttle')||'—')}</div><div class="sp-meas-lbl">5-10-5</div></div>
        <div class="sp-meas"><div class="sp-meas-val">${escHtml(verifiedValue(a,'broad')||'—')}</div><div class="sp-meas-lbl">Broad Jump</div></div>
        <div class="sp-meas"><div class="sp-meas-val">${a.forty||'—'}</div><div class="sp-meas-lbl">40-Yard</div></div>
        <div class="sp-meas"><div class="sp-meas-val">${a.vertical||'—'}</div><div class="sp-meas-lbl">Vertical</div></div>
      </div>
      ${verifiedBadge(a)}
    </div>
    <div class="sp-section">
      <div class="sp-section-title">About</div>
      <div class="sp-bio">${getAthleteBio(a)}</div>
    </div>
    ${_renderEventAttendance(a)}
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
    ${_renderEvaluations(id, a)}
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
  const uid=typeof _athleteUserId==='function'?_athleteUserId(id):null;
  if(uid&&window.sb&&_coachUser()){
    _coachFire(()=>window.sb.from('recruiter_pipeline').delete()
      .eq('recruiter_id',_coachUser().id).eq('athlete_user_id',uid));
  }
  filterAthletes();
  updateHeaderStats();
  openAthlete(id);
}

let _noteDebounce=null;
function saveNote(id, val){
  coachNotes[id] = val;
  lss('notes', coachNotes);
  if(val.trim()){
    coachLastActivity[id] = {ts:Date.now(), type:'note', text:val.slice(0,80)};
    lss('last_activity', coachLastActivity);
  }
  clearTimeout(_noteDebounce);
  _noteDebounce=setTimeout(()=>{
    const uid=typeof _athleteUserId==='function'?_athleteUserId(id):null;
    if(!uid||!window.sb||!_coachUser()) return;
    window.sb.from('recruiter_notes').upsert({
      recruiter_id:_coachUser().id, athlete_user_id:uid,
      content:val, updated_at:new Date().toISOString()
    },{onConflict:'recruiter_id,athlete_user_id'}).then(({error})=>{
      if(error) console.warn('JUKE recruiter note write failed:',error);
    });
  },1000);
}

let _naDebounce=null;
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
  // Debounced backend write — only updates if athlete is already on the board
  clearTimeout(_naDebounce);
  _naDebounce=setTimeout(()=>{
    const uid=typeof _athleteUserId==='function'?_athleteUserId(id):null;
    if(!uid||!window.sb||!_coachUser()) return;
    window.sb.from('recruiter_pipeline').update({
      next_action:v||null, updated_at:new Date().toISOString()
    }).eq('recruiter_id',_coachUser().id).eq('athlete_user_id',uid)
      .then(({error})=>{ if(error) console.warn('JUKE recruiter next_action write failed:',error); });
  },1000);
  if(document.getElementById('content-pipeline')?.classList.contains('active')) renderPipeline();
}

function saveEvaluation(id){
  const fv = fieldId => (document.getElementById(fieldId)||{}).value || '';
  const key = String(id);
  const evaluation = {
    id: 'eval_'+Date.now(),
    visibility: 'program_private',
    evaluatorName: coachProfile?.name || 'Coach',
    programName: coachProfile?.school || '',
    eventName: fv('sp-eval-event').trim(),
    eventDate: fv('sp-eval-date'),
    evaluatedPosition: fv('sp-eval-pos'),
    flagFit: fv('sp-eval-fit'),
    grades: {
      athletic: fv('sp-eval-athletic'),
      skill: fv('sp-eval-skill'),
      coachability: fv('sp-eval-coachability')
    },
    notes: fv('sp-eval-notes-input').trim(),
    createdAt: new Date().toISOString()
  };
  if(!coachEvaluations[key]) coachEvaluations[key] = [];
  coachEvaluations[key].unshift(evaluation);
  lss('evaluations', coachEvaluations);
  coachLastActivity[id] = {ts:Date.now(), type:'evaluation', text:evaluation.eventName||'Private evaluation'};
  lss('last_activity', coachLastActivity);
  if(window.JukeOnboarding) JukeOnboarding.event('college_coach','evaluation_saved',{athleteId:id});
  const uid=typeof _athleteUserId==='function'?_athleteUserId(id):null;
  if(uid&&window.sb&&_coachUser()){
    _coachFire(()=>window.sb.from('recruiter_evaluations').insert({
      id:evaluation.id, recruiter_id:_coachUser().id, athlete_user_id:uid,
      event_name:evaluation.eventName, event_date:evaluation.eventDate||null,
      evaluated_position:evaluation.evaluatedPosition, flag_fit:evaluation.flagFit,
      grades:evaluation.grades, notes:evaluation.notes||null
    }));
  }
  openAthlete(id);
  if(document.getElementById('content-pipeline')?.classList.contains('active')) renderPipeline();
}

function deleteEvaluation(id, evalId){
  const key = String(id);
  coachEvaluations[key] = _coachEvaluationList(id).filter(ev=>ev.id!==evalId);
  lss('evaluations', coachEvaluations);
  const uid=typeof _athleteUserId==='function'?_athleteUserId(id):null;
  if(uid&&window.sb&&_coachUser()){
    _coachFire(()=>window.sb.from('recruiter_evaluations').delete()
      .eq('id',evalId).eq('recruiter_id',_coachUser().id));
  }
  openAthlete(id);
  if(document.getElementById('content-pipeline')?.classList.contains('active')) renderPipeline();
}

function renderProgramNeeds(){
  const list=document.getElementById('needs-list');
  if(!list) return;
  const needs=activeCoachNeeds();
  if(!needs.length){
    list.innerHTML='<div class="needs-empty">No needs posted yet.</div>';
    return;
  }
  list.innerHTML=needs.map(need=>`
    <div class="need-card" data-need-id="${escHtml(need.id)}">
      <div class="need-card-grid">
        <label class="need-field"><span>Class</span><input value="${escHtml(need.classYear||'')}" placeholder="2027" oninput="updateProgramNeed('${escHtml(need.id)}','classYear',this.value)"></label>
        <label class="need-field"><span>Position</span>
          <select onchange="updateProgramNeed('${escHtml(need.id)}','position',this.value)">
            ${['QB','WR','RB','C','DB','Rusher','S','Utility'].map(p=>`<option value="${p}" ${need.position===p?'selected':''}>${p==='C'?'Center':p}</option>`).join('')}
          </select>
        </label>
        <label class="need-field"><span>Priority</span>
          <select onchange="updateProgramNeed('${escHtml(need.id)}','priority',this.value)">
            ${['High','Medium','Low'].map(v=>`<option ${need.priority===v?'selected':''}>${v}</option>`).join('')}
          </select>
        </label>
        <label class="need-field"><span>Slot Type</span>
          <select onchange="updateProgramNeed('${escHtml(need.id)}','slotType',this.value)">
            ${['Roster spot','Scholarship target','Walk-on target','Developmental'].map(v=>`<option ${need.slotType===v?'selected':''}>${v}</option>`).join('')}
          </select>
        </label>
        <label class="need-field"><span>Min GPA</span><input value="${escHtml(need.minGpa||'')}" placeholder="3.5" oninput="updateProgramNeed('${escHtml(need.id)}','minGpa',this.value)"></label>
        <label class="need-field"><span>Region</span><input value="${escHtml(need.region||'')}" placeholder="Any, TX, South..." oninput="updateProgramNeed('${escHtml(need.id)}','region',this.value)"></label>
      </div>
      <textarea class="need-notes" placeholder="Describe the profile you need..." oninput="updateProgramNeed('${escHtml(need.id)}','notes',this.value)">${escHtml(need.notes||'')}</textarea>
      <div class="need-ft">
        <span class="need-visibility">${escHtml(need.visibility==='public'?'Publish-ready':'Private')}</span>
        <button class="need-remove" onclick="removeProgramNeed('${escHtml(need.id)}')">Delete</button>
      </div>
    </div>`).join('');
}

let _needsDebounce=null;
function _syncNeedsToBackend(){
  const cu=_coachUser();
  if(!window.sb||!cu||!coachNeeds||!coachNeeds.length) return;
  const rows=coachNeeds.map(n=>({
    id:String(n.id), recruiter_id:cu.id,
    class_year:n.classYear||null, position:n.position||null,
    priority:n.priority||'High', slot_type:n.slotType||null,
    min_gpa:n.minGpa||null, region:n.region||null,
    notes:n.notes||null, visibility:n.visibility||'program_private'
  }));
  window.sb.from('recruiter_needs').upsert(rows,{onConflict:'id'})
    .then(({error})=>{ if(error) console.warn('JUKE recruiter needs sync failed:',error); });
}
function persistProgramNeeds(){
  lss('needs', coachNeeds);
  clearTimeout(_needsDebounce);
  _needsDebounce=setTimeout(_syncNeedsToBackend,1000);
  if(typeof filterAthletes==='function') filterAthletes();
  if(document.getElementById('content-pipeline')?.classList.contains('active')) renderPipeline();
  if(typeof renderCoachFeed==='function') renderCoachFeed();
}

function addProgramNeed(){
  const need={
    id:'need_'+Date.now(),
    classYear:String(new Date().getFullYear()+1),
    position:'DB',
    priority:'High',
    slotType:'Roster spot',
    minGpa:'',
    region:'Any',
    notes:'',
    visibility:'program_private',
    createdAt:new Date().toISOString()
  };
  coachNeeds.unshift(need);
  persistProgramNeeds();
  renderProgramNeeds();
}

function updateProgramNeed(id, key, value){
  const need=activeCoachNeeds().find(n=>String(n.id)===String(id));
  if(!need) return;
  need[key]=value;
  persistProgramNeeds();
}

function removeProgramNeed(id){
  coachNeeds=activeCoachNeeds().filter(n=>String(n.id)!==String(id));
  lss('needs',coachNeeds);
  const cu=_coachUser();
  if(window.sb&&cu) _coachFire(()=>window.sb.from('recruiter_needs').delete()
    .eq('id',String(id)).eq('recruiter_id',cu.id));
  if(typeof filterAthletes==='function') filterAthletes();
  if(document.getElementById('content-pipeline')?.classList.contains('active')) renderPipeline();
  if(typeof renderCoachFeed==='function') renderCoachFeed();
  renderProgramNeeds();
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
  if(el('coach-display-name')) el('coach-display-name').textContent = p.name||'Recruiter Name';
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
  renderProgramNeeds();
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
  lss('needs', coachNeeds);
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
  const wrap = document.getElementById('hd-school-logo-wrap');
  if(!wrap) return;
  // Prefer the shared resolver (curated override → favicon by exact name).
  let url = window.schoolLogoUrl ? window.schoolLogoUrl(school) : null;
  if(!url){
    // Fall back to a fuzzy domain match for full school names not in the map.
    const map = window.SCHOOL_DOMAINS||{};
    const sl = school.toLowerCase();
    const hit = Object.keys(map).find(k=>sl.includes(k.toLowerCase())||k.toLowerCase().includes(sl));
    if(hit) url = 'https://www.google.com/s2/favicons?domain='+map[hit]+'&sz=128';
  }
  if(!url) return;
  const img = document.createElement('img');
  img.src = url;
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

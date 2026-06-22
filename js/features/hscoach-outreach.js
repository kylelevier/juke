function renderActivity(){
  if(activityView==='cards') renderActivityCards();
  else renderActivityTable();
}

function renderActivityCards(){
  const grid = el('activity-grid'); if(!grid) return;
  if(typeof _hsRosterSource!=='undefined' && _hsRosterSource==='live'){
    grid.innerHTML = '<div class="empty-state"><div class="empty-state-title">No college activity yet</div><div class="empty-state-sub">Live activity for this roster will appear here as college coaches view your athletes.</div></div>';
    return;
  }
  grid.innerHTML = ACTIVITY.map(act=>{
    const athletes = act.athletes.map(id=>ATHLETES.find(a=>a.id===id)).filter(Boolean);
    const logoSrc = logoUrl(act.domain);
    return `<div class="activity-card">
      <div class="ac-hd">
        <div class="ac-logo">
          <img src="${logoSrc}" alt="${act.school}" onerror="this.parentNode.innerHTML='<span class=ac-logo-init>${act.abbr}</span>'">
        </div>
        <div>
          <div class="ac-school">${act.school}</div>
          <div class="ac-div">${act.div}</div>
        </div>
      </div>
      <div class="ac-athletes">
        <div class="ac-athletes-lbl">Viewed your athletes</div>
        ${athletes.map(a=>`<span class="ac-athlete-chip" onclick="openSP(${hsJsArg(a.id)})">
          ${initials(a)} ${hsEsc(a.fname)} ${hsEsc(a.lname)}
        </span>`).join('')}
      </div>
      <div class="ac-date">Last active ${act.date}</div>
      <div class="ac-ft">
        <button class="ac-btn" onclick="openCollegeCoachMessage('${act.school}')">Message College Coaches →</button>
      </div>
    </div>`;
  }).join('');
}

function renderActivityTable(){
  const tbody = el('activity-tbody'); if(!tbody) return;
  if(typeof _hsRosterSource!=='undefined' && _hsRosterSource==='live'){
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-dim)">No live college activity yet.</td></tr>';
    return;
  }
  tbody.innerHTML = ACTIVITY.map(act=>{
    const athletes = act.athletes.map(id=>ATHLETES.find(a=>a.id===id)).filter(Boolean);
    const logoSrc = logoUrl(act.domain);
    return `<tr>
      <td>
        <span class="at-logo"><img src="${logoSrc}" alt="${act.school}" onerror="this.textContent='${act.abbr[0]}'"></span>
        <span class="at-program">${act.school}</span>
      </td>
      <td style="font-size:11px;color:var(--text-muted)">${act.div}</td>
      <td>${athletes.map(a=>`<span class="ac-athlete-chip" style="display:inline-flex;margin:2px 4px 2px 0" onclick="openSP(${hsJsArg(a.id)})">${hsEsc(a.fname)} ${hsEsc(a.lname)}</span>`).join('')}</td>
      <td style="font-size:11px;color:var(--text-dim)">${act.date}</td>
      <td><button class="rt-btn blue" onclick="openCollegeCoachMessage('${act.school}')">Message</button></td>
    </tr>`;
  }).join('');
}

// ──────────────────────────────────────────────
// OUTREACH
// ──────────────────────────────────────────────
function renderOutreachAthletes(){
  const row = el('outreach-athlete-row'); if(!row) return;
  row.innerHTML = ATHLETES.map(a=>`<span class="athlete-tag" data-id="${hsEsc(a.id)}" onclick="toggleOutreachAthlete(this)">${hsEsc(a.fname)} ${hsEsc(a.lname)}</span>`).join('');
}

function toggleOutreachAthlete(tag){
  tag.classList.toggle('selected');
  updateOutreachBody();
}

function updateOutreachBody(){
  const selected = [...document.querySelectorAll('#outreach-athlete-row .athlete-tag.selected')];
  if(!selected.length) return;
  const school = el('hs-school')?.value||'DeSoto HS';
  const coachName = [el('hs-fname')?.value, el('hs-lname')?.value].filter(Boolean).join(' ')||'Coach';
  const names = selected.map(t=>{
    const id = t.dataset.id;
    const a = hsFindAthlete(id);
    return a ? a.fname+' '+a.lname : '';
  }).filter(Boolean);
  if(!el('outreach-subject').value){
    el('outreach-subject').value = `Player Spotlight from ${school}: ${names.slice(0,2).join(', ')}${names.length>2?' +more':''}`;
  }
  if(!el('outreach-body').value){
    el('outreach-body').value = `Coach,\n\nI wanted to bring ${names.length>1?'a few of my athletes':'one of my athletes'} to your attention — ${names.join(', ')} from ${school}.\n\n${names.length>1?'They have':'She has'} the athleticism and character to compete at the next level, and I believe ${names.length>1?'they would':'she would'} thrive in your program.\n\nI've attached their JUKE profile links. Happy to send game film, transcripts, or schedule a call at your convenience.\n\nBest,\n${coachName}\n${school}`;
  }
}

function openOutreachFor(athleteId){
  switchHsTab('outreach');
  setTimeout(()=>{
    // Select just this athlete
    document.querySelectorAll('#outreach-athlete-row .athlete-tag').forEach(t=>{
      if(hsSameId(t.dataset.id,athleteId)){ t.classList.add('selected'); }
      else { t.classList.remove('selected'); }
    });
    el('outreach-subject').value='';
    el('outreach-body').value='';
    updateOutreachBody();
    el('outreach-to').focus();
  },50);
}

function openOutreachTo(school){
  switchHsTab('outreach');
  setTimeout(()=>{
    el('outreach-to').value = school;
    el('outreach-to').focus();
  },50);
}

function openCollegeCoachMessage(school){
  if(typeof openNewMsg==='function'){
    openNewMsg({role:'college_coach', query:school||''});
    return;
  }
  openOutreachTo(school);
}

function sendOutreach(){
  const to   = el('outreach-to').value;
  const subj = el('outreach-subject').value;
  const body = el('outreach-body').value;
  if(!to||!subj||!body){ alert('Please fill in the recipient, subject, and message.'); return; }
  if(window.JukeOnboarding){
    const selected = [...document.querySelectorAll('#outreach-athlete-row .athlete-tag.selected')].map(t=>t.dataset.id);
    JukeOnboarding.mark('hs_coach','firstOutreach',{to,athleteIds:selected});
    JukeOnboarding.event('hs_coach','outreach_sent',{to,athleteCount:selected.length});
  }
  const msg = el('outreach-msg');
  msg.classList.add('show');
  setTimeout(()=>msg.classList.remove('show'), 2500);
  el('outreach-to').value='';
  el('outreach-subject').value='';
  el('outreach-body').value='';
  document.querySelectorAll('#outreach-athlete-row .athlete-tag').forEach(t=>t.classList.remove('selected'));
}

const TEMPLATES = {
  intro: {
    subject: 'Player Introduction — {name} | {school}',
    body: 'Coach,\n\nI wanted to introduce you to {name}, a Class of {year} {pos} from {school}.\n\nShe is {gpa} GPA, clocking {forty} in the 40-yard dash, and has shown elite instincts on film. She\'s exactly the type of athlete your program should have on your radar.\n\nI\'d love to connect and share more. Happy to send film at your request.\n\nCoach {coachName}\n{school}'
  },
  spotlight: {
    subject: 'Season Spotlight — {name} | {school}',
    body: 'Coach,\n\nEnd of season update on {name} ({pos}, Class of {year}) from {school}.\n\nThis season she was one of the top performers in our league. You can find her full stats and updated highlight film on her JUKE profile.\n\nLooking forward to hearing from you.\n\nCoach {coachName}'
  },
  followup: {
    subject: 'Following Up — {name} | {school}',
    body: 'Coach,\n\nI wanted to follow up on our earlier message regarding {name}.\n\nShe remains highly interested in your program and has been closely following your team this season. A campus visit or call would go a long way.\n\nThanks for your time.\n\nCoach {coachName}'
  },
  roster: {
    subject: 'Eligible Class Spotlight | {school}',
    body: 'Coach,\n\nI\'m reaching out to share our current eligible class from {school}.\n\nWe have multiple athletes ready to compete at the collegiate level across several positions. I\'d be happy to send individual profiles and film for any athletes that catch your eye.\n\nCoach {coachName}'
  }
};

function applyTemplate(key){
  const tpl = TEMPLATES[key]; if(!tpl) return;
  const selected = [...document.querySelectorAll('#outreach-athlete-row .athlete-tag.selected')];
  let a = null;
  if(selected.length){ const id=selected[0].dataset.id; a=hsFindAthlete(id); }
  const school    = el('hs-school')?.value||'DeSoto HS';
  const coachName = [el('hs-fname')?.value, el('hs-lname')?.value].filter(Boolean).join(' ')||'Coach';
  const fill = s => s
    .replace(/{name}/g,  a?a.fname+' '+a.lname:'[Athlete Name]')
    .replace(/{year}/g,  a?a.year:'[Year]')
    .replace(/{pos}/g,   a?a.pos.join('/'):  '[Position]')
    .replace(/{gpa}/g,   a?a.gpa+'':         '[GPA]')
    .replace(/{forty}/g, a?a.forty:           '[40 Time]')
    .replace(/{school}/g,    school)
    .replace(/{coachName}/g, coachName);
  el('outreach-subject').value = fill(tpl.subject);
  el('outreach-body').value    = fill(tpl.body);
}

// ──────────────────────────────────────────────
// ATHLETE SLIDE-OVER
// ──────────────────────────────────────────────
let currentSPId = null;

function openSP(id){
  const a = hsFindAthlete(id); if(!a) return;
  currentSPId = id;
  const st = athleteStatus(a);
  const endorsed = endorsements[id];
  const savedNote = ls('note_'+id)||'';
  el('sp-title').textContent = a.fname+' '+a.lname;
  const idArg = hsJsArg(a.id);
  const messageId = a._userId || ('athlete_'+a.id);
  const bannerStyle = a.banner ? ` style="background-image:url('${String(a.banner).replace(/'/g,'%27')}');background-size:cover;background-position:center;"` : '';
  el('sp-body').innerHTML = `
    <div class="sp-banner"${bannerStyle}></div>
    <div class="sp-av">${a.avatar?`<img src="${hsEsc(a.avatar)}" alt="${hsEsc(a.fname+' '+a.lname)}">`:initials(a)}</div>
    <div class="sp-name-block">
      <div class="sp-name">${hsEsc(a.fname)} ${hsEsc(a.lname)}</div>
      <div class="sp-school">${hsEsc(a.school)} · ${hsEsc(a.state)} · Class of ${a.year}</div>
    </div>
    <div class="sp-pills">
      ${a.pos.map(p=>`<span class="rc-pos">${hsEsc(p)}</span>`).join('')}
      <span class="rc-year">${a.year}</span>
      ${st!=='none'?`<span style="font-family:'Archivo Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:2px 8px;border-radius:20px;border:1.5px solid ${STAGE_COLORS[st]};color:${STAGE_COLORS[st]};background:${STAGE_COLORS[st]}18;">${STAGE_LABELS[st]}</span>`:''}
    </div>
    <div class="sp-divider"></div>
    <div class="sp-section">
      <div class="sp-sec-title">Measurables</div>
      <div class="sp-meas-grid">
        <div class="sp-meas"><div class="sp-meas-val">${a.height||'—'}</div><div class="sp-meas-lbl">Height</div></div>
        <div class="sp-meas"><div class="sp-meas-val">${a.forty||'—'}</div><div class="sp-meas-lbl">40-Yard</div></div>
        <div class="sp-meas"><div class="sp-meas-val">${a.vertical||'—'}</div><div class="sp-meas-lbl">Vertical</div></div>
        <div class="sp-meas"><div class="sp-meas-val">${a.gpa||'—'}</div><div class="sp-meas-lbl">GPA</div></div>
      </div>
    </div>
    ${a.bio?`<div class="sp-section"><div class="sp-sec-title">Bio</div><div class="sp-bio">${hsEsc(a.bio)}</div></div>`:''}
    ${(a.highlight||a.gamefilm)?`<div class="sp-section"><div class="sp-sec-title">Film</div><div class="sp-interest-list">
      ${a.highlight?`<a class="sp-int-row" href="${hsEsc(a.highlight)}" target="_blank" rel="noopener"><span class="sp-int-school">Highlight Film</span></a>`:''}
      ${a.gamefilm?`<a class="sp-int-row" href="${hsEsc(a.gamefilm)}" target="_blank" rel="noopener"><span class="sp-int-school">Game Film</span></a>`:''}
    </div></div>`:''}
    <div class="sp-divider"></div>
    <div class="sp-section">
      <div class="sp-sec-title">College Interest (${a.programs.length})</div>
      ${a.programs.length?
        `<div class="sp-interest-list">${a.programs.map(p=>{
          const col=STAGE_COLORS[p.stage]||'#888';
          const lbl=STAGE_LABELS[p.stage]||'';
          return `<div class="sp-int-row">
            <div class="sp-int-logo">
              <img src="https://logo.clearbit.com/${p.name.toLowerCase().replace(/\s+/g,'')}.edu" alt="${p.name}" onerror="this.parentNode.textContent='${p.name[0]}'">
            </div>
            <span class="sp-int-school">${hsEsc(p.name)}</span>
            <span class="sp-int-stage" style="background:${col}18;border:1.5px solid ${col};color:${col};font-family:'Archivo Condensed';font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:2px 7px;border-radius:20px;">${lbl}</span>
          </div>`;
        }).join('')}</div>`
        :'<div style="font-size:12px;color:var(--text-dim)">No college interest logged yet. Use Outreach Tools to start the conversation.</div>'}
    </div>
    ${endorsed?`<div class="sp-divider"></div><div class="sp-section"><div class="sp-sec-title">Your Recommendation</div><div class="sp-bio" style="color:#00a03a">${typeof endorsed==='object'&&endorsed.text?hsEsc(endorsed.text):'Recommended by coach.'}</div></div>`:''}
    <div class="sp-divider"></div>
    <div class="sp-section">
      <div class="sp-sec-title">Coach Notes</div>
      <textarea class="sp-note-area" id="sp-note-area" onblur="saveSPNote(${idArg})" placeholder="Private notes about this athlete…">${hsEsc(savedNote)}</textarea>
    </div>
    <div class="sp-actions">
      <button class="sp-action-btn primary" onclick="openEndorse(${idArg})">Recommend / Update</button>
      <button class="sp-action-btn blue" onclick="openOutreachFor(${idArg})">Outreach →</button>
      <button class="sp-action-btn" onclick="openMsgFromOutside(${hsJsArg(messageId)})">Message</button>
    </div>
  `;
  const overlay = el('sp-overlay');
  overlay.classList.add('open');
  if(window.JukeDialog) window.JukeDialog.open(overlay, {close: closeSPDirect});
}

function saveSPNote(id){
  const area = el('sp-note-area'); if(!area) return;
  lss('note_'+id, area.value);
}

function closeSP(e){
  if(e.target===el('sp-overlay')) closeSPDirect();
}
function closeSPDirect(){
  const overlay = el('sp-overlay');
  overlay.classList.remove('open');
  if(window.JukeDialog) window.JukeDialog.close(overlay);
  currentSPId = null;
}

// ──────────────────────────────────────────────
// ENDORSEMENTS
// ──────────────────────────────────────────────
let endorseTarget = null;

function openEndorse(id){
  endorseTarget = id;
  const a = hsFindAthlete(id); if(!a) return;
  el('endorse-title').textContent = 'Recommend '+a.fname+' '+a.lname;
  el('endorse-sub').textContent   = 'Your recommendation carries weight. College coaches trust HS/club coach vouches — be specific and honest.';
  el('endorse-text').value        = typeof endorsements[id]==='object' ? (endorsements[id].text||'') : '';
  // Reset traits
  document.querySelectorAll('.endorse-trait').forEach(t=>{
    const savedTraits = typeof endorsements[id]==='object' ? (endorsements[id].traits||[]) : [];
    t.classList.toggle('selected', savedTraits.includes(t.textContent));
  });
  const overlay = el('endorse-overlay');
  overlay.classList.add('open');
  if(window.JukeDialog) window.JukeDialog.open(overlay, {close: closeEndorseModal, focus: el('endorse-text')});
}

function closeEndorseModal(e){
  const overlay = el('endorse-overlay');
  if(!e || e.target===overlay) {
    overlay.classList.remove('open');
    if(window.JukeDialog) window.JukeDialog.close(overlay);
    endorseTarget = null;
  }
}

function toggleTrait(el){ el.classList.toggle('selected'); }

function submitEndorse(){
  if(!endorseTarget) return;
  const refreshedId = endorseTarget;
  const traits = [...document.querySelectorAll('.endorse-trait.selected')].map(t=>t.textContent);
  const text   = el('endorse-text').value.trim();
  endorsements[endorseTarget] = {traits, text, date: new Date().toLocaleDateString()};
  lss('endorsements', endorsements);
  if(window.JukeOnboarding){
    JukeOnboarding.mark('hs_coach','firstRecommendation',{athleteId:endorseTarget,traits:traits.length});
  }
  updateHSCard();
  renderRoster();
  closeEndorseModal();
  if(hsSameId(currentSPId,refreshedId)) openSP(refreshedId);
}

function renderActivity(){
  if(activityView==='cards') renderActivityCards();
  else renderActivityTable();
}

function renderActivityCards(){
  const grid = el('activity-grid'); if(!grid) return;
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
        ${athletes.map(a=>`<span class="ac-athlete-chip" onclick="openSP(${a.id})">
          ${initials(a)} ${a.fname} ${a.lname}
        </span>`).join('')}
      </div>
      <div class="ac-date">Last active ${act.date}</div>
      <div class="ac-ft">
        <button class="ac-btn" onclick="openOutreachTo('${act.school}')">Contact This Program →</button>
      </div>
    </div>`;
  }).join('');
}

function renderActivityTable(){
  const tbody = el('activity-tbody'); if(!tbody) return;
  tbody.innerHTML = ACTIVITY.map(act=>{
    const athletes = act.athletes.map(id=>ATHLETES.find(a=>a.id===id)).filter(Boolean);
    const logoSrc = logoUrl(act.domain);
    return `<tr>
      <td>
        <span class="at-logo"><img src="${logoSrc}" alt="${act.school}" onerror="this.textContent='${act.abbr[0]}'"></span>
        <span class="at-program">${act.school}</span>
      </td>
      <td style="font-size:11px;color:var(--text-muted)">${act.div}</td>
      <td>${athletes.map(a=>`<span class="ac-athlete-chip" style="display:inline-flex;margin:2px 4px 2px 0" onclick="openSP(${a.id})">${a.fname} ${a.lname}</span>`).join('')}</td>
      <td style="font-size:11px;color:var(--text-dim)">${act.date}</td>
      <td><button class="rt-btn blue" onclick="openOutreachTo('${act.school}')">Contact</button></td>
    </tr>`;
  }).join('');
}

// ──────────────────────────────────────────────
// OUTREACH
// ──────────────────────────────────────────────
function renderOutreachAthletes(){
  const row = el('outreach-athlete-row'); if(!row) return;
  row.innerHTML = ATHLETES.map(a=>`<span class="athlete-tag" data-id="${a.id}" onclick="toggleOutreachAthlete(this)">${a.fname} ${a.lname}</span>`).join('');
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
    const id = parseInt(t.dataset.id);
    const a = ATHLETES.find(x=>x.id===id);
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
      if(parseInt(t.dataset.id)===athleteId){ t.classList.add('selected'); }
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

function sendOutreach(){
  const to   = el('outreach-to').value;
  const subj = el('outreach-subject').value;
  const body = el('outreach-body').value;
  if(!to||!subj||!body){ alert('Please fill in the recipient, subject, and message.'); return; }
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
  if(selected.length){ const id=parseInt(selected[0].dataset.id); a=ATHLETES.find(x=>x.id===id); }
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
  const a = ATHLETES.find(x=>x.id===id); if(!a) return;
  currentSPId = id;
  const st = athleteStatus(a);
  const endorsed = endorsements[id];
  const savedNote = ls('note_'+id)||'';
  el('sp-title').textContent = a.fname+' '+a.lname;
  el('sp-body').innerHTML = `
    <div class="sp-banner"></div>
    <div class="sp-av">${initials(a)}</div>
    <div class="sp-name-block">
      <div class="sp-name">${a.fname} ${a.lname}</div>
      <div class="sp-school">${a.school} · ${a.state} · Class of ${a.year}</div>
    </div>
    <div class="sp-pills">
      ${a.pos.map(p=>`<span class="rc-pos">${p}</span>`).join('')}
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
    ${a.bio?`<div class="sp-section"><div class="sp-sec-title">Bio</div><div class="sp-bio">${a.bio}</div></div>`:''}
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
            <span class="sp-int-school">${p.name}</span>
            <span class="sp-int-stage" style="background:${col}18;border:1.5px solid ${col};color:${col};font-family:'Archivo Condensed';font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:2px 7px;border-radius:20px;">${lbl}</span>
          </div>`;
        }).join('')}</div>`
        :'<div style="font-size:12px;color:var(--text-dim)">No college interest logged yet. Use Outreach Tools to start the conversation.</div>'}
    </div>
    ${endorsed?`<div class="sp-divider"></div><div class="sp-section"><div class="sp-sec-title">Your Endorsement</div><div class="sp-bio" style="color:#00a03a">${typeof endorsed==='object'&&endorsed.text?endorsed.text:'Endorsed by coach.'}</div></div>`:''}
    <div class="sp-divider"></div>
    <div class="sp-section">
      <div class="sp-sec-title">Coach Notes</div>
      <textarea class="sp-note-area" id="sp-note-area" onblur="saveSPNote(${id})" placeholder="Private notes about this athlete…">${savedNote}</textarea>
    </div>
    <div class="sp-actions">
      <button class="sp-action-btn primary" onclick="openEndorse(${a.id})">Endorse / Update</button>
      <button class="sp-action-btn blue" onclick="openOutreachFor(${a.id})">Outreach →</button>
      <button class="sp-action-btn" onclick="openMsgFromOutside('athlete_'+${a.id})">Message</button>
    </div>
  `;
  el('sp-overlay').classList.add('open');
}

function saveSPNote(id){
  const area = el('sp-note-area'); if(!area) return;
  lss('note_'+id, area.value);
}

function closeSP(e){
  if(e.target===el('sp-overlay')) closeSPDirect();
}
function closeSPDirect(){
  el('sp-overlay').classList.remove('open');
  currentSPId = null;
}

// ──────────────────────────────────────────────
// ENDORSEMENTS
// ──────────────────────────────────────────────
let endorseTarget = null;

function openEndorse(id){
  endorseTarget = id;
  const a = ATHLETES.find(x=>x.id===id); if(!a) return;
  el('endorse-title').textContent = 'Endorse '+a.fname+' '+a.lname;
  el('endorse-sub').textContent   = 'Your endorsement carries weight. College coaches trust HS/club coach vouches — be specific and honest.';
  el('endorse-text').value        = typeof endorsements[id]==='object' ? (endorsements[id].text||'') : '';
  // Reset traits
  document.querySelectorAll('.endorse-trait').forEach(t=>{
    const savedTraits = typeof endorsements[id]==='object' ? (endorsements[id].traits||[]) : [];
    t.classList.toggle('selected', savedTraits.includes(t.textContent));
  });
  el('endorse-overlay').classList.add('open');
}

function closeEndorseModal(e){
  if(!e || e.target===el('endorse-overlay')) {
    el('endorse-overlay').classList.remove('open');
    endorseTarget = null;
  }
}

function toggleTrait(el){ el.classList.toggle('selected'); }

function submitEndorse(){
  if(!endorseTarget) return;
  const traits = [...document.querySelectorAll('.endorse-trait.selected')].map(t=>t.textContent);
  const text   = el('endorse-text').value.trim();
  endorsements[endorseTarget] = {traits, text, date: new Date().toLocaleDateString()};
  lss('endorsements', endorsements);
  updateHSCard();
  renderRoster();
  el('endorse-overlay').classList.remove('open');
  endorseTarget = null;
}

function addAthletePrompt(){
  alert('Add Athlete flow coming soon — this will open a form to manually add a player to your roster or invite them to create a JUKE profile.');
}

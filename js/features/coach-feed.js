// ── JUKE USER CHIP ──
(function(){
  var auth=null;
  try{auth=JSON.parse(localStorage.getItem('juke_auth'));}catch(e){}
  if(!auth) return;
  var chip=document.getElementById('juke-user-chip');
  if(!chip) return;
  var parts=auth.name.trim().split(' ');
  var inits=(parts[0][0]+(parts.length>1?parts[parts.length-1][0]:'')).toUpperCase();
  var RL={athlete:'Athlete',college_coach:'College Coach',hs_coach:'HS / Club Coach'};
  var activeProfile=null;
  if(auth.profiles&&auth.profiles.length){
    var apid=auth.activeProfileId||auth.profiles[0].id;
    activeProfile=auth.profiles.find(function(p){return p.id===apid;})||auth.profiles[0];
  }
  var roleOrg=activeProfile&&activeProfile.org?'College Coach · '+activeProfile.org:'College Coach';
  var profilesHTML='';
  if(auth.profiles&&auth.profiles.length){
    profilesHTML+='<div class="juke-chip-dd-divider"></div><div class="juke-chip-dd-section">';
    auth.profiles.forEach(function(p){
      var isA=p.id===(auth.activeProfileId||'');
      profilesHTML+='<button class="juke-chip-dd-profile'+(isA?' is-active':'')+'"'
        +(isA?'':' onclick="switchProfile(\''+p.id+'\')"')+'>'
        +'<span class="jcp-dot'+(isA?' on':'')+'"></span>'
        +'<span class="jcp-info"><span class="jcp-org">'+(p.org||RL[p.type]||p.type)+'</span><span class="jcp-role">'+(RL[p.type]||p.type)+'</span></span>'
        +(isA?'<span class="jcp-check">✓</span>':'')
        +'</button>';
    });
    profilesHTML+='</div>';
  }
  chip.innerHTML=
    '<div class="juke-user-av">'+inits+'</div>'
    +'<span class="juke-user-name">'+parts[0]+'</span>'
    +'<div class="juke-chip-dd" id="juke-chip-dd">'
      +'<div class="juke-chip-dd-header">'
        +'<div class="juke-chip-dd-name">'+auth.name+'</div>'
        +'<div class="juke-chip-dd-role">'+roleOrg+'</div>'
      +'</div>'
      +profilesHTML
      +'<div class="juke-chip-dd-section">'
        +'<button class="juke-chip-dd-item" onclick="location.href=\'../preview.html\'">+ Add Account</button>'
      +'</div>'
      +'<div class="juke-chip-dd-divider"></div>'
      +'<button class="juke-chip-dd-item juke-chip-dd-logout" onclick="jukeLogout()">Log Out</button>'
    +'</div>';
  chip.style.display='flex';
  chip.addEventListener('click',function(e){
    if(e.target.closest('.juke-chip-dd')) return;
    document.getElementById('juke-chip-dd').classList.toggle('open');
  });
  document.addEventListener('click',function(e){
    if(!e.target.closest('#juke-user-chip')){
      var dd=document.getElementById('juke-chip-dd');
      if(dd) dd.classList.remove('open');
    }
  });
})();

function switchProfile(profileId){
  try{
    var auth=JSON.parse(localStorage.getItem('juke_auth'));
    if(!auth) return;
    auth.activeProfileId=profileId;
    localStorage.setItem('juke_auth',JSON.stringify(auth));
    var p=auth.profiles.find(function(x){return x.id===profileId;});
    if(!p) return;
    var portals={athlete:'athlete.html',college_coach:'coach.html',hs_coach:'hscoach.html'};
    location.href=portals[p.type]||'../preview.html';
  }catch(e){}
}

// ── SHARED HELPERS ────────────────────────────────────────────────────────────
function getAllEndorsements(){try{return JSON.parse(localStorage.getItem('juke_endorsements'))||[];}catch(e){return[];}}

// ── TODAY DASHBOARD ───────────────────────────────────────────────────────────
function renderCoachFeed(){
  const list = document.getElementById('coach-feed-list');
  if(!list) return;

  const allIds = COACH_PIPELINE_STAGES.flatMap(s=>coachPipeline[s.key]||[]);

  // ── Next Actions ──
  const withActions = allIds
    .filter(id=>coachNextActions[id])
    .map(id=>({id, a:ATHLETES.find(x=>x.id===id), na:coachNextActions[id]}))
    .filter(x=>x.a);

  // ── Follow-Up Needed: in Contacting or Recruiting, no activity in 3 days ──
  const followUpIds = [...(coachPipeline.contacting||[]), ...(coachPipeline.recruiting||[])]
    .filter(id=>{
      const la = coachLastActivity[id];
      return !la || (Date.now()-la.ts) > 3*24*60*60*1000;
    });
  const followUp = followUpIds.map(id=>({id, a:ATHLETES.find(x=>x.id===id)})).filter(x=>x.a);

  // ── Recommendations ──
  const recs = getAllEndorsements().filter(e=>e.status==='endorsed');

  // ── New prospects (not yet on board) ──
  const newProspects = ATHLETES.filter(a=>!allIds.includes(a.id)).slice(0,3);

  let html = '';

  // Section: Next Actions
  if(withActions.length){
    html += _tdSection(
      `Next Actions <span class="td-count">${withActions.length}</span>`,
      null,
      withActions.map(({id, a, na})=>{
        const stage = getPipelineStage(id);
        return `<div class="feed-item td-item" onclick="openAthlete(${id})">
          <div class="fi-icon-wrap td-av-wrap">${_av(a.name)}</div>
          <div class="fi-body">
            <div class="fi-primary">${a.name}</div>
            <div class="fi-secondary td-action-text">→ ${na}</div>
          </div>
          ${stage?`<span class="td-stage-chip" style="color:${stage.color};border-color:${stage.color}33;background:${stage.color}0f">${stage.label}</span>`:''}
        </div>`;
      }).join('')
    );
  }

  // Section: Follow-Up Needed
  if(followUp.length){
    html += _tdSection(
      `Follow-Up Needed <span class="td-count td-count-warn">${followUp.length}</span>`,
      'No activity in 3+ days',
      followUp.map(({id, a})=>{
        const la = coachLastActivity[id];
        const laText = la ? _relTime(la.ts) : 'No contact yet';
        return `<div class="feed-item td-item" onclick="openAthlete(${id})">
          <div class="fi-icon-wrap td-av-wrap">${_av(a.name)}</div>
          <div class="fi-body">
            <div class="fi-primary">${a.name} <span class="td-pos">${a.pos[0]} · '${String(a.year).slice(2)}</span></div>
            <div class="fi-secondary">Last contact: ${laText}</div>
          </div>
          <button class="td-quick-btn" onclick="event.stopPropagation();openAthlete(${id})">Follow Up</button>
        </div>`;
      }).join('')
    );
  }

  // Section: Recommendations
  if(recs.length){
    html += _tdSection(
      'New Recommendations',
      null,
      recs.map(e=>{
        const a = ATHLETES.find(x=>x.name.toLowerCase()===e.athleteName.toLowerCase());
        return `<div class="feed-item td-item" ${a?`onclick="openAthlete(${a.id})"`:''}>
          <div class="fi-icon-wrap fi-icon-milestone">⭐</div>
          <div class="fi-body">
            <div class="fi-primary">${e.athleteName}</div>
            <div class="fi-secondary">From ${e.coachName}${e.coachSchool?' · '+e.coachSchool:''}</div>
            <div class="fi-secondary" style="font-style:italic;margin-top:3px">"${e.endorsementText.slice(0,90)}…"</div>
          </div>
        </div>`;
      }).join('')
    );
  }

  // Section: Recent Activity
  const recentRows = _buildActivityRows().slice(0,4);
  if(recentRows.length){
    html += _tdSection(
      'Recent Activity',
      null,
      recentRows.map(r=>`<div class="feed-item td-item">
        <div class="fi-icon-wrap td-av-wrap">${_av(r.name)}</div>
        <div class="fi-body">
          <div class="fi-primary">${r.name}</div>
          <div class="fi-secondary">${r.action}</div>
        </div>
        <div class="td-time">${r.time}</div>
      </div>`).join(''),
      `<button class="td-see-all" onclick="switchTab('analytics')">View Activity</button>`
    );
  }

  // Section: New Prospects
  if(newProspects.length){
    html += _tdSection(
      'New Prospects',
      null,
      newProspects.map(a=>`<div class="feed-item td-item" onclick="openAthlete(${typeof jsArg==='function'?jsArg(a.id):JSON.stringify(a.id)})">
        <div class="fi-icon-wrap fi-icon-new">🏃‍♀️</div>
        <div class="fi-body">
          <div class="fi-primary">${a.name} <span class="td-pos">${a.pos[0]} · '${String(a.year).slice(2)} · ${a.state}</span></div>
          <div class="fi-secondary">GPA ${a.gpa} · 40yd ${a.forty} · ${a.school}</div>
        </div>
        <button class="td-quick-btn td-add-btn" onclick="event.stopPropagation();_quickAddBoard(${typeof jsArg==='function'?jsArg(a.id):JSON.stringify(a.id)})">+ Board</button>
      </div>`).join(''),
      `<button class="td-see-all" onclick="switchTab('search')">See All Prospects →</button>`
    );
  }

  if(!html){
    html = `<div class="feed-empty" style="padding:48px 0">
      <div style="font-size:32px;margin-bottom:12px">✓</div>
      <div style="font-weight:600;margin-bottom:6px">All caught up</div>
      <div style="font-size:12px;color:var(--text-dim)">Add athletes to your board and set next actions to track priorities here.</div>
      <button class="fi-action-btn" style="margin-top:16px" onclick="switchTab('search')">Find Athletes →</button>
    </div>`;
  }

  list.innerHTML = html;
}


function _tdSection(title, sub, bodyHtml, footerHtml=''){
  return `<div class="td-section">
    <div class="td-section-hd">
      <div class="td-section-title">${title}</div>
      ${sub?`<div class="td-section-sub">${sub}</div>`:''}
    </div>
    ${bodyHtml}
    ${footerHtml}
  </div>`;
}

function _av(name){
  const inits = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return `<div class="td-av">${inits}</div>`;
}

function _quickAddBoard(id){
  if(!coachPipeline.identified) coachPipeline.identified=[];
  if(!coachPipeline.identified.includes(id)) coachPipeline.identified.push(id);
  lss('pipeline', coachPipeline);
  updateHeaderStats();
  filterAthletes();
  renderCoachFeed();
}

// ── ACTIVITY FEED (Analytics tab) ────────────────────────────────────────────
function renderActivityFeed(){
  // Stats row — reuse existing an-stat CSS
  const allIds = COACH_PIPELINE_STAGES.flatMap(s=>coachPipeline[s.key]||[]);
  const committed = (coachPipeline.committed||[]).length;
  const statsEl = document.getElementById('analytics-stats');
  if(statsEl) statsEl.innerHTML = [
    {num:allIds.length,  lbl:'On Board',         delta:''},
    {num:committed,      lbl:'Committed',         delta:''},
    {num:Object.keys(coachNextActions).length,    lbl:'With Next Action', delta:''},
    {num:Object.keys(coachNotes).filter(k=>coachNotes[k]?.trim()).length, lbl:'With Notes', delta:''},
  ].map(s=>`<div class="an-stat">
    <div class="an-stat-num">${s.num}</div>
    <div class="an-stat-lbl">${s.lbl}</div>
    ${s.delta?`<div class="an-stat-delta">${s.delta}</div>`:''}
  </div>`).join('');

  // Activity rows — newest first
  const rows = _buildActivityRows();
  const tableEl = document.getElementById('an-table');
  if(!tableEl) return;
  tableEl.innerHTML = `
    <div class="an-table-hd"><div class="an-table-title">Recent Activity</div></div>
    ${rows.length
      ? rows.map(r=>`<div class="an-row">
          <div class="board-av" style="flex-shrink:0;width:32px;height:32px;font-size:12px">
            ${r.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div class="an-row-name">${r.name}<br><span class="an-row-meta">${r.action}</span></div>
          <div style="flex-shrink:0;text-align:right">
            ${r.badge?`<div class="an-row-badge" style="color:${r.color};background:${r.color}18;border:1px solid ${r.color}44">${r.badge}</div>`:''}
            <div class="an-row-meta" style="margin-top:3px">${r.time}</div>
          </div>
        </div>`).join('')
      : '<div style="padding:24px;text-align:center;font-size:12px;color:var(--text-dim)">No recruiting activity yet. Move an athlete, add a note, or set a next action to build this log.</div>'
    }`;
}

function _buildActivityRows(){
  const rows = [];

  // Real activity from coachLastActivity
  Object.entries(coachLastActivity).forEach(([id, la])=>{
    const a = ATHLETES.find(x=>String(x.id)===String(id));
    if(!a||!la) return;
    const stage = COACH_PIPELINE_STAGES.find(s=>s.key===(la.text||'').toLowerCase().replace(/ /g,''));
    const color = stage?.color || '#888';
    if(la.type==='stage'){
      rows.push({name:a.name, action:`Moved to ${la.text}`, badge:la.text, color, time:_relTime(la.ts), ts:la.ts});
    } else if(la.type==='note'){
      rows.push({name:a.name, action:'Note added', badge:null, color:'#888', time:_relTime(la.ts), ts:la.ts});
    } else if(la.type==='action'){
      rows.push({name:a.name, action:`Next action set: ${la.text}`, badge:null, color:'#888', time:_relTime(la.ts), ts:la.ts});
    }
  });

  // Coach recommendations
  getAllEndorsements().filter(e=>e.status==='endorsed').forEach(e=>{
    rows.push({name:e.athleteName, action:`Coach recommendation from ${e.coachName}`, badge:'Recommended', color:'#00A040', time:'May 2026', ts:0});
  });

  rows.sort((a,b)=>(b.ts||0)-(a.ts||0));
  return rows.slice(0,15);
}

function jukeLogout(){localStorage.removeItem('juke_auth');location.href='../preview.html';}

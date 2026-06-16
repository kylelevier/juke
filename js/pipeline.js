// ── TABS ────────────────────────────────────────────────
function switchTab(t){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  document.getElementById('tab-'+t).classList.add('active');
  document.getElementById('content-'+t).classList.add('active');
  if(t==='feed')renderFeed();
  if(t==='pipeline')renderPipeline();
  if(t==='coaches'&&coachUnlocked)filterCoachAthletes();
  if(t==='profile')setTimeout(renderProfileView,0);
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
      const domain=SCHOOL_DOMAINS[committedSchool]??null;
      if(domain){
        logoWrap.innerHTML='<img src="https://logo.clearbit.com/'+domain+'" style="width:32px;height:32px;object-fit:contain;border-radius:6px" onerror="this.parentNode.innerHTML=\'<span style=\\"font-size:11px;color:rgba(255,255,255,.5)\\">'+committedSchool.slice(0,3).toUpperCase()+'</span>\'">';
      } else {
        logoWrap.innerHTML='<span style="font-size:10px;color:rgba(255,255,255,.5);font-weight:700">'+committedSchool.slice(0,3).toUpperCase()+'</span>';
      }
    }
  } else {
    banner.classList.remove('show');
  }
}

// ── MILESTONE TIMELINE ────────────────────────────────────
function recordMilestone(school,statusKey){
  if(!school||!statusKey||statusKey==='none') return;
  const tl=lsGet('juke_timeline')||[];
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
  const stageLabel={saved:'Saved',contacted:'Contacted',engaged:'Engaged',visit:'Visit',applied:'Applied',offer:'Offer',committed:'Committed',archived:'Archived'};
  rail.innerHTML=tl.map(ev=>{
    const initials=ev.school.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const domain=SCHOOL_DOMAINS[ev.school]??null;
    const logoHtml=domain?'<img src="https://logo.clearbit.com/'+domain+'" onerror="this.parentNode.textContent=\''+initials+'\'" loading="lazy"/>':initials;
    return'<div class="ms-card" onclick="openBoardDetail(\''+esc(ev.school)+'\')">'+'<div class="ms-card-top"><div class="ms-logo">'+logoHtml+'</div><div class="ms-school">'+ev.school+'</div></div>'+'<span class="ms-badge ms-'+ev.status+'">'+(stageLabel[ev.status]||ev.status)+'</span>'+'<div class="ms-date">'+fmt(ev.ts)+'</div>'+'</div>';
  }).join('');
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
  const schoolsByStage={};
  PIPELINE_STAGES.forEach(s=>schoolsByStage[s.key]=[]);
  Object.entries(statusData).forEach(([school,status])=>{
    if(schoolsByStage[status])schoolsByStage[status].push(school);
  });
  const total=Object.values(schoolsByStage).flat().length;

  document.getElementById('pipeline-summary').innerHTML=`
    <div class="pipeline-stat"><div class="pipeline-stat-num">${total}</div><div class="pipeline-stat-lbl">Total</div></div>
    ${PIPELINE_STAGES.map(s=>`<div class="pipeline-stat"><div class="pipeline-stat-num" style="color:${s.color}">${schoolsByStage[s.key].length}</div><div class="pipeline-stat-lbl">${s.label}</div></div>`).join('')}
  `;

  const colsEl=document.getElementById('pipeline-cols');
  colsEl.innerHTML='';
  PIPELINE_STAGES.forEach(stage=>{
    const schools=schoolsByStage[stage.key].map(name=>RAW.find(r=>r.School===name)).filter(Boolean);
    const col=document.createElement('div');
    col.className='pipeline-col';
    col.innerHTML=`<div class="pipeline-col-hd"><span class="pipeline-col-title" style="color:${stage.color}">${stage.label}</span><span class="pipeline-col-count">${schools.length}</span></div>`;
    const body=document.createElement('div');
    body.className='pipeline-col-body';
    body.dataset.stage=stage.key;
    if(!schools.length){
      const ph=document.createElement('div');ph.className='pipeline-empty-col';ph.textContent='Drop cards here';
      body.appendChild(ph);
    } else {
      schools.forEach(r=>body.appendChild(buildPipelineCard(r,stage.key)));
    }
    col.appendChild(body);
    colsEl.appendChild(col);
  });
}

// ── CARD BUILD ───────────────────────────────────────────
function buildPipelineCard(r,stageKey){
  const meta=_boardMeta[r.School]||{};
  const lsAttrs=(lsGet('juke_card_attrs')||{})[r.School]||{};
  // Merge Supabase meta + localStorage attrs (Supabase wins if logged in)
  const attrs=sb&&currentUser?meta:lsAttrs;

  const card=document.createElement('div');
  card.className=`pipeline-card status-${stageKey}`;
  card.dataset.school=r.School;

  // ── Header: drag handle + logo + name/state ──
  const hd=document.createElement('div');hd.className='pipeline-card-hd';
  const handle=document.createElement('span');
  handle.className='pipeline-drag-handle';handle.title='Drag to move';handle.textContent='⠿';

  const logoWrap=_logoPlaceholder(r.School);logoWrap.dataset.logo=r.School;

  const hdText=document.createElement('div');hdText.className='pipeline-card-hd-text';
  hdText.innerHTML=`<div class="pipeline-card-name">${r.School}</div><div class="pipeline-card-meta">${r.State||''}${r.Region?` · ${r.Region}`:''}</div>`;
  hd.appendChild(handle);hd.appendChild(logoWrap);hd.appendChild(hdText);

  // ── Row: fit score + division badge ──
  const row=document.createElement('div');row.className='pipeline-card-row';
  const fit=getFit(r);
  if(fit>=0){const tmp=document.createElement('span');tmp.innerHTML=fitBadge(fit);while(tmp.firstChild)row.appendChild(tmp.firstChild);}
  row.innerHTML+=divTag(r['Governing Body'],r['Division']);

  // ── Contact row: last contact + next action ──
  const contactRow=document.createElement('div');contactRow.className='pipeline-card-contact';
  const lcd=meta.last_contact_date;
  const na=meta.next_action;
  const naDate=meta.next_action_date;
  contactRow.innerHTML=`
    ${lcd?`<span class="pc-last-contact" title="Last contact">📅 ${_fmtDate(lcd)}</span>`:''}
    ${na?`<span class="pc-next-action ${_isOverdue(naDate)?'overdue':''}" title="Next action">${_isOverdue(naDate)?'⚠':'▶'} ${na}${naDate?' · '+_fmtDate(naDate):''}</span>`:''}
  `.trim();

  // ── Key tags: card attributes ──
  const tagsEl=document.createElement('div');tagsEl.className='pipeline-card-tags';
  const attrTags=[];
  if(attrs.is_dream_school) attrTags.push('<span class="tag tag-attr tag-dream">⭐ Dream</span>');
  if(attrs.is_top_choice)   attrTags.push('<span class="tag tag-attr tag-top">🔥 Top Choice</span>');
  if(attrs.is_in_state)     attrTags.push('<span class="tag tag-attr tag-instate">📍 In-State</span>');
  if(attrs.scholarship_opp) attrTags.push('<span class="tag tag-attr tag-schol">💰 Scholarship</span>');
  if(attrs.academic_match)  attrTags.push('<span class="tag tag-attr tag-acad">📚 Acad Match</span>');
  if(attrs.is_christian)    attrTags.push('<span class="tag tag-attr tag-christian">✝ Christian</span>');
  if(r.HBCU==='Yes')        attrTags.push('<span class="tag tag-hbcu">HBCU</span>');
  tagsEl.innerHTML=attrTags.join('');

  card.appendChild(hd);
  if(contactRow.innerHTML.trim()) card.appendChild(contactRow);
  card.appendChild(row);
  if(attrTags.length) card.appendChild(tagsEl);
  fetchSchoolLogo(r.School,logoWrap);

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

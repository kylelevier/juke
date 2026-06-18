

// ── PROFILE STATE ────────────────────────────────────────
let profileAwards=[];

// ── INIT ────────────────────────────────────────────────
(function init(){
  const _ss=document.getElementById('stat-states');if(_ss)_ss.textContent=[...new Set(RAW.map(r=>r.State).filter(Boolean))].length;
  recalcFit();applyFilters();
  loadPlayerProfile();
  if(!profileAwards.length) addAward();
  profileUpdate();
  initWizPhotos();
  renderFeed();
})();

// ── FIT PROFILE ─────────────────────────────────────────
function toggleProfile(){
  document.getElementById('profile-form').classList.toggle('visible');
  document.getElementById('profile-arrow').classList.toggle('open');
}
function recalcFit(){
  const prefs = getFitPrefs();
  const has = !!(prefs.div||prefs.gov||prefs.vc||prefs.region||
                 prefs.state||prefs.type||prefs.maxNet||prefs.rel||prefs.hbcu);
  RAW.forEach(r=>{
    const result = scoreFit(r, prefs);
    fitScores[r.School+'|'+r.State] = result.overall !== null ? result.overall : -1;
  });
  const matches = Object.values(fitScores).filter(s=>s>=75).length;
  const _sf = document.getElementById('stat-fit');
  if(_sf) _sf.textContent = has ? matches : '—';
  const criteriaCount = [prefs.div,prefs.gov,prefs.vc,prefs.region,prefs.state,
    prefs.type,prefs.rel,prefs.hbcu,prefs.maxNet?'net':''].filter(Boolean).length;
  document.getElementById('profile-summary').textContent = has
    ? `Profile active — ${criteriaCount} criteria · ${matches} strong matches`
    : 'Set your preferences to see personalized match scores for every school';
}
function clearProfile(){
  ['pf-div','pf-gov','pf-vc','pf-region','pf-state','pf-type','pf-net','pf-rel','pf-hbcu'].forEach(id=>document.getElementById(id).value='');
  recalcFit();applyFilters();
}
// Called by _syncFromCloud (auth.js) after loading saved preferences from Supabase
function _applyFitPrefs(prefs){
  if(!prefs)return;
  Object.entries(prefs).forEach(([id,val])=>{
    const el=document.getElementById(id);
    if(el)el.value=val;
  });
  recalcFit();applyFilters();
}
function getFit(r){return fitScores[r.School+'|'+r.State]??-1;}

// ── FILTERS ─────────────────────────────────────────────
function applyFilters(){
  const s=document.getElementById('f-search').value.toLowerCase(),
    gov=document.getElementById('f-gov').value,div=document.getElementById('f-div').value,
    vc=document.getElementById('f-vc').value,region=document.getElementById('f-region').value,
    state=document.getElementById('f-state').value,hbcu=document.getElementById('f-hbcu').value;
  filtered=RAW.filter(r=>{
    if(s&&![r.School,r.State,r['Flag Football Conference'],r['Governing Body'],r.Region,r['Religious Affiliation']].join(' ').toLowerCase().includes(s))return false;
    if(gov&&r['Governing Body']!==gov)return false;
    if(div&&r['Division']!==div)return false;
    if(vc&&r['Varsity or Club']!==vc)return false;
    if(region&&r['Region']!==region)return false;
    if(state&&r['State']!==state)return false;
    if(hbcu&&r['HBCU']!==hbcu)return false;
    return true;
  });
  sortData();render();
}
function toggleFilterPanel(){
  const panel=document.getElementById('filter-panel');
  const btn=document.getElementById('fsb-toggle-btn');
  const open=panel.style.display==='none'||panel.style.display==='';
  panel.style.display=open?'block':'none';
  btn.classList.toggle('active',open);
}
function updateFilterCount(){
  const ids=['f-gov','f-div','f-vc','f-region','f-state','f-hbcu'];
  const count=ids.filter(id=>{const el=document.getElementById(id);return el&&el.value!=='';}).length;
  const badge=document.getElementById('fsb-count');
  if(badge){badge.textContent=count;badge.style.display=count>0?'inline':'none';}
}
function resetFilters(){
  ['f-search','f-gov','f-div','f-vc','f-region','f-state','f-hbcu'].forEach(id=>{const el=document.getElementById(id);el.tagName==='INPUT'?el.value='':el.value='';});
  updateFilterCount();
  applyFilters();
}
function sortBy(col){if(sortCol===col)sortAsc=!sortAsc;else{sortCol=col;sortAsc=col!=='_fit';}sortData();render();}
function sortData(){
  filtered.sort((a,b)=>{
    if(sortCol==='_fit'){return sortAsc?getFit(a)-getFit(b):getFit(b)-getFit(a);}
    if(sortCol==='_net'){const na=netPrice(a),nb=netPrice(b);return sortAsc?na-nb:nb-na;}
    let va=a[sortCol]||'',vb=b[sortCol]||'';
    if(sortCol.includes('Cost')||sortCol.includes('Aid')){va=parseInt(va.replace(/[$,]/g,''))||0;vb=parseInt(vb.replace(/[$,]/g,''))||0;return sortAsc?va-vb:vb-va;}
    return sortAsc?va.localeCompare(vb):vb.localeCompare(va);
  });
}
function netPrice(r){
  const cost=parseInt((r['Est. Cost of Attendance (2023-24)']||'').replace(/[$,]/g,''))||0;
  const aid=parseInt((r['Avg Financial Aid Award']||'').replace(/[$,]/g,''))||0;
  return(cost&&aid)?cost-aid:cost||0;
}
function fmtNet(r){
  const cost=parseInt((r['Est. Cost of Attendance (2023-24)']||'').replace(/[$,]/g,''))||0;
  const aid=parseInt((r['Avg Financial Aid Award']||'').replace(/[$,]/g,''))||0;
  if(!cost)return'—';
  if(!aid)return'$'+cost.toLocaleString()+' <span style="font-size:10px;color:var(--text-muted)">(no aid data)</span>';
  const net=cost-aid;
  return'$'+net.toLocaleString();
}

// ── HELPERS ─────────────────────────────────────────────
function statusHtml(school){
  const s=statusData[school]||'none';
  const L={none:'Save to Board',saved:'Saved',contacted:'Contacted',applied:'Applied',committed:'Committed'};
  return`<span class="status-pill status-${s}" onclick="event.stopPropagation();openStatusPopover('${esc(school)}',this)">${L[s]}</span>`;
}
function _getFitTags(r){
  const tags=[];
  const div=document.getElementById('pf-div')?.value;
  const gov=document.getElementById('pf-gov')?.value;
  const vc=document.getElementById('pf-vc')?.value;
  const region=document.getElementById('pf-region')?.value;
  const state=document.getElementById('pf-state')?.value;
  const hbcu=document.getElementById('pf-hbcu')?.value;
  if(div&&r['Division']===div)tags.push(r['Division']);
  else if(gov&&r['Governing Body']===gov)tags.push(r['Governing Body']);
  if(vc&&r['Varsity or Club']===vc)tags.push(r['Varsity or Club']);
  if(state&&r['State']===state)tags.push('In your state');
  else if(region&&r['Region']===region)tags.push(r['Region']);
  if(hbcu==='yes'&&r['HBCU']==='Yes')tags.push('HBCU');
  if(!tags.length&&r['Scholarship Available (Y/N/Partial)']==='Yes')tags.push('Scholarships available');
  return[...new Set(tags)].slice(0,2);
}
let _spSchool = null;

// Used by pipeline board cards (cycle through stages without a popover)
function cycleStatus(school){
  const o=['none','saved','contacted','applied','committed'];
  statusData[school]=o[(o.indexOf(statusData[school]||'none')+1)%o.length];
  if(statusData[school]==='none') delete statusData[school];
  lsSet('juke_status',statusData);cloudSave();
}

function openStatusPopover(school, el){
  _spSchool = school;
  const pop = document.getElementById('status-popover');
  const rect = el.getBoundingClientRect();
  pop.style.top  = (rect.bottom + 6) + 'px';
  pop.style.left = rect.left + 'px';
  // Keep within viewport
  setTimeout(function(){
    const pr = pop.getBoundingClientRect();
    if(pr.right > window.innerWidth - 8)
      pop.style.left = (window.innerWidth - pr.width - 8) + 'px';
  }, 0);
  pop.classList.add('open');
}

function spSelect(key){
  if(!_spSchool) return;

  if(key === 'none'){
    delete statusData[_spSchool];
  } else {
    statusData[_spSchool] = key;
  }
  lsSet('juke_status', statusData);
  if(key !== 'none') recordMilestone(_spSchool, key);
  cloudSave();
  closeStatusPopover();
  render();
  updateAthleteHeader();
  updateCommittedBanner();
  updateOfferStrip();
  // Sync profile panel if open
  if(_ppCurrent === _spSchool) _ppRenderStatusRow(_spSchool);
}

function closeStatusPopover(){
  document.getElementById('status-popover').classList.remove('open');
  _spSchool = null;
}

// Close on outside click
document.addEventListener('click', function(e){
  const pop = document.getElementById('status-popover');
  if(pop && pop.classList.contains('open') && !pop.contains(e.target)){
    closeStatusPopover();
  }
}, true);
function getNote(s){return adminNotes[s]||'';}
function ppSaveNote(val){
  if(!_ppCurrent)return;
  adminNotes[_ppCurrent]=val;
  lsSet('juke_notes',adminNotes);
  cloudSave();
}
function ppToggleOffer(){
  if(!_ppCurrent)return;
  const isOffered=!!offersData[_ppCurrent];
  if(isOffered)delete offersData[_ppCurrent];
  else offersData[_ppCurrent]=true;
  lsSet('juke_offers',offersData);
  const btn=document.getElementById('pp-offer-btn');
  if(btn){btn.textContent=offersData[_ppCurrent]?'🏅 Offered':'🏅 Offered';btn.className='pp-offer-btn'+(offersData[_ppCurrent]?' offered':'');}
  // Update live card badge
  const card=document.querySelector(`.pipeline-card[data-school="${CSS.escape(_ppCurrent)}"]`);
  if(card){
    card.querySelector('.pipeline-card-offer-badge')?.remove();
    if(offersData[_ppCurrent]){
      const badge=document.createElement('span');badge.className='pipeline-card-offer-badge';badge.textContent='Offered';
      const nameEl=card.querySelector('.pipeline-card-name');
      if(nameEl)nameEl.after(badge);
    }
  }
}
function getForm(s){return adminForms[s]||RAW.find(r=>r.School===s)?.['Athlete Interest / Recruiting Form']||'';}
function recruitHtml(s){const u=getForm(s);if(!u||u==='See school athletics website')return'<span class="recruit-na">—</span>';return`<a class="recruit-link" href="${u}" target="_blank" rel="noopener">Visit ↗</a>`;}
function esc(s){return s.replace(/'/g,"\'");}

// ── COMPARE ─────────────────────────────────────────────
function toggleCompare(s){if(compareSet.has(s))compareSet.delete(s);else if(compareSet.size<4)compareSet.add(s);updateCompareBar();render();}
function clearCompare(){compareSet.clear();updateCompareBar();render();}
function updateCompareBar(){
  const n=compareSet.size;
  document.getElementById('compare-bar').classList.toggle('visible',n>0);
  document.getElementById('compare-open-btn').style.display=n>=2?'block':'none';
  document.getElementById('compare-count-inline').textContent=`${n} in compare`;
  document.getElementById('compare-chips').innerHTML=[...compareSet].map(s=>`<div class="compare-school-chip">${s}<button class="compare-chip-remove" onclick="toggleCompare('${esc(s)}')" title="Remove">✕</button></div>`).join('');
}
function openCompareModal(){
  if(compareSet.size<2)return;
  const schools=[...compareSet].map(n=>RAW.find(r=>r.School===n)).filter(Boolean);
  const cols=schools.length;
  const fields=[['Governing Body','Body'],['Division','Division'],['Varsity or Club','Type'],['Flag Football Conference','Conference'],['Region','Region'],['State','State'],['School Type','School Type'],['Religious Affiliation','Religion'],['_net','Net Price'],['Scholarship Available (Y/N/Partial)','Scholarships'],['HBCU','HBCU']];
  let h=`<div style="display:grid;grid-template-columns:150px repeat(${cols},1fr);border:1px solid var(--gray-mid);border-radius:4px;overflow:hidden;">`;
  h+=`<div style="background:rgba(0,0,0,.2);border-right:1px solid var(--gray-mid);"></div>`;
  schools.forEach(s=>{const fit=getFit(s);h+=`<div class="cmp-school"><div class="cmp-school-name">${s.School}</div><div class="cmp-school-state">${s.State} · ${s.Region||''}</div>${fit>=0?`<div style="margin-top:6px">${fitBadge(fit)}</div>`:''}</div>`;});
  fields.forEach(([k,l])=>{h+=`<div class="cmp-row-label">${l}</div>`;schools.forEach(s=>{const v=k==='_net'?fmtNet(s):(s[k]||'—');h+=`<div class="cmp-row-val">${v}</div>`;});});
  h+=`<div class="cmp-row-label">My Status</div>`;schools.forEach(s=>{h+=`<div class="cmp-row-val">${statusHtml(s.School)}</div>`;});
  h+=`<div class="cmp-row-label">Coach Note</div>`;schools.forEach(s=>{h+=`<div class="cmp-row-val" style="font-style:italic;color:var(--columbia)">${getNote(s.School)||'—'}</div>`;});
  h+=`<div class="cmp-row-label">Recruiting Form</div>`;schools.forEach(s=>{h+=`<div class="cmp-row-val">${recruitHtml(s.School)}</div>`;});
  h+=`</div>`;
  document.getElementById('compare-content').innerHTML=h;
  document.getElementById('compare-modal').classList.add('visible');
}
function closeCompareModal(){document.getElementById('compare-modal').classList.remove('visible');}

// ── RENDER ──────────────────────────────────────────────
function render(){
  document.getElementById('match-count').textContent=filtered.length;
  const empty=filtered.length===0;
  document.getElementById('empty-state').style.display=empty?'block':'none';
  document.getElementById('view-table').style.display=(!empty&&view==='table')?'block':'none';
  document.getElementById('view-cards').style.display=(!empty&&view==='cards')?'block':'none';
  if(view==='table')renderTable();else renderCards();
  sweepLogos();
}
function sweepLogos(){
  document.querySelectorAll('[data-logo]').forEach(wrap=>{
    const name=wrap.dataset.logo;
    if(name)fetchSchoolLogo(name,wrap);
  });
}
function renderTable(){
  document.getElementById('table-body').innerHTML=filtered.map(r=>{
    const fit=getFit(r),ic=compareSet.has(r.School);
    const hbcu = r.HBCU==='Yes' ? '<span class="tag tag-hbcu" style="font-size:9px;padding:1px 5px;margin-left:4px">HBCU</span>' : '';
    return`<tr>
      <td>${fitBadge(fit)}</td>
      <td class="school-name" onclick="openProgramProfile('${esc(r.School)}')" style="cursor:pointer">
        <div class="finder-logo-cell">
          <div class="finder-logo-wrap" data-logo="${r.School}"><div class="finder-logo-initials">🏈</div></div>
          <div style="display:flex;align-items:center;gap:4px">${r.School}${hbcu}</div>
        </div>
      </td>
      <td style="color:var(--text-muted);font-size:12px">${r.State||'—'}</td>
      <td>${divTag(r['Governing Body'],r['Division'])}</td>
      <td>${vcTag(r['Varsity or Club'])}</td>
      <td>${statusHtml(r.School)}</td>
    </tr>`;
  }).join('');
}
function fmtNetPlain(r){
  const cost=parseInt((r['Est. Cost of Attendance (2023-24)']||'').replace(/[$,]/g,''))||0;
  const aid=parseInt((r['Avg Financial Aid Award']||'').replace(/[$,]/g,''))||0;
  if(!cost)return'';
  return '$'+(cost-aid).toLocaleString();
}
function cardFactRow(r){
  const parts=[];
  // Division + governing body
  const g=r['Governing Body']||'',d=r['Division']||'';
  if(g){const divStr=g+(d?' '+d.replace('Division ','D'):'');parts.push(`<span class="card-fact-div">${divStr}</span>`);}
  // Varsity or Club
  const vc=r['Varsity or Club'];
  if(vc)parts.push(`<span>${vc}</span>`);
  // Scholarship
  const sch=r['Scholarship Available (Y/N/Partial)']||'';
  if(sch&&sch!=='—'){
    const short=sch==='Yes'?'Athletic Aid':sch==='No'?'No Aid':sch.length>22?sch.slice(0,22)+'…':sch;
    parts.push(`<span class="card-fact-sch">${short}</span>`);
  }
  // Net price
  const price=fmtNetPlain(r);
  if(price)parts.push(`<span class="card-fact-price">${price}/yr</span>`);
  // HBCU
  if(r.HBCU==='Yes')parts.push(`<span style="color:#166534;font-weight:700">HBCU</span>`);
  return parts.map((p,i)=>i===0?p:`<span class="card-fact-sep">·</span>${p}`).join('');
}
function renderCards(){
  document.getElementById('cards-body').innerHTML=filtered.map(r=>{
    const fit=getFit(r),pct=fit>=0?fit:0,ic=compareSet.has(r.School);
    const note=getNote(r.School);
    const st=statusData[r.School]||'none';
    const statusClass=st!=='none'?` has-status-${st}`:'';
    const conf=r['Flag Football Conference']||'';
    const meta=[r.State,r.Region,conf].filter(Boolean).join(' · ');
    const fitTags=fit>=0?_getFitTags(r):[];
    const fitTagsHtml=fitTags.length?`<div class="card-fit-reason">${fitTags.map(t=>`<span class="card-fit-tag">${t}</span>`).join('')}</div>`:'';
    return`<div class="school-card${statusClass}" onclick="openProgramProfile('${esc(r.School)}')">
      <div class="card-hd">
        <div class="card-logo-wrap" data-logo="${r.School}"><div class="card-logo-initials">🏈</div></div>
        <div style="flex:1;min-width:0">
          <div class="card-school">${r.School}</div>
          <div class="card-meta">${meta}</div>
        </div>
        ${fit>=0?fitBadge(fit):''}
      </div>
      <div class="card-fact-row">${cardFactRow(r)}</div>
      ${fitTagsHtml}
      ${note?`<div class="card-note"><span style="flex-shrink:0">📌</span><span>${note}</span></div>`:''}
      <div class="card-ft">
        <div class="card-actions">
          ${statusHtml(r.School)}${recruitHtml(r.School)}
          <button class="btn ${ic?'btn-primary':'btn-ghost'}" style="padding:3px 8px;font-size:10px" onclick="event.stopPropagation();toggleCompare('${esc(r.School)}')">${ic?'✓ Compare':'Compare'}</button>
        </div>
      </div>
    </div>`;
  }).join('');
}
function setView(v){view=v;document.getElementById('btn-table').classList.toggle('active',v==='table');document.getElementById('btn-cards').classList.toggle('active',v==='cards');render();}
function exportCSV(){
  const cols=Object.keys(RAW[0]);
  const lines=[['Fit Score',...cols,'My Status'].join(',')];
  filtered.forEach(r=>{const fit=getFit(r);lines.push([fit>=0?fit+'':``, ...cols.map(c=>`"${(r[c]||'').replace(/"/g,'""')}"`),`"${statusData[r.School]||''}"`].join(','));});
  const blob=new Blob([lines.join('\n')],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='juke_programs.csv';a.click();
}

// ── ADMIN ────────────────────────────────────────────────
function openAdmin(){
  document.getElementById('admin-modal').classList.add('visible');
  document.getElementById('admin-login-form').style.display=adminUnlocked?'none':'block';
  document.getElementById('admin-panel').style.display=adminUnlocked?'block':'none';
  if(adminUnlocked)renderAdminList();
  else setTimeout(()=>document.getElementById('admin-pw-input').focus(),100);
}
function closeAdmin(){document.getElementById('admin-modal').classList.remove('visible');}
function checkAdminPw(){
  if(document.getElementById('admin-pw-input').value===ADMIN_PW){
    adminUnlocked=true;
    document.getElementById('admin-login-form').style.display='none';
    document.getElementById('admin-panel').style.display='block';
    renderAdminList();
  }else document.getElementById('admin-pw-err').style.display='block';
}
function renderAdminList(){
  const q=(document.getElementById('admin-search-input').value||'').toLowerCase();
  const schools=RAW.filter(r=>!q||r.School.toLowerCase().includes(q)||r.State.toLowerCase().includes(q));
  document.getElementById('admin-school-list').innerHTML=schools.map(r=>{
    const note=adminNotes[r.School]||'';
    const form=adminForms[r.School]||(r['Athlete Interest / Recruiting Form']!=='See school athletics website'?r['Athlete Interest / Recruiting Form']:'');
    const k=r.School.replace(/[^a-z0-9]/gi,'_');
    return`<div class="admin-school-item" id="item-${k}">
      <div class="admin-school-name"><span>${r.School} <span style="font-size:10px;font-weight:400;color:var(--text-muted)">${r.State} · ${r['Governing Body']} ${r.Division||''}</span></span>
      <button class="admin-save-btn" onclick="saveSchool('${esc(r.School)}')">Save</button></div>
      <div class="admin-row"><input class="admin-input" id="form-${k}" value="${esc(form)}" placeholder="Recruiting form URL…"/></div>
      <div class="admin-row"><input class="admin-input" id="note-${k}" value="${esc(note)}" placeholder="Coach note visible to athletes…"/></div>
    </div>`;
  }).join('');
}
function saveSchool(school){
  const k=school.replace(/[^a-z0-9]/gi,'_');
  const fe=document.getElementById('form-'+k),ne=document.getElementById('note-'+k);
  if(fe){adminForms[school]=fe.value.trim();lsSet('juke_forms',adminForms);}
  if(ne){adminNotes[school]=ne.value.trim();lsSet('juke_notes',adminNotes);cloudSave();}
  render();
  const item=document.getElementById('item-'+k);
  if(item){item.style.borderColor='var(--columbia)';setTimeout(()=>item.style.borderColor='',1200);}
}
function saveAllAdmin(){
  document.querySelectorAll('.admin-school-item').forEach(item=>{
    const nameNode=item.querySelector('.admin-school-name>span');
    if(!nameNode)return;
    const school=nameNode.childNodes[0].textContent.trim();
    const k=school.replace(/[^a-z0-9]/gi,'_');
    const fe=document.getElementById('form-'+k),ne=document.getElementById('note-'+k);
    if(fe&&school)adminForms[school]=fe.value.trim();
    if(ne&&school)adminNotes[school]=ne.value.trim();
  });
  lsSet('juke_forms',adminForms);lsSet('juke_notes',adminNotes);render();closeAdmin();
}
function exportAdminData(){
  const blob=new Blob([JSON.stringify({notes:adminNotes,forms:adminForms},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='juke_admin_data.json';a.click();
}

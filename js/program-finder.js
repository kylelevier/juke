function openProgramProfile(schoolName){
  const r=RAW.find(x=>x.School===schoolName);
  if(!r)return;
  _ppCurrent=schoolName;

  const coachRegs=lsGet('juke_coach_registrations');
  const coach=coachRegs[schoolName];
  const sc=SCORECARD[schoolName]||null;

  // ── Fit score ──
  const fit=getFit(r), pct=fit>=0?fit:0;
  const fitCls=pct>=70?'fit-hi':pct>=40?'fit-mid':'fit-lo';

  // ── Reach / Match / Likely ──
  let rmlLabel='', rmlCls='';
  if(sc){
    if(sc.admRate>=75){rmlLabel='Likely';rmlCls='chip-likely';}
    else if(sc.admRate>=45){rmlLabel='Match';rmlCls='chip-match';}
    else{rmlLabel='Reach';rmlCls='chip-reach';}
  }

  // ── Athletic tier chip ──
  const vcRaw=(r['Varsity or Club']||'').toLowerCase();
  const schRaw=(r['Scholarship Available (Y/N/Partial)']||'').toLowerCase();
  let athLabel='Club', athCls='chip-ath';
  if(vcRaw.includes('varsity')){
    if(schRaw==='yes'){athLabel='Scholarship';athCls='chip-match';}
    else if(schRaw.includes('partial')){athLabel='Partial Sch.';athCls='chip-reach';}
    else{athLabel='Varsity';}
  }

  // ── Signal chips ──
  let sigHtml='<div class="pp-signals">';
  if(fit>=0) sigHtml+=`<div class="pp-sig-chip"><div class="pp-sig-label">Fit Score</div><div class="pp-sig-val ${fitCls}">${pct}%</div></div>`;
  if(rmlLabel) sigHtml+=`<div class="pp-sig-chip"><div class="pp-sig-label">Admissions</div><div class="pp-sig-val ${rmlCls}">${rmlLabel}</div></div>`;
  sigHtml+=`<div class="pp-sig-chip"><div class="pp-sig-label">Program Type</div><div class="pp-sig-val ${athCls}">${athLabel}</div></div>`;
  sigHtml+='</div>';

  // ── Coach box ──
  let coachHtml;
  if(coach&&coach.name){
    const tl=coach.title?' &middot; '+coach.title:'';
    const cb=coach.email?`<a class="pp-contact-btn" href="mailto:${coach.email}">&#x2709; Contact Coach</a>`:'';
    coachHtml=`<div class="pp-coach-box registered"><div class="pp-coach-status"><div class="pp-coach-dot active"></div><div class="pp-coach-label">Coach on JUKE</div></div><div class="pp-coach-detail">${coach.name}${tl}<br>${coach.email||''}</div>${cb}</div>`;
  }else{
    coachHtml=`<div class="pp-coach-box"><div class="pp-coach-status"><div class="pp-coach-dot"></div><div class="pp-coach-label">No coach registered yet</div></div><div class="pp-coach-detail">The coaching staff hasn&#39;t joined JUKE yet. Check the athletics website for contact info.</div></div>`;
  }

  // ── Recruiting form button ──
  const rl=r['Athlete Interest / Recruiting Form']||'';
  const notesHtml=r.Notes?`<div class="pp-notes">${r.Notes}</div>`:'';

  // ── "Why This School?" section ──
  const _coachNote=adminNotes[schoolName]||'';
  const _whyParts=[];
  if(_coachNote) _whyParts.push(`<div class="pp-why-note"><span class="pp-why-note-icon">📌</span><div>${_coachNote}</div></div>`);
  if(fit>=70&&fit>=0) _whyParts.push(`<div class="pp-context-note">Your preferences are a strong match for this program — this school lines up with several of the criteria you set.</div>`);
  else if(fit>=50&&fit>=0) _whyParts.push(`<div class="pp-context-note">This program matches several of your preferences. Worth a closer look.</div>`);
  if(r.HBCU==='Yes') _whyParts.push(`<div class="pp-context-note" style="border-left-color:#166534;">This is a Historically Black College or University (HBCU).</div>`);
  const whySection=_whyParts.length?'<div class="pp-section"><div class="pp-section-title">Why This School?</div>'+_whyParts.join('')+'</div>':'';

  // ── Financial zone ──
  const fmt$=n=>'$'+Math.round(n).toLocaleString();
  const costRaw=parseInt((r['Est. Cost of Attendance (2023-24)']||'').replace(/[$,]/g,''))||0;
  const aidRaw=parseInt((r['Avg Financial Aid Award']||'').replace(/[$,]/g,''))||0;
  const trueAnnual=costRaw&&aidRaw?costRaw-aidRaw:null;

  const costCallout=trueAnnual?`<div class="pp-cost-callout"><div class="pp-cost-label">Cost Snapshot</div><div class="pp-cost-amount">${fmt$(trueAnnual)}</div><div class="pp-cost-sub">Estimated annual cost after average aid — your number will vary by income and merit</div></div>`:'';

  const incomeBands=sc?`<div class="pp-income-hd">What Families Actually Pay (by Income)</div><div class="pp-income-table"><div class="pp-income-row"><span class="pp-income-lbl">Under $30k / yr</span><span class="pp-income-val">${fmt$(sc.netPrice.u30k)}/yr</span></div><div class="pp-income-row"><span class="pp-income-lbl">$30k – $48k</span><span class="pp-income-val">${fmt$(sc.netPrice._3048k)}/yr</span></div><div class="pp-income-row"><span class="pp-income-lbl">$48k – $75k</span><span class="pp-income-val">${fmt$(sc.netPrice._4875k)}/yr</span></div><div class="pp-income-row"><span class="pp-income-lbl">$75k – $110k</span><span class="pp-income-val">${fmt$(sc.netPrice._75110k)}/yr</span></div><div class="pp-income-row"><span class="pp-income-lbl">Over $110k</span><span class="pp-income-val">${fmt$(sc.netPrice._110kp)}/yr</span></div></div>`:''

  const scNote='<div class="pp-sc-note">&#128196; Estimated from College Scorecard data. Your actual cost will vary by income, merit, and athletic aid.</div>';

  const finSection='<div class="pp-section">'
    +'<div class="pp-section-title">Can I Afford It?</div>'
    +'<div class="pp-section-sub">Financial aid can change the cost significantly — these are starting estimates, not final numbers.</div>'
    +costCallout
    +(costRaw?`<div class="pp-row"><span class="pp-lbl">Full Cost of Attendance</span><span class="pp-val">${fmt$(costRaw)}/yr</span></div>`:'')
    +(aidRaw?`<div class="pp-row"><span class="pp-lbl">Average Aid Package</span><span class="pp-val">${fmt$(aidRaw)}</span></div>`:'')
    +incomeBands
    +(sc?`<div class="pp-row" style="margin-top:10px"><span class="pp-lbl">Students Who Get Aid</span><span class="pp-val">${sc.pctAid}%</span></div>`:'')
    +(sc?`<div class="pp-row"><span class="pp-lbl">Avg Student Debt</span><span class="pp-val">${fmt$(sc.avgDebt)}</span></div>`:'')
    +(sc?scNote:'')
    +'</div>';

  // ── Academic Fit zone ──
  let _admContext='';
  if(rmlLabel==='Likely') _admContext='<div class="pp-context-note">Your academic profile appears to be a strong fit for this school\'s admitted student range.</div>';
  else if(rmlLabel==='Match') _admContext='<div class="pp-context-note">Your profile is in range — this school admits a solid portion of applicants.</div>';
  else if(rmlLabel==='Reach') _admContext='<div class="pp-context-note">This school is selective. A strong application and coach support can make a real difference.</div>';

  const acadSection=sc?'<div class="pp-section">'
    +'<div class="pp-section-title">Can I Get In?</div>'
    +_admContext
    +`<div class="pp-row"><span class="pp-lbl">Admissions Fit</span><span class="pp-val">${sc.admRate}% admitted${rmlLabel?' &mdash; <strong>'+rmlLabel+'</strong>':''}</span></div>`
    +`<div class="pp-row"><span class="pp-lbl">GPA Range</span><span class="pp-val">${sc.gpaRange}</span></div>`
    +`<div class="pp-row"><span class="pp-lbl">SAT Middle 50%</span><span class="pp-val">${sc.satRange}</span></div>`
    +scNote
    +'</div>':'';

  // ── Life zone: campus + retention merged ──
  const enrRaw=parseInt((r['School Size (Enrollment)']||'').replace(/,/g,''))||0;
  const szLbl=enrRaw>=25000?'Very Large':enrRaw>=10000?'Large':enrRaw>=3000?'Medium':enrRaw>0?'Small':'';
  const enrRow=enrRaw?`<div class="pp-row"><span class="pp-lbl">Campus Size</span><span class="pp-val">${enrRaw.toLocaleString()} students${szLbl?' ('+szLbl+')':''}</span></div>`:'';
  const locRow=sc?`<div class="pp-row"><span class="pp-lbl">Location</span><span class="pp-val">${sc.location}</span></div>`:'';
  const genRow=sc?`<div class="pp-row"><span class="pp-lbl">Student Body</span><span class="pp-val">${sc.womenPct}% women</span></div>`:'';
  const relRow=r['Religious Affiliation']?`<div class="pp-row"><span class="pp-lbl">Affiliation</span><span class="pp-val">${r['Religious Affiliation']}</span></div>`:'';
  const hbcuRow2=r.HBCU==='Yes'?`<div class="pp-row"><span class="pp-lbl">HBCU</span><span class="pp-val">Yes</span></div>`:'';
  const lifeSection=(sc||enrRow||locRow||genRow||relRow||hbcuRow2)?'<div class="pp-section">'
    +'<div class="pp-section-title">Will I Like It Here?</div>'
    +enrRow+locRow+genRow+relRow+hbcuRow2
    +(sc?'<div class="pp-stat-grid" style="margin-top:12px">'
      +`<div class="pp-stat-tile"><div class="pp-stat-tile-val">${sc.retention}%</div><div class="pp-stat-tile-lbl">Students Stay</div></div>`
      +`<div class="pp-stat-tile"><div class="pp-stat-tile-val">${sc.grad4}%</div><div class="pp-stat-tile-lbl">Graduate in 4 Yrs</div></div>`
      +`<div class="pp-stat-tile"><div class="pp-stat-tile-val">${sc.grad6}%</div><div class="pp-stat-tile-lbl">Graduate in 6 Yrs</div></div>`
      +'</div>'+scNote:'')
    +'</div>':'';

  // ── "What Should I Do Next?" section ──
  const _inPipeNow=statusData[schoolName]&&statusData[schoolName]!=='none';
  const _nextItems=[];
  if(!_inPipeNow) _nextItems.push(`<div class="pp-next-action-item pp-next-note"><span class="pp-next-item-icon">📌</span>Save this school to your board to track your recruiting progress.</div>`);
  if(rl.startsWith('http')) _nextItems.push(`<a class="pp-next-action-item" href="${rl}" target="_blank" rel="noopener"><span class="pp-next-item-icon">📋</span>Fill out the recruiting interest form</a>`);
  if(coach&&coach.email) _nextItems.push(`<a class="pp-next-action-item" href="mailto:${coach.email}"><span class="pp-next-item-icon">✉️</span>Email ${coach.name||'the coach'} to introduce yourself</a>`);
  if(SCHOOL_URLS&&SCHOOL_URLS[schoolName]) _nextItems.push(`<a class="pp-next-action-item" href="${SCHOOL_URLS[schoolName]}" target="_blank" rel="noopener"><span class="pp-next-item-icon">🏟️</span>Visit the athletics website</a>`);
  const nextSection=_nextItems.length?'<div class="pp-section"><div class="pp-section-title">What Should I Do Next?</div><div class="pp-next-actions">'+_nextItems.join('')+'</div></div>':'';

  // ── Div / VC / Type badges ──
  const divBadge=divTag(r['Governing Body'],r['Division']);
  const vcBadge=vcTag(r['Varsity or Club']);
  const typeBadge=r['School Type']?'<span class="tag tag-other">'+r['School Type']+'</span>':'';
  const hbcuBadge=r.HBCU==='Yes'?'<span class="tag tag-hbcu">HBCU</span>':'';

  const body=
    '<div class="pp-hero">'
    +'<div class="pp-logo-wrap" id="pp-logo-wrap"><span class="pp-logo-init">&#x1F3C8;</span></div>'
    +'<div style="flex:1;min-width:0">'
    +'<div class="pp-school-name">'+r.School+'</div>'
    +'<div class="pp-school-meta">'+r.State+(r.Region?' &middot; '+r.Region:'')+'</div>'
    +(SCHOOL_URLS[schoolName]?'<a class="pp-website-link" href="'+SCHOOL_URLS[schoolName]+'" target="_blank" rel="noopener">Visit Athletics Site &#x2197;</a>':'')
    +'</div></div>'
    +sigHtml
    +'<div class="pp-status-row" id="pp-status-row"></div>'
    +'<div class="pp-map-wrap"><div id="pp-map"></div></div>'
    +whySection
    +'<div class="pp-section">'
    +'<div class="pp-section-title">Can I Play Here?</div>'
    +'<div class="pp-badges">'+divBadge+vcBadge+typeBadge+hbcuBadge+'</div>'
    +'<div class="pp-row"><span class="pp-lbl">Conference</span><span class="pp-val">'+(r['Flag Football Conference']||'Independent')+'</span></div>'
    +'<div class="pp-row"><span class="pp-lbl">Scholarships</span><span class="pp-val" style="font-size:11px;max-width:65%">'+(r['Scholarship Available (Y/N/Partial)']||'&mdash;')+'</span></div>'
    +notesHtml
    +coachHtml
    +'</div>'
    +acadSection
    +finSection
    +lifeSection
    +nextSection
    +'<div class="pp-section">'
    +'<div class="pp-section-title">My Notes</div>'
    +`<textarea class="pp-user-notes" placeholder="Add notes about this program…" oninput="ppSaveNote(this.value)">${(adminNotes[schoolName]||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>`
    +'</div>'
    +'<div style="height:32px"></div>';

  document.getElementById('pp-topbar-title').textContent=r.School;
  document.getElementById('pp-body').innerHTML=body;
  setTimeout(function(){_ppRenderStatusRow(schoolName);},10);

  const status=lsGet('juke_status');
  const inPipe=status[schoolName]&&status[schoolName]!=='none';
  const btn=document.getElementById('pp-pipeline-btn');
  btn.textContent=inPipe?'✓ On My Board':'+ My Board';
  btn.className='pp-pipeline-btn'+(inPipe?' added':'');
  const offerBtn=document.getElementById('pp-offer-btn');
  if(offerBtn)offerBtn.className='pp-offer-btn'+(offersData[schoolName]?' offered':'');

  setTimeout(function(){
    const wrap=document.getElementById('pp-logo-wrap');
    if(wrap)fetchSchoolLogo(schoolName,wrap);
  },50);

  setTimeout(function(){ppInitMap(schoolName,r.State);},80);

  document.getElementById('pp-overlay').classList.add('open');
  document.body.style.overflow='hidden';
}

function closeProgramProfile(e){
  if(e && e.target !== document.getElementById('pp-overlay')) return;
  document.getElementById('pp-overlay').classList.remove('open');
  document.body.style.overflow = '';
  _ppCurrent = null;
  ppDestroyMap();
}
let _ppMap=null;

function ppDestroyMap(){
  if(_ppMap){try{_ppMap.remove();}catch(e){}  _ppMap=null;}
  // Clear the container so Leaflet doesn't complain on re-open
  const el=document.getElementById('pp-map');
  if(el)el.innerHTML='';
}

function ppInitMap(schoolName,state){
  ppDestroyMap();
  const el=document.getElementById('pp-map');
  if(!el||typeof L==='undefined')return;

  _ppMap=L.map(el,{
    zoomControl:false,scrollWheelZoom:false,dragging:true,
    touchZoom:true,doubleClickZoom:true,attributionControl:false,keyboard:false
  });
  L.control.zoom({position:'bottomright'}).addTo(_ppMap);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(_ppMap);
  _ppMap.setView([39.5,-98.35],3);

  // State abbreviation → full name for better geocode matching
  const STATE_NAMES={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
  const stateFull=STATE_NAMES[state]||state;

  // Append "University" when name lacks a higher-ed keyword — avoids matching
  // shorter geographic or church names (e.g. "Arizona" → "Arizona University")
  const needsSuffix=!/university|college|institute|tech|academy|seminary/i.test(schoolName);
  const queryName=needsSuffix?schoolName+' University':schoolName;
  const q=encodeURIComponent(queryName+' '+stateFull);

  // Fetch up to 5 candidates and pick the one whose address matches the state
  fetch('https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&countrycodes=us&q='+q)
    .then(r=>r.json())
    .then(results=>{
      if(!results||!results.length||!_ppMap)return;
      // Prefer a result whose state field matches
      const best=results.find(r=>{
        const a=r.address||{};
        return a.state===stateFull||a.state_code===state||(a.state||'').includes(stateFull.split(' ')[0]);
      })||results[0];
      const lat=parseFloat(best.lat);
      const lng=parseFloat(best.lon);
      _ppMap.setView([lat,lng],14);

      const domain=SCHOOL_DOMAINS&&SCHOOL_DOMAINS[schoolName];
      const logoUrl=domain?`https://www.google.com/s2/favicons?domain=${domain}&sz=64`:null;
      const initials=(_logoInitials&&_logoInitials(schoolName))||schoolName.slice(0,2).toUpperCase();

      const imgHtml=logoUrl
        ?`<img src="${logoUrl}" style="width:28px;height:28px;object-fit:contain;display:block;" onerror="this.style.display='none';this.nextSibling.style.display='block'"/><span style="display:none;font-size:11px;font-weight:700;color:#1D1D1F">${initials}</span>`
        :`<span style="font-size:11px;font-weight:700;color:#1D1D1F">${initials}</span>`;

      const iconHtml=`<div style="display:flex;flex-direction:column;align-items:center"><div style="width:42px;height:42px;border-radius:50%;background:#fff;border:2.5px solid #FF0080;overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,.22);display:flex;align-items:center;justify-content:center;">${imgHtml}</div><div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid #FF0080;margin-top:-1px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.18))"></div></div>`;

      const icon=L.divIcon({html:iconHtml,iconSize:[42,54],iconAnchor:[21,54],className:''});
      if(_ppMap)L.marker([lat,lng],{icon}).addTo(_ppMap);
    })
    .catch(()=>{});
}


function ppTogglePipeline(){
  if(!_ppCurrent) return;
  const status = lsGet('juke_status');
  const cur = status[_ppCurrent];
  if(cur && cur !== 'none'){
    status[_ppCurrent] = 'none';
  } else {
    status[_ppCurrent] = 'saved';
    // Also show a brief toast
    showToast(`${_ppCurrent} added to your board`);
  }
  lsSet('juke_status', status);
  const inPipe = status[_ppCurrent] !== 'none';
  const btn = document.getElementById('pp-pipeline-btn');
  btn.textContent = inPipe ? '✓ On My Board' : '+ My Board';
  btn.className = 'pp-pipeline-btn' + (inPipe?' added':'');
  renderCards();
}


function ppSetStatus(key){
  if(!_ppCurrent) return;
  if(key === 'none'){
    delete statusData[_ppCurrent];
  } else {
    statusData[_ppCurrent] = key;
  }
  lsSet('juke_status', statusData);
  cloudSave();
  // Refresh status row in panel
  _ppRenderStatusRow(_ppCurrent);
  // Refresh table/cards in background
  render();
  // Update pipeline button
  const inPipe = statusData[_ppCurrent] && statusData[_ppCurrent] !== 'none';
  const btn = document.getElementById('pp-pipeline-btn');
  if(btn){
    btn.textContent = inPipe ? '\u2713 On My Board' : '+ My Board';
    btn.className = 'pp-pipeline-btn' + (inPipe ? ' added' : '');
  }
}

function _ppRenderStatusRow(schoolName){
  const el = document.getElementById('pp-status-row');
  if(!el) return;
  const cur = statusData[schoolName] || 'none';
  const stages = [{key:'saved',label:'Saved'},{key:'contacting',label:'Contacting'},{key:'applied',label:'Applied'},{key:'committed',label:'Committed'}];
  el.innerHTML = stages.map(function(s){
    var active = cur===s.key ? ' active' : '';
    return '<button class="pp-status-pill s-'+s.key+active+'" data-key="'+s.key+'" onclick="ppSetStatus(this.dataset.key)">'+s.label+'</button>';
  }).join('') + (cur!=='none' ? '<button class="pp-status-remove" onclick="ppSetStatus(this.dataset.key)" data-key="none">&#x2715; Remove</button>' : '');
}

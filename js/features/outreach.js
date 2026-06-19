// ── EMAIL TEMPLATES ───────────────────────────────────────
function applyEmailTemplate(type){
  document.querySelectorAll('.et-chip').forEach(function(c){c.classList.remove('active');});
  var btn=document.querySelector('.et-chip[onclick*="\''+type+'\'"]');
  if(btn)btn.classList.add('active');
  var first=pv('p-fname'),last=pv('p-lname');
  var name=(first+' '+last).trim()||'[Your Name]';
  var gradyr=pv('p-gradyr')||'[Year]';
  var pos=getPositions().join(' / ')||'[Position]';
  var school=pv('p-school')||'[Your School]';
  var gpaVal=pv('p-gpa');
  var coachName=pv('p-coach-name')||'Coach';
  var university=pv('p-university')||'[University]';
  var draft='';
  if(type==='intro'){
    draft='Dear '+coachName+',\n\nMy name is '+name+', a Class of '+gradyr+' '+pos+' from '+school+'. I have been following '+university+'\'s program closely and would love to be part of what you are building.\n\n'+(gpaVal?'I currently hold a '+gpaVal+' unweighted GPA. ':'')+' I am a dedicated competitor who brings discipline to the classroom and the field. My JUKE recruiting profile and film links are included below.\n\nI would love the opportunity to speak with you about my fit in your program. Thank you for your time.\n\nRespectfully,\n'+name;
  }else if(type==='followup'){
    draft='Dear '+coachName+',\n\nI wanted to follow up after a recent camp and make sure you had a chance to see my film. I am '+name+', a Class of '+gradyr+' '+pos+' from '+school+'.\n\n'+(gpaVal?'I bring both athletic ability and academic commitment to every program I pursue — my current GPA is '+gpaVal+'.\n\n':'')+' I believe my skill set is a strong fit for '+university+' and I would love to set up a time to connect.\n\nThank you for your consideration.\n\nRespectfully,\n'+name;
  }else if(type==='thankyou'){
    draft='Dear '+coachName+',\n\nI wanted to personally thank you for the opportunity to visit '+university+'. The experience exceeded my expectations — the culture your staff has built is something I am genuinely excited about.\n\nI left with a clear picture of how I can contribute, both on the field and in the classroom. '+university+' is a serious option for me and I wanted you to know that.\n\nI look forward to staying in touch. Please reach out any time.\n\nWith gratitude,\n'+name;
  }else if(type==='info'){
    draft='Dear '+coachName+',\n\nMy name is '+name+', a Class of '+gradyr+' '+pos+' from '+school+'. I am actively exploring programs at the collegiate level and '+university+' has stood out to me.\n\nI would love to learn more about your program — including roster needs for the '+gradyr+' class and opportunities for a visit.'+(gpaVal?' My current GPA is '+gpaVal+'.' :'')+'\n\nI have attached my JUKE recruiting profile for your review. Thank you for your time.\n\nRespectfully,\n'+name;
  }
  var ta=document.getElementById('p-intro');
  if(ta){ta.value=draft;saveProfile();profileUpdate();}
}

// ── PROFILE EMAIL PREVIEW & COPY ─────────────────────────
function pv(id){return((document.getElementById(id)||{}).value||'').trim();}
function ph(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');}

function draftIntro(){
  const ta=document.getElementById('p-intro');
  if(!ta)return;
  const first=pv('p-fname'),last=pv('p-lname');
  const name=(first+' '+last).trim();
  const coach=pv('p-coach-name')||'Coach';
  const uni=pv('p-university');
  const year=pv('p-gradyr');
  const pos=getPositions();
  const gpa=pv('p-gpa');
  const major=pv('p-major');
  const school=pv('p-school');

  const nameLine=name?`My name is ${name}`:`I`;
  const classLine=year?` in the Class of ${year}`:'';
  const posLine=pos.length?` who plays ${pos.join(' and ')}`:'';
  const schoolLine=school?` at ${school}`:'';
  const uniLine=uni?`your program at ${uni}`:'your flag football program';
  const gpaLine=gpa?` I carry a ${gpa} GPA${major?' and am interested in studying '+major:''}.`:(major?` I plan to study ${major}.`:'');
  const closingUni=uni?`${uni}`:'your university';

  const draft=`${nameLine}${posLine}${classLine}${schoolLine}, and I am reaching out because I have a strong interest in ${uniLine}.${gpaLine}

After researching ${closingUni}, I believe it aligns closely with both my academic and athletic goals. I would love the opportunity to contribute to your program and compete at the next level.

I have attached my recruiting profile for your review and would welcome any chance to connect further. Thank you for your time, ${coach}.`;

  ta.value=draft;
  profileUpdate();
}



// ── Highlight rail ────────────────────────────────────────────────────────────
function updateHighlightRail(){
  const p = lsGet('juke_player') || {};
  const positions = p._positions || [];
  const hasFilm = !!(p['p-highlight'] || p['p-gamefilm']);
  const hasStats = !!(p['p-gpa'] || p['p-height'] || p['p-forty'] || p['p-vertical']);
  const hasPos   = positions.length > 0;
  const hasAcad  = !!(p['p-gpa'] || p['p-sat'] || p['p-act'] || p['p-major']);
  const tracked  = Object.keys(lsGet('juke_status')||{}).length;

  const mark = (id, has) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.classList.toggle('has-content', has);
    el.querySelector('.hl-ring').classList.toggle('empty', !has);
  };
  mark('hl-film', hasFilm);
  mark('hl-stats', hasStats);
  mark('hl-positions', hasPos);
  mark('hl-academic', hasAcad);

  const pipeEl = document.getElementById('hl-pipeline');
  const pipeRing = document.getElementById('hl-pipeline-ring');
  const pipeLbl = document.getElementById('hl-pipeline-lbl');
  if(pipeEl){ pipeEl.classList.toggle('has-content', tracked > 0); }
  if(pipeRing){ pipeRing.classList.toggle('empty', tracked === 0); }
  if(pipeLbl){ pipeLbl.textContent = tracked > 0 ? tracked + ' Schools' : 'My Board'; }
}

function hlOpen(type){
  const p = lsGet('juke_player') || {};
  const modal = document.getElementById('hl-modal');
  const title = document.getElementById('hl-modal-title');
  const body  = document.getElementById('hl-modal-body');
  if(!modal) return;

  if(type === 'film'){
    title.textContent = 'Film';
    const hl = p['p-highlight']||'';
    const gf = p['p-gamefilm']||'';
    if(!hl && !gf){
      body.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Add your Hudl or film links in <strong>Step 3: Recruiting</strong> of your profile.</p>';
    } else {
      body.innerHTML = (hl ? '<div style="margin-bottom:12px"><div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-dim);margin-bottom:6px">Highlight Reel</div><a href="'+hl+'" target="_blank" rel="noopener" style="color:#0057FF;font-size:13px;word-break:break-all">'+hl+'</a></div>' : '')
        + (gf ? '<div><div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-dim);margin-bottom:6px">Game Film</div><a href="'+gf+'" target="_blank" rel="noopener" style="color:#0057FF;font-size:13px;word-break:break-all">'+gf+'</a></div>' : '');
    }
  } else if(type === 'stats'){
    title.textContent = 'Athletic Stats';
    const rows = [
      ['Height', p['p-height']],
      ['40-Yard Dash', p['p-forty']],
      ['Vertical', p['p-vertical']],
    ].filter(r=>r[1]);
    body.innerHTML = rows.length
      ? rows.map(r=>'<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--text-muted)">'+r[0]+'</span><span style="font-family:\'Archivo Condensed\',sans-serif;font-size:15px;font-weight:700">'+r[1]+'</span></div>').join('')
      : '<p style="color:var(--text-muted);font-size:13px">Add your stats in <strong>Step 2: Athletic</strong> of your profile.</p>';
  } else if(type === 'positions'){
    title.textContent = 'Positions';
    const pos = p._positions||[];
    body.innerHTML = pos.length
      ? '<div style="display:flex;flex-wrap:wrap;gap:8px">'+pos.map(p=>'<span style="font-family:\'Archivo Condensed\',sans-serif;font-size:13px;font-weight:700;font-style:italic;text-transform:uppercase;padding:6px 14px;border-radius:20px;background:#FF0080;color:#fff">'+p+'</span>').join('')+'</div>'
      : '<p style="color:var(--text-muted);font-size:13px">Select your positions in <strong>Step 2: Athletic</strong> of your profile.</p>';
  } else if(type === 'academic'){
    title.textContent = 'Academics';
    const rows = [
      ['GPA', p['p-gpa']],
      ['SAT', p['p-sat']],
      ['ACT', p['p-act']],
      ['Intended Major', p['p-major']],
    ].filter(r=>r[1]);
    body.innerHTML = rows.length
      ? rows.map(r=>'<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--text-muted)">'+r[0]+'</span><span style="font-family:\'Archivo Condensed\',sans-serif;font-size:15px;font-weight:700">'+r[1]+'</span></div>').join('')
      : '<p style="color:var(--text-muted);font-size:13px">Add your academic info in <strong>Step 1: About You</strong> of your profile.</p>';
  }

  modal.style.display = 'flex';
  if(window.JukeDialog) window.JukeDialog.open(modal, {close: closeHlModal});
}

function closeHlModal(){
  const m = document.getElementById('hl-modal');
  if(m) {
    m.style.display = 'none';
    if(window.JukeDialog) window.JukeDialog.close(m);
  }
}

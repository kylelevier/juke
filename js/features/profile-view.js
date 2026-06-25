// ── PROFILE COMPLETENESS SCORE ───────────────────────────
function calcProfileScore(){
  var p=lsGet('juke_player')||{};
  function g(k){
    if(p[k]!==undefined&&p[k]!==null&&p[k]!=='')return p[k];
    var s=k.replace(/^[ps]-/,'').replace(/-/g,'');
    return(p[s]!==undefined&&p[s]!==null&&p[s]!=='')? p[s]:'';
  }
  var fields=[g('p-fname'),g('p-lname'),g('p-gradyr'),g('p-city'),g('p-school'),g('p-email'),
    g('p-highlight'),g('p-gamefilm'),g('p-intro'),g('p-word1'),g('p-gpa'),g('p-sat'),
    g('p-height'),g('p-weight'),g('p-forty'),g('p-vertical')];
  var filled=fields.filter(function(v){return v&&v!=='';}).length;
  var positions=p.positions||p._positions||[];
  if(positions.length) filled+=2;
  if(localStorage.getItem('juke_avatar')) filled+=1;
  return Math.min(100,Math.round((filled/(fields.length+3))*100));
}

function _profileNextStep(score){
  if(score===100)return'Profile complete ✓';
  if(score<20)return'Add your name and grad year';
  if(score<40)return'Add your highlight film link';
  if(score<60)return'Add your GPA and city';
  if(score<80)return'Write a short bio (In Her Own Words)';
  return'Add measurables and season stats';
}

function updateHeaderProfileProgress(){
  var el=document.getElementById('hd-profile-progress');
  if(!el) return;
  var score=calcProfileScore();
  if(score===0){el.style.display='none';return;}
  var color=score<40?'#FF4D4D':score<70?'#FF9800':'var(--columbia)';
  el.style.display='flex';
  el.title='Next: '+_profileNextStep(score);
  el.innerHTML=
    '<div class="hd-prog-bar"><div class="hd-prog-fill" style="width:'+score+'%;background:'+color+'"></div></div>'
    +'<div class="hd-prog-wrap">'
    +'<span class="hd-prog-pct" style="color:'+color+'">'+score+'%</span>'
    +'<span class="hd-prog-lbl">Profile</span>'
    +'</div>';
}

// ── PROFILE READ VIEW (dark card) ────────────────────────
function pv(id){
  const el=document.getElementById(id);
  return el ? (el.value||'') : '';
}

function ph(value){
  return String(value||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function renderProfileView(){
  var container=document.getElementById('profile-view');
  if(!container)return;
  var p=lsGet('juke_player')||{};
  // Support both short keys (fname) saved by saveProfile() and
  // prefixed keys (p-fname / s-fname) used by saved profile data
  function g(id){
    if(p[id]!==undefined&&p[id]!==null&&p[id]!=='') return p[id];
    var short=id.replace(/^[ps]-/,'').replace(/-/g,'');
    if(p[short]!==undefined&&p[short]!==null&&p[short]!=='') return p[short];
    // also try with hyphens stripped differently (def-int → defint)
    return '';
  }
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function dsbox(v,l){return '<div class="dpc-stat-box"><div class="dpc-stat-val">'+esc(v)+'</div><div class="dpc-stat-lbl">'+l+'</div></div>';}
  function dsec(title,body){return '<div class="dpc-section"><div class="dpc-section-title">'+title+'</div>'+body+'</div>';}

  var first=g('p-fname'),last=g('p-lname');
  var highlight=g('p-highlight'),gamefilm=g('p-gamefilm'),profileurl=g('p-profileurl');
  var gpa=g('p-gpa'),sat=g('p-sat'),act=g('p-act'),major=g('p-major'),honors=g('p-honors');
  var gradyr=g('p-gradyr');
  var height=g('p-height'),weight=g('p-weight'),forty=g('p-forty'),vertical=g('p-vertical'),twenty=g('p-twenty'),broad=g('p-broad'),shuttle=g('p-shuttle');
  var verifiedSource=p.verifiedSource||p['p-verified-source']||p.verifiedMeasurables?.twenty?.source||p.verifiedMeasurables?.shuttle?.source||p.verifiedMeasurables?.broad?.source||'';
  var verifiedDate=p.verifiedDate||p['p-verified-date']||p.verifiedMeasurables?.twenty?.verifiedAt||p.verifiedMeasurables?.shuttle?.verifiedAt||p.verifiedMeasurables?.broad?.verifiedAt||'';
  var events=Array.isArray(p.events)?p.events:[];
  if(!events.length&&(p.eventName||p['p-event-name'])){
    events=[{
      name:p.eventName||p['p-event-name']||'',
      date:p.eventDate||p['p-event-date']||'',
      location:p.eventLocation||p['p-event-location']||'',
      source:p.eventSource||p['p-event-source']||'',
      verified:(p.eventSource||p['p-event-source']||'')==='USA Football'
    }];
  }
  if(!twenty)twenty=p.verifiedMeasurables?.twenty?.value||'';
  if(!shuttle)shuttle=p.verifiedMeasurables?.shuttle?.value||'';
  if(!broad)broad=p.verifiedMeasurables?.broad?.value||'';
  var email=g('p-email'),phone=g('p-phone'),parent=g('p-parent'),city=g('p-city'),school=g('p-school'),clubTeam=g('p-club-team');
  var intro=g('p-intro');
  var word1=g('p-word1'),word2=g('p-word2'),word3=g('p-word3');
  var sport1=g('p-sport1'),sport1pos=g('p-sport1pos'),sport2=g('p-sport2'),sport2pos=g('p-sport2pos');
  var positions=p.positions||p._positions||
    Array.from(document.querySelectorAll('#pos-grid .pos-chip.selected input')).map(function(i){return i.value;});
  var gp=g('s-gp'),comp=g('s-comp'),att=g('s-att'),ptd=g('s-ptd'),pyds=g('s-pyds');
  var rec=g('s-rec'),ryds=g('s-ryds'),rtd=g('s-rtd'),ruyds=g('s-ruyds'),rutd=g('s-rutd');
  var flags=g('s-flags'),defint=p.defint||p['s-def-int']||'',sacks=g('s-sacks'),dtd=g('s-dtd');

  var hasData=first||highlight||gpa||height||forty||positions.length||intro||(Array.isArray(p._recommendations)&&p._recommendations.length);
  if(!hasData){
    container.innerHTML='<div class="pv-empty-state pv-welcome-state">'
      +'<div class="pv-welcome-badge">Your Recruiting Profile</div>'
      +'<div class="pv-welcome-title">Coaches are looking for athletes like you.</div>'
      +'<div class="pv-welcome-sub">Your profile is the first thing a college coach sees. It takes about 10 minutes to build — and it stays in front of every recruiter in the system.</div>'
      +'<div class="pv-welcome-checklist">'
      +'<div class="pv-wc-item"><span class="pv-wc-dot"></span><span>A photo and your basic info</span></div>'
      +'<div class="pv-wc-item"><span class="pv-wc-dot"></span><span>Your highlight film link (most important)</span></div>'
      +'<div class="pv-wc-item"><span class="pv-wc-dot"></span><span>Your GPA and test scores</span></div>'
      +'<div class="pv-wc-item"><span class="pv-wc-dot"></span><span>Season stats and a short bio</span></div>'
      +'</div>'
      +'<button class="pv-edit-btn pv-welcome-btn" onclick="openProfileEdit()">Build My Profile →</button>'
      +'<div class="pv-welcome-note">Free · Auto-saves · Visible to verified college coaches</div>'
      +'</div>';
    return;
  }

  var html='';
  var fullName=(first+' '+last).trim()||'Your Name';

  // ── PUBLISH BANNER — visible whenever profile is not yet live ──
  var isPublished=!!(lsGet('juke_publish')||{}).on;
  if(!isPublished){
    html+='<div class="pv-publish-banner">'
      +'<span class="pv-publish-icon">🔒</span>'
      +'<span class="pv-publish-msg">Your profile is in draft — coaches can\'t find you yet.</span>'
      +'<button class="pv-publish-btn" onclick="openProfileEdit();setTimeout(function(){goStep(5);},50)">Go Live →</button>'
      +'</div>';
  }

  // ── HERO CARD ──
  var initials=((first[0]||'')+(last[0]||'')).toUpperCase()||'?';
  var avatarRaw=localStorage.getItem('juke_avatar');
  var avatarSrc=avatarRaw?JSON.parse(avatarRaw):null;
  var avatarHtml=avatarSrc
    ?'<img src="'+esc(avatarSrc)+'" alt=""/>'
    :'<span>'+esc(initials)+'</span>';
  var bannerRaw=localStorage.getItem('juke_banner');
  var bannerSrc=bannerRaw?JSON.parse(bannerRaw):null;
  var bannerStyle=bannerSrc?'background-image:url('+bannerSrc+');background-size:cover;background-position:center top;':'';
  var posPills=positions.map(function(pos){return '<span class="dpc-pos-pill">'+esc(pos)+'</span>';}).join('');
  var metaPills='';
  if(gradyr)metaPills+='<span class="dpc-meta-pill">Class of \''+esc(gradyr.toString().slice(-2))+'</span>';
  if(city)metaPills+='<span class="dpc-meta-pill">'+esc(city)+'</span>';
  html+='<div class="dark-profile-card">'
    +'<div class="dpc-banner" style="'+bannerStyle+'">'+(bannerSrc?'':'<div class="dpc-banner-grid"></div><div class="dpc-banner-glow"></div>')+'</div>'
    +'<div class="dpc-hero-body">'
    +'<div class="dpc-avatar">'+avatarHtml+'</div>'
    +'<div class="dpc-info">'
    +'<div class="dpc-name">'+esc(fullName)+'</div>'
    +(posPills||metaPills?'<div class="dpc-pill-row">'+posPills+metaPills+'</div>':'')
    +([school,clubTeam].filter(Boolean).map(function(t){return '<span class="dpc-school-tag">'+esc(t)+'</span>';}).join('')
      ? '<div class="dpc-school">'+[school,clubTeam].filter(Boolean).map(function(t){return '<span class="dpc-school-tag">'+esc(t)+'</span>';}).join('')+'</div>'
      : '')
    +'</div></div></div>';

  // ── FILM CTA ──
  if(highlight||gamefilm||profileurl){
    var filmHtml='<span class="dpc-film-label">Film</span>';
    if(highlight)filmHtml+='<a href="'+esc(highlight)+'" target="_blank" rel="noopener" class="dpc-film-pri">▶ Watch Highlight Reel</a>';
    if(gamefilm)filmHtml+='<a href="'+esc(gamefilm)+'" target="_blank" rel="noopener" class="dpc-film-sec">🎬 Game Film</a>';
    if(profileurl)filmHtml+='<a href="'+esc(profileurl)+'" target="_blank" rel="noopener" class="dpc-film-sec">👤 Full Profile</a>';
    html+='<div class="dpc-film">'+filmHtml+'</div>';
  }

  // ── IDENTITY GRID: ACADEMIC + ATHLETIC ──
  var acItems=[],atItems=[];
  if(gpa)acItems.push([gpa,'GPA']);
  if(sat)acItems.push([sat,'SAT']);
  if(act)acItems.push([act,'ACT']);
  if(major)acItems.push([major,'Major']);
  if(height)atItems.push([height,'Height']);
  if(forty)atItems.push([forty,'40-Yard']);
  if(vertical)atItems.push([vertical,'Vertical']);
  if(weight)atItems.push([weight+' lbs','Weight']);
  if(acItems.length||atItems.length){
    var acCol=acItems.map(function(r){return '<div class="dpc-id-stat"><span class="dpc-id-val">'+esc(r[0])+'</span><span class="dpc-id-lbl">'+r[1]+'</span></div>';}).join('');
    var atCol=atItems.map(function(r){return '<div class="dpc-id-stat"><span class="dpc-id-val">'+esc(r[0])+'</span><span class="dpc-id-lbl">'+r[1]+'</span></div>';}).join('');
    html+='<div class="dpc-identity">'
      +'<div class="dpc-id-col"><div class="dpc-id-title">Academic</div>'+acCol+'</div>'
      +'<div class="dpc-id-div"></div>'
      +'<div class="dpc-id-col"><div class="dpc-id-title">Athletic</div>'+atCol+'</div>'
      +'</div>';
  }

  // ── ATHLETE STATEMENT ──
  if(intro){
    html+=dsec('In Her Own Words','<div class="dpc-statement">'+esc(intro)+'</div>');
  }

  // ── COACH ENDORSEMENTS ──
  var allEnds=[];
  if(Array.isArray(p._recommendations)){
    allEnds=p._recommendations;
  }
  var fullNameKey=fullName.toLowerCase();
  var seenEnds={};
  var receivedEnds=allEnds.filter(function(e){
    if(!e||e.status!=='endorsed')return false;
    var athlete=(e.athleteName||'').toLowerCase();
    if(athlete&&athlete!==fullNameKey)return false;
    var key=[e.coachName,e.coachSchool,e.endorsementText].join('|').toLowerCase();
    if(seenEnds[key])return false;
    seenEnds[key]=true;
    return true;
  });
  if(receivedEnds.length){
    receivedEnds.forEach(function(e){
      html+='<div class="dpc-end-block">'
        +'<div class="dpc-end-top"><span class="dpc-end-verified">✓ Coach Verified</span>'
        +'<span class="dpc-end-coach"><strong>'+esc(e.coachName)+'</strong>'+(e.coachTitle?' · '+esc(e.coachTitle):'')+(e.coachSchool?' · '+esc(e.coachSchool):'')+'</span></div>'
        +'<div class="dpc-end-quote">&#8220;'+esc(e.endorsementText)+'&#8221;</div>'
        +'</div>';
    });
  }

  // ── HOW SHE COMPETES (three words) ──
  var words=[word1,word2,word3].filter(Boolean);
  if(words.length){
    var chips=words.map(function(w){return '<span class="dpc-tw-chip">'+esc(w)+'</span>';}).join('');
    html+=dsec('How She Competes','<div class="dpc-tw-row">'+chips+'</div>');
  }

  // ── MULTI-SPORT ──
  var sports=[];
  if(sport1)sports.push('🏈 Flag Football'+(positions.length?' — '+positions.slice(0,2).join(' / '):'')+' (Primary)');
  if(sport1&&sport1pos)sports=[]; // rebuild with actual data
  var sportChips=[];
  if(sport1)sportChips.push('<div class="dpc-sport-chip">'+esc(sport1)+(sport1pos?' — '+esc(sport1pos):'')+'</div>');
  if(sport2)sportChips.push('<div class="dpc-sport-chip">'+esc(sport2)+(sport2pos?' — '+esc(sport2pos):'')+'</div>');
  if(sportChips.length){
    html+=dsec('Multi-Sport Athlete','<div class="dpc-sport-row">'+sportChips.join('')+'</div>');
  }

  // ── SEASON STATS ──
  var off=[[gp,'Games'],[pyds,'Pass Yds'],[ptd,'Pass TDs'],[(comp&&att)?comp+'/'+att:'','Comp/Att'],[rec,'Receptions'],[ryds,'Rec Yds'],[rtd,'Rec TDs'],[ruyds,'Rush Yds'],[rutd,'Rush TDs']].filter(function(r){return r[0];});
  var def=[[flags,'Flags'],[defint,'INTs'],[sacks,'Sacks'],[dtd,'Def TDs']].filter(function(r){return r[0];});
  if(off.length||def.length){
    var si='';
    if(off.length)si+='<div class="dpc-stats-lbl">Offensive</div><div class="dpc-stats-grid">'+off.map(function(r){return dsbox(r[0],r[1]);}).join('')+'</div>';
    if(def.length)si+='<div class="dpc-stats-lbl">Defensive</div><div class="dpc-stats-grid">'+def.map(function(r){return dsbox(r[0],r[1]);}).join('')+'</div>';
    html+=dsec('Season Stats',si);
  }

  // ── AWARDS ──
  var fa=(typeof profileAwards!=='undefined')?profileAwards.filter(function(a){return a.val;}):[];
  if(fa.length){
    var awHtml=fa.map(function(a){return '<div class="dpc-award-item">🏆 <span>'+esc(a.val)+'</span>'+(a.yr?'<span class="dpc-award-yr">'+esc(a.yr)+'</span>':'')+'</div>';}).join('');
    html+=dsec('Awards &amp; Honors',awHtml);
  }

  // ── USA FOOTBALL VERIFIED TESTS ──
  var verifiedTests=[[twenty,'20-Yard'],[shuttle,'5-10-5'],[broad,'Broad Jump']].filter(function(r){return r[0];});
  if(verifiedTests.length){
    var verifiedSub=(verifiedSource||verifiedDate)
      ? '<div class="dpc-stats-lbl">'+esc([verifiedSource,verifiedDate].filter(Boolean).join(' · '))+'</div>'
      : '';
    html+=dsec('USA Football Verified Tests',verifiedSub+'<div class="dpc-stats-grid">'+verifiedTests.map(function(r){return dsbox(r[0],r[1]);}).join('')+'</div>');
  }

  // ── EVENT ATTENDANCE ──
  if(events.length){
    var eventHtml=events.map(function(ev){
      var meta=[ev.date,ev.location,ev.source].filter(Boolean).map(esc).join(' · ');
      return '<div class="dpc-award-item">📍 <span>'+esc(ev.name||'Event')+'</span>'+(meta?'<span class="dpc-award-yr">'+meta+'</span>':'')+(ev.verified?' <span class="dpc-meta-pill">Verified</span>':'')+'</div>';
    }).join('');
    html+=dsec('Event Attendance',eventHtml);
  }

  // ── CONTACT ──
  if(email||phone){
    var contactHtml='';
    if(email)contactHtml+='<div class="dpc-id-stat"><span class="dpc-id-lbl">Email</span><span class="dpc-id-val" style="font-size:13px;padding-left:4px;">'+esc(email)+'</span></div>';
    if(phone)contactHtml+='<div class="dpc-id-stat"><span class="dpc-id-lbl">Phone</span><span class="dpc-id-val" style="font-size:13px;padding-left:4px;">'+esc(phone)+'</span></div>';
    if(parent)contactHtml+='<div class="dpc-id-stat"><span class="dpc-id-lbl">Parent</span><span class="dpc-id-val" style="font-size:13px;padding-left:4px;">'+esc(parent)+'</span></div>';
    html+=dsec('Contact',contactHtml);
  }

  container.innerHTML='<div class="dpc-inner">'+html+'</div>';
  updateHeaderProfileProgress();
}

function openProfileEdit(){
  var v=document.getElementById('profile-view'),eb=document.getElementById('pv-edit-bar'),e=document.getElementById('profile-edit');
  if(v)v.style.display='none';
  if(eb)eb.style.display='none';
  if(e){e.style.display='block';e.scrollIntoView({behavior:'smooth',block:'start'});}
}

function closeProfileEdit(){
  var v=document.getElementById('profile-view'),eb=document.getElementById('pv-edit-bar'),e=document.getElementById('profile-edit');
  if(e)e.style.display='none';
  if(v)v.style.display='';
  if(eb)eb.style.display='';
  renderProfileView();
}

// ── PROFILE COMPLETENESS SCORE ───────────────────────────
function updateCompletenessScore(){
  var pctEl=document.getElementById('pvc-pct');
  var barEl=document.getElementById('pvc-bar-fill');
  var nudgeEl=document.getElementById('pvc-nudge');
  if(!pctEl||!barEl||!nudgeEl)return;
  var first=pv('p-fname'),last=pv('p-lname');
  var gradyr=pv('p-gradyr');
  var positions=getPositions();
  if(!positions.length){var _pd=lsGet('juke_player');if(_pd)positions=_pd.positions||_pd._positions||[];}
  var height=pv('p-height');
  var gpa=pv('p-gpa');
  var highlight=pv('p-highlight');
  var intro=pv('p-intro');
  var gp=pv('s-gp');
  var school=pv('p-school'),clubTeam=pv('p-club-team');
  var sat=pv('p-sat'),act=pv('p-act');
  var score=0,missing=[];
  if(first&&last){score+=10;}else{missing.push('Add your full name');}
  if(gradyr){score+=5;}else{missing.push('Add your graduation year');}
  if(positions.length){score+=10;}else{missing.push('Select your position(s)');}
  if(height){score+=5;}else{missing.push('Add your height');}
  if(gpa){score+=10;}else{missing.push('Add your GPA — coaches always check');}
  if(highlight){score+=25;}else{missing.push('Add a highlight reel — it\'s the #1 thing coaches watch');}
  if(intro){score+=15;}else{missing.push('Write an intro message to coaches');}
  if(gp){score+=10;}else{missing.push('Add your season stats');}
  if(school||clubTeam){score+=5;}else{missing.push('Add your high school or club team');}
  if(sat||act){score+=5;}else{missing.push('Add your SAT or ACT score');}
  score=Math.min(100,score);
  if(score>=40 && window.JukeOnboarding){
    JukeOnboarding.mark('athlete','profileStarted',{score});
  }
  pctEl.textContent=score+'%';
  barEl.style.width=score+'%';
  barEl.style.background=score<40?'#FF4D4D':score<70?'#FF9800':'#FF0080';
  if(score===100){nudgeEl.textContent='✓ Complete — your profile is showing up in coach searches';}
  else if(score===0){nudgeEl.textContent='Start with your name and a photo — you\'re one step from being visible.';}
  else if(missing.length){nudgeEl.textContent=missing[0];}
}



function updateAthleteHeader(){
  const sd = lsGet('juke_status');
  const tracked   = Object.keys(sd).length;
  const contacted = Object.values(sd).filter(v=>v==='contacted').length;
  const applied   = Object.values(sd).filter(v=>v==='applied').length;
  const committed = Object.values(sd).filter(v=>v==='committed').length;
  const el = id => document.getElementById(id);
  const pipeBar = el('athlete-pipeline-bar');
  if(pipeBar){
    if(tracked === 0){
      pipeBar.innerHTML = 'Add schools to your pipeline to get started';
    } else if(committed > 0){
      pipeBar.innerHTML = 'Committed · <strong>'+tracked+'</strong> program'+(tracked!==1?'s':'')+' tracked';
    } else {
      pipeBar.innerHTML = '<strong>'+tracked+'</strong> program'+(tracked!==1?'s':'')+' on your board';
    }
  }

  // Name + avatar initials
  const fname = document.getElementById('p-fname')?.value||'';
  const lname = document.getElementById('p-lname')?.value||'';
  const nameEl = el('athlete-display-name');
  const avatarEl = el('athlete-avatar-initials');
  const tagEl = el('athlete-tagline');
  if(nameEl){
    if(fname||lname){
      nameEl.textContent = (fname+' '+lname).trim().toUpperCase();
      nameEl.classList.remove('placeholder');
    } else {
      nameEl.textContent = 'Your Name';
      nameEl.classList.add('placeholder');
    }
  }
  if(avatarEl){
    const initials = ((fname?.[0]||'')+(lname?.[0]||'')).toUpperCase();
    avatarEl.textContent = initials || '?';
  }

  // Tagline: grad year + city
  if(tagEl){
    const gradyr = document.getElementById('p-gradyr')?.value||'';
    const city   = document.getElementById('p-city')?.value||'';
    const parts  = [gradyr ? 'Class of '+gradyr : '', city].filter(Boolean);
    tagEl.textContent = parts.join(' · ') || 'Complete your profile to get started';
  }

  // Verified checkmark: ≥80% of key fields filled
  const KEY_FIELDS = ['p-fname','p-lname','p-email','p-gradyr','p-gpa','p-city','p-height','p-forty'];
  const filled = KEY_FIELDS.filter(id=>{ const el2=document.getElementById(id); return el2&&el2.value.trim(); }).length;
  const pct = filled / KEY_FIELDS.length;
  const badge = el('athlete-verified');
  if(badge) badge.classList.toggle('show', pct >= 0.8);

  // Card measurables — one-liner
  const measLine = el('athlete-meas-line');
  if(measLine){
    const height   = document.getElementById('p-height')?.value||'';
    const forty    = document.getElementById('p-forty')?.value||'';
    const vertical = document.getElementById('p-vertical')?.value||'';
    const gpa      = document.getElementById('p-gpa')?.value||'';
    const parts = [];
    if(height)   parts.push('<span class="meas-val">'+height+'</span>');
    if(forty)    parts.push('<span class="meas-val">'+forty+' 40</span>');
    if(vertical) parts.push('<span class="meas-val">'+vertical+' vert</span>');
    if(gpa)      parts.push('<span class="meas-val">'+gpa+' GPA</span>');
    if(parts.length){
      measLine.innerHTML = parts.map((p,i)=>i===0?p:'<span class="meas-sep">·</span>'+p).join('');
    } else {
      measLine.innerHTML = '';
    }
  }

  // Position pills on card
  const posRow = el('athlete-pos-row');
  if(posRow){
    const positions = Array.from(document.querySelectorAll('#pos-grid .pos-chip.selected input')).map(i=>i.value);
    posRow.innerHTML = positions.map(p=>'<span class="athlete-pos-pill">'+p+'</span>').join('');
  }
  updateCommittedBanner();
  updateOfferStrip();
  // Restore avatar photo if saved
  const savedBanner = lsGet('juke_banner');
  if(savedBanner && typeof savedBanner === 'string' && savedBanner.startsWith('data:')) renderBannerPhoto(savedBanner);
  const savedAvatar = lsGet('juke_avatar');
  if(savedAvatar && typeof savedAvatar === 'string' && savedAvatar.startsWith('data:')) renderAvatarPhoto(savedAvatar);
}

function profileUpdate(){
  updateAthleteHeader();
  if(typeof updateHighlightRail === 'function') updateHighlightRail();
  saveProfile();
  updateCompletenessScore();
  if(typeof updateWizAvatarInitials === 'function') updateWizAvatarInitials();
  const first=pv('p-fname'),last=pv('p-lname');
  const name=(first+' '+last).trim()||'Athlete Name';
  const pos=getPositions();
  const year=pv('p-gradyr'),height=pv('p-height'),weight=pv('p-weight');
  const city=pv('p-city'),school=pv('p-school'),clubTeam=pv('p-club-team');
  const gpa=pv('p-gpa'),sat=pv('p-sat'),act=pv('p-act');
  const major=pv('p-major'),honors=pv('p-honors');
  const forty=pv('p-forty'),vertical=pv('p-vertical'),twenty=pv('p-twenty'),broad=pv('p-broad'),shuttle=pv('p-shuttle');
  const verifiedSource=pv('p-verified-source'),verifiedDate=pv('p-verified-date');
  const email=pv('p-email'),phone=pv('p-phone');
  const parent=pv('p-parent'),clubCoach=pv('p-club-coach');
  const highlight=pv('p-highlight'),gamefilm=pv('p-gamefilm'),profileurl=pv('p-profileurl');
  const coachName=pv('p-coach-name')||'Coach';
  const university=pv('p-university');
  const intro=pv('p-intro');

  // Stats
  const gp=pv('s-gp'),comp=pv('s-comp'),att=pv('s-att'),ptd=pv('s-ptd'),pyds=pv('s-pyds');
  const intT=pv('s-int'),rec=pv('s-rec'),ryds=pv('s-ryds'),rtd=pv('s-rtd');
  const ruyds=pv('s-ruyds'),rutd=pv('s-rutd');
  const flags=pv('s-flags'),defint=pv('s-def-int'),sacks=pv('s-sacks'),dtd=pv('s-dtd');

  const offStats=[[gp,'Games'],[pyds,'Pass Yds'],[ptd,'Pass TDs'],[(comp&&att)?comp+'/'+att:'','Comp/Att'],[ryds,'Rec Yds'],[rtd,'Rec TDs'],[ruyds,'Rush Yds'],[rutd,'Rush TDs']].filter(([v])=>v);
  const defStats=[[flags,'Flags Pulled'],[defint,'INT'],[sacks,'Sacks'],[dtd,'Def TDs']].filter(([v])=>v);
  const allStats=[...offStats,...defStats];

  const filledAwards=profileAwards.filter(a=>a.val);

  // Film buttons
  const filmBtns=[];
  if(highlight) filmBtns.push({label:'▶ Watch Highlight Reel',sub:'Hudl Highlight Film',url:highlight,primary:true});
  if(gamefilm)  filmBtns.push({label:'🎬 View Game Film',sub:'Full Game Footage',url:gamefilm,primary:false});
  if(profileurl)filmBtns.push({label:'👤 Full Recruiting Profile',sub:'Stats, Film &amp; Bio',url:profileurl,primary:false});

  // Metrics
  const metrics=[];
  if(year)   metrics.push({v:year,l:'Class'});
  if(gpa)    metrics.push({v:gpa,l:'GPA'});
  if(height) metrics.push({v:height,l:'Height'});
  if(forty)  metrics.push({v:forty,l:'40-Yard'});

  // Colors (email-inline)
  const BLUE='#185FA5',BLUE_DARK='#0c447c',BLUE_BG='#f0f6fc',BLUE_BD='#c3d9f0';
  const TEXT='#111827',MUTED='#555555',BG='#ffffff',SEC_BG='#f7f8fa',DIV='#e5e7eb';

  function infoRow(label,val){
    if(!val)return'';
    return`<tr><td width="38%" style="padding:5px 0;font-family:Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${MUTED};vertical-align:top">${label}</td><td width="62%" style="padding:5px 0;font-family:Arial,sans-serif;font-size:13px;color:${TEXT};vertical-align:top">${ph(val)}</td></tr>`;
  }
  function secHead(title){
    return`<tr><td colspan="2" style="padding:0 0 8px 0"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="3" style="background:${BLUE};border-radius:2px">&nbsp;</td><td style="padding-left:8px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${BLUE_DARK}">${title}</td><td><hr style="border:none;border-top:1px solid ${DIV};margin:0"></td></tr></table></td></tr>`;
  }

  const metricsHTML=metrics.length?`<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;border-collapse:collapse"><tr>${metrics.map((m,i)=>`<td width="${Math.floor(100/metrics.length)}%" align="center" style="padding:12px 6px;background:${BLUE_BG};border:1px solid ${BLUE_BD};${i>0?'border-left:none':''}"><div style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:${BLUE_DARK};line-height:1">${ph(m.v)}</div><div style="font-family:Arial,sans-serif;font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};margin-top:3px">${m.l}</div></td>`).join('')}</tr></table>`:'';

  const athleticRows=[infoRow('Position',pos.join(', ')),infoRow('Height',height),infoRow('Weight',weight?weight+' lbs':''),infoRow('40-Yard Dash',forty),infoRow('Vertical',vertical),infoRow('High School',school),infoRow('Club Team',clubTeam),infoRow('Location',city)].filter(Boolean);
  const verifiedRows=[infoRow('20-Yard Dash',twenty),infoRow('5-10-5 Shuttle',shuttle),infoRow('Broad Jump',broad),infoRow('Verified By',verifiedSource),infoRow('Verified Date',verifiedDate)].filter(Boolean);

  const athleticHTML=athleticRows.length?`<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px">${secHead('Athletic Profile')}${athleticRows.join('')}</table>`:'';
  const verifiedHTML=verifiedRows.length?`<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px">${secHead('USA Football Verified Tests')}${verifiedRows.join('')}</table>`:'';

  const statsHTML=allStats.length?`<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px">${secHead('Season Statistics')}<tr><td colspan="2"><table width="100%" cellpadding="0" cellspacing="4" border="0"><tr>${allStats.map(([v,l])=>`<td style="padding:8px 10px;background:${BLUE_BG};border:1px solid ${BLUE_BD};text-align:center;width:${Math.floor(100/Math.min(allStats.length,4))}%"><div style="font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:${TEXT}">${ph(v)}</div><div style="font-family:Arial,sans-serif;font-size:10px;color:${MUTED};margin-top:2px">${l}</div></td>`).join('')}</tr></table></td></tr></table>`:'';

  const acRows=[infoRow('GPA',gpa),infoRow('SAT',sat),infoRow('ACT',act),infoRow('Major',major),infoRow('Honors',honors)].filter(Boolean);
  const academicHTML=acRows.length?`<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px">${secHead('Academic Profile')}${acRows.join('')}</table>`:'';

  const awardsHTML=filledAwards.length?`<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px">${secHead('Honors &amp; Awards')}<tr><td colspan="2">${filledAwards.map(a=>`<div style="font-family:Arial,sans-serif;font-size:13px;color:${TEXT};padding:3px 0;padding-left:12px"><span style="color:${BLUE};font-weight:700;margin-right:5px">›</span>${ph(a.val)}</div>`).join('')}</td></tr></table>`:'';

  const filmHTML=filmBtns.length?`<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px">${secHead('Film &amp; Resources')}<tr><td colspan="2" style="padding-top:8px"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${filmBtns.map((b,i)=>`<td width="${Math.floor(100/filmBtns.length)}%" style="padding:${i>0?'0 0 0 6px':'0'}"><a href="${b.url}" target="_blank" style="display:block;text-decoration:none;text-align:center;padding:12px 8px;background:${b.primary?BLUE:BLUE_BG};border:1px solid ${b.primary?BLUE:BLUE_BD};border-radius:4px"><div style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:${b.primary?'#fff':BLUE_DARK};line-height:1.2">${b.label}</div><div style="font-family:Arial,sans-serif;font-size:10px;color:${b.primary?'rgba(255,255,255,.75)':MUTED};margin-top:3px">${b.sub}</div></a></td>`).join('')}</tr></table></td></tr></table>`:'';

  const contactRows=[infoRow('Email',email),infoRow('Phone',phone),parent?infoRow('Parent',parent):'',clubCoach?infoRow('Club Coach',clubCoach):''].filter(Boolean);
  const contactHTML=contactRows.length?`<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px">${secHead('Contact Information')}${contactRows.join('')}</table>`:'';

  const fullHTML=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${ph(name)} — Recruiting Profile</title></head><body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f2f5"><tr><td align="center" style="padding:20px 16px"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff;border-radius:6px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.08)"><tr><td height="4" style="background:${BLUE};font-size:0">&nbsp;</td></tr><tr><td style="background:${SEC_BG};padding:20px 28px;border-bottom:1px solid ${DIV}"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle"><div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${BLUE_DARK};margin-bottom:5px">Flag Football Recruiting Profile</div><div style="font-family:Arial,sans-serif;font-size:24px;font-weight:700;color:${TEXT};line-height:1.1">${ph(name)}</div>${(pos.length||year)?`<div style="font-family:Arial,sans-serif;font-size:12px;color:${MUTED};margin-top:4px">${[pos.join(' / '),year?'Class of '+year:''].filter(Boolean).join(' &nbsp;·&nbsp; ')}</div>`:''} ${school||city?`<div style="font-family:Arial,sans-serif;font-size:11px;color:#888;margin-top:2px">${[school,city].filter(Boolean).join(' &nbsp;·&nbsp; ')}</div>`:''}</td><td width="44" valign="middle" align="right"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 235.34 262.19" width="38" height="43"><path fill="${BLUE}" opacity=".5" d="M88.9,51.24h0l28.56,96.37,28.54-96.69s0-.11,0-.16c4.15-15.96,18.23-15.38,26.7-15.38h27.4l-13.99,22.7-39.72,135.65,2.19,13.69h-62.24l2.84-13.65c-12.76-45.96-27.46-91.73-40.87-137.63l-13.08-20.76h28.28c8.37,0,21.88-.58,25.38,15.86h.01ZM116.02,262.19l-58.46-24.42v-.12C22.45,221.12,0,185.97,0,146.88V0h235.34v146.18c0,41.05-24.58,77.56-62.63,93l-56.69,23ZM70.97,228.84l45.12,18.84,51.57-20.92c32.96-13.38,54.27-45.01,54.27-80.58V13.41H13.41v133.46c0,35.18,20.98,66.67,53.44,80.23l4.12,1.73Z"/></svg></td></tr></table></td></tr>${metricsHTML?`<tr><td style="padding:0 28px">${metricsHTML}</td></tr>`:''}<tr><td style="padding:${metricsHTML?'4':'24'}px 28px 24px">${intro?`<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px"><tr><td style="font-family:Arial,sans-serif;font-size:14px;color:${TEXT};line-height:1.7"><p style="margin:0 0 8px 0">Dear ${ph(coachName)}${university?', and the '+ph(university)+' coaching staff':''},</p><p style="margin:0;color:#333;line-height:1.8">${ph(intro)}</p></td></tr></table><hr style="border:none;border-top:1px solid ${DIV};margin:0 0 20px 0">`:''} ${athleticHTML}${verifiedHTML}${statsHTML}${academicHTML}${awardsHTML}${filmHTML}${contactHTML}<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-family:Arial,sans-serif;font-size:13px;color:${TEXT};line-height:1.7"><p style="margin:0 0 14px 0">I would welcome the opportunity to speak with you further. Thank you for your time and consideration.</p><p style="margin:0;font-weight:600">${ph(name)}</p>${email?`<p style="margin:2px 0 0;font-size:12px;color:${MUTED}">${ph(email)}</p>`:''}${phone?`<p style="margin:2px 0 0;font-size:12px;color:${MUTED}">${ph(phone)}</p>`:''}</td></tr></table></td></tr><tr><td style="background:${SEC_BG};border-top:1px solid ${DIV};padding:12px 28px"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-family:Arial,sans-serif;font-size:10px;color:#aaa">Recruiting profile created with Valor Flag Football &nbsp;·&nbsp; juke.gg</td></tr></table></td></tr><tr><td height="3" style="background:${BLUE};font-size:0">&nbsp;</td></tr></table></td></tr></table>
</body></html>`;

  // Write preview (strip doctype/html/body wrappers for inline render)
  const preview=document.getElementById('profile-email-preview');
  if(preview) preview.innerHTML=fullHTML.replace(/<!DOCTYPE[^>]*>/i,'').replace(/<html[^>]*>/i,'').replace(/<\/html>/i,'').replace(/<head>[\s\S]*?<\/head>/i,'').replace(/<body[^>]*>/i,'').replace(/<\/body>/i,'');

  // Store for copy
  window._profileEmailHTML=fullHTML;

  // Keep the read view in sync while editing
  const pve=document.getElementById('profile-edit');
  if(!pve||pve.style.display==='none') renderProfileView();
  // Re-render feed so nudges disappear as fields are filled
  const feedEl=document.getElementById('feed-list');
  if(feedEl&&feedEl.closest('.tab-content.active')) renderFeed();
}

function copyProfileEmailHTML(){
  const html=window._profileEmailHTML||'';
  if(!html)return;
  const success=()=>{
    const el=document.getElementById('profile-copy-success');
    if(el){el.classList.add('visible');setTimeout(()=>el.classList.remove('visible'),2500);}
  };
  if(navigator.clipboard&&window.ClipboardItem){
    const blob=new Blob([html],{type:'text/html'});
    navigator.clipboard.write([new ClipboardItem({'text/html':blob})]).then(success).catch(()=>fallbackCopyHTML(html,success));
  }else{fallbackCopyHTML(html,success);}
}
function fallbackCopyHTML(html,cb){
  const d=document.createElement('div');
  d.style.cssText='position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  d.innerHTML=html;document.body.appendChild(d);
  const r=document.createRange();r.selectNode(d);
  const s=window.getSelection();s.removeAllRanges();s.addRange(r);
  try{document.execCommand('copy');}catch(e){}
  s.removeAllRanges();document.body.removeChild(d);
  if(cb)cb();
}

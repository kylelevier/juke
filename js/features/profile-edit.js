// ── PROFILE WIZARD ──────────────────────────────────────
let _wizStep = 1;
function goStep(n){
  _wizStep = n;
  for(let i=1;i<=5;i++){
    const content=document.getElementById('wiz-content-'+i);
    const btn=document.getElementById('wiz-btn-'+i);
    if(content) content.classList.toggle('active', i===n);
    if(btn){
      btn.classList.toggle('active', i===n);
      btn.classList.toggle('done', i<n);
    }
  }
  if(n===5) renderEndorsementSection();
  window.scrollTo({top:0,behavior:'smooth'});
}
function toggleDiv(label){
  label.classList.toggle('selected');
  saveProfile();
}
function getDivisions(){
  return Array.from(document.querySelectorAll('.div-chips .pos-chip.selected'))
    .map(function(c){return c.querySelector('input').value;});
}

// ── COACH ENDORSEMENTS ───────────────────────────────────
function getEndorsements(){try{return JSON.parse(localStorage.getItem('juke_endorsements'))||[];}catch(e){return[];}}
function saveEndorsements(arr){try{localStorage.setItem('juke_endorsements',JSON.stringify(arr));}catch(e){}}

function renderEndorsementSection(){
  var el=document.getElementById('end-cards-list');
  if(!el)return;
  var all=getEndorsements();
  if(!all.length){el.innerHTML='';return;}
  el.innerHTML=all.map(function(e){
    var inits=(e.coachName||'?').split(' ').map(function(w){return w[0]||'';}).join('').slice(0,2).toUpperCase();
    if(e.status==='pending'){
      return '<div class="end-card end-card-pending">'
        +'<div class="end-card-hd"><div class="end-av" style="background:#d97706;">'+escHtml(inits)+'</div>'
        +'<div><div class="end-coach-name">'+escHtml(e.coachName)+'</div>'
        +'<div class="end-coach-school">'+escHtml(e.coachTitle||'')+(e.coachSchool?' · '+escHtml(e.coachSchool):'')+'</div></div>'
        +'<span class="end-status-pill end-pill-pending">Pending</span></div>'
        +'<div class="end-meta">Request sent '+escHtml(e.requestedAt||'')+'</div></div>';
    }else{
      return '<div class="end-card end-card-received">'
        +'<div class="end-card-hd"><div class="end-av" style="background:#1e40af;">'+escHtml(inits)+'</div>'
        +'<div><div class="end-coach-name">'+escHtml(e.coachName)+'</div>'
        +'<div class="end-coach-school">'+escHtml(e.coachTitle||'')+(e.coachSchool?' · '+escHtml(e.coachSchool):'')+'</div></div>'
        +'<span class="end-status-pill end-pill-received">✓ Recommended</span></div>'
        +'<div class="end-text">&#8220;'+escHtml(e.endorsementText)+'&#8221;</div>'
        +'<div class="end-meta">Recommended '+escHtml(e.submittedAt||'')+'</div></div>';
    }
  }).join('');
}

function submitEndorsementRequest(){
  var name=(document.getElementById('end-req-name')||{}).value||'';
  var school=(document.getElementById('end-req-school')||{}).value||'';
  var title=(document.getElementById('end-req-title')||{}).value||'';
  var note=(document.getElementById('end-req-note')||{}).value||'';
  if(!name.trim()){alert('Please enter your coach\'s name.');return;}
  var auth=null;try{auth=JSON.parse(localStorage.getItem('juke_auth'));}catch(e){}
  var apid=(auth&&auth.activeProfileId)||'athlete';
  var athleteName=auth&&auth.name?auth.name:((pv('p-fname')+' '+pv('p-lname')).trim()||'Athlete');
  var existing=getEndorsements();
  if(existing.some(function(e){return e.coachName.toLowerCase()===name.trim().toLowerCase();})){
    alert('A request for this coach already exists.');return;
  }
  existing.push({
    id:'end_'+Date.now(),
    athleteProfileId:apid,
    athleteName:athleteName,
    coachName:name.trim(),
    coachSchool:school.trim(),
    coachTitle:title.trim(),
    coachNote:note.trim(),
    status:'pending',
    requestedAt:new Date().toLocaleDateString('en-US',{month:'short',year:'numeric'})
  });
  var payload=existing[existing.length-1];
  saveEndorsements(existing);
  // Cloud write — persists request so HS/club coach portals can surface it
  if(typeof saveRecommendationRequest==='function') saveRecommendationRequest(payload);
  ['end-req-name','end-req-school','end-req-title','end-req-note'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  var ok=document.getElementById('end-req-success');
  if(ok){ok.style.display='block';setTimeout(function(){ok.style.display='none';},3000);}
  renderEndorsementSection();
}

// ── BIO BUILDER ───────────────────────────────────────────
const BIO_FORMULAS = {
  stats:    '[Role]. [Stat 1], [Stat 2]. [What makes you rare].',
  identity: '[Position identity] with [key trait]. [Proof].',
  fit:      'Competing for a [D1/D2] spot. [Stats]. [What I bring to your program].'
};
function bioApplyFormula(key){
  const ta=document.getElementById('p-intro');
  if(!ta)return;
  // Try to pre-fill position from selected chips
  const pos=[...document.querySelectorAll('.pos-chip.selected')].map(el=>el.querySelector('input').value).join('/');
  let tpl=BIO_FORMULAS[key];
  if(pos&&key==='stats')tpl=pos+'. [Stat 1], [Stat 2]. [What makes you rare].';
  if(pos&&key==='identity')tpl=pos+' with [key trait]. [Proof].';
  ta.value=tpl;
  ta.focus();ta.select();
  saveProfile();profileUpdate();bioUpdate();
}
function bioAddKw(kw){
  const ta=document.getElementById('p-intro');
  if(!ta)return;
  const cur=ta.value.trim();
  const sep=(cur&&!cur.endsWith(' '))?'. ':'';
  ta.value=(cur+sep+kw).trim();
  ta.focus();
  saveProfile();profileUpdate();bioUpdate();
}
function bioUpdate(){
  const ta=document.getElementById('p-intro');
  const counter=document.getElementById('bio-char-count');
  const preview=document.getElementById('bio-preview-text');
  if(!ta)return;
  const len=ta.value.length;
  if(counter){
    counter.textContent=len+' / 280';
    counter.className='bio-char-count'+(len>250?' over':len>200?' warn':'');
  }
  if(preview){
    const txt=ta.value.trim();
    if(txt){
      preview.textContent=txt;
      preview.className='bio-preview-text';
    } else {
      preview.textContent='Start typing above to preview your headline…';
      preview.className='bio-preview-text empty';
    }
  }
}

// ── PLAYER PROFILE ───────────────────────────────────────
function togglePos(el){
  el.classList.toggle('selected');
  el.querySelector('input').checked=el.classList.contains('selected');
  saveProfile();
}
function getPositions(){
  return [...document.querySelectorAll('.pos-chip.selected')].map(el=>el.querySelector('input').value);
}
// ── AWARDS (dynamic rows) ──────────────────────────────────
function addAward(val=''){
  const id='aw'+Date.now()+Math.round(Math.random()*9999);
  profileAwards.push({id,val});
  renderAwards();
}
function removeAward(id){profileAwards=profileAwards.filter(a=>a.id!==id);renderAwards();profileUpdate();}
function renderAwards(){
  document.getElementById('awards-list').innerHTML=profileAwards.map(a=>`
    <div class="dynamic-row one">
      <input class="form-input" type="text" value="${escHtml(a.val)}" placeholder="e.g. 2024 All-Tournament MVP — National Flag Championship" oninput="setAwardVal('${a.id}',this.value)">
      <button class="row-remove" onclick="removeAward('${a.id}')">×</button>
    </div>`).join('');
}
function setAwardVal(id,v){const a=profileAwards.find(x=>x.id===id);if(a){a.val=v;profileUpdate();}}
function escHtml(s){return(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function saveProfile(){
  setTimeout(updateAthleteHeader, 50);
  const fv=id=>(document.getElementById(id)||{}).value||'';
  const d={
    fname:fv('p-fname'),lname:fv('p-lname'),gradyr:fv('p-gradyr'),
    city:fv('p-city'),school:fv('p-school'),
    gpa:fv('p-gpa'),sat:fv('p-sat'),act:fv('p-act'),
    major:fv('p-major'),honors:fv('p-honors'),
    email:fv('p-email'),phone:fv('p-phone'),
    parent:fv('p-parent'),clubCoach:fv('p-club-coach'),
    positions:getPositions(),
    height:fv('p-height'),weight:fv('p-weight'),forty:fv('p-forty'),
    vertical:fv('p-vertical'),broad:fv('p-broad'),shuttle:fv('p-shuttle'),
    gp:fv('s-gp'),comp:fv('s-comp'),att:fv('s-att'),
    ptd:fv('s-ptd'),pyds:fv('s-pyds'),int:fv('s-int'),
    rec:fv('s-rec'),ryds:fv('s-ryds'),rtd:fv('s-rtd'),
    ruyds:fv('s-ruyds'),rutd:fv('s-rutd'),
    flags:fv('s-flags'),defint:fv('s-def-int'),sacks:fv('s-sacks'),dtd:fv('s-dtd'),
    highlight:fv('p-highlight'),gamefilm:fv('p-gamefilm'),profileurl:fv('p-profileurl'),
    awards:profileAwards.map(a=>a.val).filter(Boolean),
    intro:fv('p-intro'),
    word1:fv('p-word1'),word2:fv('p-word2'),word3:fv('p-word3'),
    sport1:fv('p-sport1'),sport1pos:fv('p-sport1pos'),sport2:fv('p-sport2'),sport2pos:fv('p-sport2pos'),
    divisions:getDivisions(),
  };
  lsSet('juke_player',d);
  cloudSave();
  const ind=document.getElementById('save-indicator');
  if(ind){ind.classList.add('show');setTimeout(()=>ind.classList.remove('show'),1500);}
}
function loadPlayerProfile(){
  const d=lsGet('juke_player');
  // Support both saveProfile() short keys (fname) and legacy/demo long keys (p-fname)
  if(!d||(!d.fname&&!d['p-fname']))return;
  // Normalize: if data uses long keys, remap to short keys so all code below works
  if(!d.fname&&d['p-fname']){
    ['fname','lname','gradyr','city','school','gpa','sat','act','major','honors',
     'email','phone','parent','height','weight','forty','vertical','broad','shuttle',
     'highlight','gamefilm','profileurl','intro'].forEach(k=>{
      if(d['p-'+k]!==undefined&&d[k]===undefined)d[k]=d['p-'+k];
    });
    if(!d.positions&&d._positions)d.positions=d._positions;
  }
  const fields=[
    ['p-fname','fname'],['p-lname','lname'],['p-gradyr','gradyr'],['p-city','city'],
    ['p-school','school'],['p-gpa','gpa'],['p-sat','sat'],['p-act','act'],
    ['p-major','major'],['p-honors','honors'],
    ['p-email','email'],['p-phone','phone'],['p-parent','parent'],['p-club-coach','clubCoach'],
    ['p-height','height'],['p-weight','weight'],['p-forty','forty'],
    ['p-vertical','vertical'],['p-broad','broad'],['p-shuttle','shuttle'],
    ['s-gp','gp'],['s-comp','comp'],['s-att','att'],['s-ptd','ptd'],['s-pyds','pyds'],
    ['s-int','int'],['s-rec','rec'],['s-ryds','ryds'],['s-rtd','rtd'],
    ['s-ruyds','ruyds'],['s-rutd','rutd'],
    ['s-flags','flags'],['s-def-int','defint'],['s-sacks','sacks'],['s-dtd','dtd'],
    ['p-highlight','highlight'],['p-gamefilm','gamefilm'],['p-profileurl','profileurl'],
    ['p-intro','intro'],
    ['p-word1','word1'],['p-word2','word2'],['p-word3','word3'],
    ['p-sport1','sport1'],['p-sport1pos','sport1pos'],['p-sport2','sport2'],['p-sport2pos','sport2pos'],
  ];
  fields.forEach(([id,key])=>{const el=document.getElementById(id);if(el&&d[key]!=null)el.value=d[key];});
  if(d.positions){
    document.querySelectorAll('.pos-chip').forEach(chip=>{
      const val=chip.querySelector('input').value;
      if(d.positions.includes(val))chip.classList.add('selected');
    });
  }
  if(d.divisions){
    document.querySelectorAll('.div-chips .pos-chip').forEach(chip=>{
      const val=chip.querySelector('input').value;
      if(d.divisions.includes(val))chip.classList.add('selected');
    });
  }
  if(d.awards&&d.awards.length){
    profileAwards=d.awards.map(v=>({id:'aw'+Math.random(),val:v}));
    renderAwards();
  }
  profileUpdate();
  setTimeout(bioUpdate, 50);
}
function clearPlayerProfile(){
  lsSet('juke_player',{});
  document.querySelectorAll('#content-profile .form-input,#content-profile .form-select,#content-profile .form-textarea,#content-profile .stat-input').forEach(el=>el.tagName==='SELECT'?el.selectedIndex=0:el.value='');
  document.querySelectorAll('.pos-chip,.div-chips .pos-chip').forEach(c=>c.classList.remove('selected'));
  profileAwards=[];renderAwards();profileUpdate();
}
function updateVideoPreview(){}  // legacy no-op

// ── Photo uploads (banner + avatar) ──────────────────────────────────────────
// Moved from pipeline.js — these are profile presentation concerns.
function handleBannerUpload(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    localStorage.setItem('juke_banner', JSON.stringify(e.target.result));
    renderBannerPhoto(e.target.result);
    renderWizBanner(e.target.result);
    renderProfileView();
    if(typeof cloudSave==='function') cloudSave();
  };
  reader.readAsDataURL(file);
}

function renderBannerPhoto(dataUrl){
  const zone = document.getElementById('athlete-banner-zone');
  if(!zone) return;
  const existing = zone.querySelector('img.athlete-banner-img');
  if(existing) existing.remove();
  const ph = document.getElementById('athlete-banner-placeholder');
  if(ph) ph.style.display = 'none';
  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = 'Cover photo';
  img.className = 'athlete-banner-img';
  zone.insertBefore(img, zone.firstChild);
}

function renderWizBanner(dataUrl){
  const zone = document.getElementById('wiz-photo-banner');
  if(!zone) return;
  const ph = document.getElementById('wiz-photo-banner-ph');
  let img = zone.querySelector('img');
  if(!img){ img = document.createElement('img'); zone.insertBefore(img, zone.firstChild); }
  img.src = dataUrl;
  if(ph) ph.style.display = 'none';
}

function handleAvatarUpload(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    localStorage.setItem('juke_avatar', JSON.stringify(e.target.result));
    renderAvatarPhoto(e.target.result);
    renderWizAvatar(e.target.result);
    renderProfileView();
    if(typeof cloudSave==='function') cloudSave();
  };
  reader.readAsDataURL(file);
}

function renderAvatarPhoto(dataUrl){
  const circle = document.getElementById('athlete-avatar-circle');
  if(!circle) return;
  const existing = circle.querySelector('img.athlete-avatar-img');
  if(existing) existing.remove();
  const initials = document.getElementById('athlete-avatar-initials');
  if(initials) initials.style.display = 'none';
  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = 'Athlete photo';
  img.className = 'athlete-avatar-img';
  circle.insertBefore(img, circle.firstChild);
}

function renderWizAvatar(dataUrl){
  const av = document.getElementById('wiz-photo-av');
  if(!av) return;
  const init = document.getElementById('wiz-photo-av-init');
  let img = av.querySelector('img');
  if(!img){ img = document.createElement('img'); av.appendChild(img); }
  img.src = dataUrl;
  if(init) init.style.display = 'none';
}

function updateWizAvatarInitials(){
  const init = document.getElementById('wiz-photo-av-init');
  if(!init || init.style.display === 'none') return;
  const f = (document.getElementById('p-fname')||{}).value||'';
  const l = (document.getElementById('p-lname')||{}).value||'';
  init.textContent = ((f[0]||'')+(l[0]||'')).toUpperCase()||'?';
}

function initWizPhotos(){
  const bannerRaw = localStorage.getItem('juke_banner');
  if(bannerRaw){ try{ renderWizBanner(JSON.parse(bannerRaw)); }catch(e){} }
  const avatarRaw = localStorage.getItem('juke_avatar');
  if(avatarRaw){ try{ renderWizAvatar(JSON.parse(avatarRaw)); }catch(e){} }
}

function initProfileEditor(){
  loadPlayerProfile();
  if(!profileAwards.length) addAward();
  profileUpdate();
  initWizPhotos();
}

initProfileEditor();

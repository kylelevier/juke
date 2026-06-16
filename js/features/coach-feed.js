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
        +'<button class="juke-chip-dd-item" onclick="location.href=\'login.html\'">+ Add Account</button>'
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
    var portals={athlete:'juke.html',college_coach:'coach.html',hs_coach:'hscoach.html'};
    location.href=portals[p.type]||'login.html';
  }catch(e){}
}
// ── COACH FEED ────────────────────────────────────────────
const CF_ICON = {
  new_athlete:'🏃‍♀️', pipeline:'📊', message:'💬',
  nudge:'⚡', tip:'💡', calendar:'📅', milestone:'🏆'
};
const CF_ICON_CLASS = {
  new_athlete:'fi-icon-new', pipeline:'fi-icon-pipeline', message:'fi-icon-message',
  nudge:'fi-icon-nudge', tip:'fi-icon-tip', calendar:'fi-icon-calendar', milestone:'fi-icon-milestone'
};
const CF_FILTER_MAP = {
  all:      ()=>true,
  prospect: i=>['new_athlete','milestone'].includes(i.type),
  action:   i=>i.type==='nudge',
  tips:     i=>['tip','calendar'].includes(i.type),
};

function buildCoachFeed(){
  const items = [];
  let _id = 1;

  // Read real data — coachPipeline is {stageName:[athleteId,...]}
  const cp = coachPipeline || {};
  const allPipelineIds = COACH_PIPELINE_STAGES.flatMap(s=>cp[s.key]||[]);
  const pipeCount = new Set(allPipelineIds).size;
  const hasBio = !!(coachProfile&&coachProfile.bio&&coachProfile.bio.trim()
    && coachProfile.bio !== 'Building a program that develops champions on and off the field. NAU Flag Football is a fast-growing D1 program with a commitment to academic excellence and athletic development. We are actively recruiting skilled playmakers for the 2025–26 roster.');
  const athleteBioSet = (()=>{try{const p=JSON.parse(localStorage.getItem('juke_player'));return !!(p&&p.intro&&p.intro.trim());}catch(e){return false;}})();

  // Update stats tile
  const pipeEl = document.getElementById('cf-pipeline-count');
  if(pipeEl) pipeEl.textContent = pipeCount;

  // ── NUDGES (Action Needed) ──
  if(!hasBio)
    items.push({id:_id++, type:'nudge', time:'Today', pri:1,
      primary:'Your program bio is missing',
      secondary:'Athletes evaluate your program before they respond. A compelling bio — your philosophy, what you\'re building, who you want — increases reply rates significantly.',
      action:{label:'Complete Profile →', tab:'profile'}});

  const visitIds = cp['visit']||[];
  if(visitIds.length){
    const a = ATHLETES.find(x=>x.id===visitIds[0]);
    if(a) items.push({id:_id++, type:'nudge', time:'1d ago', pri:2,
      primary:a.name+' has a visit scheduled — stay in front of her',
      secondary:'Coaches who communicate consistently between visit and decision win more commitments. A quick check-in goes a long way.',
      action:{label:'View Profile →', athleteId:a.id}});
  }

  const identifiedIds = cp['identified']||[];
  if(identifiedIds.length >= 2)
    items.push({id:_id++, type:'nudge', time:'2d ago', pri:3,
      primary:identifiedIds.length+' athletes on your Identified list with no follow-up',
      secondary:'Identified athletes are waiting to hear from you. Moving them to Contacted is a 30-second task that opens the relationship.',
      action:{label:'View Pipeline →', tab:'pipeline'}});

  // ── PIPELINE UPDATES ──
  if(athleteBioSet){
    const a = ATHLETES.find(x=>x.id===2);
    if(a&&pipeline.includes('2')) items.push({id:_id++, type:'pipeline', time:'3h ago', pri:5,
      primary:a.name+' updated her recruiting headline',
      secondary:'She\'s actively working her profile. Worth a quick view — athletes who invest in their profile are serious prospects.',
      action:{label:'View Profile →', athleteId:2}});
  }

  items.push({id:_id++, type:'pipeline', time:'1d ago', pri:6,
    primary:'Maya Thornton (2026 CB/S, Inglewood CA) added game film',
    secondary:'4.44 speed · 12 INTs last season · SoCal Defensive POY. Film just posted — first-mover advantage.',
    action:{label:'View Profile →', athleteId:3}});

  // ── NEW PROSPECTS ──
  items.push({id:_id++, type:'new_athlete', time:'Today', pri:8,
    primary:'Nia Washington (2027 QB, Charlotte NC) just joined JUKE',
    secondary:'Top-ranked 2027 prospect. 5\'10" · 4.0 GPA · Strong arm with exceptional football IQ. Wide open for contact.',
    action:{label:'View Profile →', athleteId:8}});

  items.push({id:_id++, type:'new_athlete', time:'2h ago', pri:9,
    primary:'Camryn Wells has a 100% complete profile — film, bio, measurables',
    secondary:'2026 WR/PR from Dallas TX. 4.38 speed, 1,240 rec yards. Actively seeking D1 programs. This is a live prospect.',
    action:{label:'View Profile →', athleteId:1}});

  items.push({id:_id++, type:'new_athlete', time:'1d ago', pri:10,
    primary:'3 new skill-position prospects match your D1 criteria this week',
    secondary:'Filter by position and division in Prospects to see the full list.',
    action:{label:'Search Now →', tab:'search'}});

  // ── MILESTONE ──
  if(pipeCount >= 1 && !localStorage.getItem('cf_milestone_first')){
    localStorage.setItem('cf_milestone_first','1');
    items.push({id:_id++, type:'milestone', time:'Recently', pri:4,
      primary:'Your recruiting pipeline is live',
      secondary:'Every athlete you add moves through a structured stage: Identified → Contacted → Visit → Offer → Committed. Consistency here is what separates programs that land their class.'});
  }

  // ── RECRUITING TIPS ──
  items.push(
    {id:_id++, type:'tip', time:'3d ago', pri:20,
      primary:'The best coaches respond to film within 48 hours',
      secondary:'Response speed is one of the strongest signals of genuine interest. Athletes talk to each other — your reputation for attentiveness travels.'},
    {id:_id++, type:'calendar', time:'4d ago', pri:21,
      primary:'NCAA Contact Rule: D1 coaches may not initiate contact before Sept 1 of a recruit\'s junior year',
      secondary:'Athletes can reach out to you at any time. A complete JUKE profile gives them a reason to — make sure yours is filled in.'},
    {id:_id++, type:'tip', time:'1w ago', pri:22,
      primary:'Class of 2026 offer window is open — programs are moving fast',
      secondary:'The most competitive D1 programs issue offers between January–April of junior year. Know where your targets stand before the window closes.'},
    {id:_id++, type:'calendar', time:'1w ago', pri:23,
      primary:'Flag football recruiting timelines are compressing',
      secondary:'Athletes who\'ve been through traditional sports recruiting expect structured, consistent communication. A defined process — from first contact to offer — wins the room.'},
    {id:_id++, type:'tip', time:'2w ago', pri:24,
      primary:'Academics close more offers than most coaches realize',
      secondary:'When two athletes are athletically comparable, programs almost always take the one who can stay eligible. Lead with academics in your messaging — it signals program culture.'}
  );

  items.sort((a,b)=>a.pri-b.pri);
  return items;
}

function coachFeedItemHTML(item){
  let actionHTML = '';
  if(item.action){
    let onclick = '';
    if(item.action.tab)      onclick = `switchTab('${item.action.tab}')`;
    else if(item.action.athleteId) onclick = `openAthlete(${item.action.athleteId})`;
    actionHTML = `<div class="fi-action-row"><button class="fi-action-btn" onclick="${onclick}">${item.action.label}</button></div>`;
  }
  return `<div class="feed-item" data-type="${item.type}">
    <div class="fi-icon-wrap ${CF_ICON_CLASS[item.type]}">${CF_ICON[item.type]}</div>
    <div class="fi-body">
      <div class="fi-primary">${item.primary}</div>
      <div class="fi-secondary">${item.secondary}</div>
      ${actionHTML}
    </div>
    <div class="fi-time">${item.time}</div>
  </div>`;
}

var _activeCFFilter = 'all';
function filterCoachFeed(filter, btn){
  _activeCFFilter = filter;
  document.querySelectorAll('.feed-filter').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderCoachFeed();
}

function renderCoachFeed(){
  const list = document.getElementById('coach-feed-list');
  if(!list) return;
  const items = buildCoachFeed();
  const fn = CF_FILTER_MAP[_activeCFFilter]||CF_FILTER_MAP.all;
  const filtered = items.filter(fn);
  list.innerHTML = filtered.length
    ? filtered.map(coachFeedItemHTML).join('')
    : '<div class="feed-empty">No items in this category right now.</div>';
}

function jukeLogout(){localStorage.removeItem('juke_auth');location.href='../login.html';}



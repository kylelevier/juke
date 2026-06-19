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
  // Active profile for header subtitle
  var activeProfile=null;
  if(auth.profiles&&auth.profiles.length){
    var apid=auth.activeProfileId||auth.profiles[0].id;
    activeProfile=auth.profiles.find(function(p){return p.id===apid;})||auth.profiles[0];
  }
  var roleLabel=activeProfile?RL[activeProfile.type]||'Athlete':'Athlete';
  var roleOrg=activeProfile&&activeProfile.org?'Athlete · '+activeProfile.org:'Athlete';
  // Build profiles section
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
function jukeLogout(){localStorage.removeItem('juke_auth');location.href='../preview.html';}

// ── SCHOOL WORKSPACE ─────────────────────────────────────────────────────────
let _wsSchool=null,_wsPPId=null,_wsData={};

const WS_STAGE_COLORS={
  // ── Active 5-stage momentum pipeline ──
  saved:      {bg:'rgba(0,87,255,.1)',    text:'#2055cc'},
  contacting: {bg:'rgba(123,47,255,.1)', text:'#7b2fff'},
  applied:    {bg:'rgba(255,69,0,.1)',   text:'#cc3800'},
  offered:    {bg:'rgba(180,140,0,.1)',  text:'#a07a00'},
  committed:  {bg:'rgba(0,180,60,.1)',   text:'#007a30'},
  archived:   {bg:'rgba(107,114,128,.1)',text:'#5c6370'},
  // ── Legacy compat (pre-migration keys map to nearest new stage) ──
  contacted:  {bg:'rgba(123,47,255,.1)', text:'#7b2fff'},
  engaged:    {bg:'rgba(123,47,255,.1)', text:'#7b2fff'},
  visit:      {bg:'rgba(123,47,255,.1)', text:'#7b2fff'},
  offer:      {bg:'rgba(180,140,0,.1)',  text:'#a07a00'},
  interested: {bg:'rgba(0,87,255,.1)',   text:'#2055cc'},
  dream_schools:{bg:'rgba(0,87,255,.1)', text:'#2055cc'},
};
const WS_LOG_ICONS={mail:'✉',email:'@',message:'◎',phone_call:'☎',juke:'⚡'};
const WS_LOG_LABELS={mail:'Mail',email:'Email',message:'Message',phone_call:'Phone Call',juke:'Juke'};
const WS_OFFER_STATUSES=['none','verbal_interest','partial_offer','full_offer','preferred_walk_on'];
const WS_OFFER_LABELS={none:'None',verbal_interest:'Verbal Interest',partial_offer:'Partial Offer',full_offer:'Full Offer',preferred_walk_on:'Preferred Walk-On'};

async function openSchoolWorkspace(schoolName){
  const r=RAW.find(x=>x.School===schoolName);
  if(!r)return;
  _wsSchool=schoolName;
  _wsData={log:[],contacts:[],tasks:[],offer:{status:'none'},notes:[],ppId:null,jukeAlert:null,ppCreatedAt:null};

  const sel=document.getElementById('ws-stage-select');
  sel.innerHTML=PIPELINE_STAGES.map(s=>`<option value="${s.key}">${s.label}</option>`).join('');
  const curStage=statusData[schoolName]||'dream_schools';
  sel.value=curStage;

  const sc=WS_STAGE_COLORS[curStage]||WS_STAGE_COLORS.saved;
  const abbr=schoolName.split(' ').map(w=>w[0]).join('').slice(0,3).toUpperCase();
  const av=document.getElementById('ws-av');
  av.textContent=abbr;av.style.background=sc.bg;av.style.color=sc.text;
  document.getElementById('ws-name').textContent=schoolName;
  document.getElementById('ws-warmth').innerHTML='';
  document.getElementById('ws-juke-bar').classList.remove('show');
  document.getElementById('ws-tasks-strip').classList.remove('has-tasks');
  document.getElementById('ws-body').innerHTML='<div class="ws-empty">Loading…</div>';
  document.getElementById('ws-bottom-bar').innerHTML='';
  const overlay=document.getElementById('ws-overlay');
  overlay.classList.add('open');
  if(window.JukeDialog) window.JukeDialog.open(overlay, {close: closeWorkspace});
  document.body.style.overflow='hidden';

  if(!sb||!currentUser){_renderWsOffline();return;}

  try{
    const {data:prog}=await sb.from('programs').select('id').eq('school',schoolName).single();
    if(!prog){_renderWsOffline('School not found in database.');return;}

    let ppRow;
    const {data:existing}=await sb.from('player_programs')
      .select('id,stage,created_at').eq('user_id',currentUser.id).eq('program_id',prog.id).single();
    if(existing){
      ppRow=existing;
      if(existing.stage!==curStage)
        await sb.from('player_programs').update({stage:curStage,updated_at:new Date().toISOString()}).eq('id',existing.id);
    }else{
      const {data:created}=await sb.from('player_programs')
        .insert({user_id:currentUser.id,program_id:prog.id,stage:curStage})
        .select('id,stage,created_at').single();
      ppRow=created;
    }
    _wsPPId=ppRow?.id;_wsData.ppId=_wsPPId;_wsData.ppCreatedAt=ppRow?.created_at;

    const [logRes,conRes,taskRes,offRes,noteRes,jukeRes]=await Promise.all([
      sb.from('program_communications').select('*').eq('player_program_id',_wsPPId).order('logged_at',{ascending:false}),
      sb.from('program_contacts').select('*').eq('player_program_id',_wsPPId).order('created_at'),
      sb.from('program_tasks').select('*').eq('player_program_id',_wsPPId).order('created_at'),
      sb.from('program_offers').select('*').eq('player_program_id',_wsPPId).maybeSingle(),
      sb.from('program_notes').select('*').eq('player_program_id',_wsPPId).order('created_at',{ascending:false}),
      sb.rpc('get_stale_programs',{stale_days:14}),
    ]);
    _wsData.log=logRes.data||[];
    _wsData.contacts=conRes.data||[];
    _wsData.tasks=taskRes.data||[];
    _wsData.offer=offRes.data||{status:'none'};
    _wsData.notes=noteRes.data||[];
    const staleList=jukeRes.data||[];
    _wsData.jukeAlert=staleList.find(s=>s.player_program_id===_wsPPId)||null;

    _renderWorkspace();
  }catch(err){
    console.warn('Workspace load error:',err);
    _renderWsOffline('Could not load workspace data.');
  }
}

function closeWorkspace(){
  const overlay=document.getElementById('ws-overlay');
  overlay.classList.remove('open');
  if(window.JukeDialog) window.JukeDialog.close(overlay);
  document.body.style.overflow='';
  _wsSchool=null;_wsPPId=null;
}

function _renderWorkspace(){
  _renderJukeBar();
  _renderWarmthDots();
  _renderTasksStrip();
  document.getElementById('ws-body').innerHTML=_buildStoryFeed();
  _renderBottomBar();
}

function _renderJukeBar(){
  const bar=document.getElementById('ws-juke-bar');
  if(_wsData.jukeAlert){
    const d=_wsData.jukeAlert.days_since_contact;
    document.getElementById('ws-juke-msg').innerHTML=`It's been <strong style="color:#FF0080;">${d} day${d!==1?'s':''}</strong> since your last logged contact.`;
    bar.classList.add('show');
  }else{bar.classList.remove('show');}
}

function _calcWarmth(){
  if(!_wsData.log.length)return 0;
  const now=new Date();
  const lastLog=new Date(_wsData.log[0].logged_at);
  const daysSince=Math.floor((now-lastLog)/(1000*60*60*24));
  const recentCount=_wsData.log.filter(e=>(now-new Date(e.logged_at))<30*24*60*60*1000).length;
  if(daysSince<=3&&recentCount>=3)return 5;
  if(daysSince<=7&&recentCount>=2)return 4;
  if(daysSince<=14)return 3;
  if(daysSince<=30)return 2;
  return 1;
}

function _renderWarmthDots(){
  const w=_wsData.log.length?_calcWarmth():0;
  document.getElementById('ws-warmth').innerHTML=
    [1,2,3,4,5].map(i=>`<span style="width:8px;height:8px;border-radius:50%;background:${i<=w?'#FF0080':'#E2DCE8'};display:inline-block;"></span>`).join('');
}

function _renderTasksStrip(){
  const strip=document.getElementById('ws-tasks-strip');
  const open=_wsData.tasks.filter(t=>!t.completed);
  if(!open.length){strip.classList.remove('has-tasks');return;}
  const today=new Date();today.setHours(0,0,0,0);
  strip.classList.add('has-tasks');
  strip.innerHTML=`<div class="ws-tasks-strip-hd">Open tasks</div>`
    +open.map(t=>{
      const overdue=t.due_date&&new Date(t.due_date+'T12:00:00')<today;
      const dueSpan=t.due_date
        ?` — <span class="${overdue?'ws-task-chip-overdue':'ws-task-chip-due'}">${overdue?'Overdue':'Due'} ${new Date(t.due_date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>`
        :'';
      return`<label class="ws-task-chip"><input type="checkbox" onchange="wsToggleTask(${t.id},true)"><span class="ws-task-chip-text">${t.text}${dueSpan}</span></label>`;
    }).join('');
}

function _buildStoryFeed(){
  const items=[];
  _wsData.log.forEach(e=>items.push({kind:'comm',date:new Date(e.logged_at),data:e}));
  _wsData.tasks.filter(t=>t.completed).forEach(t=>items.push({kind:'task_done',date:new Date(t.completed_at||t.created_at),data:t}));
  _wsData.notes.forEach(n=>items.push({kind:'note',date:new Date(n.created_at),data:n}));
  if(_wsData.ppCreatedAt)items.push({kind:'added',date:new Date(_wsData.ppCreatedAt),data:{}});
  items.sort((a,b)=>b.date-a.date);

  const fmtDate=d=>{
    const diff=Math.floor((new Date()-d)/(1000*60*60*24));
    if(diff===0)return'Today';if(diff===1)return'Yesterday';
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  };

  const forms=`<div style="margin-bottom:12px;">
    <button class="ws-add-light" id="ws-log-trigger-btn" onclick="wsShowLogForm()">+ Log an interaction</button>
    <button class="ws-add-light" id="ws-note-trigger-btn" onclick="wsShowNoteForm()" style="border-color:#E8DCF0;color:#9a78b8;margin-bottom:0;">+ Add a reflection</button>
  </div>
  <div class="ws-form-light" id="ws-log-form" style="display:none;">
    <label>Type</label>
    <select id="ws-log-type">
      <option value="phone_call">Phone Call</option>
      <option value="email">Email</option>
      <option value="message">Message</option>
      <option value="mail">Mail</option>
    </select>
    <label>Note <span style="opacity:.5;font-size:9px;">(optional)</span></label>
    <textarea id="ws-log-note" placeholder="What happened? How'd it feel?"></textarea>
    <div class="ws-actions-light">
      <button class="ws-btn-pink" onclick="wsAddLog()">Log it</button>
      <button class="ws-btn-muted" onclick="wsHideLogForm()">Cancel</button>
    </div>
  </div>
  <div class="ws-form-light" id="ws-note-form" style="display:none;">
    <label>Your reflection</label>
    <textarea id="ws-note-text" placeholder="Campus vibe, coaching style, team culture, your gut feeling…"></textarea>
    <div class="ws-actions-light">
      <button class="ws-btn-pink" onclick="wsAddNote()">Save</button>
      <button class="ws-btn-muted" onclick="wsHideNoteForm()">Cancel</button>
    </div>
  </div>`;

  if(!items.length)return forms+`<div class="ws-empty">Your story with ${_wsSchool} starts here.</div>`;

  const tl=items.map((item,i)=>{
    const isLast=i===items.length-1;
    const line=isLast?'':'<div class="ws-tl-line"></div>';
    const ds=fmtDate(item.date);
    if(item.kind==='comm'){
      const e=item.data;
      const cls=e.type==='phone_call'?'ws-tl-phone':e.type==='email'?'ws-tl-email':e.type==='message'?'ws-tl-message':e.type==='mail'?'ws-tl-mail':'ws-tl-juke';
      return`<div class="ws-tl-entry ${cls}">
        <div class="ws-tl-left"><div class="ws-tl-dot">${WS_LOG_ICONS[e.type]||'•'}</div>${line}</div>
        <div class="ws-tl-right"><div class="ws-tl-meta"><span class="ws-tl-type">${WS_LOG_LABELS[e.type]||e.type}</span><span class="ws-tl-date">${ds}</span></div>
        <div class="ws-tl-card"><p>${e.note||'Logged.'}</p></div></div></div>`;
    }
    if(item.kind==='task_done'){
      return`<div class="ws-tl-entry ws-tl-task">
        <div class="ws-tl-left"><div class="ws-tl-dot">✓</div>${line}</div>
        <div class="ws-tl-right"><div class="ws-tl-meta"><span class="ws-tl-type">Task completed</span><span class="ws-tl-date">${ds}</span></div>
        <div class="ws-tl-card"><p>${item.data.text}</p></div></div></div>`;
    }
    if(item.kind==='note'){
      return`<div class="ws-tl-entry ws-tl-note">
        <div class="ws-tl-left"><div class="ws-tl-dot">✎</div>${line}</div>
        <div class="ws-tl-right"><div class="ws-tl-meta"><span class="ws-tl-type">Your note</span><span class="ws-tl-date">${ds}</span></div>
        <div class="ws-tl-card"><p>${item.data.content}</p></div></div></div>`;
    }
    if(item.kind==='added'){
      return`<div class="ws-tl-entry ws-tl-added">
        <div class="ws-tl-left"><div class="ws-tl-dot">★</div>${line}</div>
        <div class="ws-tl-right"><div class="ws-tl-meta"><span class="ws-tl-type">Added to board</span><span class="ws-tl-date">${ds}</span></div>
        <div class="ws-tl-card"><p>Started tracking ${_wsSchool}</p></div></div></div>`;
    }
    return'';
  }).join('');

  return forms+tl;
}

function wsShowLogForm(){
  document.getElementById('ws-log-form').style.display='block';
  document.getElementById('ws-log-trigger-btn').style.display='none';
  document.getElementById('ws-juke-bar').classList.remove('show');
}
function wsHideLogForm(){
  document.getElementById('ws-log-form').style.display='none';
  document.getElementById('ws-log-trigger-btn').style.display='flex';
}
function wsShowNoteForm(){
  document.getElementById('ws-note-form').style.display='block';
  document.getElementById('ws-note-trigger-btn').style.display='none';
}
function wsHideNoteForm(){
  document.getElementById('ws-note-form').style.display='none';
  document.getElementById('ws-note-trigger-btn').style.display='flex';
}

async function wsAddLog(){
  if(!_wsPPId)return;
  const type=document.getElementById('ws-log-type')?.value||'phone_call';
  const note=(document.getElementById('ws-log-note')?.value||'').trim();
  const btn=document.querySelector('#ws-log-form .ws-btn-pink');
  if(btn){btn.disabled=true;btn.textContent='Saving…';}
  const {data,error}=await sb.from('program_communications')
    .insert({player_program_id:_wsPPId,type,note:note||null,logged_at:new Date().toISOString()})
    .select().single();
  if(!error&&data){_wsData.log.unshift(data);_wsData.jukeAlert=null;_renderWorkspace();}
}

async function wsAddNote(){
  if(!_wsPPId)return;
  const content=(document.getElementById('ws-note-text')?.value||'').trim();
  if(!content)return;
  const btn=document.querySelector('#ws-note-form .ws-btn-pink');
  if(btn){btn.disabled=true;btn.textContent='Saving…';}
  const {data,error}=await sb.from('program_notes')
    .insert({player_program_id:_wsPPId,content}).select().single();
  if(!error&&data){_wsData.notes.unshift(data);_renderWorkspace();}
}

function _renderBottomBar(){
  const bar=document.getElementById('ws-bottom-bar');
  const o=_wsData.offer||{status:'none'};
  const hasOffer=o.status&&o.status!=='none';

  const contactsHtml=_wsData.contacts.length
    ?`<div class="ws-bottom-section-hd">Coaches</div>`
      +_wsData.contacts.map(c=>{
        const abbr=(c.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
        const email=c.email?`<a href="mailto:${c.email}" style="color:#FF0080;font-size:10px;text-decoration:none;">${c.email}</a>`:'';
        return`<div class="ws-contact-chip-row">
          <div class="ws-contact-chip-av">${abbr}</div>
          <div class="ws-contact-chip-info">
            <div class="ws-contact-chip-nm">${c.name}${c.role?` <span style="color:#a09ab0;font-weight:400;">· ${c.role}</span>`:''}</div>
            ${email}
          </div></div>`;
      }).join('')
    :'';

  bar.innerHTML=contactsHtml
    +`<div class="ws-form-light" id="ws-contact-form" style="display:none;margin-bottom:10px;">
      <label>Name</label><input id="ws-c-name" placeholder="Coach Sarah Jones">
      <label>Role</label><input id="ws-c-role" placeholder="Head Coach">
      <div class="ws-form-row-light">
        <div><label>Email</label><input id="ws-c-email" type="email" placeholder="coach@school.edu"></div>
        <div><label>Phone</label><input id="ws-c-phone" type="tel" placeholder="555-000-0000"></div>
      </div>
      <div class="ws-actions-light">
        <button class="ws-btn-pink" onclick="wsAddContact()">Save</button>
        <button class="ws-btn-muted" onclick="wsHideContactForm()">Cancel</button>
      </div></div>
    <button class="ws-add-light" id="ws-contact-trigger" onclick="wsShowContactForm()" style="margin-top:${_wsData.contacts.length?'6':'0'}px;">+ Add a coach contact</button>
    <div class="ws-form-light" id="ws-task-form" style="display:none;margin-bottom:10px;">
      <label>Task</label><input id="ws-t-text" placeholder="Submit application, register for camp…">
      <label>Due date <span style="opacity:.5;font-size:9px;">(optional)</span></label>
      <input id="ws-t-due" type="date">
      <div class="ws-actions-light">
        <button class="ws-btn-pink" onclick="wsAddTask()">Add task</button>
        <button class="ws-btn-muted" onclick="wsHideTaskForm()">Cancel</button>
      </div></div>
    <button class="ws-add-light" id="ws-task-trigger" onclick="wsShowTaskForm()">+ Add a task</button>
    <button class="ws-add-light" id="ws-offer-trigger" onclick="wsToggleOffer()" style="${hasOffer?'border-color:rgba(255,0,128,.35);color:#FF0080;':''}">
      ${hasOffer?`Offer: ${WS_OFFER_LABELS[o.status]}`:'+ Track offer / financial aid'}
    </button>
    <div id="ws-offer-section" style="display:none;">
      <div class="ws-offer-inner">
        <div class="ws-offer-pills-light">
          ${WS_OFFER_STATUSES.map(s=>`<button class="ws-offer-pill-light${o.status===s?' active':''}" onclick="wsSetOfferStatus('${s}')">${WS_OFFER_LABELS[s]}</button>`).join('')}
        </div>
        <div class="ws-offer-grid-light">
          ${[['scholarship_amount','Scholarship/yr'],['housing','Housing'],['books','Books'],['cost_of_attendance','Cost of Attendance'],['est_family_contribution','Family Contribution']].map(([k,l])=>`<div class="ws-metric-light">
            <div class="ws-metric-light-lbl">${l}</div>
            <input type="text" placeholder="—" value="${o[k]?'$'+parseInt(o[k]).toLocaleString():''}" onblur="wsUpdateOfferField('${k}',this.value)" onfocus="this.select()">
          </div>`).join('')}
        </div>
        <textarea class="ws-offer-note-light" placeholder="Verbal interest, scholarship timing, any conditions…" onblur="wsUpdateOfferNote(this.value)">${o.notes||''}</textarea>
      </div>
    </div>`;
}

function wsShowContactForm(){
  document.getElementById('ws-contact-form').style.display='block';
  document.getElementById('ws-contact-trigger').style.display='none';
}
function wsHideContactForm(){
  document.getElementById('ws-contact-form').style.display='none';
  document.getElementById('ws-contact-trigger').style.display='flex';
}
function wsShowTaskForm(){
  document.getElementById('ws-task-form').style.display='block';
  document.getElementById('ws-task-trigger').style.display='none';
}
function wsHideTaskForm(){
  document.getElementById('ws-task-form').style.display='none';
  document.getElementById('ws-task-trigger').style.display='flex';
}
function wsToggleOffer(){
  const s=document.getElementById('ws-offer-section');
  const open=s.style.display==='block';
  s.style.display=open?'none':'block';
  if(!open)document.getElementById('ws-offer-trigger').style.display='none';
}

async function wsAddContact(){
  if(!_wsPPId)return;
  const name=(document.getElementById('ws-c-name')?.value||'').trim();
  if(!name)return;
  const role=(document.getElementById('ws-c-role')?.value||'').trim();
  const email=(document.getElementById('ws-c-email')?.value||'').trim();
  const phone=(document.getElementById('ws-c-phone')?.value||'').trim();
  const btn=document.querySelector('#ws-contact-form .ws-btn-pink');
  if(btn){btn.disabled=true;btn.textContent='Saving…';}
  const {data,error}=await sb.from('program_contacts')
    .insert({player_program_id:_wsPPId,name,role:role||null,email:email||null,phone:phone||null})
    .select().single();
  if(!error&&data){_wsData.contacts.push(data);_renderBottomBar();}
}

async function wsToggleTask(id,done){
  const {error}=await sb.from('program_tasks')
    .update({completed:done,completed_at:done?new Date().toISOString():null}).eq('id',id);
  if(!error){
    const t=_wsData.tasks.find(x=>x.id===id);
    if(t){t.completed=done;t.completed_at=done?new Date().toISOString():null;}
    _renderWorkspace();
  }
}

async function wsAddTask(){
  if(!_wsPPId)return;
  const text=(document.getElementById('ws-t-text')?.value||'').trim();
  if(!text)return;
  const due=document.getElementById('ws-t-due')?.value||null;
  const btn=document.querySelector('#ws-task-form .ws-btn-pink');
  if(btn){btn.disabled=true;btn.textContent='Saving…';}
  const {data,error}=await sb.from('program_tasks')
    .insert({player_program_id:_wsPPId,text,due_date:due||null})
    .select().single();
  if(!error&&data){_wsData.tasks.push(data);_renderWorkspace();}
}

async function wsSetOfferStatus(status){
  const update={status,updated_at:new Date().toISOString()};
  let error;
  if(_wsData.offer?.id){
    ({error}=await sb.from('program_offers').update(update).eq('id',_wsData.offer.id));
  }else{
    const res=await sb.from('program_offers').insert({player_program_id:_wsPPId,...update}).select().single();
    error=res.error;if(!error)_wsData.offer=res.data;
  }
  if(!error){_wsData.offer={..._wsData.offer,...update};_renderBottomBar();}
}

async function wsUpdateOfferField(key,rawVal){
  const num=parseInt(rawVal.replace(/[$,\s]/g,''));
  const val=isNaN(num)?null:num;
  const update={[key]:val,updated_at:new Date().toISOString()};
  let error;
  if(_wsData.offer?.id){
    ({error}=await sb.from('program_offers').update(update).eq('id',_wsData.offer.id));
  }else{
    const res=await sb.from('program_offers').insert({player_program_id:_wsPPId,status:'none',...update}).select().single();
    error=res.error;if(!error)_wsData.offer=res.data;
  }
  if(!error)_wsData.offer={..._wsData.offer,...update};
}

async function wsUpdateOfferNote(val){
  const notes=val.trim()||null;
  const update={notes,updated_at:new Date().toISOString()};
  let error;
  if(_wsData.offer?.id){
    ({error}=await sb.from('program_offers').update(update).eq('id',_wsData.offer.id));
  }else{
    const res=await sb.from('program_offers').insert({player_program_id:_wsPPId,status:'none',...update}).select().single();
    error=res.error;if(!error)_wsData.offer=res.data;
  }
  if(!error)_wsData.offer={..._wsData.offer,...update};
}

async function wsChangeStage(newStage){
  if(!_wsSchool)return;
  statusData[_wsSchool]=newStage;
  lsSet('juke_status',statusData);
  cloudSave();
  const sc=WS_STAGE_COLORS[newStage]||WS_STAGE_COLORS.saved;
  const av=document.getElementById('ws-av');
  if(av){av.style.background=sc.bg;av.style.color=sc.text;}
  if(sb&&currentUser&&_wsPPId){
    await sb.from('player_programs').update({stage:newStage,updated_at:new Date().toISOString()}).eq('id',_wsPPId);
  }
  if(document.getElementById('tab-pipeline')?.classList.contains('active'))renderPipeline();
}

function _renderWsOffline(msg='Sign in to track this school.'){
  document.getElementById('ws-body').innerHTML=`<div class="ws-empty">${msg}</div>`;
}

// ── JUKE LOGIN BANNER ─────────────────────────────────────────────────────────
async function checkJukeLoginAlerts(){
  if(!sb||!currentUser)return;
  try{
    const {data}=await sb.rpc('get_stale_programs',{stale_days:14});
    if(!data||!data.length)return;
    const top=data[0];
    const existing=document.getElementById('juke-login-banner');
    if(existing)existing.remove();
    const banner=document.createElement('div');
    banner.id='juke-login-banner';
    banner.style.cssText='position:fixed;bottom:24px;right:24px;background:#1a1c20;border:1px solid rgba(255,0,128,.3);border-radius:14px;padding:14px 16px;max-width:300px;z-index:400;box-shadow:0 8px 32px rgba(0,0,0,.5);cursor:pointer;';
    banner.innerHTML=`<div style="display:flex;gap:10px;align-items:flex-start;">
      <div style="width:7px;height:7px;border-radius:50%;background:#FF0080;margin-top:5px;flex-shrink:0;animation:jukePulse 2s infinite;"></div>
      <div style="flex:1;">
        <div style="font-size:12px;font-weight:700;color:#FF0080;letter-spacing:.04em;text-transform:uppercase;margin-bottom:4px;">Juke Reminder</div>
        <div style="font-size:13px;color:rgba(255,255,255,.7);line-height:1.5;">It's been ${top.days_since_contact} days since your last contact with <strong style="color:#fff;">${top.program_name}</strong>.</div>
        ${data.length>1?`<div style="font-size:11px;color:rgba(255,0,128,.6);margin-top:6px;">+${data.length-1} more school${data.length>2?'s':''} need attention</div>`:''}
      </div>
      <button onclick="event.stopPropagation();document.getElementById('juke-login-banner').remove();" style="background:none;border:none;color:rgba(255,255,255,.3);font-size:18px;cursor:pointer;padding:0;line-height:1;flex-shrink:0;">×</button>
    </div>`;
    banner.addEventListener('click',()=>{switchTab('pipeline');banner.remove();});
    document.body.appendChild(banner);
    setTimeout(()=>banner?.remove(),12000);
  }catch(e){}
}

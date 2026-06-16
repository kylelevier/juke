// ── BOARD DETAIL PANEL ───────────────────────────────────────
// Opens a slide-over with full per-school recruiting data.
// Sections: Overview · Coaches · Communications · Notes · Visits · Application · Offer · Deadlines

let _bdSchool=null;   // currently open school name
let _bdRecord=null;   // player_programs row from Supabase
let _bdSection='overview'; // active tab

const BD_ATTR_DEFS=[
  {key:'is_dream_school', label:'⭐ Dream School'},
  {key:'is_top_choice',   label:'🔥 Top Choice'},
  {key:'is_in_state',     label:'📍 In-State'},
  {key:'scholarship_opp', label:'💰 Scholarship Opp'},
  {key:'academic_match',  label:'📚 Academic Match'},
  {key:'is_christian',    label:'✝ Christian School'},
];

const BD_SECTIONS=[
  {key:'overview',     label:'Overview'},
  {key:'coaches',      label:'Coaches'},
  {key:'comms',        label:'Timeline'},
  {key:'notes',        label:'Notes'},
  {key:'visits',       label:'Visits'},
  {key:'application',  label:'Application'},
  {key:'offer',        label:'Offer'},
  {key:'deadlines',    label:'Deadlines'},
];

// ── Open / close ─────────────────────────────────────────
function openBoardDetail(schoolName){
  _bdSchool=schoolName;
  _bdSection='overview';
  _renderBDShell();
  document.getElementById('bd-overlay').classList.add('open');
  document.getElementById('bd-panel').classList.add('open');
  _loadBDSection('overview');
}

function closeBoardDetail(){
  document.getElementById('bd-overlay').classList.remove('open');
  document.getElementById('bd-panel').classList.remove('open');
  _bdSchool=null;_bdRecord=null;
}

// ── Shell (header + nav) ─────────────────────────────────
function _renderBDShell(){
  const panel=document.getElementById('bd-panel');
  const prog=RAW.find(r=>r.School===_bdSchool)||{};
  const stage=statusData[_bdSchool]||'saved';
  const stageLabel={saved:'Saved',contacted:'Contacted',engaged:'Engaged',visit:'Visit',applied:'Applied',offer:'Offer',committed:'Committed',archived:'Archived'};
  const sc=WS_STAGE_COLORS[stage]||WS_STAGE_COLORS.saved;
  const lsAttrs=(lsGet('juke_card_attrs')||{})[_bdSchool]||{};

  panel.innerHTML=`
    <div class="bd-header">
      <div class="bd-header-top">
        <div class="bd-logo-wrap" id="bd-logo-wrap" data-logo="${_bdSchool}"></div>
        <div class="bd-header-text">
          <div class="bd-school-name">${_bdSchool}</div>
          <div class="bd-school-meta">${prog.State||''}${prog.Region?' · '+prog.Region:''}${prog['Division']?' · '+prog['Division']:''}</div>
          <div class="bd-stage-badge" style="background:${sc.bg};color:${sc.text}">${stageLabel[stage]||stage}</div>
        </div>
        <button class="bd-close-btn" onclick="closeBoardDetail()">✕</button>
      </div>

      <div class="bd-attrs">
        ${BD_ATTR_DEFS.map(a=>`
          <button class="bd-attr-pill ${lsAttrs[a.key]?'active':''}" data-attr="${a.key}" onclick="_bdToggleAttr('${a.key}',this)">
            ${a.label}
          </button>
        `).join('')}
      </div>

      <div class="bd-nav">
        ${BD_SECTIONS.map(s=>`<button class="bd-nav-btn ${s.key===_bdSection?'active':''}" onclick="_bdSwitchSection('${s.key}')">${s.label}</button>`).join('')}
      </div>
    </div>
    <div class="bd-body" id="bd-body"><div class="bd-loading">Loading…</div></div>
  `;

  fetchSchoolLogo(_bdSchool,document.getElementById('bd-logo-wrap'));
}

function _bdSwitchSection(key){
  _bdSection=key;
  document.querySelectorAll('.bd-nav-btn').forEach(b=>b.classList.toggle('active',b.textContent.trim()===BD_SECTIONS.find(s=>s.key===key)?.label));
  _loadBDSection(key);
}

// ── Attribute toggles ────────────────────────────────────
function _bdToggleAttr(attrKey,btn){
  const lsAttrs=(lsGet('juke_card_attrs')||{});
  const cur=lsAttrs[_bdSchool]||{};
  cur[attrKey]=!cur[attrKey];
  saveBoardAttrs(_bdSchool,cur); // data.js
  btn.classList.toggle('active',!!cur[attrKey]);
  // Refresh card on board if visible
  const card=document.querySelector(`.pipeline-card[data-school="${CSS.escape(_bdSchool)}"]`);
  if(card){
    const r=RAW.find(x=>x.School===_bdSchool);
    const stage=statusData[_bdSchool]||'saved';
    if(r) card.replaceWith(buildPipelineCard(r,stage));
  }
}

// ── Section loader ───────────────────────────────────────
async function _loadBDSection(key){
  const body=document.getElementById('bd-body');
  if(!body) return;
  body.innerHTML='<div class="bd-loading">Loading…</div>';
  switch(key){
    case 'overview':     _renderBDOverview(body);break;
    case 'coaches':      await _renderBDCoaches(body);break;
    case 'comms':        await _renderBDComms(body);break;
    case 'notes':        await _renderBDNotes(body);break;
    case 'visits':       await _renderBDVisits(body);break;
    case 'application':  await _renderBDApplication(body);break;
    case 'offer':        await _renderBDOffer(body);break;
    case 'deadlines':    await _renderBDDeadlines(body);break;
  }
}

// ── OVERVIEW ─────────────────────────────────────────────
function _renderBDOverview(body){
  const prog=RAW.find(r=>r.School===_bdSchool)||{};
  const fit=typeof fitScores!=='undefined'?fitScores[_bdSchool+'|'+prog.State]??-1:-1;

  // Next action form
  const meta=_boardMeta[_bdSchool]||{};
  const lcd=meta.last_contact_date||'';
  const na=meta.next_action||'';
  const nad=meta.next_action_date||'';

  body.innerHTML=`
    <div class="bd-section">
      <div class="bd-overview-grid">
        <div class="bd-ov-item"><span class="bd-ov-label">Division</span><span class="bd-ov-val">${prog['Division']||'—'}</span></div>
        <div class="bd-ov-item"><span class="bd-ov-label">Governing Body</span><span class="bd-ov-val">${prog['Governing Body']||'—'}</span></div>
        <div class="bd-ov-item"><span class="bd-ov-label">Varsity / Club</span><span class="bd-ov-val">${prog['Varsity or Club']||'—'}</span></div>
        <div class="bd-ov-item"><span class="bd-ov-label">Conference</span><span class="bd-ov-val">${prog.Conference||'—'}</span></div>
        <div class="bd-ov-item"><span class="bd-ov-label">School Type</span><span class="bd-ov-val">${prog['School Type']||'—'}</span></div>
        <div class="bd-ov-item"><span class="bd-ov-label">Enrollment</span><span class="bd-ov-val">${prog.Enrollment||'—'}</span></div>
        <div class="bd-ov-item"><span class="bd-ov-label">HBCU</span><span class="bd-ov-val">${prog.HBCU||'—'}</span></div>
        <div class="bd-ov-item"><span class="bd-ov-label">Religious</span><span class="bd-ov-val">${prog['Religious Affiliation']||'—'}</span></div>
        <div class="bd-ov-item"><span class="bd-ov-label">Scholarship</span><span class="bd-ov-val">${prog.Scholarship||'—'}</span></div>
        ${fit>=0?`<div class="bd-ov-item"><span class="bd-ov-label">Fit Score</span><span class="bd-ov-val">${fitBadge(fit)}</span></div>`:''}
      </div>
    </div>

    <div class="bd-section">
      <div class="bd-section-title">Next Action</div>
      <div class="bd-contact-form">
        <div class="bd-form-row">
          <label class="bd-form-label">Last Contact</label>
          <input type="date" class="bd-input" id="bd-lcd" value="${lcd}" onchange="_bdSaveContact()">
        </div>
        <div class="bd-form-row">
          <label class="bd-form-label">Next Action</label>
          <input type="text" class="bd-input" id="bd-na" value="${na}" placeholder="e.g. Send highlight reel" onblur="_bdSaveContact()">
        </div>
        <div class="bd-form-row">
          <label class="bd-form-label">Due Date</label>
          <input type="date" class="bd-input" id="bd-nad" value="${nad}" onchange="_bdSaveContact()">
        </div>
      </div>
    </div>
  `;
}

async function _bdSaveContact(){
  const lcd=document.getElementById('bd-lcd')?.value||null;
  const na=document.getElementById('bd-na')?.value||null;
  const nad=document.getElementById('bd-nad')?.value||null;
  await saveBoardContact(_bdSchool,{lastContactDate:lcd,nextAction:na,nextActionDate:nad});
  _boardMeta[_bdSchool]=Object.assign(_boardMeta[_bdSchool]||{},{last_contact_date:lcd,next_action:na,next_action_date:nad});
  // Refresh card
  const card=document.querySelector(`.pipeline-card[data-school="${CSS.escape(_bdSchool)}"]`);
  if(card){const r=RAW.find(x=>x.School===_bdSchool);if(r)card.replaceWith(buildPipelineCard(r,statusData[_bdSchool]||'saved'));}
}

// ── COACHES ──────────────────────────────────────────────
async function _renderBDCoaches(body){
  const items=await loadBoardSection(_bdSchool,'program_contacts');
  body.innerHTML=`
    <div class="bd-section">
      <div class="bd-section-hd"><div class="bd-section-title">Coach Contacts</div><button class="bd-add-btn" onclick="_bdAddCoach()">+ Add Coach</button></div>
      <div id="bd-coaches-list">
        ${items.length?items.map(c=>`
          <div class="bd-contact-card" data-id="${c.id}">
            <div class="bd-contact-name">${c.name}</div>
            ${c.role?`<div class="bd-contact-role">${c.role}</div>`:''}
            <div class="bd-contact-links">
              ${c.email?`<a href="mailto:${c.email}" class="bd-contact-link">✉ ${c.email}</a>`:''}
              ${c.phone?`<a href="tel:${c.phone}" class="bd-contact-link">☎ ${c.phone}</a>`:''}
            </div>
            <div class="bd-item-actions">
              <button class="bd-item-del" onclick="_bdDeleteItem('program_contacts',${c.id},'bd-coaches-list',_renderBDCoaches)">Remove</button>
            </div>
          </div>
        `).join(''):'<div class="bd-empty">No coach contacts yet.</div>'}
      </div>
    </div>
  `;
}

function _bdAddCoach(){
  const body=document.getElementById('bd-body');
  const existing=body.querySelector('.bd-inline-form');if(existing)existing.remove();
  const form=document.createElement('div');form.className='bd-section bd-inline-form';
  form.innerHTML=`
    <div class="bd-section-title">Add Coach</div>
    <div class="bd-form-row"><label class="bd-form-label">Name *</label><input class="bd-input" id="bdc-name" placeholder="Coach Name"></div>
    <div class="bd-form-row"><label class="bd-form-label">Title</label><input class="bd-input" id="bdc-role" placeholder="Head Coach, Recruiting Coordinator…"></div>
    <div class="bd-form-row"><label class="bd-form-label">Email</label><input class="bd-input" id="bdc-email" type="email" placeholder="coach@school.edu"></div>
    <div class="bd-form-row"><label class="bd-form-label">Phone</label><input class="bd-input" id="bdc-phone" type="tel" placeholder="555-000-0000"></div>
    <div class="bd-form-actions"><button class="bd-save-btn" onclick="_bdSaveCoach()">Save</button><button class="bd-cancel-btn" onclick="this.closest('.bd-inline-form').remove()">Cancel</button></div>
  `;
  body.querySelector('.bd-section').before(form);
}

async function _bdSaveCoach(){
  const name=document.getElementById('bdc-name')?.value.trim();
  if(!name){showToast('Name is required');return;}
  await addBoardItem(_bdSchool,'program_contacts',{
    name,
    role:document.getElementById('bdc-role')?.value.trim()||null,
    email:document.getElementById('bdc-email')?.value.trim()||null,
    phone:document.getElementById('bdc-phone')?.value.trim()||null,
  });
  await _renderBDCoaches(document.getElementById('bd-body'));
}

// ── COMMUNICATIONS ────────────────────────────────────────
const COMM_TYPES=['email','call','text','social','in_person','letter'];
const COMM_ICONS={email:'✉',call:'☎',text:'💬',social:'📲',in_person:'🤝',letter:'📬'};

async function _renderBDComms(body){
  const items=await loadBoardSection(_bdSchool,'program_communications');
  body.innerHTML=`
    <div class="bd-section">
      <div class="bd-section-hd"><div class="bd-section-title">Communication Timeline</div><button class="bd-add-btn" onclick="_bdAddComm()">+ Log Contact</button></div>
      <div id="bd-comms-list">
        ${items.length?items.map(c=>`
          <div class="bd-comm-item" data-id="${c.id}">
            <div class="bd-comm-icon">${COMM_ICONS[c.type]||'◎'}</div>
            <div class="bd-comm-body">
              <div class="bd-comm-top">
                <span class="bd-comm-type">${c.type||'contact'}</span>
                ${c.direction?`<span class="bd-comm-dir ${c.direction}">${c.direction}</span>`:''}
                <span class="bd-comm-date">${_fmtDate(c.comm_date||c.logged_at?.split('T')[0])}</span>
              </div>
              ${c.subject?`<div class="bd-comm-subject">${c.subject}</div>`:''}
              ${c.note?`<div class="bd-comm-note">${c.note}</div>`:''}
            </div>
            <button class="bd-item-del" onclick="_bdDeleteItem('program_communications',${c.id},'bd-comms-list',_renderBDComms)">✕</button>
          </div>
        `).join(''):'<div class="bd-empty">No communications logged yet.</div>'}
      </div>
    </div>
  `;
}

function _bdAddComm(){
  const body=document.getElementById('bd-body');
  const existing=body.querySelector('.bd-inline-form');if(existing)existing.remove();
  const today=new Date().toISOString().split('T')[0];
  const form=document.createElement('div');form.className='bd-section bd-inline-form';
  form.innerHTML=`
    <div class="bd-section-title">Log Contact</div>
    <div class="bd-form-row">
      <label class="bd-form-label">Type</label>
      <select class="bd-input" id="bdcomm-type">${COMM_TYPES.map(t=>`<option value="${t}">${COMM_ICONS[t]} ${t}</option>`).join('')}</select>
    </div>
    <div class="bd-form-row">
      <label class="bd-form-label">Direction</label>
      <select class="bd-input" id="bdcomm-dir"><option value="outbound">Outbound (I reached out)</option><option value="inbound">Inbound (Coach reached out)</option></select>
    </div>
    <div class="bd-form-row"><label class="bd-form-label">Date</label><input class="bd-input" id="bdcomm-date" type="date" value="${today}"></div>
    <div class="bd-form-row"><label class="bd-form-label">Subject</label><input class="bd-input" id="bdcomm-subj" placeholder="e.g. Sent highlight video"></div>
    <div class="bd-form-row"><label class="bd-form-label">Notes</label><textarea class="bd-input bd-textarea" id="bdcomm-note" placeholder="What was said, what happened…"></textarea></div>
    <div class="bd-form-actions"><button class="bd-save-btn" onclick="_bdSaveComm()">Save</button><button class="bd-cancel-btn" onclick="this.closest('.bd-inline-form').remove()">Cancel</button></div>
  `;
  body.querySelector('.bd-section').before(form);
}

async function _bdSaveComm(){
  const date=document.getElementById('bdcomm-date')?.value;
  await addBoardItem(_bdSchool,'program_communications',{
    type:document.getElementById('bdcomm-type')?.value,
    direction:document.getElementById('bdcomm-dir')?.value,
    comm_date:date||null,
    subject:document.getElementById('bdcomm-subj')?.value.trim()||null,
    note:document.getElementById('bdcomm-note')?.value.trim()||null,
    logged_at:new Date().toISOString(),
  });
  // Auto-update last contact date if this is newer
  if(date){
    const cur=_boardMeta[_bdSchool]?.last_contact_date;
    if(!cur||date>cur) await saveBoardContact(_bdSchool,{lastContactDate:date});
  }
  await _renderBDComms(document.getElementById('bd-body'));
}

// ── NOTES ────────────────────────────────────────────────
async function _renderBDNotes(body){
  const items=await loadBoardSection(_bdSchool,'program_notes');
  const latest=items[0];
  body.innerHTML=`
    <div class="bd-section">
      <div class="bd-section-title">Notes</div>
      <textarea class="bd-input bd-notes-area" id="bd-notes-text" placeholder="Impressions, questions, things to remember…">${latest?.content||''}</textarea>
      <div class="bd-form-actions"><button class="bd-save-btn" onclick="_bdSaveNote()">Save Note</button></div>
      ${items.length>1?`<div class="bd-section-title" style="margin-top:20px">Previous Notes</div>`+'<div class="bd-notes-history">'+items.slice(1).map(n=>`<div class="bd-note-item"><div class="bd-note-date">${_fmtDate(n.created_at?.split('T')[0])}</div><div class="bd-note-content">${n.content}</div></div>`).join('')+'</div>':''}
    </div>
  `;
}

async function _bdSaveNote(){
  const content=document.getElementById('bd-notes-text')?.value.trim();
  if(!content) return;
  await addBoardItem(_bdSchool,'program_notes',{content});
  showToast('Note saved');
}

// ── VISITS ───────────────────────────────────────────────
const VISIT_TYPES=['unofficial','official','virtual'];
const VISIT_STATUS=['planned','completed','cancelled'];

async function _renderBDVisits(body){
  const items=await loadBoardSection(_bdSchool,'program_visits');
  body.innerHTML=`
    <div class="bd-section">
      <div class="bd-section-hd"><div class="bd-section-title">Visits</div><button class="bd-add-btn" onclick="_bdAddVisit()">+ Add Visit</button></div>
      <div id="bd-visits-list">
        ${items.length?items.map(v=>`
          <div class="bd-visit-item" data-id="${v.id}">
            <div class="bd-visit-type-badge ${v.visit_type}">${v.visit_type}</div>
            <div class="bd-visit-body">
              <div class="bd-visit-date">${v.visit_date?_fmtDate(v.visit_date):'Date TBD'}</div>
              <div class="bd-visit-status status-${v.status}">${v.status}</div>
              ${v.notes?`<div class="bd-visit-notes">${v.notes}</div>`:''}
            </div>
            <button class="bd-item-del" onclick="_bdDeleteItem('program_visits',${v.id},'bd-visits-list',_renderBDVisits)">✕</button>
          </div>
        `).join(''):'<div class="bd-empty">No visits tracked yet.</div>'}
      </div>
    </div>
  `;
}

function _bdAddVisit(){
  const body=document.getElementById('bd-body');
  const existing=body.querySelector('.bd-inline-form');if(existing)existing.remove();
  const form=document.createElement('div');form.className='bd-section bd-inline-form';
  form.innerHTML=`
    <div class="bd-section-title">Add Visit</div>
    <div class="bd-form-row"><label class="bd-form-label">Type</label><select class="bd-input" id="bdv-type">${VISIT_TYPES.map(t=>`<option>${t}</option>`).join('')}</select></div>
    <div class="bd-form-row"><label class="bd-form-label">Date</label><input class="bd-input" id="bdv-date" type="date"></div>
    <div class="bd-form-row"><label class="bd-form-label">Status</label><select class="bd-input" id="bdv-status">${VISIT_STATUS.map(s=>`<option>${s}</option>`).join('')}</select></div>
    <div class="bd-form-row"><label class="bd-form-label">Notes</label><textarea class="bd-input bd-textarea" id="bdv-notes"></textarea></div>
    <div class="bd-form-actions"><button class="bd-save-btn" onclick="_bdSaveVisit()">Save</button><button class="bd-cancel-btn" onclick="this.closest('.bd-inline-form').remove()">Cancel</button></div>
  `;
  body.querySelector('.bd-section').before(form);
}

async function _bdSaveVisit(){
  await addBoardItem(_bdSchool,'program_visits',{
    visit_type:document.getElementById('bdv-type')?.value,
    visit_date:document.getElementById('bdv-date')?.value||null,
    status:document.getElementById('bdv-status')?.value,
    notes:document.getElementById('bdv-notes')?.value.trim()||null,
  });
  await _renderBDVisits(document.getElementById('bd-body'));
}

// ── APPLICATION ───────────────────────────────────────────
const APP_STATUSES=['not_started','in_progress','submitted','accepted','waitlisted','denied'];
const APP_LABELS={not_started:'Not Started',in_progress:'In Progress',submitted:'Submitted',accepted:'Accepted',waitlisted:'Waitlisted',denied:'Denied'};

async function _renderBDApplication(body){
  const items=await loadBoardSection(_bdSchool,'program_applications');
  const app=items[0];
  body.innerHTML=`
    <div class="bd-section">
      <div class="bd-section-title">Application</div>
      <div class="bd-form-row">
        <label class="bd-form-label">Status</label>
        <select class="bd-input" id="bda-status" onchange="_bdSaveApplication()">
          ${APP_STATUSES.map(s=>`<option value="${s}" ${app?.app_status===s?'selected':''}>${APP_LABELS[s]}</option>`).join('')}
        </select>
      </div>
      <div class="bd-form-row"><label class="bd-form-label">Submission Date</label><input class="bd-input" id="bda-sub" type="date" value="${app?.submission_date||''}" onchange="_bdSaveApplication()"></div>
      <div class="bd-form-row"><label class="bd-form-label">Deadline</label><input class="bd-input" id="bda-ddl" type="date" value="${app?.deadline||''}" onchange="_bdSaveApplication()"></div>
      <div class="bd-form-row"><label class="bd-form-label">Portal URL</label><input class="bd-input" id="bda-url" type="url" value="${app?.portal_url||''}" placeholder="https://…" onblur="_bdSaveApplication()"></div>
      <div class="bd-form-row"><label class="bd-form-label">Notes</label><textarea class="bd-input bd-textarea" id="bda-notes" onblur="_bdSaveApplication()">${app?.notes||''}</textarea></div>
      <div id="bda-id" style="display:none">${app?.id||''}</div>
    </div>
  `;
}

async function _bdSaveApplication(){
  const id=document.getElementById('bda-id')?.textContent.trim();
  const payload={
    app_status:document.getElementById('bda-status')?.value,
    submission_date:document.getElementById('bda-sub')?.value||null,
    deadline:document.getElementById('bda-ddl')?.value||null,
    portal_url:document.getElementById('bda-url')?.value.trim()||null,
    notes:document.getElementById('bda-notes')?.value.trim()||null,
  };
  if(id){
    await updateBoardItem('program_applications',parseInt(id),payload);
  } else {
    const created=await addBoardItem(_bdSchool,'program_applications',payload);
    if(created)document.getElementById('bda-id').textContent=created.id;
  }
  showToast('Application saved');
}

// ── OFFER ────────────────────────────────────────────────
const OFFER_STATUSES=['received','accepted','declined','expired'];

async function _renderBDOffer(body){
  const items=await loadBoardSection(_bdSchool,'program_offers');
  const offer=items[0];
  body.innerHTML=`
    <div class="bd-section">
      <div class="bd-section-title">Offer Details</div>
      <div class="bd-form-row">
        <label class="bd-form-label">Offer Status</label>
        <select class="bd-input" id="bdo-status" onchange="_bdSaveOffer()">
          <option value="">No offer yet</option>
          ${OFFER_STATUSES.map(s=>`<option value="${s}" ${offer?.status===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
        </select>
      </div>
      <div class="bd-form-row"><label class="bd-form-label">Scholarship Amount / yr</label><input class="bd-input" id="bdo-amt" type="number" value="${offer?.scholarship_amount||''}" placeholder="0" onblur="_bdSaveOffer()"></div>
      <div class="bd-form-row"><label class="bd-form-label">Housing</label><input class="bd-input" id="bdo-housing" type="number" value="${offer?.housing||''}" placeholder="0" onblur="_bdSaveOffer()"></div>
      <div class="bd-form-row"><label class="bd-form-label">Books</label><input class="bd-input" id="bdo-books" type="number" value="${offer?.books||''}" placeholder="0" onblur="_bdSaveOffer()"></div>
      <div class="bd-form-row"><label class="bd-form-label">Est. Family Contribution</label><input class="bd-input" id="bdo-efc" type="number" value="${offer?.est_family_contribution||''}" placeholder="0" onblur="_bdSaveOffer()"></div>
      <div class="bd-form-row"><label class="bd-form-label">Notes</label><textarea class="bd-input bd-textarea" id="bdo-notes" onblur="_bdSaveOffer()">${offer?.notes||''}</textarea></div>
      <div id="bdo-id" style="display:none">${offer?.id||''}</div>
      ${offer?.scholarship_amount?`<div class="bd-offer-summary">Net estimated cost: <strong>$${_calcOfferNet(offer).toLocaleString()}</strong>/yr</div>`:''}
    </div>
  `;
}

function _calcOfferNet(o){
  const coa=o.cost_of_attendance||0;
  const schol=(o.scholarship_amount||0)+(o.housing||0)+(o.books||0);
  const efc=o.est_family_contribution||0;
  return Math.max(0,coa-schol-efc)||efc;
}

async function _bdSaveOffer(){
  const id=document.getElementById('bdo-id')?.textContent.trim();
  const payload={
    status:document.getElementById('bdo-status')?.value||'none',
    scholarship_amount:parseInt(document.getElementById('bdo-amt')?.value)||null,
    housing:parseInt(document.getElementById('bdo-housing')?.value)||null,
    books:parseInt(document.getElementById('bdo-books')?.value)||null,
    est_family_contribution:parseInt(document.getElementById('bdo-efc')?.value)||null,
    notes:document.getElementById('bdo-notes')?.value.trim()||null,
    updated_at:new Date().toISOString(),
  };
  if(id){
    await updateBoardItem('program_offers',parseInt(id),payload);
  } else {
    const created=await addBoardItem(_bdSchool,'program_offers',payload);
    if(created)document.getElementById('bdo-id').textContent=created.id;
  }
  showToast('Offer saved');
}

// ── DEADLINES ────────────────────────────────────────────
const DDL_TYPES=['application','decision','commitment','nli','eid','custom'];

async function _renderBDDeadlines(body){
  const items=await loadBoardSection(_bdSchool,'program_tasks');
  body.innerHTML=`
    <div class="bd-section">
      <div class="bd-section-hd"><div class="bd-section-title">Deadlines & Tasks</div><button class="bd-add-btn" onclick="_bdAddDeadline()">+ Add</button></div>
      <div id="bd-deadlines-list">
        ${items.length?items.map(d=>`
          <div class="bd-deadline-item ${d.completed?'completed':''}" data-id="${d.id}">
            <button class="bd-deadline-check ${d.completed?'done':''}" onclick="_bdToggleDeadline(${d.id},${!d.completed})">${d.completed?'✓':''}</button>
            <div class="bd-deadline-body">
              <div class="bd-deadline-text">${d.text}</div>
              ${d.due_date?`<div class="bd-deadline-date ${_isOverdue(d.due_date)&&!d.completed?'overdue':''}">${_fmtDate(d.due_date)}</div>`:''}
            </div>
            <button class="bd-item-del" onclick="_bdDeleteItem('program_tasks',${d.id},'bd-deadlines-list',_renderBDDeadlines)">✕</button>
          </div>
        `).join(''):'<div class="bd-empty">No deadlines tracked yet.</div>'}
      </div>
    </div>
  `;
}

function _bdAddDeadline(){
  const body=document.getElementById('bd-body');
  const existing=body.querySelector('.bd-inline-form');if(existing)existing.remove();
  const form=document.createElement('div');form.className='bd-section bd-inline-form';
  form.innerHTML=`
    <div class="bd-section-title">Add Deadline / Task</div>
    <div class="bd-form-row"><label class="bd-form-label">Description *</label><input class="bd-input" id="bdd-text" placeholder="e.g. Submit application, Decision deadline…"></div>
    <div class="bd-form-row"><label class="bd-form-label">Due Date</label><input class="bd-input" id="bdd-date" type="date"></div>
    <div class="bd-form-actions"><button class="bd-save-btn" onclick="_bdSaveDeadline()">Save</button><button class="bd-cancel-btn" onclick="this.closest('.bd-inline-form').remove()">Cancel</button></div>
  `;
  body.querySelector('.bd-section').before(form);
}

async function _bdSaveDeadline(){
  const text=document.getElementById('bdd-text')?.value.trim();
  if(!text){showToast('Description required');return;}
  await addBoardItem(_bdSchool,'program_tasks',{
    text,due_date:document.getElementById('bdd-date')?.value||null,completed:false
  });
  await _renderBDDeadlines(document.getElementById('bd-body'));
}

async function _bdToggleDeadline(id,completed){
  await updateBoardItem('program_tasks',id,{completed,completed_at:completed?new Date().toISOString():null});
  await _renderBDDeadlines(document.getElementById('bd-body'));
}

// ── Shared delete helper ──────────────────────────────────
async function _bdDeleteItem(table,id,listId,rerender){
  await deleteBoardItem(table,id);
  const body=document.getElementById('bd-body');
  if(body)await rerender(body);
}

// ── DOM init (inject panel HTML on page load) ─────────────
(function _initBDPanel(){
  if(document.getElementById('bd-panel')) return;
  const overlay=document.createElement('div');
  overlay.id='bd-overlay';overlay.className='bd-overlay';
  overlay.addEventListener('click',e=>{if(e.target===overlay)closeBoardDetail();});

  const panel=document.createElement('div');
  panel.id='bd-panel';panel.className='bd-panel';

  document.body.appendChild(overlay);
  document.body.appendChild(panel);
})();

// ── READINESS — NCAA Eligibility Core ────────────────────────────────────────
// Owns the athlete "Readiness" tab: NCAA Eligibility Center checklist,
// core-course progress, core GPA vs. division threshold, test scores,
// amateurism + transcript status, and an overall readiness score.
// Data store: localStorage 'juke_readiness' (cloud sync is a follow-up — see NOTE).

// Division-specific NCAA academic requirements (Eligibility Center).
const READINESS_REQS = {
  D1: { coreCourses:16, coreGpa:2.3, center:true,
        note:'D1 requires 16 core courses, a 2.3 core GPA, and 10 of 16 cores (7 in English/math/science) completed before your 7th semester.' },
  D2: { coreCourses:16, coreGpa:2.2, center:true,
        note:'D2 requires 16 core courses and a 2.2 core GPA. Register with the NCAA Eligibility Center.' },
  D3: { coreCourses:0,  coreGpa:0,   center:false,
        note:'D3 has no national NCAA eligibility standard — admission and aid are set by each school. The Eligibility Center is optional.' },
};

function _readGet(){
  const d = (typeof lsGet==='function') ? lsGet('juke_readiness') : null;
  return Object.assign({ division:'D1', registered:false, coreCompleted:0,
    coreGpa:'', testSat:'', testAct:'', amateurism:false, transcriptSent:false }, d||{});
}
function _readSet(d){
  if(typeof lsSet==='function') lsSet('juke_readiness', d);
  // Mirror to Supabase (player_data.readiness) when signed in.
  if(typeof cloudSave==='function') cloudSave();
}

// Returns {pct, items:[{label, ok, detail}]} for the current state.
function _readScore(d){
  const req = READINESS_REQS[d.division] || READINESS_REQS.D1;
  const items = [];
  if(req.center){
    items.push({ label:'Registered with NCAA Eligibility Center', ok:!!d.registered,
      detail: d.registered ? 'Registered' : 'Not yet registered' });
  }
  if(req.coreCourses){
    const done = Math.min(+d.coreCompleted||0, req.coreCourses);
    items.push({ label:`Core courses (${done} of ${req.coreCourses})`, ok: done>=req.coreCourses,
      detail: done>=req.coreCourses ? 'All core courses logged' : `${req.coreCourses-done} core course(s) remaining` });
  }
  if(req.coreGpa){
    const gpa = parseFloat(d.coreGpa);
    const ok = !isNaN(gpa) && gpa>=req.coreGpa;
    items.push({ label:`Core GPA ≥ ${req.coreGpa.toFixed(1)}`, ok,
      detail: isNaN(gpa) ? 'No core GPA entered' : (ok ? `On track (${gpa.toFixed(2)})` : `Below threshold (${gpa.toFixed(2)})`) });
  }
  const hasTest = (parseInt(d.testSat,10)>0) || (parseInt(d.testAct,10)>0);
  items.push({ label:'Test score on file (SAT/ACT)', ok:hasTest,
    detail: hasTest ? 'Recorded' : 'Optional for D1/D2 today, but recommended' });
  if(req.center){
    items.push({ label:'Amateurism questionnaire complete', ok:!!d.amateurism,
      detail: d.amateurism ? 'Complete' : 'Complete in your final year' });
    items.push({ label:'Official transcript sent to Eligibility Center', ok:!!d.transcriptSent,
      detail: d.transcriptSent ? 'Sent' : 'Ask your counselor to send it' });
  }
  const ok = items.filter(i=>i.ok).length;
  const pct = items.length ? Math.round(ok/items.length*100) : 100;
  return { pct, items, req };
}

function renderReadiness(){
  const root = document.getElementById('content-readiness');
  if(!root) return;
  const d = _readGet();
  const { pct, items, req } = _readScore(d);
  const ring = pct>=80 ? 'good' : pct>=50 ? 'mid' : 'low';

  root.innerHTML = `
    <div class="readiness-wrap">
      <div class="readiness-head">
        <div>
          <h2 class="readiness-title">NCAA Eligibility Tracker <span class="readiness-self-badge">Self-Assessment</span></h2>
          <p class="readiness-sub">Track your core courses, GPA and certification steps against your target division's standard. This is a self-reported checklist — official eligibility is determined by the NCAA Eligibility Center.</p>
        </div>
        <div class="readiness-score readiness-${ring}">
          <div class="readiness-score-num">${pct}<span>%</span></div>
          <div class="readiness-score-lbl">Eligibility ready</div>
        </div>
      </div>

      <div class="readiness-controls">
        <label class="readiness-field">
          <span>Target division</span>
          <select id="rd-division" onchange="_readUpdate('division',this.value)">
            ${['D1','D2','D3'].map(v=>`<option value="${v}" ${d.division===v?'selected':''}>NCAA ${v}</option>`).join('')}
          </select>
        </label>
        <p class="readiness-note">${req.note}</p>
      </div>

      <ul class="readiness-list">
        ${items.map(i=>`
          <li class="readiness-item ${i.ok?'ok':''}">
            <span class="readiness-check">${i.ok?'✓':''}</span>
            <span class="readiness-item-body">
              <span class="readiness-item-label">${i.label}</span>
              <span class="readiness-item-detail">${i.detail}</span>
            </span>
          </li>`).join('')}
      </ul>

      <div class="readiness-inputs">
        <label class="readiness-field"><span>Core courses completed</span>
          <input id="rd-core" type="number" min="0" max="24" value="${d.coreCompleted||''}" onchange="_readUpdate('coreCompleted',this.value)"></label>
        <label class="readiness-field"><span>Core GPA</span>
          <input id="rd-gpa" type="number" min="0" max="4" step="0.01" value="${d.coreGpa||''}" onchange="_readUpdate('coreGpa',this.value)"></label>
        <label class="readiness-field"><span>SAT (total)</span>
          <input id="rd-sat" type="number" min="0" max="1600" value="${d.testSat||''}" onchange="_readUpdate('testSat',this.value)"></label>
        <label class="readiness-field"><span>ACT (composite)</span>
          <input id="rd-act" type="number" min="0" max="36" value="${d.testAct||''}" onchange="_readUpdate('testAct',this.value)"></label>
      </div>

      ${req.center ? `
      <div class="readiness-toggles">
        <label class="readiness-toggle"><input type="checkbox" ${d.registered?'checked':''} onchange="_readUpdate('registered',this.checked)"> Registered with NCAA Eligibility Center</label>
        <label class="readiness-toggle"><input type="checkbox" ${d.amateurism?'checked':''} onchange="_readUpdate('amateurism',this.checked)"> Amateurism questionnaire complete</label>
        <label class="readiness-toggle"><input type="checkbox" ${d.transcriptSent?'checked':''} onchange="_readUpdate('transcriptSent',this.checked)"> Official transcript sent</label>
      </div>` : ''}

      <p class="readiness-foot">Self-assessment only — JUKE does not verify eligibility. Requirements shown reflect standard NCAA Division ${d.division.slice(1)} rules for football; confirm current rules and register at <span class="readiness-link">eligibilitycenter.org</span>.</p>
    </div>`;
}

// Coerce + persist a single field, then re-render.
function _readUpdate(key, val){
  const d = _readGet();
  if(typeof val==='boolean') d[key]=val;
  else if(key==='coreCompleted') d[key]=parseInt(val,10)||0;
  else d[key]=val;
  _readSet(d);
  renderReadiness();
}

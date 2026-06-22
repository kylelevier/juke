// ── CALENDAR — Recruiting timeline & alerts ──────────────────────────────────
// Owns the athlete "Calendar" tab: NCAA recruiting-calendar windows (always
// available) merged with the athlete's own program deadlines (when signed in).
//
// IMPORTANT: Juke targets FOOTBALL. The windows below are women's lacrosse,
// used only as a TEMPORARY PLACEHOLDER because the NCAA has not yet published
// the football recruiting calendar for this cycle. Replace RECRUITING_CALENDAR
// with the official Division I football calendar (ncaa.org) as soon as it is
// issued — do not treat these lacrosse dates/rules as the product's sport.
// (Lacrosse-specific quirk reflected here: D1 contact opens Sept 1 of junior
// year; football's windows and signing periods differ substantially.)

const RECRUITING_CALENDAR = [
  { start:'2026-07-02', end:'2026-07-06', type:'dead',     title:'Dead period', note:'No in-person contact; digital communication still allowed.' },
  { start:'2026-08-01', end:'2026-08-14', type:'dead',     title:'Dead period', note:'No in-person contact; digital communication still allowed.' },
  { start:'2026-08-15', end:'2026-08-27', type:'quiet',    title:'Quiet period', note:'On-campus contact only — no off-campus visits or evaluations.' },
  { start:'2026-08-28', end:'2026-09-03', type:'dead',     title:'Dead period', note:'No in-person contact; digital communication still allowed.' },
  { start:'2026-09-01', end:'2026-09-01', type:'signing',  title:'Junior-year contact opens (D1)', note:'First day D1 coaches may call, email, DM and make verbal offers.' },
  { start:'2026-09-04', end:'2026-11-24', type:'contact',  title:'Contact period', note:'Calls, messages, visits and off-campus evaluations permitted.' },
  { start:'2026-11-11', end:'2026-11-11', type:'signing',  title:'Signing Day (Class of 2027)', note:'First date to sign a financial aid agreement.' },
  { start:'2026-11-25', end:'2026-11-30', type:'dead',     title:'Dead period', note:'No in-person contact; digital communication still allowed.' },
  { start:'2026-12-01', end:'2026-12-21', type:'contact',  title:'Contact period', note:'Calls, messages, visits and off-campus evaluations permitted.' },
  { start:'2026-12-22', end:'2026-12-26', type:'dead',     title:'Dead period', note:'No in-person contact; digital communication still allowed.' },
  { start:'2026-12-31', end:'2027-01-02', type:'dead',     title:'Recruiting shutdown', note:'No form of recruiting permitted.' },
  { start:'2027-01-03', end:'2027-05-21', type:'contact',  title:'Contact period', note:'Calls, messages, visits and off-campus evaluations permitted.' },
  { start:'2027-05-22', end:'2027-05-24', type:'dead',     title:'Dead period', note:'No in-person contact; digital communication still allowed.' },
  { start:'2027-05-25', end:'2027-06-11', type:'contact',  title:'Contact period', note:'Calls, messages, visits and off-campus evaluations permitted.' },
];

const CAL_TYPE_LABEL = { contact:'Contact', evaluation:'Evaluation', quiet:'Quiet', dead:'Dead', signing:'Signing' };

function _calToday(){ const t=new Date(); t.setHours(0,0,0,0); return t; }
function _calParse(s){ const d=new Date(s+'T00:00:00'); return isNaN(d)?null:d; }
function _calDaysAway(d){ return Math.round((d-_calToday())/86400000); }
function _calFmt(d){ return d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); }

// Build the merged, date-sorted event list. NCAA windows are filtered to those
// not yet ended; personal deadlines are appended when available.
function _calNcaaEvents(){
  const out=[];
  RECRUITING_CALENDAR.forEach(w=>{
    const s=_calParse(w.start), e=_calParse(w.end)||s;
    if(!s || e < _calToday()) return; // skip windows already over
    out.push({ date:s, endDate:e, type:w.type, source:'ncaa',
      title:w.title, note:w.note });
  });
  return out;
}

// Best-effort: pull program deadlines from the athlete's board (Supabase).
async function _calPersonalEvents(){
  if(typeof sb==='undefined' || !sb || typeof currentUser==='undefined' || !currentUser) return [];
  if(typeof loadBoardSection!=='function') return [];
  const schools = Object.keys((typeof lsGet==='function' && lsGet('juke_status'))||{});
  const events=[];
  for(const school of schools){
    try{
      const tasks = await loadBoardSection(school,'program_tasks');
      (tasks||[]).forEach(t=>{
        const d=t.due_date?_calParse(t.due_date):null;
        if(d && !t.completed && d>=_calToday()) events.push({ date:d, type:'deadline', source:'personal', title:t.text||'Deadline', note:school });
      });
    }catch(e){ /* one school failing shouldn't break the calendar */ }
  }
  return events;
}

async function renderCalendar(){
  const root=document.getElementById('content-calendar');
  if(!root) return;
  root.innerHTML='<div class="cal-loading">Loading your calendar…</div>';

  let events=_calNcaaEvents();
  try{ events=events.concat(await _calPersonalEvents()); }catch(e){}
  events.sort((a,b)=>a.date-b.date);

  const rows = events.map(ev=>{
    const days=_calDaysAway(ev.date);
    const soon = days<=14;
    const when = days===0?'Today':days===1?'Tomorrow':days<0?'Now':`In ${days} days`;
    const range = ev.endDate && ev.endDate>ev.date ? `${_calFmt(ev.date)} – ${_calFmt(ev.endDate)}` : _calFmt(ev.date);
    const tag = ev.source==='personal' ? '<span class="cal-tag cal-tag-you">Your deadline</span>'
              : `<span class="cal-tag cal-tag-${ev.type}">${CAL_TYPE_LABEL[ev.type]||'NCAA'}</span>`;
    return `
      <li class="cal-item ${soon?'cal-soon':''}">
        <div class="cal-date">
          <div class="cal-when">${when}</div>
          <div class="cal-range">${range}</div>
        </div>
        <div class="cal-body">
          <div class="cal-item-title">${ev.title} ${tag}</div>
          ${ev.note?`<div class="cal-note">${ev.note}</div>`:''}
        </div>
      </li>`;
  }).join('');

  root.innerHTML = `
    <div class="cal-wrap">
      <div class="cal-head">
        <h2 class="cal-title">Recruiting Calendar</h2>
        <p class="cal-sub">NCAA windows plus your own program deadlines, newest first. Items within two weeks are highlighted.</p>
      </div>
      <ul class="cal-list">${rows || '<li class="cal-empty">No upcoming dates. Add deadlines from any program board to see them here.</li>'}</ul>
      <p class="cal-foot">Interim recruiting calendar — dates are placeholders pending the official NCAA publication. Verify at <span class="cal-link">ncaa.org</span>.</p>
    </div>`;
}

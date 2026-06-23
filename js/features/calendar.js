// ── CALENDAR — Recruiting timeline & alerts ──────────────────────────────────
// Owns the athlete "Calendar" tab: NCAA recruiting-calendar windows (loaded
// from the recruiting_calendar table, admin-managed) merged with the athlete's
// own program deadlines (when signed in).

const CAL_TYPE_LABEL = { contact:'Contact', evaluation:'Evaluation', quiet:'Quiet', dead:'Dead', signing:'Signing', shutdown:'Shutdown' };

function _calToday(){ const t=new Date(); t.setHours(0,0,0,0); return t; }
function _calParse(s){ const d=new Date(s+'T00:00:00'); return isNaN(d)?null:d; }
function _calDaysAway(d){ return Math.round((d-_calToday())/86400000); }
function _calFmt(d){ return d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); }

// Fetch upcoming windows from the admin-managed recruiting_calendar table.
async function _calNcaaEvents(){
  const client=(typeof sb!=='undefined'&&sb)?sb:null;
  if(!client) return [];
  try{
    const today=new Date().toISOString().slice(0,10);
    const {data,error}=await client
      .from('recruiting_calendar')
      .select('start_date,end_date,type,title,note')
      .gte('end_date',today)
      .order('start_date',{ascending:true});
    if(error||!data) return [];
    return data.map(w=>{
      const s=_calParse(w.start_date), e=_calParse(w.end_date)||s;
      if(!s) return null;
      return {date:s,endDate:e,type:w.type,source:'ncaa',title:w.title,note:w.note||''};
    }).filter(Boolean);
  }catch(e){ return []; }
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

  let events=await _calNcaaEvents();
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
      <ul class="cal-list">${rows || '<li class="cal-empty">No recruiting calendar entries yet. Your personal board deadlines will appear here once added. NCAA windows will appear once an admin seeds the calendar.</li>'}</ul>
      <p class="cal-foot">NCAA windows are published by admins from official sources. Always verify current recruiting rules at <span class="cal-link">ncaa.org</span>.</p>
    </div>`;
}

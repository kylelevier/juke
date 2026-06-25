// ── UI PRIMITIVES — shared across all portals ──────────────────

// Shared Supabase error helper. Logs + surfaces a toast when sb returns error.
// Usage: if(_sbErr(error, 'saving note')) return;
function _sbErr(error, context){
  if(!error) return false;
  const msg = error.message || String(error);
  console.warn('JUKE db error' + (context ? ' ['+context+']' : '') + ':', msg);
  if(typeof showToast === 'function') showToast('Save failed — ' + (context||'') + '. Try again.');
  return true;
}

// ── PIPELINE STAGES ─────────────────────────────────────────────
const PIPELINE_STAGES=[
  {key:'saved',      label:'Saved',      color:'#0057FF'},
  {key:'contacting', label:'Contacting', color:'#7B2FFF'},
  {key:'applied',    label:'Applied',    color:'#FF4500'},
  {key:'offered',    label:'Offered',    color:'#F1C40F'},
  {key:'committed',  label:'Committed',  color:'#00E050'},
];

// ── SCHOOL LOGO (Google favicon service) ─────────────────
const _logoUrlCache={};
function _logoInitials(name){
  return name.split(/\s+/).filter(w=>/^[A-Za-z]/.test(w)).slice(0,2).map(w=>w[0].toUpperCase()).join('');
}

function _logoPlaceholder(name){
  const el=document.createElement('div');
  el.className='school-logo-wrap';
  el.innerHTML=`<div class="school-logo-initials">🏈</div>`;
  return el;
}

function fetchSchoolLogo(name,wrap){
  // Resolve via the shared resolver: curated override (school-logos bucket) → favicon.
  const url=window.schoolLogoUrl?window.schoolLogoUrl(name):null;
  if(!url)return;
  _logoUrlCache[name]=url;
  if(wrap)_paintLogo(wrap,url,name);
  // paint all current wraps for this school
  document.querySelectorAll('[data-logo]').forEach(w=>{
    if(w.dataset.logo===name)_paintLogo(w,url,name);
  });
}

function _paintLogo(wrap,url,name){
  if(wrap.querySelector('img'))return;
  wrap.innerHTML='';
  const img=document.createElement('img');
  img.src=url;
  img.alt='';
  img.style.cssText='width:100%;height:100%;object-fit:contain;display:block;';
  const cls=wrap.classList.contains('card-logo-wrap')?'card-logo-initials':
            wrap.classList.contains('finder-logo-wrap')?'finder-logo-initials':'school-logo-initials';
  img.onerror=()=>{wrap.innerHTML=`<div class="${cls}">🏈</div>`;};
  wrap.appendChild(img);
}


function divTag(g,d){
  if(g==='NCAA'&&d==='Division I')return'<span class="tag tag-d1">NCAA D1</span>';
  if(g==='NCAA'&&d==='Division II')return'<span class="tag tag-d2">NCAA D2</span>';
  if(g==='NCAA'&&d==='Division III')return'<span class="tag tag-d3">NCAA D3</span>';
  if(g==='NAIA')return'<span class="tag tag-naia">NAIA</span>';
  if(g==='NJCAA')return'<span class="tag tag-njcaa">NJCAA</span>';
  return`<span class="tag tag-other">${g}</span>`;
}
function vcTag(v){return v==='Varsity'?'<span class="tag tag-varsity">Varsity</span>':'<span class="tag tag-club">Club</span>';}
function fitBadge(s){
  if(s<0)return'';
  if(s>=75)return'<span class="fit-badge fit-high">Strong Fit</span>';
  if(s>=55)return'<span class="fit-badge fit-mid">Good Fit</span>';
  if(s>=35)return'<span class="fit-badge fit-low">Possible Fit</span>';
  return'<span class="fit-badge fit-weak">Weak Fit</span>';
}
function showToast(msg, type, opts){
  // type: 'success' | 'info' | 'warning' | 'error'
  // opts: { undo: fn }
  const STYLES={
    success:{bg:'#14532d',color:'#dcfce7'},
    info:   {bg:'#1D1D1F',color:'#fff'},
    warning:{bg:'#78350f',color:'#fef3c7'},
    error:  {bg:'#7f1d1d',color:'#fee2e2'},
  };
  const s=STYLES[type]||STYLES.info;
  const persistent=type==='error'||type==='warning';
  const delay=type==='success'?3500:4200;

  let t=document.getElementById('juke-toast');
  if(!t){t=document.createElement('div');t.id='juke-toast';document.body.appendChild(t);}
  t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 18px;border-radius:20px;font-size:13px;font-weight:500;z-index:9999;opacity:0;transition:opacity .2s;display:flex;align-items:center;gap:10px;max-width:90vw;';
  t.style.background=s.bg;
  t.style.color=s.color;
  t.style.pointerEvents=(persistent||(opts&&opts.undo))?'auto':'none';
  t.innerHTML='';

  const msgSpan=document.createElement('span');
  msgSpan.textContent=msg;
  t.appendChild(msgSpan);

  if(opts&&opts.undo){
    const u=document.createElement('button');
    u.textContent='Undo';
    u.style.cssText='background:rgba(255,255,255,.18);border:none;color:inherit;font-size:12px;font-weight:700;padding:2px 10px;border-radius:12px;cursor:pointer;flex-shrink:0;';
    u.onclick=function(){clearTimeout(t._t);opts.undo();t.style.opacity='0';};
    t.appendChild(u);
  }

  if(persistent){
    const x=document.createElement('button');
    x.innerHTML='&times;';
    x.setAttribute('aria-label','Dismiss');
    x.style.cssText='background:none;border:none;color:inherit;font-size:17px;line-height:1;cursor:pointer;padding:0;opacity:.7;flex-shrink:0;';
    x.onclick=function(){clearTimeout(t._t);t.style.opacity='0';};
    t.appendChild(x);
  }

  t.style.opacity='1';
  clearTimeout(t._t);
  if(!persistent) t._t=setTimeout(()=>t.style.opacity='0',delay);
}

function _initials(name) {
  return String(name || 'U')
    .split(/\s+/)
    .map(function(w){ return w[0] || ''; })
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

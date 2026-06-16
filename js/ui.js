// ── UI PRIMITIVES — shared across all portals ──────────────────

// ── PIPELINE STAGES ─────────────────────────────────────────────
const PIPELINE_STAGES=[
  {key:'saved',     label:'Saved',     color:'#0057FF'},
  {key:'contacted', label:'Contacted', color:'#7B2FFF'},
  {key:'engaged',   label:'Engaged',   color:'#FF0080'},
  {key:'visit',     label:'Visit',     color:'#E67E22'},
  {key:'applied',   label:'Applied',   color:'#FF4500'},
  {key:'offer',     label:'Offer',     color:'#F1C40F'},
  {key:'committed', label:'Committed', color:'#00E050'},
  {key:'archived',  label:'Archived',  color:'#6B7280'},
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
  if(_logoUrlCache[name]){
    _paintLogo(wrap,_logoUrlCache[name],name);
    return;
  }
  const domain=SCHOOL_DOMAINS[name];
  if(!domain)return;
  const url=`https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  _logoUrlCache[name]=url;
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
function statusHtml(school){

function showToast(msg){
  let t = document.getElementById('juke-toast');
  if(!t){ t = document.createElement('div'); t.id='juke-toast'; t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1D1D1F;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:500;z-index:9999;opacity:0;transition:opacity .2s;pointer-events:none;'; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(()=>t.style.opacity='0', 2000);
}


  function _initials(name) {
    return String(name || 'U')
      .split(/\s+/)
      .map(function(w){ return w[0] || ''; })
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

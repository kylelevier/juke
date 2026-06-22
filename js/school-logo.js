// ── SCHOOL LOGO RESOLVER (shared across all portals) ──────────────────────────
// Single source of truth for school logos. Resolution order:
//   1. Curated override uploaded to the `school-logos` Supabase Storage bucket,
//      recorded in `programs.logo_url` → window.SCHOOL_LOGO_OVERRIDES[name]
//   2. Live favicon by domain (window.SCHOOL_DOMAINS)
//   3. null → the caller renders its own placeholder
// Loaded by all three portals right after data-school-domains.js. No deps beyond
// window.SCHOOL_DOMAINS and (for the override fetch) a Supabase client.

window.SCHOOL_LOGO_OVERRIDES = window.SCHOOL_LOGO_OVERRIDES || {};

// Resolve a school name → logo URL (override wins), or null if nothing is known.
window.schoolLogoUrl = function(name){
  if(!name) return null;
  if(window.SCHOOL_LOGO_OVERRIDES[name]) return window.SCHOOL_LOGO_OVERRIDES[name];
  var domain = (window.SCHOOL_DOMAINS || {})[name];
  if(domain) return 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=128';
  return null;
};

// Paint a logo into a wrapper element, with an onerror → placeholder fallback.
// `placeholder` is an HTML string used when no URL resolves or the image fails.
window.paintSchoolLogo = function(wrap, name, placeholder){
  if(!wrap) return;
  var url = window.schoolLogoUrl(name);
  if(!url){ wrap.innerHTML = placeholder || ''; return; }
  var img = document.createElement('img');
  img.src = url; img.alt = '';
  img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;';
  img.onerror = function(){ wrap.innerHTML = placeholder || ''; };
  wrap.innerHTML = '';
  wrap.appendChild(img);
};

// Load curated overrides from Supabase (only rows that have a logo_url — a small
// set). On completion, re-paints any existing [data-logo] wrappers so overrides
// appear without a full re-render, then calls onLoaded() for portal-specific UI.
window.loadSchoolLogoOverrides = function(client, onLoaded){
  if(!client || !client.from) return Promise.resolve();
  return client.from('programs').select('school,logo_url').not('logo_url','is',null)
    .then(function(res){
      var rows = (res && res.data) || [];
      rows.forEach(function(row){
        if(row.school && row.logo_url) window.SCHOOL_LOGO_OVERRIDES[row.school] = row.logo_url;
      });
      // Repaint athlete-style logo wrappers already in the DOM.
      document.querySelectorAll('[data-logo]').forEach(function(w){
        if(window.SCHOOL_LOGO_OVERRIDES[w.dataset.logo]) window.paintSchoolLogo(w, w.dataset.logo, w.innerHTML);
      });
      if(typeof onLoaded === 'function') onLoaded();
    })
    .catch(function(){ /* overrides are best-effort; logos degrade to favicons */ });
};

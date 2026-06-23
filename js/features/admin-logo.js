// ── ADMIN LOGO MANAGER ────────────────────────────────────────────────────────
// Drag-and-drop logo upload inside the admin school list (athlete portal only).
// Flow: pick/drop image → upload to the `school-logos` bucket → set
// programs.logo_url → update the live override map → repaint everywhere.
// Writes require an authenticated admin; RLS enforces this server-side.

(function(){
  var BUCKET    = 'school-logos';
  var MAX_BYTES = 1024 * 1024;                 // 1 MB
  var OK_TYPES  = ['image/png','image/jpeg','image/webp','image/svg+xml'];

  function _slug(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
  function _ext(file){
    if(file.type==='image/svg+xml') return 'svg';
    if(file.type==='image/webp') return 'webp';
    if(file.type==='image/jpeg') return 'jpg';
    return 'png';
  }
  function _attr(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }
  function _client(){ return (typeof sb!=='undefined' && sb) ? sb : window.sb; }

  // HTML for one school's logo cell — called from finder.js renderAdminList().
  window.adminLogoCell = function(school){
    var url = window.schoolLogoUrl ? window.schoolLogoUrl(school) : null;
    var prev = url ? '<img src="'+url+'" alt="">' : '<span>—</span>';
    return '<div class="admin-logo" data-logo-school="'+_attr(school)+'">'
         +   '<div class="admin-logo-prev">'+prev+'</div>'
         +   '<div class="admin-logo-drop"><span class="admin-logo-msg">Drag logo here or click</span>'
         +     '<input type="file" accept="'+OK_TYPES.join(',')+'" hidden></div>'
         + '</div>';
  };

  // ── Upload status panel ──────────────────────────────────────────────────────
  var _log = [];   // [{school, url, ok, err, ts}]

  function _logEntry(school, url, ok, err) {
    _log.unshift({ school: school, url: url, ok: ok, err: err, ts: new Date() });
    _renderStatusPanel();
  }

  function _renderStatusPanel() {
    var panel = document.getElementById('admin-logo-status');
    if (!panel) return;
    if (!_log.length) { panel.hidden = true; return; }
    panel.hidden = false;
    panel.innerHTML = '<div class="als-hd">Recent uploads</div>'
      + _log.map(function(e){
          var time = e.ts.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
          var thumb = e.url
            ? '<img class="als-thumb" src="'+_attr(e.url)+'" alt="">'
            : '<span class="als-thumb-empty"></span>';
          var badge = e.ok
            ? '<span class="als-badge ok">Saved ✓</span>'
            : '<span class="als-badge err">'+(e.err ? _attr(String(e.err)) : 'Failed')+'</span>';
          return '<div class="als-row">'
            + thumb
            + '<span class="als-school">'+_attr(e.school)+'</span>'
            + badge
            + '<span class="als-time">'+time+'</span>'
            + '</div>';
        }).join('');
  }

  function _setPreview(cell,url){
    var p = cell.querySelector('.admin-logo-prev');
    if(p) p.innerHTML = url ? '<img src="'+url+'" alt="">' : '<span>—</span>';
  }
  function _msg(cell,text,state){
    var d = cell.querySelector('.admin-logo-msg');
    if(!d) return;
    d.textContent = text;
    d.style.color = state==='ok' ? '#00a03a' : state==='err' ? '#c0392b' : '';
  }

  async function _upload(cell, file){
    var school = cell.getAttribute('data-logo-school');
    var client = _client();
    if(!client){ _msg(cell,'Not signed in',  'err'); return; }
    if(OK_TYPES.indexOf(file.type)===-1){ _msg(cell,'PNG, JPG, WebP or SVG only','err'); return; }
    if(file.size > MAX_BYTES){ _msg(cell,'Max 1 MB','err'); return; }

    _msg(cell,'Uploading…');
    var path = _slug(school) + '.' + _ext(file);
    try{
      var up = await client.storage.from(BUCKET).upload(path, file, {upsert:true, contentType:file.type});
      if(up.error){ _msg(cell, up.error.message || 'Upload failed', 'err'); _logEntry(school, null, false, up.error.message || 'Upload failed'); return; }

      var pub = client.storage.from(BUCKET).getPublicUrl(path);
      var url = (pub.data && pub.data.publicUrl) + '?v=' + Date.now();   // cache-bust

      var upd = await client.from('programs').update({logo_url:url}).eq('school', school).select('school');
      if(upd.error){ _msg(cell, upd.error.message || 'Save failed', 'err'); _logEntry(school, url, false, upd.error.message || 'Save failed'); return; }
      if(!upd.data || !upd.data.length){ _msg(cell,'No matching program row','err'); _logEntry(school, url, false, 'No matching program row'); return; }

      window.SCHOOL_LOGO_OVERRIDES = window.SCHOOL_LOGO_OVERRIDES || {};
      window.SCHOOL_LOGO_OVERRIDES[school] = url;
      var prev = cell.querySelector('.admin-logo-prev');
      if (prev && window.paintSchoolLogo) {
        window.paintSchoolLogo(prev, school, '<span>—</span>');
      } else {
        _setPreview(cell, url);
      }
      _msg(cell,'Saved ✓','ok');
      _logEntry(school, url, true, null);
      if (typeof adminAudit === 'function') adminAudit('program.logo_update', 'program', school, { school: school, url: url });

      // Repaint this school wherever it is shown.
      document.querySelectorAll('[data-logo]').forEach(function(w){
        if(w.dataset.logo===school && window.paintSchoolLogo) window.paintSchoolLogo(w, school, w.innerHTML);
      });
      if(typeof render==='function') render();
    }catch(e){ _msg(cell, 'Upload failed', 'err'); _logEntry(school, null, false, 'Upload failed'); }
  }

  // Delegated listeners on the (persistent) list container — attach once.
  window.initAdminLogoDropzones = function(){
    var list = document.getElementById('admin-school-list');
    if(!list || list._logoBound) return;
    list._logoBound = true;

    list.addEventListener('click', function(e){
      var cell = e.target.closest('.admin-logo'); if(!cell) return;
      if(e.target.closest('.admin-logo-drop')){
        var inp = cell.querySelector('input[type=file]'); if(inp) inp.click();
      }
    });
    list.addEventListener('change', function(e){
      if(e.target.matches('.admin-logo input[type=file]')){
        var cell = e.target.closest('.admin-logo'), f = e.target.files && e.target.files[0];
        if(cell && f){ _upload(cell, f); e.target.value=''; }
      }
    });
    ['dragover','dragenter'].forEach(function(ev){
      list.addEventListener(ev, function(e){
        var cell = e.target.closest('.admin-logo'); if(!cell) return;
        e.preventDefault(); cell.classList.add('drag');
      });
    });
    ['dragleave','drop'].forEach(function(ev){
      list.addEventListener(ev, function(e){
        var cell = e.target.closest('.admin-logo'); if(!cell) return;
        e.preventDefault(); cell.classList.remove('drag');
        if(ev==='drop'){
          var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
          if(f) _upload(cell, f);
        }
      });
    });
  };
})();

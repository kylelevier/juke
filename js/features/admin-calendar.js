// ── Admin Portal — Recruiting Calendar Manager ────────────────────────────────

(function(){

  var _entries   = [];
  var _loaded    = false;
  var _editingId = null;

  var TYPE_OPTS = ['contact','evaluation','quiet','dead','signing','shutdown'];
  var DIV_OPTS  = ['D1','D2','D3','NAIA'];

  window.initAdminCalendar = function(){
    if(_loaded){ _render(); return; }
    _load();
  };

  async function _load(){
    var wrap = document.getElementById('admin-calendar-wrap');
    if(wrap) wrap.innerHTML = '<div class="admin-loading">Loading calendar…</div>';
    if(!sb){ if(wrap) wrap.innerHTML = '<div class="admin-empty">Supabase not available.</div>'; return; }
    var r = await sb.from('recruiting_calendar').select('*').order('start_date',{ascending:true});
    if(r.error){ if(wrap) wrap.innerHTML = '<div class="admin-empty">Error: '+_esc(r.error.message)+'</div>'; return; }
    _entries = r.data || [];
    _loaded  = true;
    _render();
  }

  function _render(){
    var wrap = document.getElementById('admin-calendar-wrap');
    if(!wrap) return;

    if(!_entries.length){
      wrap.innerHTML = '<div class="admin-empty">No calendar entries yet. Use "Add Entry" to seed the football recruiting calendar.</div>';
      return;
    }

    var html = '<table class="admin-table"><thead><tr>'
      + '<th>Start</th><th>End</th><th>Type</th><th>Division</th><th>Title</th><th></th>'
      + '</tr></thead><tbody>';

    _entries.forEach(function(e){
      if(_editingId === e.id){
        html += '<tr class="admin-editing-row"><td colspan="6">'+_editorHtml(e)+'</td></tr>';
      } else {
        html += '<tr>'
          + '<td class="admin-dim">'+_esc(e.start_date)+'</td>'
          + '<td class="admin-dim">'+_esc(e.end_date||'—')+'</td>'
          + '<td><span class="cal-tag cal-tag-'+_esc(e.type)+'">'+_esc(e.type)+'</span></td>'
          + '<td class="admin-dim">'+_esc(e.division)+'</td>'
          + '<td>'+_esc(e.title)+'</td>'
          + '<td class="admin-actions">'
            + '<button class="admin-action-btn" onclick="adminEditCalEntry('+e.id+')">Edit</button>'
            + '<button class="admin-action-btn warn" onclick="adminDeleteCalEntry('+e.id+','+JSON.stringify(e.title).replace(/"/g,'&quot;')+')">Delete</button>'
          + '</td>'
          + '</tr>';
      }
    });

    html += '</tbody></table>';
    wrap.innerHTML = html;
  }

  function _editorHtml(e){
    return '<div class="admin-program-editor">'
      + '<div class="admin-program-editor-hd">'
        + '<div class="admin-program-editor-title">Edit Calendar Entry</div>'
        + '<div class="admin-actions">'
          + '<button class="admin-action-btn ok" onclick="adminSaveCalEntry('+e.id+')">Save</button>'
          + '<button class="admin-action-btn" onclick="adminCancelCalEdit()">Cancel</button>'
        + '</div>'
      + '</div>'
      + '<div class="admin-program-grid">'
        + _field('Start Date *','cal-start',e.start_date,'date')
        + _field('End Date','cal-end',e.end_date||'','date')
        + _select('Type *','cal-type',TYPE_OPTS,e.type)
        + _select('Division','cal-div',DIV_OPTS,e.division||'D1')
        + _field('Title *','cal-title',e.title,'text')
        + _field('Note','cal-note',e.note||'','text')
        + _field('Source URL','cal-source',e.source_url||'','url')
      + '</div>'
    + '</div>';
  }

  function _addHtml(){
    return '<div class="admin-program-editor">'
      + '<div class="admin-program-editor-hd">'
        + '<div class="admin-program-editor-title">New Calendar Entry</div>'
        + '<div class="admin-actions">'
          + '<button class="admin-action-btn ok" onclick="adminSaveCalEntry(null)">Add</button>'
          + '<button class="admin-action-btn" onclick="adminCancelCalEdit()">Cancel</button>'
        + '</div>'
      + '</div>'
      + '<div class="admin-program-grid">'
        + _field('Start Date *','cal-start','','date')
        + _field('End Date','cal-end','','date')
        + _select('Type *','cal-type',TYPE_OPTS,'contact')
        + _select('Division','cal-div',DIV_OPTS,'D1')
        + _field('Title *','cal-title','','text')
        + _field('Note','cal-note','','text')
        + _field('Source URL','cal-source','','url')
      + '</div>'
    + '</div>';
  }

  function _field(label,id,val,type){
    return '<label class="admin-program-field"><span>'+label+'</span>'
      + '<input class="admin-inline-input" id="'+id+'" type="'+type+'" value="'+_esc(val)+'"></label>';
  }

  function _select(label,id,opts,val){
    return '<label class="admin-program-field"><span>'+label+'</span>'
      + '<select class="admin-inline-input" id="'+id+'">'
      + opts.map(function(o){ return '<option'+(o===val?' selected':'')+'>'+o+'</option>'; }).join('')
      + '</select></label>';
  }

  function _readForm(){
    return {
      start: (document.getElementById('cal-start')||{}).value||'',
      end:   (document.getElementById('cal-end')||{}).value||'',
      type:  (document.getElementById('cal-type')||{}).value||'',
      div:   (document.getElementById('cal-div')||{}).value||'D1',
      title: (document.getElementById('cal-title')||{}).value||'',
      note:  (document.getElementById('cal-note')||{}).value||'',
      source:(document.getElementById('cal-source')||{}).value||''
    };
  }

  window.adminOpenAddCalEntry = function(){
    var wrap = document.getElementById('admin-calendar-wrap');
    if(!wrap) return;
    _editingId = null;
    var addWrap = document.getElementById('admin-cal-add-wrap');
    if(!addWrap){
      addWrap = document.createElement('div');
      addWrap.id = 'admin-cal-add-wrap';
      wrap.parentNode.insertBefore(addWrap, wrap);
    }
    addWrap.innerHTML = _addHtml();
  };

  window.adminEditCalEntry = function(id){
    _editingId = id;
    _render();
  };

  window.adminCancelCalEdit = function(){
    _editingId = null;
    var addWrap = document.getElementById('admin-cal-add-wrap');
    if(addWrap) addWrap.innerHTML = '';
    _render();
  };

  window.adminSaveCalEntry = async function(id){
    var f = _readForm();
    if(!f.start){ adminToast('Start date required','err'); return; }
    if(!f.type) { adminToast('Type required','err'); return; }
    if(!f.title.trim()){ adminToast('Title required','err'); return; }
    if(!sb) return;

    var r = await sb.rpc('admin_upsert_calendar_entry', {
      p_id:         id   || null,
      p_start_date: f.start,
      p_end_date:   f.end || null,
      p_type:       f.type,
      p_title:      f.title.trim(),
      p_note:       f.note.trim() || null,
      p_division:   f.div,
      p_source_url: f.source.trim() || null
    });
    if(r.error){ adminToast('Save failed: '+r.error.message,'err'); return; }

    adminToast(id ? 'Entry updated.' : 'Entry added.','ok');
    _editingId = null;
    var addWrap = document.getElementById('admin-cal-add-wrap');
    if(addWrap) addWrap.innerHTML = '';
    _loaded = false;
    _load();
  };

  window.adminDeleteCalEntry = async function(id, title){
    if(!confirm('Delete "'+title+'"?')) return;
    if(!sb) return;
    var r = await sb.rpc('admin_delete_calendar_entry', {p_id: id});
    if(r.error){ adminToast('Delete failed: '+r.error.message,'err'); return; }
    adminToast('Entry deleted.','ok');
    _entries = _entries.filter(function(e){ return e.id !== id; });
    _render();
  };

  window.adminRefreshCalendar = function(){
    _loaded = false;
    _load();
  };

  function _esc(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();

// Boot: init the active admin tab on page load (runs after all scripts are loaded).
(function(){
  if (typeof initAdminUsers === 'function') initAdminUsers();
  if (typeof _updateAdminChip === 'function') _updateAdminChip();
})();

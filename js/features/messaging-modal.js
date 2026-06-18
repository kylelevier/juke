// ── MESSAGING MODAL  (messaging-modal.js) ────────────────────
// School-first new-message flow for athletes; generic search for coaches.
//
// Globals required:
//   messaging.js  → renderMsgThreadList, openMsgThread
//   data.js       → linkConversationToProgram, _resolvePPId  (athlete only)
//   pipeline.js   → _boardMeta, statusData, _calcMomentum    (athlete only)
//   ui.js         → PIPELINE_STAGES                          (athlete only)
//   config.js     → sb, currentUser

(function () {
  'use strict';

  var _searchTimer  = null;
  var _pickedSchool = null;

  function _esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function _ini(n) {
    return (n||'').split(/\s+/).map(function(w){return w[0]||'';}).join('').slice(0,2).toUpperCase()||'?';
  }
  function _isAthlete() {
    return (typeof JUKE_PORTAL_TYPE==='undefined') || JUKE_PORTAL_TYPE==='athlete';
  }

  var ROLE_LABELS = {
    athlete:'Athlete', college_coach:'College Coach', hs_coach:'HS / Club Coach',
    parent:'Parent', recruiting_coordinator:'Recruiting Coordinator', admin:'Admin'
  };
  var ROLE_COLORS = {
    athlete:'#FF0080', college_coach:'#7B2FFF', hs_coach:'#0057FF',
    parent:'#27a06a', recruiting_coordinator:'#c96b3a', admin:'#b03030'
  };

  // ── Modal shell ────────────────────────────────────────────
  function _ensureModal() {
    if (document.getElementById('msg-new-modal')) return;
    var el = document.createElement('div');
    el.id = 'msg-new-modal';
    el.className = 'msg-new-overlay';
    el.innerHTML =
      '<div class="msg-new-box" role="dialog" aria-modal="true" aria-label="New Message">'
        + '<div class="msg-new-hd">'
          + '<button class="msg-nm-back" id="msg-nm-back" onclick="_msgBack()" style="display:none">← Back</button>'
          + '<span class="msg-new-title" id="msg-nm-title">New Message</span>'
          + '<button class="msg-new-close" aria-label="Close" '
          +   'onclick="document.getElementById(\'msg-new-modal\').classList.remove(\'open\')">✕</button>'
        + '</div>'
        + '<div id="msg-nm-body"></div>'
      + '</div>';
    el.addEventListener('click', function(e){ if (e.target===el) el.classList.remove('open'); });
    document.body.appendChild(el);
  }

  // ── School picker — athlete step 1 ────────────────────────
  function _paintSchoolPicker() {
    _pickedSchool = null;
    document.getElementById('msg-nm-back').style.display = 'none';
    document.getElementById('msg-nm-title').textContent = 'New Message';

    var schools = Object.keys(typeof statusData!=='undefined' ? statusData : {});
    var body    = document.getElementById('msg-nm-body');

    var urgency = {stalled:0, cooling:1, active:2, none:3};
    schools.sort(function(a, b) {
      var ma = typeof _calcMomentum==='function' ? _calcMomentum(a) : {level:'none'};
      var mb = typeof _calcMomentum==='function' ? _calcMomentum(b) : {level:'none'};
      return (urgency[ma.level]||3) - (urgency[mb.level]||3);
    });

    var stagesMap = {};
    if (typeof PIPELINE_STAGES!=='undefined') {
      PIPELINE_STAGES.forEach(function(s){ stagesMap[s.id]=s; });
    }

    var rows = schools.map(function(school) {
      var stage = (statusData||{})[school]||'saved';
      var m     = typeof _calcMomentum==='function' ? _calcMomentum(school) : {level:'none'};
      var si    = stagesMap[stage] || {label:stage.charAt(0).toUpperCase()+stage.slice(1), color:'#6b7280'};
      var dot   = ({active:'#00c853', cooling:'#f59e0b', stalled:'#ef4444', none:'#9ca3af'})[m.level]||'#9ca3af';
      return '<button class="msg-nm-school-row" onclick="_msgPickSchool('+JSON.stringify(school)+')">'
        + '<span class="msg-nm-dot" style="background:'+dot+'"></span>'
        + '<span class="msg-nm-school-nm">'+_esc(school)+'</span>'
        + '<span class="msg-nm-pill" style="background:'+si.color+'20;color:'+si.color+'">'+_esc(si.label)+'</span>'
        + '</button>';
    }).join('');

    body.innerHTML =
      (rows ? '<div class="msg-nm-section-hd">Your Board</div><div class="msg-nm-school-list">'+rows+'</div>' : '')
      + '<div class="msg-nm-divider"><span>or search all coaches</span></div>'
      + _genericSearchHtml();
  }

  function _genericSearchHtml() {
    return '<div class="msg-new-search-wrap">'
      + '<input id="msg-new-search" class="msg-new-search" type="text" '
      +   'placeholder="Search coaches by name…" autocomplete="off" oninput="searchMsgRecipients(this.value)"/>'
      + '</div>'
      + '<div id="msg-new-results" class="msg-new-results"><div class="msg-new-hint">Type to search</div></div>';
  }

  // ── Coach picker — athlete step 2 ─────────────────────────
  window._msgPickSchool = async function(school) {
    _pickedSchool = school;
    document.getElementById('msg-nm-back').style.display = '';
    document.getElementById('msg-nm-title').textContent  = school;

    var body = document.getElementById('msg-nm-body');
    body.innerHTML = '<div class="msg-new-hint">Finding coaches at '+_esc(school)+'…</div>';

    var r = await sb.from('user_profiles')
      .select('id,display_name,org')
      .eq('role','college_coach')
      .ilike('org','%'+school+'%')
      .neq('id',currentUser.id)
      .limit(12);

    var coaches = r.data||[];
    body.innerHTML =
      '<div id="msg-new-results" class="msg-new-results">'
        + (coaches.length
            ? coaches.map(function(u){ return _coachRow(u,school); }).join('')
            : '<div class="msg-new-hint">No coaches found — search by name below</div>')
      + '</div>'
      + '<div class="msg-new-search-wrap" style="margin-top:8px">'
        + '<input class="msg-new-search" type="text" placeholder="Search coaches by name…" '
        +   'autocomplete="off" oninput="_msgSearchInSchool(this.value)"/>'
      + '</div>';
  };

  function _coachRow(u, school) {
    return '<div class="msg-new-result" onclick="_msgStartWithSchool(\''+u.id+'\')">'
      + '<div class="msg-thread-av sm" style="background:#7B2FFF">'+_ini(u.display_name||'C')+'</div>'
      + '<div class="msg-new-result-info">'
        + '<div class="msg-new-result-name">'+_esc(u.display_name||'Coach')+'</div>'
        + '<div class="msg-new-result-sub">'+_esc(u.org||school||'')+'</div>'
      + '</div></div>';
  }

  window._msgSearchInSchool = function(q) {
    var res = document.getElementById('msg-new-results');
    if (!res) return;
    if (!q||q.trim().length<2) { window._msgPickSchool(_pickedSchool); return; }
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(async function(){
      res.innerHTML = '<div class="msg-new-hint">Searching…</div>';
      var r = await sb.from('user_profiles')
        .select('id,display_name,org')
        .eq('role','college_coach')
        .ilike('display_name','%'+q+'%')
        .neq('id',currentUser.id)
        .limit(10);
      res.innerHTML = (r.data||[]).length
        ? (r.data||[]).map(function(u){ return _coachRow(u,_pickedSchool||''); }).join('')
        : '<div class="msg-new-hint">No coaches found</div>';
    }, 280);
  };

  window._msgBack = function() { _paintSchoolPicker(); };

  // ── Start conversation + link to player_program ───────────
  window._msgStartWithSchool = async function(userId) {
    var modal = document.getElementById('msg-new-modal');
    if (modal) modal.classList.remove('open');

    var r = await sb.rpc('get_or_create_conversation', {other_user_id:userId});
    if (r.error) { if (typeof showToast==='function') showToast('Could not start conversation'); return; }
    var convId = r.data;

    // Link to player_programs row when school is known
    var school = _pickedSchool;
    if (school) {
      var ppId = null;
      if (typeof _boardMeta!=='undefined' && (_boardMeta[school]||{}).ppId) ppId = _boardMeta[school].ppId;
      else if (typeof _resolvePPId==='function') ppId = await _resolvePPId(school);
      if (ppId && typeof linkConversationToProgram==='function') linkConversationToProgram(convId, ppId);
    }

    await window.renderMsgThreadList();
    if (typeof switchTab==='function') switchTab('messages');
    window.openMsgThread(convId, userId);
  };

  // ── Generic search (used by both flows + coach portals) ───
  window.searchMsgRecipients = function(q) {
    var res = document.getElementById('msg-new-results');
    if (!res) return;
    if (!q||q.trim().length<2) { res.innerHTML='<div class="msg-new-hint">Type at least 2 characters</div>'; return; }
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(async function(){
      res.innerHTML = '<div class="msg-new-hint">Searching…</div>';
      var roles = _isAthlete()
        ? ['college_coach','hs_coach','recruiting_coordinator']
        : ['athlete'];
      var r = await sb.from('user_profiles')
        .select('id,display_name,role,org')
        .in('role',roles)
        .ilike('display_name','%'+q+'%')
        .neq('id',currentUser.id)
        .limit(12);
      if (!r.data||!r.data.length) { res.innerHTML='<div class="msg-new-hint">No users found</div>'; return; }
      res.innerHTML = r.data.map(function(u){
        var color = ROLE_COLORS[u.role]||'#FF0080';
        var sub   = [ROLE_LABELS[u.role]||u.role,u.org].filter(Boolean).join(' · ');
        return '<div class="msg-new-result" onclick="_msgStartWithSchool(\''+u.id+'\')">'
          + '<div class="msg-thread-av sm" style="background:'+color+'">'+_ini(u.display_name||'U')+'</div>'
          + '<div class="msg-new-result-info">'
            + '<div class="msg-new-result-name">'+_esc(u.display_name||'Unknown')+'</div>'
            + '<div class="msg-new-result-sub">'+_esc(sub)+'</div>'
          + '</div></div>';
      }).join('');
    }, 280);
  };

  // ── openNewMsg — replaces messaging.js version ────────────
  window.openNewMsg = function(prefillId) {
    if (!sb||!currentUser) {
      if (typeof showToast==='function') showToast('Sign in to send messages');
      return;
    }
    if (prefillId) { window._msgStartWithSchool(prefillId); return; }

    _ensureModal();
    _pickedSchool = null;

    if (_isAthlete()) {
      _paintSchoolPicker();
    } else {
      document.getElementById('msg-nm-back').style.display = 'none';
      document.getElementById('msg-nm-title').textContent  = 'New Message';
      document.getElementById('msg-nm-body').innerHTML     = _genericSearchHtml();
    }

    document.getElementById('msg-new-modal').classList.add('open');
    setTimeout(function(){ var i=document.getElementById('msg-new-search'); if(i) i.focus(); }, 120);
  };

})();

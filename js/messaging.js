/**
 * juke-messaging.js  —  v1.0
 * Real-time messaging for the Juke recruiting platform.
 * Loaded at the bottom of juke.html, coach.html, and hscoach.html.
 *
 * Assumes globals:
 *   sb            — Supabase client (may be null until auth loads)
 *   currentUser   — Supabase auth user (null when signed out)
 *   JUKE_PORTAL_TYPE — 'athlete' | 'college_coach' | 'hs_coach'
 *
 * Reliability layers
 *   1. Optimistic UI      — message appears immediately, tagged "sending"
 *   2. Send queue/retry   — exponential backoff, max 3 attempts
 *   3. Deduplication      — Set of sent IDs prevents realtime double-render
 *   4. Reconnect guards   — re-subscribes on visibilitychange + online events
 *   5. Backup poll        — 30-second heartbeat catches any missed realtime events
 *   6. Error surfaces     — inline feedback; no silent failures
 */
(function () {
  'use strict';

  // ── CONSTANTS ────────────────────────────────────────────────
  var MAX_RETRIES    = 3;
  var RETRY_BASE_MS  = 1500;
  var MAX_MSG_LEN    = 4000;
  var POLL_MS        = 30000;

  var ROLE_LABELS = {
    athlete:               'Athlete',
    college_coach:         'College Coach',
    hs_coach:              'HS / Club Coach',
    parent:                'Parent',
    recruiting_coordinator:'Recruiting Coordinator',
    admin:                 'Admin'
  };

  var ROLE_COLORS = {
    athlete:               '#FF0080',
    college_coach:         '#7B2FFF',
    hs_coach:              '#0057FF',
    parent:                '#27a06a',
    recruiting_coordinator:'#c96b3a',
    admin:                 '#b03030'
  };

  // ── STATE ────────────────────────────────────────────────────
  var _initialized   = false;
  var _threads       = [];        // [{conv, otherId, other, unread}]
  var _filtered      = [];        // filtered view of _threads
  var _activeConvId  = null;
  var _messages      = [];        // messages in open conversation
  var _channel       = null;      // Supabase realtime channel
  var _sentIds       = {};        // id → true  (dedup store)
  var _pending       = {};        // tempId → {body, convId, retries}
  var _profiles      = {};        // userId → {display_name, role, org}
  var _pollTimer     = null;
  var _searchTimer   = null;

  // ── PORTAL DETECTION ─────────────────────────────────────────
  function _portalType() {
    return (typeof JUKE_PORTAL_TYPE !== 'undefined' && JUKE_PORTAL_TYPE)
      ? JUKE_PORTAL_TYPE
      : 'athlete';
  }

  function _myRole() {
    try {
      var a = JSON.parse(localStorage.getItem('juke_auth') || '{}');
      if (a.profiles && a.profiles.length) {
        var apid = a.activeProfileId || a.profiles[0].id;
        var ap   = a.profiles.find(function(p){ return p.id === apid; }) || a.profiles[0];
        return ap.type || a.type || _portalType();
      }
      return a.type || _portalType();
    } catch(e) { return _portalType(); }
  }

  function _myDisplayName() {
    try {
      var a = JSON.parse(localStorage.getItem('juke_auth') || '{}');
      return a.name || (currentUser && currentUser.email) || 'User';
    } catch(e) { return 'User'; }
  }

  function _myOrg() {
    try {
      var a = JSON.parse(localStorage.getItem('juke_auth') || '{}');
      if (a.profiles && a.profiles.length) {
        var apid = a.activeProfileId || a.profiles[0].id;
        var ap   = a.profiles.find(function(p){ return p.id === apid; }) || a.profiles[0];
        return ap.org || '';
      }
      return '';
    } catch(e) { return ''; }
  }

  // ── INIT ─────────────────────────────────────────────────────
  async function initMessaging() {
    if (!sb || !currentUser) return;

    // Prevent double-init on rapid auth events
    if (_initialized) {
      await renderMsgThreadList();
      await updateMsgBadge();
      return;
    }
    _initialized = true;

    // Reveal the Messages tab
    var tabBtn = document.getElementById('tab-messages');
    if (tabBtn) tabBtn.style.display = '';

    // Upsert this user's profile row
    await _ensureProfile();

    // Load threads and badge count
    await renderMsgThreadList();
    await updateMsgBadge();

    // Live subscription
    _subscribe();

    // Reconnect handlers
    document.addEventListener('visibilitychange', _onVisibility);
    window.addEventListener('online',  _onOnline);
    window.addEventListener('offline', function(){ /* noted */ });

    // Backup poll
    _startPoll();
  }

  function _cleanup() {
    _initialized  = false;
    _threads      = [];
    _filtered     = [];
    _activeConvId = null;
    _messages     = [];
    _sentIds      = {};
    _pending      = {};
    _unsubscribe();
    clearInterval(_pollTimer);
    var tabBtn = document.getElementById('tab-messages');
    if (tabBtn) tabBtn.style.display = 'none';
  }

  // ── USER PROFILE UPSERT ──────────────────────────────────────
  async function _ensureProfile() {
    if (!sb || !currentUser) return;
    var payload = {
      id:           currentUser.id,
      role:         _myRole(),
      display_name: _myDisplayName(),
      org:          _myOrg(),
      updated_at:   new Date().toISOString()
    };
    var r = await sb.from('user_profiles').upsert(payload, { onConflict: 'id' });
    if (r.error) console.warn('[Juke Msg] profile upsert:', r.error.message);
  }

  // ── FETCH THREADS ────────────────────────────────────────────
  async function _fetchThreads() {
    if (!sb || !currentUser) return [];
    var uid = currentUser.id;

    // All conversations this user is in, with school context when linked
    var r = await sb
      .from('conversations')
      .select('id,participant_a,participant_b,last_message_at,last_message_preview,created_at,player_program_id,player_programs(stage,programs(school))')
      .or('participant_a.eq.' + uid + ',participant_b.eq.' + uid)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (r.error || !r.data || !r.data.length) return [];
    var convs = r.data;

    // Other participants
    var otherIds = convs.map(function(c){
      return c.participant_a === uid ? c.participant_b : c.participant_a;
    });
    otherIds = otherIds.filter(function(v, i, a){ return a.indexOf(v) === i; });

    // Batch-fetch profiles
    var pr = await sb.from('user_profiles')
      .select('id,display_name,role,org')
      .in('id', otherIds);
    var profileMap = {};
    (pr.data || []).forEach(function(p){ profileMap[p.id] = p; _profiles[p.id] = p; });

    // Unread counts (messages sent by others, not yet read)
    var ur = await sb.from('messages')
      .select('conversation_id')
      .in('conversation_id', convs.map(function(c){ return c.id; }))
      .neq('sender_id', uid)
      .is('read_at', null);
    var unreadMap = {};
    (ur.data || []).forEach(function(m){
      unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
    });

    return convs.map(function(c){
      var otherId = c.participant_a === uid ? c.participant_b : c.participant_a;
      var other   = profileMap[otherId] || { display_name: 'Unknown User', role: 'athlete', org: '' };
      return { conv: c, otherId: otherId, other: other, unread: unreadMap[c.id] || 0 };
    });
  }

  // ── RENDER THREAD LIST ───────────────────────────────────────
  async function renderMsgThreadList() {
    var list = document.getElementById('msg-thread-list');
    if (!list) return;

    if (!sb || !currentUser) {
      list.innerHTML = '<div class="msg-auth-prompt"><strong>Messages are signed out.</strong><br>Sign in to view conversations and start outreach.</div>';
      return;
    }

    _threads  = await _fetchThreads();
    _filtered = _threads.slice();
    _paintThreads(_filtered);
  }

  function _paintThreads(threads) {
    var list = document.getElementById('msg-thread-list');
    if (!list) return;

    if (!threads.length) {
      list.innerHTML = '<div class="msg-thread-empty"><strong>No conversations yet.</strong><br>'
        + '<span>Start a message from an athlete profile or use <strong>+ New Message</strong>.</span></div>';
      return;
    }

    list.innerHTML = threads.map(function(t){
      var name     = t.other.display_name || 'Unknown';
      var initials = typeof _initials === 'function' ? _initials(name) : (name[0] || '?').toUpperCase();
      var preview  = t.conv.last_message_preview || 'No messages yet';
      var time     = t.conv.last_message_at ? _fmtTime(t.conv.last_message_at) : '';
      var role     = t.other.role || 'athlete';
      var active   = t.conv.id === _activeConvId ? ' active' : '';
      var unread   = t.unread > 0 ? ' unread' : '';
      var color    = ROLE_COLORS[role] || '#FF0080';

      // School context — shown when conversation is linked to a player_programs row
      var schoolCtx = '';
      var pp = t.conv.player_programs;
      if (pp) {
        var schoolName = (pp.programs || {}).school || '';
        var stageTxt   = pp.stage || '';
        if (schoolName) {
          schoolCtx = '<div class="msg-thread-school">'
            + _esc(schoolName)
            + (stageTxt ? '<span class="msg-thread-school-stage">'+_esc(stageTxt)+'</span>' : '')
            + '</div>';
        }
      }

      return '<div class="msg-thread-item' + active + unread + '"'
        + ' onclick="openMsgThread(\'' + t.conv.id + '\',\'' + t.otherId + '\')">'
        + '<div class="msg-thread-av" style="background:' + color + '">' + initials + '</div>'
        + '<div class="msg-thread-body">'
          + '<div class="msg-thread-top">'
            + '<span class="msg-thread-name">' + _esc(name) + '</span>'
            + '<span class="msg-thread-time">' + _esc(time) + '</span>'
          + '</div>'
          + schoolCtx
          + '<div class="msg-thread-preview">' + _esc(preview) + '</div>'
        + '</div>'
        + (t.unread > 0 ? '<span class="msg-thread-badge">' + t.unread + '</span>' : '')
        + '</div>';
    }).join('');
  }

  // ── FILTER THREADS ───────────────────────────────────────────
  function filterThreads(q) {
    if (!q || !q.trim()) {
      _filtered = _threads.slice();
    } else {
      var lq = q.toLowerCase();
      _filtered = _threads.filter(function(t){
        return (t.other.display_name || '').toLowerCase().indexOf(lq) > -1
          || (t.other.org           || '').toLowerCase().indexOf(lq) > -1
          || (t.conv.last_message_preview || '').toLowerCase().indexOf(lq) > -1;
      });
    }
    _paintThreads(_filtered);
  }

  // ── OPEN THREAD ──────────────────────────────────────────────
  async function openMsgThread(convId, otherId) {
    _activeConvId = convId;

    // Resolve thread once — used for school context and unread clearing
    var thread = _threads.find(function(x){ return x.conv.id === convId; });

    _paintThreads(_filtered);

    var empty = document.getElementById('msg-empty-state');
    var convo = document.getElementById('msg-convo');
    if (empty) empty.style.display = 'none';
    if (convo) convo.style.display = 'flex';

    // Paint school context strip immediately from cached thread data
    _paintSchoolCtx(thread ? thread.conv : null);

    // Show cached profile, fetch fresh in background
    var profile = _profiles[otherId] || { display_name: 'Loading…', role: 'athlete', org: '' };
    _paintHeader(profile);
    if (!_profiles[otherId]) {
      var pr = await sb.from('user_profiles').select('id,display_name,role,org').eq('id', otherId).single();
      if (pr.data) { _profiles[otherId] = pr.data; _paintHeader(pr.data); }
    }

    await _loadMessages(convId);
    await _markRead(convId);
    await updateMsgBadge();

    // Clear unread in thread data
    if (thread) thread.unread = 0;
    _paintThreads(_filtered);

    // Focus compose
    var ta = document.getElementById('msg-compose-area');
    if (ta) setTimeout(function(){ ta.focus(); }, 80);
  }

  function _paintHeader(profile) {
    var av   = document.getElementById('msg-header-av');
    var name = document.getElementById('msg-header-name');
    var sub  = document.getElementById('msg-header-sub');
    var color = ROLE_COLORS[profile.role] || '#FF0080';
    if (av) {
      av.textContent = typeof _initials === 'function' ? _initials(profile.display_name || 'U') : (profile.display_name||'?')[0].toUpperCase();
      av.style.background = color;
      av.className = 'msg-header-av';
    }
    if (name) name.textContent = profile.display_name || 'Unknown';
    if (sub) {
      var parts = [ROLE_LABELS[profile.role] || profile.role, profile.org].filter(Boolean);
      sub.textContent = parts.join(' · ');
    }
  }

  // ── SCHOOL CONTEXT STRIP ─────────────────────────────────────
  // Recruiting-relationship context painted below the coach header.
  // Only rendered on athlete portal (element only exists in athlete.html).
  function _paintSchoolCtx(conv) {
    var ctx = document.getElementById('msg-school-ctx');
    if (!ctx) return;                         // not in this portal

    if (!conv || !conv.player_program_id || !conv.player_programs) {
      ctx.style.display = 'none';
      return;
    }

    var pp     = conv.player_programs;
    var school = (pp.programs || {}).school || null;
    var stage  = pp.stage || null;
    if (!school) { ctx.style.display = 'none'; return; }

    // Stage color + label
    var stageColor = '#6b7280';
    var stageLabel = stage ? (stage.charAt(0).toUpperCase() + stage.slice(1)) : '';
    if (typeof PIPELINE_STAGES !== 'undefined' && stage) {
      var si = PIPELINE_STAGES.find(function(s){ return s.id === stage; });
      if (si) { stageColor = si.color; stageLabel = si.label; }
    }

    // Momentum
    var momentum = { level: 'none', label: 'Not started' };
    if (typeof _calcMomentum === 'function') momentum = _calcMomentum(school);
    var dotColor = ({ active:'#00c853', cooling:'#f59e0b', stalled:'#ef4444', none:'#9ca3af' })[momentum.level] || '#9ca3af';

    // Last contact
    var bm  = (typeof _boardMeta !== 'undefined') ? (_boardMeta[school] || {}) : {};
    var lcd = bm.last_contact_date || null;
    var contactTxt = lcd ? 'Last contact ' + lcd : '';

    var g = function(id){ return document.getElementById(id); };
    var schoolEl = g('msg-sc-school'), stageEl = g('msg-sc-stage'),
        dotEl    = g('msg-sc-dot'),    mEl     = g('msg-sc-momentum'),
        cEl      = g('msg-sc-contact');

    if (schoolEl) schoolEl.textContent     = school;
    if (stageEl) {
      stageEl.textContent      = stageLabel;
      stageEl.style.background = stageColor + '20';
      stageEl.style.color      = stageColor;
    }
    if (dotEl)  dotEl.style.background     = dotColor;
    if (mEl)    mEl.textContent            = momentum.label;
    if (cEl)    cEl.textContent            = contactTxt;

    ctx.style.display = 'flex';
  }

  function closeMsgThread() {
    _activeConvId = null;
    var empty = document.getElementById('msg-empty-state');
    var convo = document.getElementById('msg-convo');
    var ctx   = document.getElementById('msg-school-ctx');
    if (empty) empty.style.display = '';
    if (convo) convo.style.display = 'none';
    if (ctx)   ctx.style.display   = 'none';
    _paintThreads(_filtered);
  }

  // ── LOAD MESSAGES ────────────────────────────────────────────
  async function _loadMessages(convId) {
    var bubbles = document.getElementById('msg-bubbles');
    if (!bubbles) return;
    bubbles.innerHTML = '<div class="msg-loading">Loading…</div>';

    var r = await sb
      .from('messages')
      .select('id,sender_id,body,created_at,read_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (r.error) {
      bubbles.innerHTML = '<div class="msg-load-error">Couldn\'t load messages.'
        + ' <button onclick="_loadMessages(\'' + convId + '\')">Retry</button></div>';
      return;
    }

    _messages = r.data || [];
    _paintBubbles();
    _scrollBottom();
  }

  function _paintBubbles() {
    var bubbles = document.getElementById('msg-bubbles');
    if (!bubbles || !currentUser) return;

    if (!_messages.length) {
      bubbles.innerHTML = '<div class="msg-bubble-intro">Send the first message.</div>';
      return;
    }

    var html      = '';
    var lastDate  = '';

    _messages.forEach(function(m){
      var isMine = m.sender_id === currentUser.id;
      var d      = new Date(m.created_at);
      var ds     = d.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' });
      var time   = d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

      if (ds !== lastDate) {
        html += '<div class="msg-date-sep"><span>' + _esc(ds) + '</span></div>';
        lastDate = ds;
      }

      var cls = 'msg-bubble-wrap ' + (isMine ? 'sent' : 'received');
      if (m._pending) cls += ' pending';
      if (m._failed)  cls += ' failed';

      html += '<div class="' + cls + '" data-id="' + m.id + '">'
        + '<div class="msg-bubble">' + _escNl(m.body) + '</div>'
        + '<div class="msg-bubble-meta">'
          + '<span class="msg-bubble-time">' + time + '</span>';

      if (isMine) {
        if (m._pending) {
          html += '<span class="msg-bubble-status pending">Sending…</span>';
        } else if (m._failed) {
          html += '<span class="msg-bubble-status error">Failed</span>'
            + '<button class="msg-retry-btn" onclick="retryMsg(\'' + m.id + '\')">Retry</button>';
        } else {
          html += '<span class="msg-bubble-status">' + (m.read_at ? '✓✓' : '✓') + '</span>';
        }
      }

      html += '</div></div>';
    });

    bubbles.innerHTML = html;
  }

  function _scrollBottom() {
    var b = document.getElementById('msg-bubbles');
    if (b) b.scrollTop = b.scrollHeight;
  }

  // ── SEND ─────────────────────────────────────────────────────
  async function sendMsg() {
    var ta = document.getElementById('msg-compose-area');
    if (!ta) return;
    var body = ta.value.trim();
    if (!body)           return;
    if (!_activeConvId)  return;
    if (!currentUser)    return;
    if (body.length > MAX_MSG_LEN) {
      _toast('Message too long (max ' + MAX_MSG_LEN + ' characters)');
      return;
    }

    ta.value = '';
    msgComposeResize(ta);

    // Optimistic message
    var tempId = 'tmp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    var opt = {
      id:              tempId,
      sender_id:       currentUser.id,
      body:            body,
      created_at:      new Date().toISOString(),
      read_at:         null,
      _pending:        true,
      _failed:         false
    };
    _messages.push(opt);
    _sentIds[tempId] = true;
    _paintBubbles();
    _scrollBottom();

    _pending[tempId] = { body: body, convId: _activeConvId, retries: 0 };
    await _trySend(tempId, body, _activeConvId, 0);
  }

  async function _trySend(tempId, body, convId, attempt) {
    if (!sb || !currentUser) return;

    var r = await sb.from('messages')
      .insert({ conversation_id: convId, sender_id: currentUser.id, body: body })
      .select('id,sender_id,body,created_at,read_at')
      .single();

    if (r.error) {
      if (attempt < MAX_RETRIES) {
        var delay = RETRY_BASE_MS * Math.pow(2, attempt);
        setTimeout(function(){ _trySend(tempId, body, convId, attempt + 1); }, delay);
      } else {
        // Mark as failed in UI
        var m = _messages.find(function(x){ return x.id === tempId; });
        if (m) { m._pending = false; m._failed = true; }
        _paintBubbles(); _scrollBottom();
        delete _pending[tempId];
        _toast('Message failed to send. Tap Retry.');
      }
      return;
    }

    // Success — swap optimistic with real row
    _sentIds[r.data.id] = true;          // prevent realtime double-render
    var idx = _messages.findIndex(function(x){ return x.id === tempId; });
    if (idx > -1) _messages[idx] = r.data;
    delete _pending[tempId];
    _paintBubbles(); _scrollBottom();
    _bumpThreadPreview(convId, body);

    // Momentum: outbound messages on school-linked conversations update last_contact_date
    var sentThread = _threads.find(function(t){ return t.conv.id === convId; });
    if (sentThread) _updateMomentumForConv(sentThread.conv);
  }

  function retryMsg(tempId) {
    var p = _pending[tempId];
    if (!p) return;
    var m = _messages.find(function(x){ return x.id === tempId; });
    if (m) { m._pending = true; m._failed = false; }
    p.retries = 0;
    _paintBubbles();
    _trySend(tempId, p.body, p.convId, 0);
  }

  function _bumpThreadPreview(convId, body) {
    var t = _threads.find(function(x){ return x.conv.id === convId; });
    if (!t) return;
    t.conv.last_message_preview = body.length > 60 ? body.slice(0, 60) + '…' : body;
    t.conv.last_message_at      = new Date().toISOString();
    _threads.sort(function(a, b){
      return new Date(b.conv.last_message_at) - new Date(a.conv.last_message_at);
    });
    _filtered = _threads.slice();
    _paintThreads(_filtered);
  }

  // ── MOMENTUM BRIDGE ──────────────────────────────────────────
  // Called on both successful send (_trySend) and inbound receipt (_onNewMsg).
  // Updates last_contact_date for the school relationship linked to this conversation.
  function _updateMomentumForConv(conv) {
    if (!conv || !conv.player_program_id) return;
    var today  = new Date().toISOString().split('T')[0];
    var pp     = conv.player_programs;
    var school = pp ? ((pp.programs || {}).school || null) : null;
    var ppId   = conv.player_program_id;

    // In-memory board cache (athlete portal only)
    if (school && typeof _boardMeta !== 'undefined') {
      _boardMeta[school] = Object.assign(_boardMeta[school] || {}, { last_contact_date: today });
    }
    // Persist to Supabase
    if (school && typeof saveBoardContact === 'function') {
      saveBoardContact(school, { lastContactDate: today });
    } else if (sb) {
      sb.from('player_programs')
        .update({ last_contact_date: today, updated_at: new Date().toISOString() })
        .eq('id', ppId);
    }
    // Refresh visible board card so momentum dot updates instantly
    if (school && typeof RAW !== 'undefined' && typeof buildPipelineCard === 'function') {
      var card = document.querySelector('.pipeline-card[data-school="' + CSS.escape(school) + '"]');
      var raw  = RAW.find(function(x){ return x.School === school; });
      if (card && raw) {
        card.replaceWith(buildPipelineCard(
          raw,
          (typeof statusData !== 'undefined' ? statusData[school] : null) || 'saved'
        ));
      }
    }
  }

  // ── REALTIME ─────────────────────────────────────────────────
  function _subscribe() {
    if (!sb || !currentUser) return;
    _unsubscribe();

    _channel = sb.channel('juke_msg_' + currentUser.id)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'messages'
      }, _onNewMsg)
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'conversations'
      }, _onConvUpdate)
      .subscribe(function(status){
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.warn('[Juke Msg] realtime dropped, retrying in 4s');
          setTimeout(_subscribe, 4000);
        }
      });
  }

  function _unsubscribe() {
    if (_channel && sb) { sb.removeChannel(_channel); _channel = null; }
  }

  async function _onNewMsg(payload) {
    var msg = payload.new;
    if (!msg || !currentUser) return;

    // Only act on messages in our conversations
    var thread = _threads.find(function(t){ return t.conv.id === msg.conversation_id; });
    if (!thread) {
      // New conversation we haven't seen — refresh list
      await renderMsgThreadList();
      await updateMsgBadge();
      return;
    }

    // Dedup: skip messages we already rendered optimistically
    if (_sentIds[msg.id]) { delete _sentIds[msg.id]; return; }

    if (msg.conversation_id === _activeConvId) {
      // User is looking at this conversation — append and mark read
      _messages.push(msg);
      _paintBubbles();
      _scrollBottom();
      await _markRead(msg.conversation_id);
    } else {
      thread.unread = (thread.unread || 0) + 1;
      await updateMsgBadge();
    }

    thread.conv.last_message_preview = msg.body.length > 60 ? msg.body.slice(0, 60) + '…' : msg.body;
    thread.conv.last_message_at      = msg.created_at;
    _threads.sort(function(a, b){
      return new Date(b.conv.last_message_at) - new Date(a.conv.last_message_at);
    });
    _filtered = _threads.slice();
    _paintThreads(_filtered);

    // Momentum: inbound messages from coaches reset last_contact_date
    if (msg.sender_id !== currentUser.id) _updateMomentumForConv(thread.conv);
  }

  function _onConvUpdate(payload) {
    var c = payload.new;
    if (!c) return;
    var t = _threads.find(function(x){ return x.conv.id === c.id; });
    if (t) {
      t.conv.last_message_at      = c.last_message_at;
      t.conv.last_message_preview = c.last_message_preview;
    }
  }

  // ── MARK READ ────────────────────────────────────────────────
  async function _markRead(convId) {
    if (!sb || !currentUser || !convId) return;
    await sb.rpc('mark_conversation_read', { p_conversation_id: convId });
  }

  // ── BADGE ────────────────────────────────────────────────────
  async function updateMsgBadge() {
    if (!sb || !currentUser) return;

    var r = await sb.from('messages')
      .select('id', { count: 'exact', head: true })
      .neq('sender_id', currentUser.id)
      .is('read_at', null);

    var n = r.count || 0;

    // Tab badge
    var badge = document.getElementById('msg-tab-badge');
    if (badge) {
      badge.textContent   = n > 0 ? (n > 99 ? '99+' : n) : '';
      badge.style.display = n > 0 ? 'inline-block' : 'none';
    }

    // Header envelope
    var btn = document.getElementById('hd-msg-btn');
    if (btn) btn.classList.toggle('has-unread', n > 0);

    // Feed stat cards (athlete and coach portals use different IDs)
    var feedEl = document.getElementById('feed-unread-count')
              || document.getElementById('cf-msg-count');
    if (feedEl) feedEl.textContent = n;

    return n;
  }

  // openNewMsg and searchMsgRecipients moved to features/messaging-modal.js

  async function startConvWith(userId) {
    var modal = document.getElementById('msg-new-modal');
    if (modal) modal.classList.remove('open');
    if (!sb || !currentUser) return;

    var cid = await _getOrCreate(userId);
    if (!cid) { _toast('Could not start conversation'); return; }

    await renderMsgThreadList();
    openMsgThread(cid, userId);
  }

  async function _getOrCreate(otherId) {
    var r = await sb.rpc('get_or_create_conversation', { other_user_id: otherId });
    if (r.error) { console.warn('[Juke Msg] get_or_create:', r.error.message); return null; }
    return r.data;
  }

  // ── COMPOSE UX ───────────────────────────────────────────────
  function msgComposeKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMsg();
    }
  }

  function msgComposeResize(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }

  // ── RECONNECT ────────────────────────────────────────────────
  async function _reconnect() {
    if (!sb || !currentUser) return;
    _subscribe();
    await renderMsgThreadList();
    await updateMsgBadge();
    if (_activeConvId) await _loadMessages(_activeConvId);
    // Flush pending queue
    Object.keys(_pending).forEach(function(tid){
      var p = _pending[tid];
      if (p && p.retries < MAX_RETRIES) _trySend(tid, p.body, p.convId, 0);
    });
  }

  function _onVisibility() {
    if (document.visibilityState === 'visible') _reconnect();
  }

  function _onOnline() { _reconnect(); }

  // ── BACKUP POLL ──────────────────────────────────────────────
  function _startPoll() {
    clearInterval(_pollTimer);
    _pollTimer = setInterval(async function(){
      if (!sb || !currentUser) return;
      await updateMsgBadge();

      // If a conversation is open, fetch any messages newer than the last one
      if (_activeConvId && _messages.length) {
        var last = _messages[_messages.length - 1];
        var r = await sb.from('messages')
          .select('id,sender_id,body,created_at,read_at')
          .eq('conversation_id', _activeConvId)
          .gt('created_at', last.created_at)
          .order('created_at', { ascending: true });

        if (r.data && r.data.length) {
          var novel = r.data.filter(function(m){
            return !_sentIds[m.id] && !_messages.find(function(x){ return x.id === m.id; });
          });
          if (novel.length) {
            _messages = _messages.concat(novel);
            _paintBubbles();
            _scrollBottom();
          }
        }
      }
    }, POLL_MS);
  }

  // ── UTILITIES ────────────────────────────────────────────────
  function _esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function _escNl(s) {
    return _esc(s).replace(/\n/g,'<br>');
  }

  function _fmtTime(iso) {
    var d    = new Date(iso);
    var now  = new Date();
    var diff = now - d;
    if (diff < 60000)    return 'Just now';
    if (diff < 3600000)  return Math.floor(diff / 60000) + 'm';
    if (diff < 86400000) return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    if (diff < 604800000)return d.toLocaleDateString([],  { weekday:'short' });
    return d.toLocaleDateString([], { month:'short', day:'numeric' });
  }

  function _toast(msg) {
    if (typeof showToast === 'function') { showToast(msg); return; }
    var el = document.createElement('div');
    el.className  = 'msg-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function(){ el.classList.add('show'); }, 10);
    setTimeout(function(){ el.classList.remove('show'); setTimeout(function(){ el.remove(); }, 300); }, 3000);
  }

  // ── SUPABASE AUTH HOOK ───────────────────────────────────────
  // Registers its own auth listener so it doesn't need juke.html
  // to call initMessaging explicitly.
  if (typeof sb !== 'undefined' && sb) {
    sb.auth.onAuthStateChange(function(event, session){
      if (session && session.user
          && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
        // Small delay ensures currentUser is set by the main script's listener first
        setTimeout(initMessaging, 60);
      } else if (event === 'SIGNED_OUT') {
        _cleanup();
      }
    });
  }

  // ── EXPORTS ──────────────────────────────────────────────────
  window.initMessaging        = initMessaging;
  window.renderMsgThreadList  = renderMsgThreadList;
  window.updateMsgBadge       = updateMsgBadge;
  window.filterThreads        = filterThreads;
  window.openMsgThread        = openMsgThread;
  window.closeMsgThread       = closeMsgThread;
  window.sendMsg              = sendMsg;
  window.retryMsg             = retryMsg;
  window.msgComposeKeydown    = msgComposeKeydown;
  window.msgComposeResize     = msgComposeResize;
  window.startConvWith        = startConvWith;

}());

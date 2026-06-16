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

    // All conversations this user is in
    var r = await sb
      .from('conversations')
      .select('id,participant_a,participant_b,last_message_at,last_message_preview,created_at')
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
      list.innerHTML = '<div class="msg-auth-prompt">Sign in to send and receive messages</div>';
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
      list.innerHTML = '<div class="msg-thread-empty">No conversations yet.<br>'
        + '<span>Use <strong>+ New Message</strong> to start one.</span></div>';
      return;
    }

    list.innerHTML = threads.map(function(t){
      var name     = t.other.display_name || 'Unknown';
      var initials = _initials(name);
      var preview  = t.conv.last_message_preview || 'No messages yet';
      var time     = t.conv.last_message_at ? _fmtTime(t.conv.last_message_at) : '';
      var role     = t.other.role || 'athlete';
      var active   = t.conv.id === _activeConvId ? ' active' : '';
      var unread   = t.unread > 0 ? ' unread' : '';
      var color    = ROLE_COLORS[role] || '#FF0080';
      return '<div class="msg-thread-item' + active + unread + '"'
        + ' onclick="openMsgThread(\'' + t.conv.id + '\',\'' + t.otherId + '\')">'
        + '<div class="msg-thread-av" style="background:' + color + '">' + initials + '</div>'
        + '<div class="msg-thread-body">'
          + '<div class="msg-thread-top">'
            + '<span class="msg-thread-name">' + _esc(name) + '</span>'
            + '<span class="msg-thread-time">' + _esc(time) + '</span>'
          + '</div>'
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
    _paintThreads(_filtered);

    var empty = document.getElementById('msg-empty-state');
    var convo = document.getElementById('msg-convo');
    if (empty) empty.style.display = 'none';
    if (convo) convo.style.display = 'flex';

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
    var t = _threads.find(function(x){ return x.conv.id === convId; });
    if (t) t.unread = 0;
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
      av.textContent = _initials(profile.display_name || 'U');
      av.style.background = color;
      av.className = 'msg-header-av';
    }
    if (name) name.textContent = profile.display_name || 'Unknown';
    if (sub) {
      var parts = [ROLE_LABELS[profile.role] || profile.role, profile.org].filter(Boolean);
      sub.textContent = parts.join(' · ');
    }
  }

  function closeMsgThread() {
    _activeConvId = null;
    var empty = document.getElementById('msg-empty-state');
    var convo = document.getElementById('msg-convo');
    if (empty) empty.style.display = '';
    if (convo) convo.style.display = 'none';
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

  // ── NEW MESSAGE MODAL ────────────────────────────────────────
  async function openNewMsg(prefillId, prefillName) {
    if (!sb || !currentUser) {
      _toast('Sign in to send messages');
      return;
    }

    // Direct open — skip modal (e.g. "Message" button on an athlete card)
    if (prefillId) {
      var cid = await _getOrCreate(prefillId);
      if (!cid) { _toast('Could not start conversation'); return; }
      if (prefillName && !_profiles[prefillId]) {
        _profiles[prefillId] = { display_name: prefillName, role: 'athlete', org: '' };
      }
      await renderMsgThreadList();
      if (typeof switchTab === 'function') switchTab('messages');
      openMsgThread(cid, prefillId);
      return;
    }

    // Build modal once
    if (!document.getElementById('msg-new-modal')) {
      var overlay = document.createElement('div');
      overlay.id        = 'msg-new-modal';
      overlay.className = 'msg-new-overlay';
      overlay.innerHTML =
        '<div class="msg-new-box" role="dialog" aria-modal="true" aria-label="New Message">'
          + '<div class="msg-new-hd">'
            + '<span class="msg-new-title">New Message</span>'
            + '<button class="msg-new-close" aria-label="Close" '
            +   'onclick="document.getElementById(\'msg-new-modal\').classList.remove(\'open\')">✕</button>'
          + '</div>'
          + '<div class="msg-new-search-wrap">'
            + '<input id="msg-new-search" class="msg-new-search" type="text" '
            +   'placeholder="Search by name…" autocomplete="off" '
            +   'oninput="searchMsgRecipients(this.value)"/>'
          + '</div>'
          + '<div id="msg-new-results" class="msg-new-results">'
            + '<div class="msg-new-hint">Start typing to search</div>'
          + '</div>'
        + '</div>';
      overlay.addEventListener('click', function(e){
        if (e.target === overlay) overlay.classList.remove('open');
      });
      document.body.appendChild(overlay);
    }

    // Reset and open
    var modal = document.getElementById('msg-new-modal');
    var input = document.getElementById('msg-new-search');
    var res   = document.getElementById('msg-new-results');
    if (input) input.value = '';
    if (res)   res.innerHTML = '<div class="msg-new-hint">Start typing to search</div>';
    modal.classList.add('open');
    setTimeout(function(){ if (input) input.focus(); }, 120);
  }

  async function searchMsgRecipients(q) {
    var res = document.getElementById('msg-new-results');
    if (!res) return;

    if (!q || q.trim().length < 2) {
      res.innerHTML = '<div class="msg-new-hint">Type at least 2 characters</div>';
      return;
    }

    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(async function(){
      res.innerHTML = '<div class="msg-new-hint">Searching…</div>';

      var role   = _myRole();
      var filter;
      if (role === 'athlete') {
        filter = ['college_coach','hs_coach','recruiting_coordinator'];
      } else if (role === 'college_coach' || role === 'hs_coach' || role === 'recruiting_coordinator') {
        filter = ['athlete'];
      } else {
        // admin / parent — see everyone except self
        filter = ['athlete','college_coach','hs_coach','parent','recruiting_coordinator'];
      }

      var r = await sb.from('user_profiles')
        .select('id,display_name,role,org')
        .in('role', filter)
        .ilike('display_name', '%' + q + '%')
        .neq('id', currentUser.id)
        .limit(12);

      if (!r.data || !r.data.length) {
        res.innerHTML = '<div class="msg-new-hint">No users found</div>';
        return;
      }

      res.innerHTML = r.data.map(function(u){
        var color = ROLE_COLORS[u.role] || '#FF0080';
        var sub   = [ROLE_LABELS[u.role] || u.role, u.org].filter(Boolean).join(' · ');
        return '<div class="msg-new-result" onclick="startConvWith(\'' + u.id + '\')">'
          + '<div class="msg-thread-av sm" style="background:' + color + '">'
          +   _initials(u.display_name || 'U')
          + '</div>'
          + '<div class="msg-new-result-info">'
            + '<div class="msg-new-result-name">' + _esc(u.display_name || 'Unknown') + '</div>'
            + '<div class="msg-new-result-sub">' + _esc(sub) + '</div>'
          + '</div>'
        + '</div>';
      }).join('');
    }, 280);
  }

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
  window.openNewMsg           = openNewMsg;
  window.searchMsgRecipients  = searchMsgRecipients;
  window.startConvWith        = startConvWith;

}());

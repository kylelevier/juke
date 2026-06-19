// ── ACTIVITY FEED ─────────────────────────────────────────
const FEED_FILTER_MAP = {
  all:      ()=>true,
  interest: i=>['view','board','message'].includes(i.type),
  action:   i=>['nudge'].includes(i.type),
  tips:     i=>['tip','timeline','milestone'].includes(i.type),
};
const FEED_ICON = {
  view:'👁️', board:'📋', message:'💬', nudge:'⚡', milestone:'🏆', tip:'💡', timeline:'📅'
};
const FEED_ICON_CLASS = {
  view:'fi-icon-view', board:'fi-icon-board', message:'fi-icon-message',
  nudge:'fi-icon-nudge', milestone:'fi-icon-milestone', tip:'fi-icon-tip', timeline:'fi-icon-timeline'
};

function buildFeed(){
  var items = [];
  var _id = 1;
  var p = lsGet('juke_player')||{};
  var sd = lsGet('juke_status')||{};
  var endorsements = typeof getEndorsements === 'function' ? getEndorsements() : [];
  var milestones = lsGet('juke_feed_milestones')||{};

  // read profile value supporting both short + long key formats
  function gp(key){
    if(p[key]!==undefined&&p[key]!==null&&p[key]!=='') return p[key];
    var short=key.replace(/^[ps]-/,'').replace(/-/g,'');
    return (p[short]!==undefined&&p[short]!==null&&p[short]!=='') ? p[short] : '';
  }

  var firstName = gp('p-fname');
  var gradyr    = gp('p-gradyr');
  var highlight = gp('p-highlight');
  var intro     = gp('p-intro');
  var gpa       = gp('p-gpa');
  var height    = gp('p-height');
  var email     = gp('p-email');
  var positions = p.positions||p._positions||[];
  var hasAvatar = !!localStorage.getItem('juke_avatar');
  var hasProfile = !!(firstName||highlight||gpa||height||positions.length);

  // ── PROFILE COMPLETENESS SCORE (from stored data, no DOM needed) ──
  var scoreFields = [firstName, gp('p-lname'), gradyr, gp('p-city'), gp('p-school'), email,
    highlight, gp('p-gamefilm'), intro, gp('p-word1'), gpa, gp('p-sat'),
    height, gp('p-weight'), gp('p-forty'), gp('p-vertical')];
  var filled = scoreFields.filter(function(v){return v&&v!=='';}).length;
  if(positions.length) filled += 2;
  if(hasAvatar) filled += 1;
  var score = Math.min(100, Math.round((filled / (scoreFields.length + 3)) * 100));

  // ── WELCOME / COMPLETION MILESTONES (fire once) ──
  if(hasProfile){
    if(score >= 100 && !milestones.m100){
      items.push({id:_id++, type:'milestone', time:'Just now', pri:0,
        primary:'🏆 Your profile is 100% complete',
        secondary:'Every section is filled. You\'re showing up fully to every coach who finds you on JUKE.'});
      milestones.m100=true; lsSet('juke_feed_milestones', milestones);
    } else if(score >= 75 && !milestones.m75){
      items.push({id:_id++, type:'milestone', time:'1h ago', pri:0,
        primary:'Your profile is 75% complete — almost there',
        secondary:'A complete profile gets significantly more coach attention. Film and bio are the two highest-impact fields left.'});
      milestones.m75=true; lsSet('juke_feed_milestones', milestones);
    } else if(score >= 50 && !milestones.m50){
      items.push({id:_id++, type:'milestone', time:'2h ago', pri:0,
        primary:'Your profile is 50% complete',
        secondary:'Good start. Keep going — especially film and bio. Those two fields drive the most coach engagement.'});
      milestones.m50=true; lsSet('juke_feed_milestones', milestones);
    } else if(!milestones.mFirst){
      items.push({id:_id++, type:'milestone', time:'Today', pri:0,
        primary: firstName ? 'Welcome to JUKE, '+firstName+'.' : 'Your JUKE profile is live.',
        secondary:'Complete each section to increase your visibility. Film and positions are the most important — start there.'});
      milestones.mFirst=true; lsSet('juke_feed_milestones', milestones);
    }
  }

  // ── MISSING FIELD NUDGES ──
  if(hasProfile){
    if(!highlight)
      items.push({id:_id++, type:'nudge', time:'2h ago', pri:1,
        primary:'Your highlight reel link is missing',
        secondary:'Film is the #1 thing coaches check — without it, profile views rarely convert to interest. Add your Hudl, Vimeo, or YouTube link.',
        action:{label:'Add Film →', fn:'profile'}});

    if(!intro)
      items.push({id:_id++, type:'nudge', time:'3h ago', pri:2,
        primary:'Your player bio is empty',
        secondary:'Coaches evaluate character and fit, not just athleticism. A few sentences about how you compete and what you\'re looking for in a program changes how they see you.',
        action:{label:'Write Bio →', fn:'profile'}});

    if(!positions.length)
      items.push({id:_id++, type:'nudge', time:'4h ago', pri:3,
        primary:'You haven\'t set your position(s) yet',
        secondary:'Coaches filter by position when building recruiting boards. Without positions set, you won\'t appear in their searches.',
        action:{label:'Set Positions →', fn:'profile'}});

    if(!gpa)
      items.push({id:_id++, type:'nudge', time:'5h ago', pri:4,
        primary:'Add your GPA — academics matter more than you think',
        secondary:'When coaches have two athletically comparable recruits, the one with stronger grades almost always gets the offer.',
        action:{label:'Add GPA →', fn:'profile'}});

    if(!height)
      items.push({id:_id++, type:'nudge', time:'6h ago', pri:5,
        primary:'Your measurables section is empty',
        secondary:'Height, weight, and 40 time are the first numbers coaches scan. Add them so your stats are front and center.',
        action:{label:'Add Measurables →', fn:'profile'}});

    if(!hasAvatar)
      items.push({id:_id++, type:'nudge', time:'8h ago', pri:6,
        primary:'No headshot — coaches can\'t picture you yet',
        secondary:'Profiles with photos get significantly more engagement. Add a clear, recent headshot from the Identity tab.',
        action:{label:'Add Photo →', fn:'profile'}});
  }

  // ── ENDORSEMENT ITEMS ──
  endorsements.forEach(function(end, i){
    if(end.status==='endorsed')
      items.push({id:_id++, type:'milestone', time: end.submittedAt||'Recently', pri:8,
        primary:'Coach '+end.coachName+' submitted a recommendation ✓',
        secondary:end.coachSchool+' · A verified coach recommendation is now showing on your profile card — this is the strongest trust signal in the system.'});
    else if(end.status==='pending')
      items.push({id:_id++, type:'timeline', time: end.requestedAt||'Recently', pri:22+i,
        primary:'Recommendation request sent to Coach '+end.coachName,
        secondary:end.coachSchool+' · Pending response. Coaches typically reply within 1–2 weeks.'});
  });

  // ── PIPELINE NUDGES ──
  var pipeSchools = Object.keys(sd);
  pipeSchools.forEach(function(school, i){
    var status = sd[school];
    var daysAgo = (i+1)+'d ago';
    if(status==='saved')
      items.push({id:_id++, type:'nudge', time:daysAgo, pri:12+i,
        primary:school+' is on your list — have you reached out yet?',
        secondary:'Proactive athletes get more attention. A short, specific email to '+school+' goes a long way. Coaches respect athletes who initiate.',
        action:{label:'Draft Email →', fn:'profile'}});
    else if(status==='contacted')
      items.push({id:_id++, type:'milestone', time:daysAgo, pri:18+i,
        primary:'You reached out to '+school+' — great move',
        secondary:'Initial contact is the hardest step. Give them a week to respond before following up. Keep it short, specific, and genuine.'});
    else if(status==='applied')
      items.push({id:_id++, type:'milestone', time:daysAgo, pri:18+i,
        primary:'Application submitted to '+school,
        secondary:'Nice work. Stay engaged — follow up with the coaching staff to confirm they received everything.'});
  });

  // ── EVERGREEN TIPS (always included) ──
  var classLabel = gradyr ? 'Class of '+gradyr : 'your class';
  var posLabel   = positions[0] ? positions[0]+'s' : 'athletes at your position';
  [
    {type:'tip', time:'5d ago',
      primary:'The average D1 coach evaluates 200+ recruits per class',
      secondary:'That\'s why your first email matters. Be specific about why you chose their program — coaches delete generic emails immediately.'},
    {type:'tip', time:'1w ago',
      primary:'Academics close more offers than most athletes realize',
      secondary:'When coaches have two athletically comparable recruits, the one with stronger grades almost always gets the offer. Make your GPA visible.'},
    {type:'timeline', time:'1w ago',
      primary:classLabel+': D1 programs are actively building class lists right now',
      secondary:'Peak contact window is open. This is the best time to make initial contact with programs you\'re serious about.'},
    {type:'timeline', time:'10d ago',
      primary:'NCAA Contact Rules — what you need to know',
      secondary:'D1 coaches cannot initiate contact before September 1 of an athlete\'s junior year. You can reach out to them first — and you should.'},
    {type:'tip', time:'2w ago',
      primary:'A recruiting profile without a bio gets significantly fewer responses',
      secondary:'Coaches evaluate character and fit — not just athleticism. A few sentences about how you compete and what you\'re looking for in a program can be the difference.'},
  ].forEach(function(t){ items.push(Object.assign({id:_id++, pri:50}, t)); });

  items.sort(function(a,b){ return a.pri - b.pri; });
  return items;
}

function feedItemHTML(item){
  var badgeHTML = item.badge ? '<div class="fi-badge interest">'+item.badge+'</div>' : '';
  var actionHTML = '';
  if(item.action){
    var fn = item.action.fn==='messages'
      ? 'switchTab(\'messages\');renderMsgThreadList();updateMsgBadge()'
      : 'switchTab(\'profile\');setTimeout(openProfileEdit,150)';
    actionHTML = '<div class="fi-action-row"><button class="fi-action-btn" onclick="'+fn+'">'+item.action.label+'</button></div>';
  }
  return '<div class="feed-item" data-type="'+item.type+'">'
    +'<div class="fi-icon-wrap '+FEED_ICON_CLASS[item.type]+'">'+FEED_ICON[item.type]+'</div>'
    +'<div class="fi-body">'
      +'<div class="fi-primary">'+item.primary+'</div>'
      +'<div class="fi-secondary">'+item.secondary+'</div>'
      +badgeHTML+actionHTML
    +'</div>'
    +'<div class="fi-time">'+item.time+'</div>'
    +'</div>';
}

var _activeFeedFilter = 'all';
function filterFeed(filter, btn){
  _activeFeedFilter = filter;
  document.querySelectorAll('.feed-filter').forEach(function(b){b.classList.remove('active');});
  if(btn) btn.classList.add('active');
  renderFeed();
}

function renderFeed(){
  var el = document.getElementById('feed-list');
  if(!el) return;
  var pred = FEED_FILTER_MAP[_activeFeedFilter]||FEED_FILTER_MAP.all;
  var items = buildFeed().filter(pred);
  if(!items.length){
    el.innerHTML='<div class="feed-empty">Nothing here yet — check back as you build your profile.</div>';
    return;
  }
  el.innerHTML = items.map(feedItemHTML).join('');
}

renderFeed();

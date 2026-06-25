// ── OUTREACH DRAFT ENGINE ─────────────────────────────────
// V1: Template-based. Structure is intentionally identical to what V2 will need.
// To upgrade to AI: replace _buildOutreachDraft() with a call to the Edge Function.
// Everything else (show/copy/log) stays the same.
//
// Profile fields sourced from lsGet('juke_player'):
//   fname, lname, gradyr, positions[], sport1, gpa, city, school (HS),
//   highlight (URL), profileurl, awards[], divisions[], word1/2/3

function _buildOutreachDraft(school, stage, momentumLevel) {
  const p = lsGet('juke_player') || {};

  // ── Identity ────────────────────────────────────────────
  const fname = p.fname || '';
  const lname = p.lname || '';
  const fullName = [fname, lname].filter(Boolean).join(' ') || '[Your Name]';
  const gradYear = p.gradyr ? `Class of ${p.gradyr}` : '[Class of ...]';
  const positions = (p.positions || []);
  const posDisplay = positions.length ? positions.join(' / ') : '[Position]';
  const sport = p.sport1 || 'flag football';

  // ── Academic ────────────────────────────────────────────
  const gpa = p.gpa || null;
  const gpaLine = gpa ? ` I carry a ${gpa} GPA` : '';
  const hsName = p.school || null;
  const hometown = p.city || null;
  // "at Lone Star HS in Frisco, TX" reads better than "from Frisco, TX, Lone Star HS"
  const locationLine = hsName && hometown
    ? `at ${hsName} in ${hometown}`
    : hsName || hometown || null;

  // ── Achievements ────────────────────────────────────────
  const awards = (p.awards || []).filter(Boolean);
  const topAward = awards[0] || null;
  const awardLine = topAward ? ` Most recently, I was named ${topAward}.` : '';

  // ── Division targets ────────────────────────────────────
  const divisions = (p.divisions || []);
  const divLine = divisions.length
    ? `I am specifically targeting ${divisions.join(' and ')} programs.`
    : '';

  // ── Links ───────────────────────────────────────────────
  const highlightUrl = (p.highlight || '').trim();
  const profileUrl = (p.profileurl || '').trim();
  const linkLines = [];
  if (profileUrl)   linkLines.push(`Recruiting profile: ${profileUrl}`);
  if (highlightUrl) linkLines.push(`Highlight film: ${highlightUrl}`);
  const linksBlock = linkLines.length
    ? linkLines.join('\n')
    : 'I would be happy to share my recruiting profile and highlight film upon request.';

  // ── Template body copy: stage × momentum ────────────────
  // Each entry answers: why I'm reaching out, what I want next.
  const bodies = {
    saved: {
      none: `I've been following your ${sport} program closely and am very interested in learning about scholarship and roster opportunities for the ${gradYear}.${gpaLine ? gpaLine + '.' : ''}${awardLine} I believe I would be a strong fit for your program and would love to connect.`,
      active: `I've had a chance to do more research on your program and my interest continues to grow. I'd love to find time to connect and share more about my background as a ${posDisplay}.`,
      cooling: `I wanted to follow up and make sure your staff has had a chance to review my profile. I remain very interested in competing at ${school} and believe I can contribute at your level.`,
      stalled: `I know your recruiting calendar moves quickly and I don't want to miss my window to connect. ${school} is a program I'm genuinely excited about and I'd hate to lose touch.`,
    },
    contacting: {
      none: `I wanted to continue the conversation and reiterate my interest in your program. I'm a ${posDisplay} in the ${gradYear} and ${school} is one of my top priorities.`,
      active: `I appreciate the dialogue so far and I'm excited about what I'm learning about your program. I'd love to discuss the possibility of scheduling a campus visit so I can experience your program firsthand.`,
      cooling: `It's been a little while since we last spoke and I wanted to check in. My interest in your program hasn't changed — I'd love to get back in touch and talk about next steps.`,
      stalled: `I wanted to make sure I'm still on your radar. Your program is still a top priority for me and I'd love to reconnect before your recruiting class is finalized.`,
    },
    applied: {
      none: `I'm excited to let you know that I have officially submitted my application to ${school}. This is one of my top programs and I wanted to reach out personally to let you know of my intent.`,
      active: `Thank you for staying in contact during my application process. I wanted to check in on timing and ask what the next steps look like from your end.`,
      cooling: `I wanted to follow up on my application and make sure everything is in order. I remain fully committed to this process and want to make sure there's nothing additional you need from me.`,
      stalled: `I haven't heard back recently and wanted to confirm my application is complete and check on your decision timeline. I don't want to miss any steps in this process.`,
    },
    offered: {
      none: `I want to make sure I fully understand the offer and what the next steps look like on your end. Could we find time for a call this week to walk through the details together?`,
      active: `I'm actively working through my decision and truly appreciate your patience. I want to make the right choice for my future and would love to connect to ask my final questions before I commit.`,
      cooling: `I wanted to reach out and ask about the timeline for my decision. I want to be respectful of your recruiting calendar and give you a clear answer in a reasonable timeframe.`,
      stalled: `I know I owe you a decision and I don't want to leave your offer in limbo. Can we connect this week? I'm close to a decision and want to make sure I'm asking the right questions first.`,
    },
    committed: {
      none: `I'm incredibly excited to be joining your program and wanted to reach out and start building our relationship before I arrive on campus.`,
      active: `Thank you for everything — I can't wait for this next chapter. I wanted to check in and ask if there's anything I should be doing right now to prepare for my arrival.`,
      cooling: `I wanted to reach out and stay connected as we get closer to the start of the season. I'm eager to get to campus and ready to contribute from day one.`,
      stalled: `I wanted to check in and make sure I'm doing everything I need to do before arriving on campus. I'm fully committed and want to make sure I'm as prepared as possible.`,
    },
  };

  const bodyMap = bodies[stage] || bodies.contacting;
  const bodyText = bodyMap[momentumLevel] || bodyMap.none;

  // ── Subject lines ────────────────────────────────────────
  const subjects = {
    saved:     `${sport.charAt(0).toUpperCase() + sport.slice(1)} Recruiting Inquiry — ${fullName}, ${gradYear}`,
    contacting:`${fullName} — ${posDisplay} Follow-up`,
    applied:   `${fullName} — Application Follow-up`,
    offered:   `${fullName} — Offer Follow-up`,
    committed: `${fullName} — Looking Forward to Joining`,
  };
  const subject = subjects[stage] || subjects.contacting;

  // ── Opener ───────────────────────────────────────────────
  const openers = {
    saved:     `My name is ${fullName}, a ${posDisplay}${locationLine ? ' ' + locationLine : ''}. I'm a ${gradYear} prospect actively looking for the right program fit.${divLine ? ' ' + divLine : ''}`,
    contacting:`I wanted to follow up on my previous outreach regarding your ${sport} program at ${school}.`,
    applied:   `I recently submitted my application to ${school} and wanted to reach out directly to your coaching staff.`,
    offered:   `Thank you again for extending an offer to be part of your ${sport} program at ${school}.`,
    committed: `I'm so excited to be joining your ${sport} program at ${school}.`,
  };
  const opener = openers[stage] || openers.contacting;

  // ── Closing ──────────────────────────────────────────────
  const closing = `${linksBlock}\n\nThank you for your time and consideration.\n\n${fullName}`;

  const body = `Coach,\n\n${opener}\n\n${bodyText}\n\n${closing}`;

  return { subject, body };
}

// ── Draft UI ─────────────────────────────────────────────
function _bdShowDraft(btn) {
  // Toggle: if draft is already open, close it
  const existing = document.getElementById('bd-draft-section');
  if (existing) {
    existing.remove();
    btn.textContent = '✏ Draft outreach →';
    return;
  }

  const stage = statusData[_bdSchool] || 'saved';
  const momentum = typeof _calcMomentum === 'function'
    ? _calcMomentum(_bdSchool)
    : { level: 'none' };
  const draft = _buildOutreachDraft(_bdSchool, stage, momentum.level);

  // Warn if profile is sparse
  const p = lsGet('juke_player') || {};
  const profileComplete = !!(p.fname && p.gradyr && (p.positions || []).length);
  const warningHtml = !profileComplete
    ? `<div class="bd-draft-warning">⚠ Your profile is incomplete — fill in your name, grad year, and position for a better draft.</div>`
    : '';

  const section = document.createElement('div');
  section.id = 'bd-draft-section';
  section.className = 'bd-section bd-section-draft';
  section.innerHTML = `
    <div class="bd-draft-hd">
      <span class="bd-draft-badge">Draft Message</span>
      <span class="bd-draft-note">Edit before sending — this is your starting point</span>
    </div>
    ${warningHtml}
    <div class="bd-form-row">
      <label class="bd-form-label">Subject</label>
      <input class="bd-input" id="bd-draft-subj" value="${draft.subject.replace(/"/g, '&quot;')}">
    </div>
    <div class="bd-form-row">
      <label class="bd-form-label">Message</label>
      <textarea class="bd-input bd-draft-body" id="bd-draft-body" rows="12">${draft.body}</textarea>
    </div>
    <div class="bd-draft-actions">
      <button class="bd-draft-copy" onclick="_bdCopyDraft()">Copy to clipboard</button>
      <button class="bd-draft-log" onclick="_bdLogAndDismissDraft(this)">Copied — mark as contacted today</button>
    </div>
  `;

  // Insert after Juke Suggests (if visible) or after the first section
  const suggestSection = document.getElementById('bd-body').querySelector('.bd-section-suggest');
  const firstSection = document.getElementById('bd-body').querySelector('.bd-section');
  const anchor = suggestSection || firstSection;
  if (anchor) anchor.after(section);
  else document.getElementById('bd-body').appendChild(section);

  btn.textContent = '✕ Close draft';
}

function _bdCopyDraft() {
  const subj = document.getElementById('bd-draft-subj')?.value || '';
  const body = document.getElementById('bd-draft-body')?.value || '';
  const text = `Subject: ${subj}\n\n${body}`;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Copied.','info'))
      .catch(() => _bdCopyFallback(text));
  } else {
    _bdCopyFallback(text);
  }
}

function _bdCopyFallback(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); showToast('Copied.','info'); }
  catch (e) { showToast("Couldn't copy — select the text manually.",'error'); }
  ta.remove();
}

async function _bdLogAndDismissDraft(btn) {
  btn.disabled = true;
  const today = new Date().toISOString().split('T')[0];
  // Update _boardMeta in memory first so card re-renders with correct momentum
  _boardMeta[_bdSchool] = Object.assign(_boardMeta[_bdSchool] || {}, { last_contact_date: today });
  await saveBoardContact(_bdSchool, { lastContactDate: today });
  // Refresh the card on the board
  const card = document.querySelector(`.pipeline-card[data-school="${CSS.escape(_bdSchool)}"]`);
  const r = RAW.find(x => x.School === _bdSchool);
  if (card && r) card.replaceWith(buildPipelineCard(r, statusData[_bdSchool] || 'saved'));
  // Remove draft section and reload overview (momentum + suggest section will update)
  document.getElementById('bd-draft-section')?.remove();
  _loadBDSection('overview');
  showToast('Contact logged. Good follow-through.','success');
}

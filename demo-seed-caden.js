/**
 * DEMO SEED — Caden Johnson (Girls Flag Football, Class of 2027)
 *
 * Paste the contents of this file into the browser console on the athlete portal,
 * or load it via: <script src="demo-seed-caden.js"></script> before other scripts.
 *
 * Seeds:
 *   localStorage.juke_player       — full athlete profile
 *   localStorage.juke_endorsements — 1 completed coach endorsement
 *   localStorage.juke_status       — 3 schools at different board stages
 *
 * Fields with no juke_player schema slot are marked [DEMO-ONLY] and stored
 * under a `_demo` sub-object for AI / Momentum Engine context without breaking
 * existing UI code.
 */

(function seedCadenJohnson() {

  // ── ATHLETE PROFILE ──────────────────────────────────────────────────────────
  // Keys match saveProfile() short-key format exactly.
  const player = {

    // Identity
    fname:      'Caden',
    lname:      'Johnson',
    gradyr:     '2027',
    city:       'Temecula, CA',
    school:     'Linfield Christian',

    // Academics
    gpa:        '3.72',
    sat:        '',
    act:        '',
    major:      'Kinesiology',
    honors:     'Academic Honors — Kinesiology, Sports Management, Business interests',

    // Contact (demo values — not real PII)
    email:      'caden.johnson2027@example.com',
    phone:      '951-555-0142',
    parent:     'Michelle Johnson',
    clubCoach:  'VALOR Girls Flag Football',   // club team name; coach name unknown

    // Positions (WR primary, DB secondary)
    positions:  ['WR', 'DB'],

    // Athletic measurements
    height:     '5\'8"',
    weight:     '135',
    forty:      '4.92',
    vertical:   '24"',
    broad:      '',
    shuttle:    '',

    // Offensive stats (receiver)
    gp:         '',   // games played — not provided
    comp:       '',   // QB completions — N/A
    att:        '',   // QB attempts — N/A
    ptd:        '',   // passing TDs — N/A
    pyds:       '',   // passing yards — N/A
    int:        '',   // interceptions thrown (QB) — N/A
    rec:        '62',
    ryds:       '',   // receiving yards — not provided
    rtd:        '11',
    ruyds:      '',   // rushing yards — not provided
    rutd:       '',   // rushing TDs — not provided

    // Defensive stats
    flags:      '',   // flags pulled — not provided
    defint:     '5',  // interceptions caught
    sacks:      '',
    dtd:        '',

    // Film & recruiting links
    highlight:  'https://example.com/caden-johnson-highlights',
    gamefilm:   '',
    profileurl: '',

    // Awards (drives awardLine in outreach drafts)
    awards: [
      '2025 All-League First Team',
      'Team Captain — Linfield Christian Girls Flag Football',
      'Varsity Starter (Sophomore year)',
    ],

    // Athlete statement — populates "In Her Own Words" on profile card
    intro: 'I\'m looking for a program where I can compete, grow as a leader, and keep playing the game I love. I bring speed, versatility, and a team-first mindset, and I\'m excited to find a college that feels like home.',

    // Three-word identity chips
    word1: 'Competitive',
    word2: 'Versatile',
    word3: 'Leader',

    // Multi-sport
    sport1:    'Girls Flag Football',
    sport1pos: 'WR / DB',
    sport2:    '',
    sport2pos: '',

    // Division targets (leave open — Caden is evaluating broadly)
    divisions: [],

    // ── [DEMO-ONLY] ── Fields with no current schema slot ────────────────────
    // Stored here for Momentum Engine / AI context; ignored by all existing UI.
    _demo: {
      dominantHand:       'Right',
      tenYardFly:         '1.12',     // seconds
      faithSchoolOpen:    true,        // open to faith-based programs
      travelRadius:       'West Coast preferred, open to national fit',
      clubName:           'VALOR Girls Flag Football',
      varsityYears:       1,           // stated as varsity starter
      captainYears:       1,
    },
  };

  localStorage.setItem('juke_player', JSON.stringify(player));


  // ── COACH ENDORSEMENT ────────────────────────────────────────────────────────
  const endorsements = [
    {
      id:               'end_caden_demo1',
      athleteProfileId: 'demo_caden',
      athleteName:      'Caden Johnson',
      coachName:        'Coach Rivera',
      coachSchool:      'Linfield Christian',
      coachTitle:       'Head Flag Football Coach',
      coachNote:        '',
      status:           'endorsed',
      endorsementText:  'Caden is one of the most competitive and coachable athletes in our program. She consistently impacts games on both sides of the ball and elevates the players around her through her leadership and work ethic.',
      submittedAt:      'May 2026',
      requestedAt:      'Apr 2026',
    },
  ];

  localStorage.setItem('juke_endorsements', JSON.stringify(endorsements));


  // ── BOARD STATUS ─────────────────────────────────────────────────────────────
  // statusData[schoolName] = stage string (pipeline.js STAGE_RANK keys)
  // Seeding 3 schools to exercise different outreach draft paths.
  const status = {
    'Azusa Pacific University':         'contacting',  // faith-based, West Coast — good fit
    'Point Loma Nazarene University':   'saved',       // on radar, not yet contacted
    'University of Oregon':             'saved',       // dream school, large program
  };

  localStorage.setItem('juke_status', JSON.stringify(status));


  console.log(
    '%c[JUKE DEMO] Caden Johnson profile seeded.',
    'color:#FF0080;font-weight:bold',
    '\n  juke_player:', JSON.parse(localStorage.getItem('juke_player')),
    '\n  juke_endorsements:', JSON.parse(localStorage.getItem('juke_endorsements')),
    '\n  juke_status:', JSON.parse(localStorage.getItem('juke_status'))
  );

  // Trigger UI refresh if the athlete portal is already loaded
  if (typeof loadPlayerProfile === 'function') loadPlayerProfile();
  if (typeof renderProfileView === 'function')  renderProfileView();
  if (typeof renderPipeline    === 'function')  renderPipeline();

})();

// js/features/fit-score.js
// Fit Score V1 — scores a school against athlete preferences
// using publicly available, reliable data only.
//
// Categories: Program (15%), Financial (25%), Location (20%),
//             Campus (15%), Academic (25%)
//
// Does NOT include recruiting odds, coach interest, roster need,
// scholarship likelihood, or depth chart opportunity.
//
// Outputs: overall 0–100, label, category scores,
//          top 3 reasons, missing-data warnings.

(function (global) {

  // ── WEIGHTS ──────────────────────────────────────────────
  const WEIGHTS = {
    academic:  0.25,
    financial: 0.25,
    location:  0.20,
    campus:    0.15,
    program:   0.15,
  };

  // ── SCORE LABELS ─────────────────────────────────────────
  function fitLabel(score) {
    if (score === null) return null;
    if (score >= 75) return 'Strong Fit';
    if (score >= 55) return 'Good Fit';
    if (score >= 35) return 'Possible Fit';
    return 'Weak Fit';
  }

  // ── READ PREFS FROM DOM ──────────────────────────────────
  function getFitPrefs() {
    function val(id) {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    }
    return {
      div:    val('pf-div'),
      gov:    val('pf-gov'),
      vc:     val('pf-vc'),
      region: val('pf-region'),
      state:  val('pf-state'),
      type:   val('pf-type'),
      maxNet: parseInt(val('pf-net')) || 0,
      rel:    val('pf-rel'),
      hbcu:   val('pf-hbcu'),
    };
  }

  // ── HELPERS ──────────────────────────────────────────────
  function hasAnyPref(prefs) {
    return !!(prefs.div || prefs.gov || prefs.vc || prefs.region ||
              prefs.state || prefs.type || prefs.maxNet || prefs.rel || prefs.hbcu);
  }

  function parseDollar(str) {
    return parseInt((str || '').replace(/[$,]/g, '')) || 0;
  }

  // Returns true/false if match determinable, null if school has no data.
  function relMatch(prefRel, schoolRel) {
    const ra = (schoolRel || '').toLowerCase().trim();
    // Secular: match schools with no religious affiliation listed
    if (prefRel === 'secular') {
      if (!ra || ra === 'none' || ra === 'n/a') return true;
      return ra.includes('secular');
    }
    if (!ra) return null; // school data missing for non-secular preference
    if (prefRel === 'catholic')   return ra.includes('catholic');
    if (prefRel === 'protestant') return ra.includes('christian') || ra.includes('protestant');
    if (prefRel === 'baptist')    return ra.includes('baptist');
    if (prefRel === 'methodist')  return ra.includes('methodist');
    if (prefRel === 'lutheran')   return ra.includes('lutheran');
    if (prefRel === 'adventist')  return ra.includes('adventist');
    return false;
  }

  // ── CATEGORY SCORERS ─────────────────────────────────────
  // Each returns { score: 0–100 | null, reasons: [], warnings: [] }
  // score=null means no active criteria for this category.

  function scoreProgram(school, prefs) {
    const reasons = [], warnings = [];
    let pts = 0, max = 0;

    // Governing body (NCAA / NAIA / NJCAA)
    if (prefs.gov) {
      max += 40;
      if (school['Governing Body'] === prefs.gov) {
        pts += 40;
        reasons.push(prefs.gov + ' program');
      }
    }
    // Division
    if (prefs.div) {
      max += 40;
      if (school['Division'] === prefs.div) {
        pts += 40;
        reasons.push(prefs.div.replace('Division ', 'D') + ' program');
      }
    }
    // Varsity or Club
    if (prefs.vc) {
      max += 20;
      const schoolVc = school['Varsity or Club'];
      if (!schoolVc) {
        warnings.push('Varsity/Club status unknown');
      } else if (schoolVc === prefs.vc) {
        pts += 20;
        reasons.push(prefs.vc + ' program');
      }
    }

    if (max === 0) return { score: null, reasons, warnings };
    return { score: Math.round((pts / max) * 100), reasons, warnings };
  }

  function scoreFinancial(school, prefs) {
    const reasons = [], warnings = [];
    let pts = 0, max = 0;

    const cost = parseDollar(school['Est. Cost of Attendance (2023-24)']);
    const aid  = parseDollar(school['Avg Financial Aid Award']);
    const sch  = (school['Scholarship Available (Y/N/Partial)'] || '').toLowerCase();

    // Net price vs athlete maximum
    if (prefs.maxNet > 0) {
      max += 100;
      if (!cost) {
        warnings.push('Cost of attendance not available — cannot compare to your maximum');
      } else {
        const net = (aid > 0) ? cost - aid : cost;
        if (!aid) warnings.push('Financial aid data unavailable — using sticker price');
        if (net <= prefs.maxNet) {
          pts += 100;
          reasons.push('Within your target net price');
        } else if (net <= prefs.maxNet * 1.15) {
          pts += 55;
          reasons.push('Slightly above your target net price');
        } else {
          reasons.push('Net price likely exceeds your maximum');
        }
      }
    } else {
      if (!cost) warnings.push('Cost of attendance not available');
    }

    // Scholarship signal — informational if no net price pref
    if (sch && sch !== '—') {
      if (sch.includes('yes') || sch.includes('partial')) {
        reasons.push('Athletic aid available');
      } else if (sch.includes('no')) {
        if (prefs.maxNet > 0) warnings.push('No athletic scholarships — net price may be higher');
      } else if (sch.includes('emerging')) {
        warnings.push('Scholarship program emerging — aid not yet guaranteed');
      }
    } else {
      warnings.push('Scholarship availability unknown');
    }

    if (max === 0) return { score: null, reasons, warnings };
    return { score: Math.round((pts / max) * 100), reasons, warnings };
  }

  function scoreLocation(school, prefs) {
    const reasons = [], warnings = [];
    let pts = 0, max = 0;

    if (prefs.state) {
      max += 60;
      if (!school['State']) {
        warnings.push('State not listed');
      } else if (school['State'] === prefs.state) {
        pts += 60;
        reasons.push('In-state (' + prefs.state + ')');
      }
    }
    if (prefs.region) {
      max += 40;
      if (!school['Region']) {
        warnings.push('Region not listed');
      } else if (school['Region'] === prefs.region) {
        pts += 40;
        reasons.push(prefs.region + ' region');
      }
    }

    if (max === 0) return { score: null, reasons, warnings };
    return { score: Math.round((pts / max) * 100), reasons, warnings };
  }

  function scoreCampus(school, prefs) {
    const reasons = [], warnings = [];
    let pts = 0, max = 0;

    if (prefs.type) {
      max += 40;
      const schoolType = school['School Type'] || '';
      if (!schoolType) {
        warnings.push('School type not listed');
      } else if (schoolType === prefs.type) {
        pts += 40;
        reasons.push(prefs.type + ' school');
      }
    }
    if (prefs.rel) {
      max += 40;
      const match = relMatch(prefs.rel, school['Religious Affiliation']);
      if (match === null) {
        warnings.push('Religious affiliation not listed');
      } else if (match) {
        pts += 40;
        const label = prefs.rel.charAt(0).toUpperCase() + prefs.rel.slice(1);
        reasons.push(label + ' affiliation');
      }
    }
    if (prefs.hbcu === 'yes') {
      max += 20;
      if (school['HBCU'] === 'Yes') {
        pts += 20;
        reasons.push('HBCU');
      }
    }

    if (max === 0) return { score: null, reasons, warnings };
    return { score: Math.round((pts / max) * 100), reasons, warnings };
  }

  function scoreAcademic(/* school, prefs */) {
    // Requires school_enrichment table (College Scorecard data — not yet populated).
    // Excluded from score until data is available.
    return {
      score: null,
      reasons: [],
      warnings: ['Academic data not yet available'],
    };
  }

  // ── MAIN FUNCTION ────────────────────────────────────────
  //
  // scoreFit(school, prefs) → {
  //   overall: 0–100 | null,
  //   label:   'Strong Fit' | 'Good Fit' | 'Possible Fit' | 'Weak Fit' | null,
  //   categories: {
  //     program, financial, location, campus, academic: {
  //       score, weight, label, reasons, warnings
  //     }
  //   },
  //   topReasons: string[],   // up to 3 positive signals
  //   warnings:   string[],   // all missing-data warnings
  // }

  function scoreFit(school, prefs) {
    if (!hasAnyPref(prefs)) {
      return { overall: null, label: null, categories: null, topReasons: [], warnings: [] };
    }

    const raw = {
      program:  scoreProgram(school, prefs),
      financial: scoreFinancial(school, prefs),
      location: scoreLocation(school, prefs),
      campus:   scoreCampus(school, prefs),
      academic: scoreAcademic(school, prefs),
    };

    // Weighted average — only categories with a non-null score contribute.
    // Academic is always null in V1, so its 25% weight redistributes to active categories.
    let weightedSum = 0, totalWeight = 0;
    const allWarnings = [];
    const positiveReasons = [];

    const categories = {};
    for (const [key, cat] of Object.entries(raw)) {
      const w = WEIGHTS[key];
      const catLabel = key.charAt(0).toUpperCase() + key.slice(1) + ' Fit';
      categories[key] = { ...cat, weight: w, label: catLabel };

      if (cat.score !== null) {
        weightedSum += cat.score * w;
        totalWeight += w;
        // Collect positive reasons from strong category scores
        if (cat.score >= 60) positiveReasons.push(...cat.reasons);
      }
      allWarnings.push(...cat.warnings);
    }

    const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;

    return {
      overall,
      label: fitLabel(overall),
      categories,
      topReasons: positiveReasons.slice(0, 3),
      warnings: allWarnings,
    };
  }

  // ── EXPORTS ──────────────────────────────────────────────
  global.scoreFit    = scoreFit;
  global.getFitPrefs = getFitPrefs;
  global.fitLabel    = fitLabel;

})(window);

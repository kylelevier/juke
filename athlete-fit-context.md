# Athlete Fit Rating — Context Brief

Use this to start a new focused session on the Athlete Fit rating system.

---

## What It Is

The **Athlete Fit Profile** is a preference panel in the Program Finder tab. Athletes set their preferences once; every school in the database gets scored against those preferences and displays a percentage badge.

The goal: surface the schools most likely to be a real match, so the athlete isn't sifting through 357 programs manually.

---

## Current Implementation (juke.html ~lines 3573–3615)

### Input fields (athlete's preferences)
| Field ID | Label | Weight |
|----------|-------|--------|
| `pf-div` | Division (D1/D2/D3/NAIA/NJCAA) | 25 pts |
| `pf-net` | Max net price (after financial aid) | 20 pts |
| `pf-gov` | Governing Body (NCAA/NAIA/NJCAA) | 20 pts |
| `pf-vc` | Varsity or Club | 15 pts |
| `pf-region` | Region | 15 pts |
| `pf-state` | State | 10 pts |
| `pf-type` | School Type (public/private/etc.) | 10 pts |
| `pf-rel` | Religious Affiliation | 10 pts |
| `pf-hbcu` | HBCU preference | 10 pts |

### Scoring logic (`recalcFit`)
- Only set criteria contribute to `max` (so unused fields don't penalize schools)
- `pts / max * 100` → integer percentage stored in `fitScores[school|state]`
- If no criteria set, all schools return `-1` (no badge shown)

### Badge display (`fitBadge`)
| Score | Class | Label |
|-------|-------|-------|
| ≥ 70% | `fit-high` (green) | "Strong Match" |
| 40–69% | `fit-mid` (blue) | "Good Match" |
| < 40% | `fit-low` (gray) | "Low Match" |

Badges appear on: program cards, table rows, compare panel, and workspace school header.

### Stat counter
`#stat-fit` shows count of schools with ≥70% score. Updates live as preferences change.

---

## What's Missing / Open Questions

The current scoring only uses **school-level data** from the programs database. It does not factor in anything about the **athlete** — position, GPA, highlight film quality, measurables, etc.

Some things that could be explored in a new session:

1. **Athlete athletic profile inputs** — if we know her position (WR, DB, QB, center) and we know what programs run (spread vs. run-heavy), can we score fit on offensive scheme?
2. **Academic fit** — athlete's GPA range vs. school's avg admitted GPA (would need College Scorecard data from `school_enrichment` table once populated)
3. **Scholarship availability** — current scoring doesn't weight whether the school actually offers scholarships. Should it?
4. **Weight redistribution** — are these point values right? Division is currently the heaviest (25pts). Is that what athletes actually care most about?
5. **Fit score persistence** — preferences stored in `localStorage.juke_profile`. Works offline, but doesn't sync across devices.
6. **Fit score in workspace** — when an athlete opens a school's workspace drawer, her fit score for that school shows in the Juke header bar. Is there more we should surface there?

---

## Relevant Code Locations

- `recalcFit()` — lines ~3578–3610
- `fitBadge(s)` — lines ~3687–3690
- `getFit(r)` — line ~3615
- Athlete Fit Profile HTML form — search `id="profile-form"` in juke.html
- `fitScores` object — declared near top of finder JS block

---

## Database
- Programs table: `RAW` array, ~357 schools
- Financial data fields: `Est. Cost of Attendance (2023-24)`, `Avg Financial Aid Award`
- `Scholarship Available (Y/N/Partial)` field exists but not currently weighted in fit score
- `school_enrichment` table (Supabase) — College Scorecard data, not yet populated (pending fetch-scorecard.mjs run)

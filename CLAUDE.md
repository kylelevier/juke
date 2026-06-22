# JUKE Codebase — Architecture & Ownership

## File Ownership Rules

| Path | Owns |
|------|------|
| `pages/` | Layout and containers only. No inline `<script>` blocks with logic. HTML structure + script/link imports. |
| `styles/` | Styling only. No logic. Feature-prefixed classes preferred. |
| `js/config.js` | Supabase client, keys, `currentUser`, auth state listener. References `SCHOOL_DOMAINS` (now defined in `data-school-domains.js`). |
| `js/data-school-domains.js` | `window.SCHOOL_DOMAINS` — school name → logo domain map. Pure data, no logic. Loaded by all three portals (coach portals can't load `config.js`). |
| `js/school-logo.js` | Shared logo resolver for all portals: `schoolLogoUrl`/`paintSchoolLogo`/`loadSchoolLogoOverrides`. Resolution order = curated override (`school-logos` bucket → `programs.logo_url`, cached in `window.SCHOOL_LOGO_OVERRIDES`) → favicon by domain → placeholder. Loaded right after `data-school-domains.js`. |
| `js/auth.js` | Login, logout, sign-up, session persistence, auth modal open/close, `cloudSave`/`_syncFromCloud` (profile, pipeline, notes, fit, readiness). |
| `js/data.js` | Supabase data access layer. All `sb.from(...)` calls should live here eventually. |
| `js/ui.js` | Shared UI primitives reused across portals: `PIPELINE_STAGES` (athlete), `fetchSchoolLogo`, `_paintLogo`, `divTag`, `vcTag`, `fitBadge`, `showToast`, `_initials`. |
| `js/router.js` | Client-side routing for `/athlete`, `/coach`, `/hscoach`. |
| `js/components/` | Reusable UI components used in 2+ features. Empty — candidates identified below. |
| `js/features/` | Product-area logic. One file per feature area, one clear responsibility. |

---

## Portal Architecture

Three separate portals — each is a standalone page with its own script set:

### Athlete Portal (`pages/athlete.html`)
Loads: `data-school-domains.js` → `config.js` → data files → `auth.js` → `ui.js` → `pipeline.js` → `finder.js` → `program-finder.js` → `features/activity-feed.js` → `features/athlete-chip.js` → `features/workspace.js` → `features/board-detail.js` → `features/board-detail-draft.js` → `features/profile-view.js` → `features/profile-edit.js` → `features/outreach.js` → `features/readiness.js` → `features/calendar.js` → `coach-portal.js` → `messaging.js` → `features/messaging-modal.js`

Auth: Supabase (`sb`, `currentUser` from `config.js`)
Tabs: Feed, Programs, My Profile, My Board, Readiness, Calendar, Messages.

### Recruiter Portal (`pages/coach.html`)
Loads: `data-school-domains.js` → `features/coach-portal-init.js` → `features/coach-nav.js` → `features/coach-roster.js` → `features/coach-feed.js` → `features/coach-profile.js` → `messaging.js`

Auth: `localStorage.juke_auth` (separate from Supabase) via `coach-portal-init.js`. Unauthenticated visitors are redirected to `/login.html`.
⚠️ Does NOT load `config.js` or `ui.js`. Defines its own `sb`/`SUPABASE_*`/`currentUser` in `coach-nav.js`. `SCHOOL_DOMAINS` IS available via `data-school-domains.js`.

### Coach Portal (`pages/hscoach.html`)
Loads: `data-school-domains.js` → `features/hscoach-portal-init.js` → `features/hscoach-roster.js` → `features/hscoach-outreach.js` → `features/hscoach-nav.js` → `messaging.js`

Auth: `localStorage.juke_auth` (same as recruiter). Unauthenticated visitors are redirected to `/login.html`.
⚠️ Does NOT load `config.js` or `ui.js`. Defines its own `sb`/`SUPABASE_*` in `hscoach-nav.js`. `SCHOOL_DOMAINS` IS available via `data-school-domains.js`.

---

## Feature File Directory

| File | Lines | Owns |
|------|-------|------|
| `js/pipeline.js` | 576 | Athlete board: tab switching (incl. readiness/calendar hooks), `STAGE_MIGRATION_MAP`/`_migrateStages`, committed banner, offer strip, milestone timeline, drag-drop, renderPipeline, buildPipelineCard |
| `js/features/readiness.js` | 132 | Readiness tab: NCAA eligibility checklist, core-course/GPA/test tracking, readiness score. Store: `juke_readiness` (cloud-synced via `player_data.readiness`). |
| `js/features/calendar.js` | 106 | Calendar tab: recruiting-calendar windows (`RECRUITING_CALENDAR`) + personal program deadlines. NOTE: windows are interim placeholders pending the official NCAA football calendar. |
| `js/finder.js` | 397 | Program finder: profile state, fit filters, compare bar, render results, admin toggle |
| `js/program-finder.js` | 301 | Program slide-over panel, map (Leaflet), contact outreach |
| `js/coach-portal.js` | 293 | Athlete-side coach unlock gate; also owns `handlePublishToggle` (⚠️ candidate to move to `features/athlete-publish.js`) |
| `js/features/activity-feed.js` | 232 | Feed filter map, feed item HTML, feed render, feed stats, publish nudge |
| `js/features/athlete-chip.js` | 76 | Header user chip IIFE, `switchProfile`, `jukeLogout` — athlete portal only |
| `js/features/workspace.js` | 479 | School workspace drawer, stage colors, cloud save |
| `js/features/board-detail.js` | 582 | Per-school recruiting detail panel: overview, coaches, comms, notes, visits, application, offer, deadlines |
| `js/features/board-detail-draft.js` | 213 | Outreach draft templates inside board detail |
| `js/features/profile-edit.js` | 360 | Wizard steps, endorsements, bio builder, save/load profile, photo uploads |
| `js/features/profile-view.js` | 453 | Read-only profile card, completeness score, athlete header, publish banner |
| `js/features/outreach.js` | 146 | Email templates, highlight rail, profile copy |
| `js/features/coach-roster.js` | 337 | Coach athlete data, `COACH_PIPELINE_STAGES`, storage, tabs, search/filter, boards, analytics |
| `js/features/coach-profile.js` | 415 | Athlete slide-over, coach card/form, photo uploads, school logo (uses shared `SCHOOL_DOMAINS`) |
| `js/features/coach-feed.js` | 227 | Coach feed items, juke user chip, logout |
| `js/features/coach-nav.js` | 120 | Coach header nav |
| `js/features/hscoach-roster.js` | 410 | HS roster data, stage labels, `switchHsTab`, cards, roster render |
| `js/features/hscoach-outreach.js` | 281 | Outreach activity, slide-over, endorse modal, athlete management |
| `js/features/hscoach-nav.js` | 177 | Coach nav + user chip |

---

## Global Name Registry

These names are in the global scope on the athlete portal. Do not reuse them:

- `PIPELINE_STAGES` — athlete board stages (ui.js). **Coach portal uses `COACH_PIPELINE_STAGES` instead.**
- `SCHOOL_DOMAINS` — school name → domain map (`data-school-domains.js`, window-scoped; all portals)
- `switchTab(t)` — athlete tab switcher (pipeline.js). **Coach portal uses `switchHsTab(id)` instead.**
- `fetchSchoolLogo(name, wrap)` — Google-favicon logo loader with fallback (ui.js)
- `sb` — Supabase client (config.js)
- `currentUser` — Supabase auth user (config.js)
- `statusData` — athlete recruiting status by school (pipeline.js / data.js)
- `RAW` — program finder dataset (finder.js)

---

## Recruiting Stage Definitions

### Athlete board (`PIPELINE_STAGES` in ui.js)
Current (5 stages, migrated):
`saved` → `contacting` → `applied` → `offered` → `committed` (+ `archived`)

✅ **Migration shipped** — `STAGE_MIGRATION_MAP` + `_migrateStages()` in `pipeline.js` collapse all legacy keys (`dream_schools`, `interested`, `contact_made`, `active_conversation`, `visit_planned`, `offer_received`, `top_choices`, `closed`) into the 5-stage model and run on every board render. New schools default to `saved`.
⚠️ The Supabase `player_programs.stage` CHECK constraint still lists the OLD 10 keys (see Technical Debt #3) — DB writes of `contacting`/`offered`/`archived` will be rejected until that constraint is updated.

### Coach pipeline (`COACH_PIPELINE_STAGES` in coach-roster.js)
Current (5 stages): `identified` → `contacted` → `visit` → `offer` → `committed`

---

## Terminology Standards (Target — not yet enforced)

| Concept | Use | Avoid |
|---------|-----|-------|
| Navigation tab | Find, Boards, Profile, Messages, Feed, Readiness, Calendar | Finder, Pipeline, My Board |
| Data store | Board | Pipeline (for athlete view) |
| School entry | Program | School (when referring to athletic program) |
| Message thread | Conversation | Thread (in user-facing copy) |
| Stage card | BoardCard | Card, pipeline-card |
| Coach endorsement | Recommendation | Endorsement (in data model) |

---

## Known Technical Debt

### 🔴 High Priority
1. **Auth modal bug** (FIXED) — stray `<script>` tag in athlete.html was swallowing the auth modal HTML from the DOM. Users could not sign in/up. Fixed by removing the stray tag.
2. **Offer strip stage mismatch** — `pipeline.js` hardcodes a stage set in the offer strip instead of iterating `PIPELINE_STAGES`. Should iterate `PIPELINE_STAGES`.
3. **DB stage CHECK constraint** (RESOLVED) — migration `update_player_programs_stage_check_to_5stage` replaced the old 10-key `player_programs_stage_check` with the 5-stage + `archived` set (`saved`/`contacting`/`applied`/`offered`/`committed`/`archived`), matching what the app writes. Default remains `saved`.

### 🟡 Medium Priority
4. **Coach portals don't load `config.js`/`ui.js`** (PARTIALLY RESOLVED) — they still lack `fetchSchoolLogo`/`showToast` etc. and define their own `sb`. `SCHOOL_DOMAINS` is now shared via `data-school-domains.js`, and `coach-profile.js` uses it for logos. Full `ui.js` sharing still blocked by the `const sb`/`var sb` collision and the athlete-only auth listener in `config.js`.
5. **Logo domain lookup** (RESOLVED) — coach-profile.js now resolves logos through the shared `SCHOOL_DOMAINS`. `hscoach-roster.js` carries domains in its demo data; route any real (non-demo) schools through `SCHOOL_DOMAINS` too.
6. **`workspace.js`** — now ~474 lines (✅ under 500 after dropping the legacy stage-color compat block). Stage color map + cloud-save helpers are still split candidates if it grows.

### 🟢 Low Priority
7. **CSS class collisions** — `.section-title` defined with different styles in `finder.css` and `coach-portal.css`. Safe because they load on separate pages, but will break if ever combined.
8. **`.card-hd`, `.card-school`, `.card-meta`** in `finder.css` should be `.finder-card-hd` etc. per naming spec.
9. **`messaging.js` at 859 lines** — single-responsibility IIFE. Architecturally justified, but the new-message modal (~127 lines, L605–731) could be extracted to `features/messaging-modal.js`.

---

## File Size Rules

| Threshold | Action |
|-----------|--------|
| < 500 lines | ✅ Ideal |
| 500–699 lines | 🟡 Monitor |
| 700–999 lines | ⚠️ Warning — propose split before adding |
| 1000+ lines | 🔴 Refactor required immediately |

Before creating a new file: state its single responsibility and confirm it would be reused or is large enough to justify standalone existence.

---

## CSS Naming Convention (Target)

Feature-prefixed classes. Examples:

```
.board-card        .board-column      .board-col-hd
.finder-result     .finder-filter     .finder-card
.profile-header    .profile-video     .profile-avatar
.message-thread    .message-bubble    .message-compose
```

Avoid unprefixed: `.card`, `.section`, `.box`, `.container`, `.wrapper` — unless truly global.

**Rename work pending** — scope is ~120 class names across 8 CSS files and 3 HTML pages. Do not begin without a full audit and find-replace plan.

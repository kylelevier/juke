# JUKE Codebase — Architecture & Ownership

## File Ownership Rules

| Path | Owns |
|------|------|
| `pages/` | Layout and containers only. No inline `<script>` blocks with logic. HTML structure + script/link imports. |
| `styles/` | Styling only. No logic. Feature-prefixed classes preferred. |
| `js/config.js` | Constants, Supabase client, `SCHOOL_DOMAINS`, `currentUser`, auth state listener. |
| `js/auth.js` | Login, logout, sign-up, session persistence, auth modal open/close. |
| `js/data.js` | Supabase data access layer. All `sb.from(...)` calls should live here eventually. |
| `js/ui.js` | Shared UI primitives reused across portals: `PIPELINE_STAGES` (athlete), `fetchSchoolLogo`, `_paintLogo`, `divTag`, `vcTag`, `fitBadge`, `showToast`, `_initials`. |
| `js/router.js` | Client-side routing for `/athlete`, `/coach`, `/hscoach`. |
| `js/components/` | Reusable UI components used in 2+ features. Empty — candidates identified below. |
| `js/features/` | Product-area logic. One file per feature area, one clear responsibility. |

---

## Portal Architecture

Three separate portals — each is a standalone page with its own script set:

### Athlete Portal (`pages/athlete.html`)
Loads: `config.js` → `auth.js` → `data.js` → `ui.js` → `pipeline.js` → `finder.js` → `program-finder.js` → `features/activity-feed.js` → `features/workspace.js` → `features/profile-edit.js` → `features/profile-view.js` → `features/outreach.js` → `coach-portal.js` → `messaging.js`

Auth: Supabase (`sb`, `currentUser` from `config.js`)

### College Coach Portal (`pages/coach.html`)
Loads: `features/coach-portal-init.js` → `features/coach-roster.js` → `features/coach-profile.js` → `features/coach-feed.js` → `features/coach-nav.js` → `messaging.js` → `features/coach-init2.js`

Auth: `localStorage.juke_auth` (separate from Supabase) via `coach-portal-init.js`
⚠️ Does NOT load `config.js` or `ui.js` — shared utilities unavailable here.

### HS Coach Portal (`pages/hscoach.html`)
Loads: `features/hscoach-portal-init.js` → `features/hscoach-roster.js` → `features/hscoach-outreach.js` → `features/hscoach-nav.js` → `messaging.js` → `features/hscoach-init2.js`

Auth: `localStorage.juke_auth` (same as college coach)
⚠️ Does NOT load `config.js` or `ui.js` — shared utilities unavailable here.

---

## Feature File Directory

| File | Lines | Owns |
|------|-------|------|
| `js/pipeline.js` | 317 | Athlete board: tab switching, committed banner, offer strip, milestone timeline, drag-drop handlers, renderPipeline, buildPipelineCard |
| `js/finder.js` | 397 | Program finder: profile state, fit filters, compare bar, render results, admin toggle |
| `js/program-finder.js` | 301 | Program slide-over panel, map (Leaflet), contact outreach |
| `js/coach-portal.js` | 293 | Athlete-side coach unlock gate |
| `js/features/activity-feed.js` | 211 | Feed filter map, feed item HTML, feed render |
| `js/features/workspace.js` | 548 | School workspace drawer, user chip, stage colors, cloud save |
| `js/features/profile-edit.js` | 360 | Wizard steps, endorsements, bio builder, save/load profile, photo uploads |
| `js/features/profile-view.js` | 459 | Read-only profile card, completeness score, athlete header |
| `js/features/outreach.js` | 146 | Email templates, highlight rail, profile copy |
| `js/features/coach-roster.js` | 337 | Coach athlete data, `COACH_PIPELINE_STAGES`, storage, tabs, search/filter, boards, analytics |
| `js/features/coach-profile.js` | 278 | Athlete slide-over, coach card/form, photo uploads, school logo |
| `js/features/coach-feed.js` | 227 | Coach feed items, juke user chip, logout |
| `js/features/coach-nav.js` | 120 | Coach header nav |
| `js/features/hscoach-roster.js` | 410 | HS roster data, stage labels, `switchHsTab`, cards, roster render |
| `js/features/hscoach-outreach.js` | 281 | Outreach activity, slide-over, endorse modal, athlete management |
| `js/features/hscoach-nav.js` | 177 | HS coach nav + user chip |

---

## Global Name Registry

These names are in the global scope on the athlete portal. Do not reuse them:

- `PIPELINE_STAGES` — athlete board stages (ui.js). **Coach portal uses `COACH_PIPELINE_STAGES` instead.**
- `SCHOOL_DOMAINS` — school name → domain map (config.js)
- `switchTab(t)` — athlete tab switcher (pipeline.js). **HS coach uses `switchHsTab(id)` instead.**
- `fetchSchoolLogo(name, wrap)` — Clearbit logo loader with fallback (ui.js)
- `sb` — Supabase client (config.js)
- `currentUser` — Supabase auth user (config.js)
- `statusData` — athlete recruiting status by school (pipeline.js / data.js)
- `RAW` — program finder dataset (finder.js)

---

## Recruiting Stage Definitions

### Athlete board (`PIPELINE_STAGES` in ui.js)
Current (10 stages):
`dream_schools` → `interested` → `contact_made` → `active_conversation` → `visit_planned` → `applied` → `offer_received` → `top_choices` → `committed` → `closed`

Target (per architecture spec, not yet migrated):
`saved` → `contacted` → `applied` → `offered` → `committed`

⚠️ **Migration required** — changing stage keys affects `localStorage.juke_status` data. Need a migration function before deploying.

### Coach pipeline (`COACH_PIPELINE_STAGES` in coach-roster.js)
Current (5 stages): `identified` → `contacted` → `visit` → `offer` → `committed`

---

## Terminology Standards (Target — not yet enforced)

| Concept | Use | Avoid |
|---------|-----|-------|
| Navigation tab | Find, Boards, Profile, Messages, Feed | Finder, Pipeline, My Board |
| Data store | Board | Pipeline (for athlete view) |
| School entry | Program | School (when referring to athletic program) |
| Message thread | Conversation | Thread (in user-facing copy) |
| Stage card | BoardCard | Card, pipeline-card |
| Coach endorsement | Recommendation | Endorsement (in data model) |

---

## Known Technical Debt

### 🔴 High Priority
1. **Auth modal bug** (FIXED) — stray `<script>` tag in athlete.html was swallowing the auth modal HTML from the DOM. Users could not sign in/up. Fixed by removing the stray tag.
2. **Offer strip stage mismatch** — `pipeline.js` L49 hardcodes `{applied:[], contacted:[], interested:[]}` ignoring `PIPELINE_STAGES`. Should iterate `PIPELINE_STAGES` instead.
3. **Stage rename pending** — `interested` stage used in 12 files; new spec removes it in favor of `saved`. Blocked on migration strategy.

### 🟡 Medium Priority
4. **Coach portals missing shared utilities** — `coach.html` and `hscoach.html` do not load `config.js` or `ui.js`. Coach features build their own school-logo URLs instead of using `fetchSchoolLogo`. Adding these imports requires verifying no conflicts with localStorage-based auth.
5. **SCHOOL_DOMAINS unavailable in coach portals** — coach-profile.js and hscoach-roster.js construct Clearbit URLs manually without domain lookup table. Will produce 404s for schools with non-standard `.edu` domains.
6. **`workspace.js` at 548 lines** — in warning zone. Natural split: stage color map + user chip (top ~80 lines) could move to `ui.js`; cloud save helpers to `data.js`.

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

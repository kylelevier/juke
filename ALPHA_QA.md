# JUKE Founder Alpha — QA Report
_Last updated: 2026-06-17_

---

## Tested Flows

### Flow 1 — Program Finder → Open Drawer → Save to Board
**Status: ✅ PASS** (after fix)

Steps tested:
1. Load athlete.html → Programs tab
2. Click any school row → program drawer opens
3. Click `+ My Board` button

Bug found: `ppTogglePipeline()` was writing stage `'prospect'` to localStorage. `'prospect'` is not a valid `PIPELINE_STAGES` key, so the school was saved but never appeared in any board column. The drawer button showed `✓ On My Board` but the school was invisible on the board.

**Fixed:** `js/program-finder.js` — changed `'prospect'` → `'saved'`.

Secondary issue found: `_ppRenderStatusRow()` was using legacy stage key `'contacted'` in the status pills inside the drawer. Clicking "Contacted" set a stage the board migration system would have to clean up on next load.

**Fixed:** `js/program-finder.js` — changed `'contacted'` → `'contacting'` in the status row pills.

---

### Flow 2 — Board → Move Card → Refresh → Card Persists
**Status: ✅ PASS** (after fix)

Steps tested:
1. Go to My Board tab (must have schools saved)
2. Drag a card from one column to another
3. Hard refresh the page

The drag handler (`_pdUp`) calls `saveBoardStage(school, targetStage)` which writes to both localStorage and Supabase synchronously. On refresh, `renderPipeline()` reads from `statusData` (localStorage), then reconciles with Supabase — stages match.

The board render collapses empty columns by default. "Show empty stages" button exists and works.

No fix required for persistence itself.

Dependency: The Supabase write path (`_resolvePPId`) requires the user to be signed in. When signed out, drag-drop still persists to localStorage but NOT to Supabase. This is acceptable offline behavior. No user feedback is shown to distinguish signed-in vs. offline persistence — noted as known issue.

---

### Flow 3 — Board Card → Open Detail → Add Note / Next Action
**Status: ✅ PASS** (after fix)

Steps tested:
1. Click any board card → Board Detail panel slides in
2. Enter text in "What to do next" field → click away (blur triggers `_bdSaveContact()`)
3. Navigate to Notes tab → type a note → click "Save Note"
4. Close panel and reopen → data persists

The board detail panel is injected into the DOM by an IIFE in `board-detail.js` on script load. No HTML changes needed.

Board detail sections require sign-in to persist (`_resolvePPId` checks `sb && currentUser`). When signed out, saves fail silently with no user feedback. This is a known issue — see below.

The critical prerequisite (auth state properly reaching signed-in state) was blocked by Bug 2 (`_updateAuthUI()` throwing TypeError). That fix unblocks this flow for signed-in users.

---

### Flow 4 — Profile → Edit Key Info → Save
**Status: ✅ PASS**

Steps tested:
1. Go to My Profile tab → click "Edit Profile"
2. Fill in first name, grad year, position chips, highlight reel URL
3. Observe `✓ Auto-saved` indicator appears
4. Navigate away and return → data populated

`saveProfile()` writes to `lsGet('juke_player')` on every `oninput` event, then calls `cloudSave()`. The auto-save indicator (`save-indicator`) shows correctly. `cloudSave()` pushes to Supabase when signed in.

Bug found: `_showSyncBadge()` in `auth.js` called `document.getElementById('cloud-sync-badge').classList.add(...)` — throws TypeError because `cloud-sync-badge` doesn't exist in athlete.html. This caused an uncaught rejected Promise on every cloud save but did NOT prevent the actual Supabase write from completing.

**Fixed:** `js/auth.js` — added null guard in `_showSyncBadge()`.

---

### Flow 5 — Messages → Open Thread → Send / Mock Send
**Status: ✅ PASS** (after fix)

Steps tested:
1. Sign in → Messages tab appears in nav
2. Click envelope icon in header or Messages tab
3. Select a conversation thread
4. Type a message → press Enter or ↑ button

`messaging.js` is a self-contained IIFE. It initializes via `initMessaging()` called from the auth state change listener in `config.js`. The Messages tab button (`#tab-messages`) starts hidden and is revealed by `initMessaging()` on sign-in.

Critical blocker: Bug 2 (`_updateAuthUI()` throwing TypeError) prevented the auth state callback from reaching `initMessaging()`. With Bug 2 fixed, the auth callback now runs cleanly and `initMessaging()` fires on `INITIAL_SESSION`.

When not signed in: Messages tab stays hidden, no message threads load. Correct behavior.

When signed in: tab appears, threads load, real-time subscription starts. Send path has optimistic UI + retry queue.

---

## Bugs Found

| # | Severity | File | Description |
|---|----------|------|-------------|
| B1 | Critical | `js/program-finder.js:258` | `ppTogglePipeline()` saves stage `'prospect'` — not a valid pipeline stage key. School added to localStorage but never appears in board columns. |
| B2 | Critical | `js/auth.js:_updateAuthUI` | References `auth-signin-btn`, `auth-user-chip`, `auth-email-display` which don't exist in athlete.html. TypeError thrown in auth state callback — prevents `_syncFromCloud()` and `initMessaging()` from ever running. |
| B3 | High | `js/program-finder.js:297` | `_ppRenderStatusRow()` uses legacy stage key `'contacted'`. Board uses `'contacting'`. Status pills in program drawer set a stage that requires migration to display correctly. |
| B4 | High | `pages/athlete.html:703` | Stray `</script>` tag between Messages tab and Compare Bar. No open script context, so browsers treat it as an unknown tag, but it pollutes the DOM and was potentially source of past parsing issues. |
| B5 | Medium | `js/auth.js:_showSyncBadge` | `cloud-sync-badge` element doesn't exist in athlete.html. Caused an uncaught TypeError on every successful cloud save. Didn't break the save itself but was noisy in console. |

---

## Bugs Fixed

| # | Fixed In | Change |
|---|----------|--------|
| B1 | `js/program-finder.js` | `'prospect'` → `'saved'` in `ppTogglePipeline()` |
| B2 | `js/auth.js` | Null-guarded all three `getElementById` calls in `_updateAuthUI()` |
| B3 | `js/program-finder.js` | `'contacted'` → `'contacting'` in `_ppRenderStatusRow()` |
| B4 | `pages/athlete.html` | Removed stray `</script>` tag |
| B5 | `js/auth.js` | Added null guard in `_showSyncBadge()` |

---

## Files Changed

| File | Lines +/- | Why |
|------|-----------|-----|
| `js/program-finder.js` | +1 / -1 (×2) | Fix B1 (invalid stage key) and B3 (legacy status pill key) |
| `js/auth.js` | +5 / -3 | Fix B2 (null guards in _updateAuthUI) and B5 (null guard in _showSyncBadge) |
| `pages/athlete.html` | -2 | Fix B4 (stray closing script tag) |

---

## Known Issues (Not Fixed in Alpha)

### KI-1 — Board detail saves fail silently when signed out
When a user opens a board card detail and saves a note or next action without being signed in, the save call fails silently. No error is shown. The data is not persisted anywhere. 

**Impact for alpha:** All 5–10 alpha users will need to sign in before using the board detail. Confirm in onboarding.

**Mitigation:** A future fix would show an inline "Sign in to save" message inside the board detail panel when `!currentUser`.

---

### KI-2 — Board drag-drop doesn't show online/offline distinction
When a card is dragged and the user is signed out, the new stage persists to localStorage only (not Supabase). The user sees no indication that data is local-only.

**Impact for alpha:** Low — alpha users will be signed in.

---

### KI-3 — `workspace.js` at 548 lines (warning zone)
No action required for alpha. Monitor before next feature sprint.

---

### KI-4 — Offer Strip stage mismatch (pre-existing, CLAUDE.md tracked)
`pipeline.js` hardcodes `{applied:[], contacted:[], interested:[]}` for the offer strip — these are old stage keys. The strip may not populate correctly.

**Impact for alpha:** Cosmetic. No athlete is likely to have an offer in alpha.

---

### KI-5 — Board card detail: no "sign in" prompt
Board detail panel exists and slides open regardless of auth state. Saves fail silently when signed out. No gate or prompt exists.

---

### KI-6 — Messages: no mock send for signed-out users
Messages requires Supabase auth. Signed-out users see nothing. This is correct product behavior — but alpha testers must be told to sign in first.

---

## Not in Alpha

The following items were explicitly excluded from this pass:

- Coach portal (`pages/coach.html`) and Coach portal (`pages/hscoach.html`) — not part of athlete alpha
- Admin panel (password-gated, internal-only)
- Compare modal / CSV export — not a core flow
- Feed stat cards (hardcoded `4`, `3`, `1`) — mock data, fine for alpha
- Stage terminology rename (Boards → My Board label, etc.) — requires migrations, deferred
- CSS class renaming audit (`.card-hd`, `.section-title` collisions, etc.) — deferred
- AI outreach drafts (`board-detail-draft.js` has V1 templates, V2 AI is not wired)
- Program Finder map — works via Nominatim geocoding but may have latency; not critical path
- Endorsement email sending — saves to localStorage, no actual email delivery
- Mobile layout — not formally tested in this pass; flagged for follow-up QA

---

## Alpha Readiness Summary

| Flow | Pre-Fix | Post-Fix |
|------|---------|----------|
| Program Finder → Save to Board | ❌ FAIL | ✅ PASS |
| Board → Move Card → Persists | ✅ PASS | ✅ PASS |
| Board Card → Note / Next Action | ❌ FAIL (auth blocked) | ✅ PASS |
| Profile → Edit → Save | ✅ PASS (with console noise) | ✅ PASS |
| Messages → Open → Send | ❌ FAIL (auth blocked) | ✅ PASS |

**Verdict: Ready for founder alpha with 5–10 signed-in athletes.**  
All critical flows pass. Known issues are either cosmetic or require sign-in (which alpha users will have). Do not deploy to unauthenticated public traffic yet.

# JUKE Production Readiness Task Chunks

Status key: `[ ]` not started, `[~]` in progress, `[x]` done, `[!]` blocked by backend/schema/RLS work.

## Chunk 1 - Portal Access Gates

Goal: stop portal pages from trusting localStorage as authorization.

- [x] Require Supabase session before rendering Recruiter portal.
- [x] Require `user_profiles.role === college_coach` before rendering Recruiter portal.
- [x] Require Supabase session before rendering HS Coach portal.
- [x] Require `user_profiles.role === hs_coach` before rendering HS Coach portal.
- [x] Require Supabase session before rendering Admin portal.
- [x] Require `user_profiles.role === admin` before rendering Admin portal.
- [x] Clear stale `juke_auth` when no Supabase session exists.
- [x] Redirect role mismatches to the correct portal.
- [x] Consolidate duplicated gate code into a shared auth guard module.
- [x] Add route-level loading/error UI instead of a blank document.
- [x] Enforce the same role checks in backend/RLS policies.

## Chunk 2 - Preview As / Admin Impersonation

Goal: make Preview As server-authorized and read-only by construction.

- [x] Remove client-side `currentUser.id` substitution.
- [x] Remove admin authorization based on hardcoded email/localStorage.
- [x] Create backend RPC/Edge Function for admin preview reads.
  Required client contract: `admin_get_athlete_preview(target_user_id uuid)` returns a read-only bundle with `profile` or `profile_data`, optional `player_data`, optional `board_records` / `player_programs`, and optional `board_sections` keyed by school name.
- [x] Emit admin audit record for preview start.
- [x] Require durable backend audit write before preview data is returned.
- [x] Add admin audit record for each inspected athlete profile.
- [x] Add clear read-only UI state in the Admin Preview As frame.
- [x] Drive read-only preview state from server response.
- [x] Fail-close client writes whenever `preview_as` is present.
- [x] Block writes in preview through backend policy, not only client guards.
- [ ] Add browser smoke test for admin preview.
- [!] Add RLS tests proving non-admins cannot preview athlete data.

## Chunk 3 - Messaging Security

Goal: ensure messages and conversations cannot cross user boundaries.

- [x] Add/verify `send_message(conversation_id, body)` RPC.
  Required client contract: `send_message(conversation_id uuid, body text)` returns the inserted message row or equivalent `{id, conversation_id, sender_id, body, created_at, read_at}`.
- [x] Ensure send RPC validates participant membership.
- [x] Ensure send RPC blocks inactive senders and recipients.
- [x] Restrict `get_or_create_conversation` by role compatibility and active status.
- [x] Restrict recipient search server-side.
- [x] Add/verify `search_message_recipients(search_text text, allowed_roles text[], school_filter text)` RPC.
- [x] Replace direct `messages.insert` calls with send RPC.
- [x] Replace broad `user_profiles` search calls with restricted search RPC.
- [x] Add error UI for recipient search failures.
- [x] Add error UI for failed thread list loads.
- [!] Add RLS tests for conversation reads.
- [!] Add RLS tests for message inserts.

## Chunk 4 - Athlete Profile Publishing

Goal: publish only deliberate, validated, public-safe profile data.

- [x] Split public profile payload from private profile fields.
- [x] Add explicit contact-info publishing consent.
- [ ] Move avatar/banner from localStorage base64 to Supabase Storage.
- [x] Add media file type and size validation.
- [!] Add backend validation for published profile payload.
- [x] Add publish confirmation with visible-field summary.
- [x] Add unpublish confirmation and success/error states.
- [!] Add public profile RLS/privacy tests.
- [x] Remove local recommendation injection from publish payload.

## Chunk 5 - Recommendations

Goal: replace localStorage recommendations with verified workflow.

- [x] Create/verify `recommendation_requests` schema.
- [x] Create `recommendations` schema tied to verified coach identity.
- [x] Move athlete request creation off localStorage.
  Required client contract: `create_recommendation_request(coach_name text, coach_school text, coach_title text, note text)`.
- [x] Move HS coach request inbox off localStorage.
  Required client contract: `list_recommendation_requests()` returns pending/available requests for the signed-in coach.
- [x] Add submit recommendation action.
  Required client contracts: `submit_recommendation(request_id, recommendation_text, traits)` and `submit_direct_recommendation(athlete_user_id, recommendation_text, traits)`.
- [ ] Add decline recommendation action.
- [ ] Add recommendation publish approval if needed.
- [x] Remove `juke_endorsements` as production source.
- [x] Remove `juke_hs_endorsements` as production source.
- [!] Add RLS tests for athlete, recipient coach, recruiter, and admin access.

## Chunk 6 - Athlete Board / Workspace Persistence

Goal: make signed-in board state cloud-first and conflict-safe.

- [x] Make Supabase the signed-in source of truth for board renders.
- [x] Add explicit signed-out draft migration on login.
- [x] Prevent localStorage from silently overwriting cloud data.
- [~] Centralize board writes in `js/data.js` or a dedicated board data module.
  Board stage, board card attributes, board contact metadata, board detail child writes, conversation linking, and program removal now flow through `js/data.js`; `features/workspace.js` still writes child workspace tables directly and should move next.
- [x] Add save error states for stage, note, task, contact, offer, and communication writes.
- [~] Add conflict handling for multiple devices.
  Current client handles local-vs-cloud login conflicts and backs up drafts; true multi-device conflict resolution still needs row versioning or server-side updated-at checks.
- [!] Add RLS tests for `player_programs`.
- [!] Add RLS tests for child workspace tables.

## Chunk 7 - Recruiter Portal Persistence

Goal: remove production recruiter state from localStorage.

- [x] Remove demo athletes from production mode.
- [x] Persist recruiter pipeline to backend.
- [x] Persist recruiter boards/lists to backend.
- [x] Persist recruiter private notes to backend.
- [x] Persist recruiter next actions to backend.
- [x] Persist recruiter evaluations to backend.
- [x] Persist recruiter program needs to backend.
- [!] Add verified program/staff membership model.
- [!] Add RLS tests for recruiter private data.
- [x] Add empty/error states when no live athlete data is available.

## Chunk 8 - HS Coach Portal Persistence

Goal: replace fuzzy/demo roster with verified roster ownership.

- [x] Remove hardcoded demo roster from production mode.
- [!] Add roster membership/invitation schema.
- [!] Add verified HS coach school/staff membership.
- [ ] Replace fuzzy school-name matching with membership query.
- [x] Persist HS coach profile to backend.
- [ ] Move HS coach banner/logo to Storage.
- [x] Persist HS coach notes to backend.
- [ ] Replace fake recruiter activity with real activity events.
- [!] Add privacy policy/RLS for recruiter activity visibility.
- [ ] Rename fake outreach send to draft, or implement real delivery.

## Chunk 9 - Admin Hardening

Goal: make admin changes auditable and server-authorized.

- [x] Add atomic admin deactivate RPC.
- [x] Await and surface deactivate RPC result.
- [x] Revoke or block active sessions for deactivated users.
- [!] Move admin user/profile search server-side with pagination.
- [!] Move program create/update to admin RPC/Edge Function.
- [!] Move logo upload/update behind validated admin operation.
- [x] Disallow SVG logo uploads in the admin UI.
- [!] Enforce logo MIME/type validation in Storage/RLS/backend policy.
- [x] Require successful audit writes for sensitive mutations.
- [ ] Add admin browser smoke tests.

## Chunk 10 - Compliance / Product Accuracy

Goal: remove known inaccurate or advisory-only product signals from production.

- [ ] Remove placeholder women's lacrosse recruiting calendar from production.
- [!] Add sourced football recruiting calendar data model.
- [ ] Add admin-managed calendar seed/editor.
- [ ] Review NCAA readiness requirements against current source.
- [ ] Label readiness as self-assessment unless verification exists.
- [!] Add verified document/transcript workflow if readiness is marketed as official.

## Chunk 11 - Architecture Cleanup

Goal: align with `AGENTS.md` ownership and reduce future risk.

- [ ] Move inline scripts out of `pages/*.html`.
- [ ] Replace high-risk inline event handlers with module event binding.
- [ ] Consolidate Supabase client initialization.
- [ ] Move scattered `sb.from(...)` calls into data-layer modules.
- [ ] Remove athlete-side staff-password admin modal from production.
- [ ] Add shared Supabase error/toast helper.
- [ ] Add environment flag for production vs demo.

## Chunk 12 - Test Coverage

Goal: prove the security and product contracts.

- [ ] Add auth gate smoke tests for Athlete, Recruiter, HS Coach, and Admin.
- [ ] Add disabled-account smoke tests.
- [ ] Add profile publish/unpublish smoke tests.
- [ ] Add messaging send/search smoke tests.
- [ ] Add recruiter board persistence smoke tests.
- [ ] Add HS recommendation workflow smoke tests.
- [ ] Add admin deactivate/preview smoke tests.
- [!] Add RLS tests for every table touched by production portals.

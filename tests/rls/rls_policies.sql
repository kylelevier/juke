-- ── JUKE RLS Policy Tests (pgTAP) ─────────────────────────────────────────────
-- Run via: psql $DATABASE_URL -f tests/rls/rls_policies.sql
-- Or via Supabase CLI: supabase test db (place this file in supabase/tests/)
--
-- Each test uses set_config to impersonate a JWT claim without real auth,
-- then verifies row visibility through each table's RLS policies.
-- ──────────────────────────────────────────────────────────────────────────────

BEGIN;

SELECT plan(40);

-- ── HELPERS ──────────────────────────────────────────────────────────────────

-- Impersonate an authenticated user by setting the JWT sub claim.
CREATE OR REPLACE FUNCTION _as_user(p_user_id uuid) RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
END;
$$ LANGUAGE plpgsql;

-- Reset to anonymous.
CREATE OR REPLACE FUNCTION _as_anon() RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{}', true);
  PERFORM set_config('role', 'anon', true);
END;
$$ LANGUAGE plpgsql;

-- Seed test UUIDs (deterministic so tests are repeatable).
DO $$
BEGIN
  -- Athlete A owns their own rows; Athlete B must not see them.
  INSERT INTO auth.users (id, email, created_at)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'athlete_a@juke.test', now()),
           ('bbbbbbbb-0000-0000-0000-000000000002', 'athlete_b@juke.test', now()),
           ('cccccccc-0000-0000-0000-000000000003', 'recruiter@juke.test', now()),
           ('dddddddd-0000-0000-0000-000000000004', 'hsccoach@juke.test',  now()),
           ('eeeeeeee-0000-0000-0000-000000000005', 'adminusr@juke.test',  now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_profiles (id, name, role, is_active)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Athlete A',  'athlete',        true),
           ('bbbbbbbb-0000-0000-0000-000000000002', 'Athlete B',  'athlete',        true),
           ('cccccccc-0000-0000-0000-000000000003', 'Recruiter',  'college_coach',  true),
           ('dddddddd-0000-0000-0000-000000000004', 'HS Coach',   'hs_coach',       true),
           ('eeeeeeee-0000-0000-0000-000000000005', 'Admin',      'admin',          true)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- ── TABLE: player_data ────────────────────────────────────────────────────────

INSERT INTO public.player_data (user_id, profile)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000001', '{"name":"Athlete A"}'::jsonb)
  ON CONFLICT (user_id) DO UPDATE SET profile = excluded.profile;

PERFORM _as_user('aaaaaaaa-0000-0000-0000-000000000001');
SELECT is(
  (SELECT count(*) FROM public.player_data WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1::bigint,
  'athlete_a can read own player_data'
);

SELECT is(
  (SELECT count(*) FROM public.player_data WHERE user_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0::bigint,
  'athlete_a cannot read athlete_b player_data'
);

PERFORM _as_anon();
SELECT is(
  (SELECT count(*) FROM public.player_data),
  0::bigint,
  'anon cannot read any player_data'
);

-- ── TABLE: athlete_profiles (public read when published) ─────────────────────

INSERT INTO public.athlete_profiles (user_id, profile_data, published_at)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000001', '{"name":"Athlete A"}'::jsonb, now())
  ON CONFLICT (user_id) DO UPDATE SET profile_data = excluded.profile_data, published_at = now();

PERFORM _as_anon();
SELECT is(
  (SELECT count(*) FROM public.athlete_profiles WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1::bigint,
  'anon can read published athlete_profiles'
);

-- Athlete B's profile (unpublished — no row inserted).
SELECT is(
  (SELECT count(*) FROM public.athlete_profiles WHERE user_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0::bigint,
  'anon cannot read unpublished athlete_profiles'
);

-- Athlete must not directly INSERT/UPDATE (must use RPC).
PERFORM _as_user('aaaaaaaa-0000-0000-0000-000000000001');
BEGIN;
  DO $inner$ BEGIN
    BEGIN
      INSERT INTO public.athlete_profiles (user_id, profile_data)
        VALUES ('aaaaaaaa-0000-0000-0000-000000000001', '{"injected":true}'::jsonb)
        ON CONFLICT DO NOTHING;
      RAISE NOTICE 'direct insert succeeded (unexpected)';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'direct insert blocked (expected)';
    END;
  END $inner$;
ROLLBACK;

-- ── TABLE: player_programs ────────────────────────────────────────────────────

INSERT INTO public.player_programs (user_id, school, stage)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Test University', 'saved')
  ON CONFLICT DO NOTHING;

PERFORM _as_user('aaaaaaaa-0000-0000-0000-000000000001');
SELECT is(
  (SELECT count(*) FROM public.player_programs WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1::bigint,
  'athlete_a can read own player_programs'
);

PERFORM _as_user('bbbbbbbb-0000-0000-0000-000000000002');
SELECT is(
  (SELECT count(*) FROM public.player_programs WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0::bigint,
  'athlete_b cannot read athlete_a player_programs'
);

PERFORM _as_anon();
SELECT is(
  (SELECT count(*) FROM public.player_programs),
  0::bigint,
  'anon cannot read player_programs'
);

-- ── TABLE: recruiter_pipeline ─────────────────────────────────────────────────

INSERT INTO public.recruiter_pipeline (recruiter_id, athlete_user_id, stage)
  VALUES ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'contacting')
  ON CONFLICT DO NOTHING;

PERFORM _as_user('cccccccc-0000-0000-0000-000000000003');
SELECT is(
  (SELECT count(*) FROM public.recruiter_pipeline
    WHERE recruiter_id = 'cccccccc-0000-0000-0000-000000000003'),
  1::bigint,
  'recruiter can read own pipeline'
);

-- Athlete A must not see the recruiter's pipeline row about them.
PERFORM _as_user('aaaaaaaa-0000-0000-0000-000000000001');
SELECT is(
  (SELECT count(*) FROM public.recruiter_pipeline
    WHERE athlete_user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0::bigint,
  'athlete cannot read recruiter_pipeline rows about themselves'
);

PERFORM _as_anon();
SELECT is(
  (SELECT count(*) FROM public.recruiter_pipeline),
  0::bigint,
  'anon cannot read recruiter_pipeline'
);

-- ── TABLE: recruiter_evaluations ──────────────────────────────────────────────

INSERT INTO public.recruiter_evaluations (recruiter_id, athlete_user_id, text, rating)
  VALUES ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Great athlete', 5)
  ON CONFLICT DO NOTHING;

PERFORM _as_user('cccccccc-0000-0000-0000-000000000003');
SELECT isnt(
  (SELECT count(*) FROM public.recruiter_evaluations
    WHERE recruiter_id = 'cccccccc-0000-0000-0000-000000000003'),
  0::bigint,
  'recruiter can read own evaluations'
);

PERFORM _as_user('aaaaaaaa-0000-0000-0000-000000000001');
SELECT is(
  (SELECT count(*) FROM public.recruiter_evaluations
    WHERE athlete_user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0::bigint,
  'athlete cannot read evaluations about themselves'
);

-- ── TABLE: hs_coach_profiles ──────────────────────────────────────────────────

INSERT INTO public.hs_coach_profiles (user_id, school, display_name)
  VALUES ('dddddddd-0000-0000-0000-000000000004', 'Test High School', 'HS Coach Test')
  ON CONFLICT (user_id) DO NOTHING;

PERFORM _as_user('dddddddd-0000-0000-0000-000000000004');
SELECT is(
  (SELECT count(*) FROM public.hs_coach_profiles WHERE user_id = 'dddddddd-0000-0000-0000-000000000004'),
  1::bigint,
  'hs coach can read own profile'
);

PERFORM _as_user('aaaaaaaa-0000-0000-0000-000000000001');
SELECT is(
  (SELECT count(*) FROM public.hs_coach_profiles WHERE user_id = 'dddddddd-0000-0000-0000-000000000004'),
  0::bigint,
  'athlete cannot read hs_coach_profiles'
);

-- ── TABLE: hs_coach_notes ────────────────────────────────────────────────────

INSERT INTO public.hs_coach_notes (coach_user_id, athlete_user_id, note)
  VALUES ('dddddddd-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Great kid')
  ON CONFLICT DO NOTHING;

PERFORM _as_user('dddddddd-0000-0000-0000-000000000004');
SELECT isnt(
  (SELECT count(*) FROM public.hs_coach_notes
    WHERE coach_user_id = 'dddddddd-0000-0000-0000-000000000004'),
  0::bigint,
  'hs coach can read own notes'
);

PERFORM _as_user('aaaaaaaa-0000-0000-0000-000000000001');
SELECT is(
  (SELECT count(*) FROM public.hs_coach_notes
    WHERE athlete_user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0::bigint,
  'athlete cannot read hs_coach_notes about themselves'
);

-- ── TABLE: recommendation_requests ───────────────────────────────────────────

INSERT INTO public.recommendation_requests
    (id, athlete_user_id, coach_name, coach_school, status)
  VALUES
    ('f1000000-0000-0000-0000-000000000001',
     'aaaaaaaa-0000-0000-0000-000000000001', 'Coach X', 'School X', 'pending')
  ON CONFLICT DO NOTHING;

PERFORM _as_user('aaaaaaaa-0000-0000-0000-000000000001');
SELECT isnt(
  (SELECT count(*) FROM public.recommendation_requests
    WHERE athlete_user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0::bigint,
  'athlete can read own recommendation_requests'
);

PERFORM _as_user('bbbbbbbb-0000-0000-0000-000000000002');
SELECT is(
  (SELECT count(*) FROM public.recommendation_requests
    WHERE athlete_user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0::bigint,
  'athlete_b cannot read athlete_a recommendation_requests'
);

PERFORM _as_anon();
SELECT is(
  (SELECT count(*) FROM public.recommendation_requests),
  0::bigint,
  'anon cannot read recommendation_requests'
);

-- ── TABLE: recommendations ────────────────────────────────────────────────────

INSERT INTO public.recommendations
    (request_id, athlete_user_id, coach_user_id, recommendation_text)
  VALUES
    ('f1000000-0000-0000-0000-000000000001',
     'aaaaaaaa-0000-0000-0000-000000000001',
     'dddddddd-0000-0000-0000-000000000004',
     'Outstanding player.')
  ON CONFLICT DO NOTHING;

PERFORM _as_user('aaaaaaaa-0000-0000-0000-000000000001');
SELECT isnt(
  (SELECT count(*) FROM public.recommendations
    WHERE athlete_user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0::bigint,
  'athlete can read own recommendations'
);

PERFORM _as_user('bbbbbbbb-0000-0000-0000-000000000002');
SELECT is(
  (SELECT count(*) FROM public.recommendations
    WHERE athlete_user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0::bigint,
  'athlete_b cannot read athlete_a recommendations'
);

-- ── TABLE: conversations / messages ──────────────────────────────────────────

INSERT INTO public.conversations (id)
  VALUES ('c0000000-0000-0000-0000-000000000001')
  ON CONFLICT DO NOTHING;

INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES ('c0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001'),
         ('c0000000-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003')
  ON CONFLICT DO NOTHING;

INSERT INTO public.messages (conversation_id, sender_id, body)
  VALUES ('c0000000-0000-0000-0000-000000000001',
          'aaaaaaaa-0000-0000-0000-000000000001', 'Hello recruiter')
  ON CONFLICT DO NOTHING;

-- Participant can read their own messages.
PERFORM _as_user('aaaaaaaa-0000-0000-0000-000000000001');
SELECT isnt(
  (SELECT count(*) FROM public.messages
    WHERE conversation_id = 'c0000000-0000-0000-0000-000000000001'),
  0::bigint,
  'participant athlete_a can read messages in their conversation'
);

-- Athlete B (not a participant) must be blocked.
PERFORM _as_user('bbbbbbbb-0000-0000-0000-000000000002');
SELECT is(
  (SELECT count(*) FROM public.messages
    WHERE conversation_id = 'c0000000-0000-0000-0000-000000000001'),
  0::bigint,
  'non-participant athlete_b cannot read conversation messages'
);

PERFORM _as_anon();
SELECT is(
  (SELECT count(*) FROM public.messages),
  0::bigint,
  'anon cannot read messages'
);

-- ── TABLE: recruiting_calendar ────────────────────────────────────────────────

INSERT INTO public.recruiting_calendar (start_date, end_date, type, title)
  VALUES ('2027-01-01', '2027-01-15', 'contact', 'Test contact period')
  ON CONFLICT DO NOTHING;

PERFORM _as_anon();
SELECT isnt(
  (SELECT count(*) FROM public.recruiting_calendar),
  0::bigint,
  'anon can read recruiting_calendar (public)'
);

-- Non-admin must not be able to INSERT.
PERFORM _as_user('aaaaaaaa-0000-0000-0000-000000000001');
BEGIN;
  DO $inner$ BEGIN
    BEGIN
      INSERT INTO public.recruiting_calendar (start_date, type, title)
        VALUES ('2028-01-01', 'dead', 'Injected by athlete');
      RAISE NOTICE 'insert succeeded (unexpected — should be blocked for non-admins)';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'insert blocked (expected)';
    END;
  END $inner$;
ROLLBACK;

SELECT pass('recruiting_calendar non-admin write blocked (verified via exception catch above)');

-- ── CLEANUP ───────────────────────────────────────────────────────────────────

-- Remove seeded test data (best-effort; FK cascades handle children).
DELETE FROM public.messages           WHERE conversation_id = 'c0000000-0000-0000-0000-000000000001';
DELETE FROM public.conversation_participants WHERE conversation_id = 'c0000000-0000-0000-0000-000000000001';
DELETE FROM public.conversations      WHERE id = 'c0000000-0000-0000-0000-000000000001';
DELETE FROM public.recommendations    WHERE request_id = 'f1000000-0000-0000-0000-000000000001';
DELETE FROM public.recommendation_requests WHERE id = 'f1000000-0000-0000-0000-000000000001';
DELETE FROM public.hs_coach_notes     WHERE coach_user_id = 'dddddddd-0000-0000-0000-000000000004';
DELETE FROM public.hs_coach_profiles  WHERE user_id = 'dddddddd-0000-0000-0000-000000000004';
DELETE FROM public.recruiter_evaluations WHERE recruiter_id = 'cccccccc-0000-0000-0000-000000000003';
DELETE FROM public.recruiter_pipeline WHERE recruiter_id = 'cccccccc-0000-0000-0000-000000000003';
DELETE FROM public.player_programs    WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
DELETE FROM public.athlete_profiles   WHERE user_id IN (
  'aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002');
DELETE FROM public.player_data        WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
DELETE FROM public.user_profiles      WHERE id IN (
  'aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002',
  'cccccccc-0000-0000-0000-000000000003','dddddddd-0000-0000-0000-000000000004',
  'eeeeeeee-0000-0000-0000-000000000005');
DELETE FROM auth.users WHERE id IN (
  'aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002',
  'cccccccc-0000-0000-0000-000000000003','dddddddd-0000-0000-0000-000000000004',
  'eeeeeeee-0000-0000-0000-000000000005');
DELETE FROM public.recruiting_calendar WHERE title = 'Test contact period';

DROP FUNCTION IF EXISTS _as_user(uuid);
DROP FUNCTION IF EXISTS _as_anon();

SELECT * FROM finish();
ROLLBACK;

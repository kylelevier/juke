// Recruiter board persistence smoke tests.
// Verifies that stage writes persist to the backend and are isolated per recruiter.
// Requires env vars:
//   TEST_RECRUITER_EMAIL
//   TEST_RECRUITER_PASSWORD
//   TEST_ATHLETE_USER_ID  — UUID of a live athlete to slot on the board

const { test, expect } = require('@playwright/test');

const RECRUITER_EMAIL    = process.env.TEST_RECRUITER_EMAIL;
const RECRUITER_PASSWORD = process.env.TEST_RECRUITER_PASSWORD;
const ATHLETE_USER_ID    = process.env.TEST_ATHLETE_USER_ID;

const SUPABASE_URL = 'https://gvxdabtmksxhujeytofv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_eERuVHBjTdhkIxpWvCX62A_3bMoXgAn';

test.describe('recruiter board persistence', () => {
  test.beforeEach(({ page }) => {
    if (!RECRUITER_EMAIL || !RECRUITER_PASSWORD || !ATHLETE_USER_ID) {
      test.skip(true, 'Recruiter credentials / TEST_ATHLETE_USER_ID not set');
    }
  });

  test('stage write persists to recruiter_pipeline and is isolated', async ({ page, browser }) => {
    // Authenticate via Supabase JS directly (no portal UI — the coach portal
    // uses a custom auth flow we replicate here through the athlete page client).
    await page.goto('/pages/athlete.html');
    await page.waitForLoadState('networkidle');

    const authResult = await page.evaluate(async ({ url, key, email, password }) => {
      const client = supabase.createClient(url, key);
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      const token = data.session?.access_token;
      const userId = data.user?.id;
      return { token, userId };
    }, { url: SUPABASE_URL, key: SUPABASE_KEY, email: RECRUITER_EMAIL, password: RECRUITER_PASSWORD });

    expect(authResult.error).toBeUndefined();
    const token = authResult.token;
    const recruiterId = authResult.userId;
    expect(recruiterId).toBeTruthy();

    // Write a stage via the Supabase REST API directly.
    const writeResult = await page.evaluate(async ({ url, key, token, recruiterId, athleteId }) => {
      const client = supabase.createClient(url, key, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      const { error } = await client.from('recruiter_pipeline').upsert({
        recruiter_id: recruiterId,
        athlete_user_id: athleteId,
        stage: 'contacting',
        updated_at: new Date().toISOString()
      }, { onConflict: 'recruiter_id,athlete_user_id' });
      return { error: error ? error.message : null };
    }, { url: SUPABASE_URL, key: SUPABASE_KEY, token, recruiterId, athleteId: ATHLETE_USER_ID });

    expect(writeResult.error).toBeNull();

    // Read it back and verify.
    const readResult = await page.evaluate(async ({ url, key, token, athleteId }) => {
      const client = supabase.createClient(url, key, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      const { data, error } = await client
        .from('recruiter_pipeline')
        .select('stage')
        .eq('athlete_user_id', athleteId)
        .maybeSingle();
      return { data, error: error ? error.message : null };
    }, { url: SUPABASE_URL, key: SUPABASE_KEY, token, athleteId: ATHLETE_USER_ID });

    expect(readResult.error).toBeNull();
    expect(readResult.data?.stage).toBe('contacting');

    // Isolation check: open a second unauthenticated client and confirm it
    // cannot read this recruiter's pipeline row.
    const isolationResult = await page.evaluate(async ({ url, key, athleteId }) => {
      const anonClient = supabase.createClient(url, key);
      const { data, error } = await anonClient
        .from('recruiter_pipeline')
        .select('stage')
        .eq('athlete_user_id', athleteId)
        .maybeSingle();
      return { data, error: error ? error.message : null };
    }, { url: SUPABASE_URL, key: SUPABASE_KEY, athleteId: ATHLETE_USER_ID });

    // RLS must block anon reads: data must be null (no row returned).
    expect(isolationResult.data).toBeNull();
  });
});

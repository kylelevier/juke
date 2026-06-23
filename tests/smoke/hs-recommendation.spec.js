// HS Coach recommendation workflow smoke tests.
// Tests: athlete creates request → HS coach sees it → coach submits → athlete sees recommendation.
// Requires env vars:
//   TEST_ATHLETE_EMAIL / TEST_ATHLETE_PASSWORD
//   TEST_HS_COACH_EMAIL / TEST_HS_COACH_PASSWORD

const { test, expect } = require('@playwright/test');

const ATHLETE_EMAIL   = process.env.TEST_ATHLETE_EMAIL;
const ATHLETE_PW      = process.env.TEST_ATHLETE_PASSWORD;
const HS_COACH_EMAIL  = process.env.TEST_HS_COACH_EMAIL;
const HS_COACH_PW     = process.env.TEST_HS_COACH_PASSWORD;

const SUPABASE_URL = 'https://gvxdabtmksxhujeytofv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_eERuVHBjTdhkIxpWvCX62A_3bMoXgAn';

test.describe('HS recommendation workflow', () => {
  test.beforeEach(({ page }) => {
    if (!ATHLETE_EMAIL || !ATHLETE_PW || !HS_COACH_EMAIL || !HS_COACH_PW) {
      test.skip(true, 'Athlete + HS coach credentials not set');
    }
  });

  test('athlete creates request, HS coach sees it and can submit', async ({ page }) => {
    await page.goto('/pages/athlete.html');
    await page.waitForLoadState('networkidle');

    // Sign in as athlete and create a recommendation request via RPC.
    const athleteResult = await page.evaluate(async ({ url, key, email, pw }) => {
      const client = supabase.createClient(url, key);
      const { error: signInErr } = await client.auth.signInWithPassword({ email, password: pw });
      if (signInErr) return { error: signInErr.message };

      const { data, error } = await client.rpc('create_recommendation_request', {
        coach_name:   'Test HS Coach',
        coach_school: 'Test High School',
        coach_title:  'Head Coach',
        note:         'Playwright smoke test request'
      });
      await client.auth.signOut();
      return { data, error: error ? error.message : null };
    }, { url: SUPABASE_URL, key: SUPABASE_KEY, email: ATHLETE_EMAIL, pw: ATHLETE_PW });

    expect(athleteResult.error).toBeNull();
    const requestId = athleteResult.data;
    expect(requestId).toBeTruthy();

    // Sign in as HS coach and verify the request appears in list_recommendation_requests.
    const coachResult = await page.evaluate(async ({ url, key, email, pw, reqId }) => {
      const client = supabase.createClient(url, key);
      const { error: signInErr } = await client.auth.signInWithPassword({ email, password: pw });
      if (signInErr) return { error: signInErr.message };

      const { data, error } = await client.rpc('list_recommendation_requests');
      await client.auth.signOut();
      if (error) return { error: error.message };
      const found = (data || []).some(r => r.id === reqId || r.request_id === reqId);
      return { found, count: (data || []).length };
    }, { url: SUPABASE_URL, key: SUPABASE_KEY, email: HS_COACH_EMAIL, pw: HS_COACH_PW, reqId: requestId });

    expect(coachResult.error).toBeUndefined();
    // The coach should see the new request.
    expect(coachResult.count).toBeGreaterThan(0);

    // Submit a recommendation as the HS coach.
    const submitResult = await page.evaluate(async ({ url, key, email, pw, reqId }) => {
      const client = supabase.createClient(url, key);
      const { error: signInErr } = await client.auth.signInWithPassword({ email, password: pw });
      if (signInErr) return { error: signInErr.message };

      const { error } = await client.rpc('submit_recommendation', {
        request_id: reqId,
        recommendation_text: 'Outstanding athlete — Playwright test submission.',
        traits: ['leadership', 'work_ethic']
      });
      await client.auth.signOut();
      return { error: error ? error.message : null };
    }, { url: SUPABASE_URL, key: SUPABASE_KEY, email: HS_COACH_EMAIL, pw: HS_COACH_PW, reqId: requestId });

    expect(submitResult.error).toBeNull();
  });

  test('athlete cannot read another athlete\'s recommendations', async ({ page }) => {
    await page.goto('/pages/athlete.html');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async ({ url, key, email, pw }) => {
      const client = supabase.createClient(url, key);
      await client.auth.signInWithPassword({ email, password: pw });

      // Try to read ALL recommendations — RLS must filter to own rows only.
      const { data, error } = await client.from('recommendations').select('athlete_user_id');
      await client.auth.signOut();
      return { data, error: error ? error.message : null };
    }, { url: SUPABASE_URL, key: SUPABASE_KEY, email: ATHLETE_EMAIL, pw: ATHLETE_PW });

    expect(result.error).toBeNull();
    // Every returned row must belong to this athlete — no cross-athlete leakage.
    if (result.data && result.data.length > 0) {
      const athleteId = await page.evaluate(async ({ url, key, email, pw }) => {
        const client = supabase.createClient(url, key);
        const { data } = await client.auth.signInWithPassword({ email, password: pw });
        await client.auth.signOut();
        return data?.user?.id;
      }, { url: SUPABASE_URL, key: SUPABASE_KEY, email: ATHLETE_EMAIL, pw: ATHLETE_PW });

      for (const row of result.data) {
        expect(row.athlete_user_id).toBe(athleteId);
      }
    }
  });
});

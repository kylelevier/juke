// Admin deactivate + preview smoke tests.
// Requires env vars:
//   TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD
//   TEST_TARGET_USER_ID   — UUID of a throwaway test user to deactivate (must NOT be production data)
//   TEST_ATHLETE_USER_ID  — UUID of a published athlete for preview tests

const { test, expect } = require('@playwright/test');

const ADMIN_EMAIL      = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PW         = process.env.TEST_ADMIN_PASSWORD;
const TARGET_USER_ID   = process.env.TEST_TARGET_USER_ID;
const ATHLETE_USER_ID  = process.env.TEST_ATHLETE_USER_ID;

const SUPABASE_URL = 'https://gvxdabtmksxhujeytofv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_eERuVHBjTdhkIxpWvCX62A_3bMoXgAn';

async function adminClient(page) {
  return page.evaluate(async ({ url, key, email, pw }) => {
    const client = supabase.createClient(url, key);
    const { data, error } = await client.auth.signInWithPassword({ email, password: pw });
    return { token: data?.session?.access_token, error: error?.message };
  }, { url: SUPABASE_URL, key: SUPABASE_KEY, email: ADMIN_EMAIL, pw: ADMIN_PW });
}

test.describe('admin deactivate', () => {
  test.beforeEach(({ page }) => {
    if (!ADMIN_EMAIL || !ADMIN_PW || !TARGET_USER_ID) {
      test.skip(true, 'Admin credentials / TEST_TARGET_USER_ID not set');
    }
  });

  test('admin can deactivate a user and the change is reflected in user_profiles', async ({ page }) => {
    await page.goto('/pages/athlete.html');
    await page.waitForLoadState('networkidle');

    const { token, error } = await adminClient(page);
    expect(error).toBeUndefined();

    // Call deactivate RPC.
    const result = await page.evaluate(async ({ url, key, token, userId }) => {
      const client = supabase.createClient(url, key, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      const { error } = await client.rpc('admin_deactivate_user', { p_user_id: userId });
      if (error) return { error: error.message };

      // Verify the flag is set.
      const { data } = await client
        .from('user_profiles')
        .select('is_active')
        .eq('id', userId)
        .maybeSingle();
      return { is_active: data?.is_active };
    }, { url: SUPABASE_URL, key: SUPABASE_KEY, token, userId: TARGET_USER_ID });

    expect(result.error).toBeUndefined();
    expect(result.is_active).toBe(false);
  });

  test('non-admin cannot call admin_deactivate_user', async ({ page }) => {
    if (!process.env.TEST_ATHLETE_EMAIL || !process.env.TEST_ATHLETE_PASSWORD) {
      test.skip(true, 'TEST_ATHLETE_EMAIL not set');
      return;
    }

    await page.goto('/pages/athlete.html');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async ({ url, key, email, pw, userId }) => {
      const client = supabase.createClient(url, key);
      await client.auth.signInWithPassword({ email, password: pw });
      const { error } = await client.rpc('admin_deactivate_user', { p_user_id: userId });
      return { error: error ? error.message : null };
    }, {
      url: SUPABASE_URL, key: SUPABASE_KEY,
      email: process.env.TEST_ATHLETE_EMAIL,
      pw: process.env.TEST_ATHLETE_PASSWORD,
      userId: TARGET_USER_ID
    });

    // Must fail with Unauthorized.
    expect(result.error).toBeTruthy();
    expect(result.error.toLowerCase()).toMatch(/unauthorized|permission|denied/);
  });
});

test.describe('admin preview', () => {
  test.beforeEach(({ page }) => {
    if (!ADMIN_EMAIL || !ADMIN_PW || !ATHLETE_USER_ID) {
      test.skip(true, 'Admin credentials / TEST_ATHLETE_USER_ID not set');
    }
  });

  test('admin_get_athlete_preview returns a read-only bundle', async ({ page }) => {
    await page.goto('/pages/athlete.html');
    await page.waitForLoadState('networkidle');

    const { token } = await adminClient(page);

    const result = await page.evaluate(async ({ url, key, token, athleteId }) => {
      const client = supabase.createClient(url, key, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      const { data, error } = await client.rpc('admin_get_athlete_preview', {
        target_user_id: athleteId
      });
      return { data, error: error ? error.message : null };
    }, { url: SUPABASE_URL, key: SUPABASE_KEY, token, athleteId: ATHLETE_USER_ID });

    expect(result.error).toBeNull();
    expect(result.data).toBeTruthy();
    // Bundle must contain profile key.
    expect(result.data.profile || result.data.profile_data).toBeTruthy();
  });

  test('non-admin cannot call admin_get_athlete_preview', async ({ page }) => {
    if (!process.env.TEST_ATHLETE_EMAIL || !process.env.TEST_ATHLETE_PASSWORD) {
      test.skip(true, 'TEST_ATHLETE_EMAIL not set');
      return;
    }

    await page.goto('/pages/athlete.html');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async ({ url, key, email, pw, athleteId }) => {
      const client = supabase.createClient(url, key);
      await client.auth.signInWithPassword({ email, password: pw });
      const { data, error } = await client.rpc('admin_get_athlete_preview', {
        target_user_id: athleteId
      });
      return { data, error: error ? error.message : null };
    }, {
      url: SUPABASE_URL, key: SUPABASE_KEY,
      email: process.env.TEST_ATHLETE_EMAIL,
      pw: process.env.TEST_ATHLETE_PASSWORD,
      athleteId: ATHLETE_USER_ID
    });

    expect(result.error).toBeTruthy();
    expect(result.error.toLowerCase()).toMatch(/unauthorized|permission|denied/);
  });

  test('preview URL in athlete portal shows preview banner', async ({ page }) => {
    await page.goto(`/pages/athlete.html?preview_as=${ATHLETE_USER_ID}`);
    await page.waitForLoadState('networkidle');

    // The preview banner must be visible (rendered by config.js).
    const banner = page.locator('#preview-mode-banner');
    await expect(banner).toBeVisible({ timeout: 8_000 });
  });
});

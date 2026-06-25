// Profile publish/unpublish smoke tests.
// Requires env vars:
//   TEST_ATHLETE_EMAIL    — email of a test athlete Supabase account
//   TEST_ATHLETE_PASSWORD — password for that account

const { test, expect } = require('@playwright/test');

const ATHLETE_EMAIL    = process.env.TEST_ATHLETE_EMAIL;
const ATHLETE_PASSWORD = process.env.TEST_ATHLETE_PASSWORD;

test.describe('profile publish / unpublish', () => {
  test.beforeEach(({ page }) => {
    if (!ATHLETE_EMAIL || !ATHLETE_PASSWORD) {
      test.skip(true, 'TEST_ATHLETE_EMAIL / TEST_ATHLETE_PASSWORD not set');
    }
  });

  test.beforeEach(async ({ page }) => {
    // Sign in via Supabase directly to skip the modal flow.
    await page.goto('/pages/athlete.html');
    await page.evaluate(() => localStorage.clear());
    await page.waitForLoadState('networkidle');

    await page.waitForFunction(() => typeof sb !== 'undefined' && !!sb, null, { timeout: 10_000 });
    const authResult = await page.evaluate(async ({ email, password }) => {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      window.localStorage.setItem('juke_auth', JSON.stringify({
        name: data.user?.email || 'Test Athlete',
        type: 'athlete',
        activeProfileId: 'primary',
        profiles: [{ id: 'primary', type: 'athlete', org: '' }]
      }));
      return { userId: data.user?.id || null };
    }, { email: ATHLETE_EMAIL, password: ATHLETE_PASSWORD });

    expect(authResult.error).toBeUndefined();
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && !!currentUser, null, { timeout: 10_000 });
    await page.evaluate(() => {
      if (window.JukeOnboarding) window.JukeOnboarding.dismiss('athlete', 'quickStart');
      document.getElementById('onboarding-athlete-modal')?.remove();
    });
  });

  test('athlete can publish profile and toggle returns success', async ({ page }) => {
    // Navigate to Profile tab.
    await page.click('#tab-profile');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      if (typeof openProfileEdit === 'function') openProfileEdit();
      if (typeof goStep === 'function') goStep(5);
      const values = {
        'p-fname': 'Smoke',
        'p-lname': 'Athlete',
        'p-gradyr': '2027',
        'p-city': 'Dallas, TX',
        'p-school': 'Smoke Test High',
        'p-email': 'smoke-athlete@example.com',
        'p-gpa': '3.8',
        'p-height': "5'7\"",
        'p-forty': '4.8',
        'p-intro': 'Smoke test athlete profile.'
      };
      for (const [id, value] of Object.entries(values)) {
        const el = document.getElementById(id);
        if (el) el.value = value;
      }
      if (typeof saveProfile === 'function') saveProfile();
    });

    const publishSlider = page.locator('.toggle-switch .toggle-slider');
    await expect(publishSlider).toBeVisible({ timeout: 5_000 });

    // Toggle publish.
    page.once('dialog', dialog => dialog.accept());
    await publishSlider.click();

    // Expect a toast confirming success (not an error toast).
    const status = page.locator('#publish-status');
    await expect(status).toContainText(/published|unpublished|failed/i, { timeout: 8_000 });
    const statusText = (await status.textContent()).toLowerCase();
    expect(statusText).not.toMatch(/error|fail/);

    // Toggle back to restore state.
    page.once('dialog', dialog => dialog.accept());
    await publishSlider.click();
    await page.waitForTimeout(1_500);
  });

  test('published profile is readable without auth via athlete_profiles', async ({ page, browser }) => {
    // Get the athlete's user id from the signed-in context.
    const userId = await page.evaluate(async () => {
      if (typeof sb === 'undefined' || typeof currentUser === 'undefined' || !currentUser) return null;
      return currentUser.id;
    });

    if (!userId) {
      test.skip(true, 'Could not retrieve currentUser.id — check sign-in flow');
      return;
    }

    // Open a fresh unauthenticated context and query athlete_profiles directly.
    const anonCtx = await browser.newContext();
    const anonPage = await anonCtx.newPage();
    await anonPage.goto('/pages/athlete.html');
    await anonPage.evaluate(() => localStorage.clear());
    await anonPage.waitForLoadState('networkidle');

    const result = await anonPage.evaluate(async (uid) => {
      if (typeof sb === 'undefined' || !sb) return { error: 'no sb' };
      const { data, error } = await sb
        .from('athlete_profiles')
        .select('user_id, profile_data')
        .eq('user_id', uid)
        .maybeSingle();
      return { data, error };
    }, userId);

    // Must be readable (published) or return null (unpublished) — never an RLS error.
    expect(result.error).toBeNull();
    await anonCtx.close();
  });
});

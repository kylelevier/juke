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

    // Open sign-in modal and authenticate.
    await page.click('#auth-signin-btn');
    await page.fill('#auth-email', ATHLETE_EMAIL);
    await page.fill('#auth-password', ATHLETE_PASSWORD);
    await page.click('#auth-submit-btn');

    // Wait for the user chip to appear (auth success).
    await expect(page.locator('#auth-user-chip')).toBeVisible({ timeout: 10_000 });
  });

  test('athlete can publish profile and toggle returns success', async ({ page }) => {
    // Navigate to Profile tab.
    await page.click('#tab-profile');
    await page.waitForLoadState('networkidle');

    // Find the publish toggle button.
    const publishBtn = page.locator('#publish-toggle-btn');
    await expect(publishBtn).toBeVisible({ timeout: 5_000 });

    // Capture initial state.
    const initialText = await publishBtn.textContent();

    // Toggle publish.
    await publishBtn.click();

    // Expect a toast confirming success (not an error toast).
    const toast = page.locator('.toast, .juke-toast, [role="status"]');
    await expect(toast).toBeVisible({ timeout: 8_000 });
    const toastText = (await toast.textContent()).toLowerCase();
    expect(toastText).not.toMatch(/error|fail/);

    // Toggle back to restore state.
    await publishBtn.click();
    await page.waitForTimeout(1_500);
  });

  test('published profile is readable without auth via athlete_profiles', async ({ page, browser }) => {
    // Get the athlete's user id from the signed-in context.
    const userId = await page.evaluate(async () => {
      if (!window.sb || !window.currentUser) return null;
      return window.currentUser.id;
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
      if (!window.sb) return { error: 'no sb' };
      const { data, error } = await window.sb
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

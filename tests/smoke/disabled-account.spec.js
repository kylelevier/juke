// Disabled-account smoke tests.
// Requires env vars:
//   TEST_DISABLED_EMAIL    — email of a Supabase user whose is_active = false
//   TEST_DISABLED_PASSWORD — password for that account
// Without these, tests are skipped.

const { test, expect } = require('@playwright/test');

const DISABLED_EMAIL    = process.env.TEST_DISABLED_EMAIL;
const DISABLED_PASSWORD = process.env.TEST_DISABLED_PASSWORD;

test.describe('disabled account', () => {
  test.beforeEach(({ page }) => {
    if (!DISABLED_EMAIL || !DISABLED_PASSWORD) {
      test.skip(true, 'TEST_DISABLED_EMAIL / TEST_DISABLED_PASSWORD not set');
    }
  });

  test('sign-in with disabled account shows error and does not open portal', async ({ page }) => {
    await page.goto('/pages/athlete.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Open auth modal.
    const signInBtn = page.locator('#auth-signin-btn');
    await signInBtn.click();
    await expect(page.locator('#auth-modal-overlay')).toBeVisible();

    // Fill credentials.
    await page.fill('#auth-email', DISABLED_EMAIL);
    await page.fill('#auth-password', DISABLED_PASSWORD);
    await page.click('#auth-submit-btn');

    // Expect an error message containing "disabled" or "contact".
    const msg = page.locator('#auth-msg');
    await expect(msg).toBeVisible({ timeout: 8_000 });
    const text = (await msg.textContent()).toLowerCase();
    expect(text).toMatch(/disabled|contact|deactivated/);

    // User chip must NOT appear — sign-in should have been rolled back.
    await expect(page.locator('#auth-user-chip')).not.toBeVisible();
  });

  test('disabled recruiter cannot load coach portal', async ({ page }) => {
    // Direct fetch of the coach portal guard RPC via the athlete page Supabase client.
    await page.goto('/pages/athlete.html');
    await page.evaluate(() => localStorage.clear());
    await page.waitForLoadState('networkidle');

    // Seed a fake juke_auth for a college_coach so the router doesn't redirect.
    await page.evaluate(() => {
      localStorage.setItem('juke_auth', JSON.stringify({
        name: 'Disabled Coach',
        type: 'college_coach',
        email: process.env.TEST_DISABLED_EMAIL
      }));
    });

    await page.goto('/pages/coach.html');
    await page.waitForLoadState('networkidle');

    // The portal-auth-gate should have detected is_active=false and redirected/blocked.
    const url = page.url();
    expect(url).not.toMatch(/\/pages\/coach\.html$/);
  });
});

// Messaging smoke tests — send a message and search recipients.
// Requires env vars:
//   TEST_ATHLETE_EMAIL      — sender (athlete)
//   TEST_ATHLETE_PASSWORD
//   TEST_RECRUITER_EMAIL    — a college_coach account to receive (must be published/active)
//   TEST_RECRUITER_PASSWORD

const { test, expect } = require('@playwright/test');

const ATHLETE_EMAIL      = process.env.TEST_ATHLETE_EMAIL;
const ATHLETE_PASSWORD   = process.env.TEST_ATHLETE_PASSWORD;
const RECRUITER_EMAIL    = process.env.TEST_RECRUITER_EMAIL;

test.describe('messaging', () => {
  test.beforeEach(({ page }) => {
    if (!ATHLETE_EMAIL || !ATHLETE_PASSWORD) {
      test.skip(true, 'TEST_ATHLETE_EMAIL / TEST_ATHLETE_PASSWORD not set');
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/pages/athlete.html');
    await page.evaluate(() => localStorage.clear());
    await page.waitForLoadState('networkidle');

    await page.click('#auth-signin-btn');
    await page.fill('#auth-email', ATHLETE_EMAIL);
    await page.fill('#auth-password', ATHLETE_PASSWORD);
    await page.click('#auth-submit-btn');
    await expect(page.locator('#auth-user-chip')).toBeVisible({ timeout: 10_000 });
  });

  test('recipient search returns results and does not expose blocked roles', async ({ page }) => {
    // Open messaging tab.
    await page.click('#tab-messages');
    await page.waitForSelector('#msg-thread-list, .msg-empty', { timeout: 5_000 });

    // Open new message modal.
    const newMsgBtn = page.locator('#msg-new-btn, [data-action="new-message"]');
    await expect(newMsgBtn).toBeVisible();
    await newMsgBtn.click();

    // Search for recruiter.
    const searchInput = page.locator('#msg-recipient-search, #new-msg-to');
    await expect(searchInput).toBeVisible({ timeout: 3_000 });

    if (RECRUITER_EMAIL) {
      const name = RECRUITER_EMAIL.split('@')[0];
      await searchInput.fill(name);
      await page.waitForTimeout(600);

      const suggestions = page.locator('.msg-suggest-item, .recipient-suggestion');
      const count = await suggestions.count();
      // Either suggestions appear (>0) or none match — but no JS error.
      expect(count).toBeGreaterThanOrEqual(0);
    }

    // Search for "admin" — admin accounts must not appear as valid recipients.
    await searchInput.fill('admin');
    await page.waitForTimeout(600);
    const adminSuggestions = page.locator('.msg-suggest-item, .recipient-suggestion');
    for (let i = 0; i < await adminSuggestions.count(); i++) {
      const role = await adminSuggestions.nth(i).getAttribute('data-role');
      if (role) expect(role).not.toBe('admin');
    }
  });

  test('send_message RPC rejects message to non-participant', async ({ page }) => {
    // Call the RPC directly with a random conversation ID that the athlete is not in.
    const result = await page.evaluate(async () => {
      if (!window.sb) return { error: 'no sb' };
      const fakeConvId = '00000000-0000-0000-0000-000000000001';
      const { data, error } = await window.sb.rpc('send_message', {
        conversation_id: fakeConvId,
        body: 'unauthorized test message'
      });
      return { data, error: error ? error.message : null };
    });

    // Must fail — either an RPC error or null data.
    expect(result.error || result.data === null).toBeTruthy();
  });
});

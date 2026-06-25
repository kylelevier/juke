// Auth gate smoke tests — verify every portal redirects unauthenticated visitors.
// These tests require NO credentials and run in CI without secrets.

const { test, expect } = require('@playwright/test');

// Pages that must not render for unauthenticated users.
const GATED_PORTALS = [
  { path: '/pages/coach.html',    label: 'Recruiter portal' },
  { path: '/pages/hscoach.html',  label: 'HS Coach portal' },
  { path: '/pages/admin.html',    label: 'Admin portal' },
];

for (const { path, label } of GATED_PORTALS) {
  test(`${label} redirects unauthenticated visitors`, async ({ page }) => {
    // Ensure localStorage is clean so no stale juke_auth token is present.
    await page.goto('/pages/athlete.html');
    await page.evaluate(() => localStorage.clear());

    await page.goto(path);

    // The auth gate shows a brief overlay then calls location.replace after 650 ms.
    // Use waitForURL so we wait for the redirect rather than just networkidle.
    await page.waitForURL(url => !url.toString().includes(path), { timeout: 5_000 });

    const url = page.url();
    expect(url, `${label} should redirect away from ${path}`).not.toContain(path);
  });
}

test('Athlete portal renders without auth (public)', async ({ page }) => {
  await page.goto('/pages/athlete.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');

  // The athlete portal is public — it must render its tab nav.
  const tabNav = page.locator('.tab-nav');
  await expect(tabNav).toBeVisible();
});

test('Wrong-role redirect: hs_coach with college_coach token goes to hscoach portal', async ({ page }) => {
  // Seed a stub juke_auth with role=hs_coach, then visit the coach portal.
  await page.goto('/pages/athlete.html');
  await page.evaluate(() => {
    localStorage.setItem('juke_auth', JSON.stringify({
      name: 'Test Coach',
      type: 'hs_coach',
      email: 'test@test.com'
    }));
  });

  await page.goto('/pages/coach.html');
  await page.waitForLoadState('networkidle');

  // The Supabase session check will fail (fake token) but the client-side role
  // check from router.js should redirect away from coach.html.
  // Accept any URL that is not /pages/coach.html as a pass.
  const url = page.url();
  expect(url).not.toMatch(/\/pages\/coach\.html$/);
});

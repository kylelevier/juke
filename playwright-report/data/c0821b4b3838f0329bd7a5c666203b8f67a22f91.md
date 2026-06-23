# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke/auth-gate.spec.js >> Wrong-role redirect: hs_coach with college_coach token goes to hscoach portal
- Location: tests/smoke/auth-gate.spec.js:46:1

# Error details

```
Error: page.evaluate: Execution context was destroyed, most likely because of a navigation
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - img "JUKE" [ref=e3]
    - paragraph [ref=e5]:
      - text: Recruiting
      - emphasis [ref=e6]: her
      - text: way.
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]: Sign in
        - generic [ref=e10]: Your journey starts here.
      - button "Continue with Google" [ref=e11] [cursor=pointer]:
        - img [ref=e12]
        - text: Continue with Google
      - generic [ref=e19]: By signing in you agree to JUKE's terms of service and privacy policy.
  - generic [ref=e20]: © 2026 JUKE · shejukes.com
```

# Test source

```ts
  1  | // Auth gate smoke tests — verify every portal redirects unauthenticated visitors.
  2  | // These tests require NO credentials and run in CI without secrets.
  3  | 
  4  | const { test, expect } = require('@playwright/test');
  5  | 
  6  | // Pages that must not render for unauthenticated users.
  7  | const GATED_PORTALS = [
  8  |   { path: '/pages/coach.html',    label: 'Recruiter portal' },
  9  |   { path: '/pages/hscoach.html',  label: 'HS Coach portal' },
  10 |   { path: '/pages/admin.html',    label: 'Admin portal' },
  11 | ];
  12 | 
  13 | for (const { path, label } of GATED_PORTALS) {
  14 |   test(`${label} redirects unauthenticated visitors`, async ({ page }) => {
  15 |     // Ensure localStorage is clean so no stale juke_auth token is present.
  16 |     await page.goto('/pages/athlete.html');
  17 |     await page.evaluate(() => localStorage.clear());
  18 | 
  19 |     const response = await page.goto(path);
  20 |     // Allow either a 200 (redirect handled client-side) or a server-level redirect.
  21 |     // Wait for navigation to settle.
  22 |     await page.waitForLoadState('networkidle');
  23 | 
  24 |     // The portal must NOT render its main content — it must redirect to login.
  25 |     const url = page.url();
  26 |     expect(url, `${label} should redirect to login, stayed at ${url}`)
  27 |       .not.toContain(path);
  28 | 
  29 |     // Additionally: the main tab navigation or page-wrap must not be visible.
  30 |     const tabNav = page.locator('.tab-nav, .coach-nav, .hs-nav');
  31 |     await expect(tabNav).not.toBeVisible();
  32 |   });
  33 | }
  34 | 
  35 | test('Athlete portal renders without auth (public)', async ({ page }) => {
  36 |   await page.goto('/pages/athlete.html');
  37 |   await page.evaluate(() => localStorage.clear());
  38 |   await page.reload();
  39 |   await page.waitForLoadState('networkidle');
  40 | 
  41 |   // The athlete portal is public — it must render its tab nav.
  42 |   const tabNav = page.locator('.tab-nav');
  43 |   await expect(tabNav).toBeVisible();
  44 | });
  45 | 
  46 | test('Wrong-role redirect: hs_coach with college_coach token goes to hscoach portal', async ({ page }) => {
  47 |   // Seed a stub juke_auth with role=hs_coach, then visit the coach portal.
  48 |   await page.goto('/pages/athlete.html');
  49 |   await page.evaluate(() => {
  50 |     localStorage.setItem('juke_auth', JSON.stringify({
  51 |       name: 'Test Coach',
  52 |       type: 'hs_coach',
  53 |       email: 'test@test.com'
  54 |     }));
  55 |   });
  56 | 
  57 |   await page.goto('/pages/coach.html');
  58 |   await page.waitForLoadState('networkidle');
  59 | 
  60 |   // The Supabase session check will fail (fake token) but the client-side role
  61 |   // check from router.js should redirect away from coach.html.
  62 |   // Accept any URL that is not /pages/coach.html as a pass.
  63 |   const url = page.url();
  64 |   expect(url).not.toMatch(/\/pages\/coach\.html$/);
  65 | 
  66 |   // Clean up.
> 67 |   await page.evaluate(() => localStorage.clear());
     |              ^ Error: page.evaluate: Execution context was destroyed, most likely because of a navigation
  68 | });
  69 | 
```
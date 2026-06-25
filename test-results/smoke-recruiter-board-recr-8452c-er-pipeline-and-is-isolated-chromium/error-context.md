# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke/recruiter-board.spec.js >> recruiter board persistence >> stage write persists to recruiter_pipeline and is isolated
- Location: tests/smoke/recruiter-board.spec.js:24:3

# Error details

```
Error: expect(received).toBeNull()

Received: {"stage": "contacting"}
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - img [ref=e4]
    - generic [ref=e7]:
      - text: Recruiting
      - emphasis [ref=e8]: her
      - text: way.
    - button "Messages" [ref=e10] [cursor=pointer]:
      - img [ref=e11]
  - navigation [ref=e14]:
    - button "Home" [ref=e15] [cursor=pointer]
    - button "Profile" [ref=e16] [cursor=pointer]
    - button "Programs" [ref=e17] [cursor=pointer]
    - button "Board" [ref=e18] [cursor=pointer]
    - button "Messages" [ref=e19] [cursor=pointer]
    - button "Calendar" [ref=e20] [cursor=pointer]
    - button "Readiness" [ref=e21] [cursor=pointer]
  - generic [ref=e23]:
    - generic [ref=e24]:
      - generic [ref=e25]:
        - generic [ref=e26]: "0"
        - generic [ref=e27]: Programs on Board
      - generic [ref=e28]:
        - generic [ref=e29]: "0"
        - generic [ref=e30]: Active Offers
      - generic [ref=e31]:
        - generic [ref=e32]: "0"
        - generic [ref=e33]: Unread Messages
    - generic [ref=e34]:
      - button "All Activity" [ref=e35] [cursor=pointer]
      - button "Interest" [ref=e36] [cursor=pointer]
      - button "Action Needed" [ref=e37] [cursor=pointer]
      - button "Tips & Timeline" [ref=e38] [cursor=pointer]
    - generic [ref=e39]:
      - generic [ref=e40]:
        - generic [ref=e41]: 💡
        - generic [ref=e42]:
          - generic [ref=e43]: The average D1 coach evaluates 200+ recruits per class
          - generic [ref=e44]: That's why your first email matters. Be specific about why you chose their program — coaches delete generic emails immediately.
        - generic [ref=e45]: 5d ago
      - generic [ref=e46]:
        - generic [ref=e47]: 💡
        - generic [ref=e48]:
          - generic [ref=e49]: Academics close more offers than most athletes realize
          - generic [ref=e50]: When coaches have two athletically comparable recruits, the one with stronger grades almost always gets the offer. Make your GPA visible.
        - generic [ref=e51]: 1w ago
      - generic [ref=e52]:
        - generic [ref=e53]: 📅
        - generic [ref=e54]:
          - generic [ref=e55]: "your class: D1 programs are actively building class lists right now"
          - generic [ref=e56]: Peak contact window is open. This is the best time to make initial contact with programs you're serious about.
        - generic [ref=e57]: 1w ago
      - generic [ref=e58]:
        - generic [ref=e59]: 📅
        - generic [ref=e60]:
          - generic [ref=e61]: NCAA Contact Rules — what you need to know
          - generic [ref=e62]: D1 coaches cannot initiate contact before September 1 of an athlete's junior year. You can reach out to them first — and you should.
        - generic [ref=e63]: 10d ago
      - generic [ref=e64]:
        - generic [ref=e65]: 💡
        - generic [ref=e66]:
          - generic [ref=e67]: A recruiting profile without a bio gets significantly fewer responses
          - generic [ref=e68]: Coaches evaluate character and fit — not just athleticism. A few sentences about how you compete and what you're looking for in a program can be the difference.
        - generic [ref=e69]: 2w ago
  - text: No activity logged yet — open a school card to log your first update
  - generic:
    - dialog "Program Profile":
      - generic:
        - button "Close": ‹
        - generic: Program Profile
        - button "Offered"
        - button "+ My Board"
  - contentinfo [ref=e70]:
    - generic [ref=e71]:
      - img [ref=e72]
      - generic [ref=e74]:
        - text: Recruiting
        - emphasis [ref=e75]: her
        - text: way.
    - generic [ref=e76]: Data from collegiateflagfootball.com, IPEDS & College Scorecard. Cost/aid figures are 2023–24 estimates. Verify recruiting links on each program's official athletics site.
  - generic:
    - dialog "Sign in to JUKE":
      - button "Close": ×
      - generic:
        - generic: Sign in to JUKE
        - generic: Save your profile, board, and recruiting data across all your devices.
        - button "Continue with Google":
          - img
          - text: Continue with Google
        - generic:
          - text: Coach or recruiter?
          - link "Request access →":
            - /url: /coach-access.html
  - dialog "Board detail" [ref=e77]
  - dialog "Make the program list yours" [ref=e79]:
    - button "Close" [ref=e80] [cursor=pointer]: ×
    - generic [ref=e81]: Quick Start
    - generic [ref=e82]: Make the program list yours
    - generic [ref=e83]: Three choices tune your matches. You can change them anytime.
    - generic [ref=e84]:
      - generic [ref=e85]:
        - generic [ref=e86]: Sport
        - combobox "Sport" [ref=e87]:
          - option "Flag Football" [selected]
          - option "Soccer"
          - option "Basketball"
          - option "Track & Field"
          - option "Volleyball"
      - generic [ref=e88]:
        - generic [ref=e89]: Grad Year
        - combobox "Grad Year" [ref=e90]:
          - option "Grad year" [selected]
          - option "2026"
          - option "2027"
          - option "2028"
          - option "2029"
          - option "2030"
          - option "2031"
          - option "2032"
      - generic [ref=e91]:
        - generic [ref=e92]: Target Level
        - combobox "Target Level" [ref=e93]:
          - option "Not sure" [selected]
          - option "D1"
          - option "D2"
          - option "D3"
          - option "NAIA"
    - generic [ref=e94]:
      - button "Skip" [ref=e95] [cursor=pointer]
      - button "Show Matches" [ref=e96] [cursor=pointer]
  - generic:
    - generic: Board synced.
```

# Test source

```ts
  1  | // Recruiter board persistence smoke tests.
  2  | // Verifies that stage writes persist to the backend and are isolated per recruiter.
  3  | // Requires env vars:
  4  | //   TEST_RECRUITER_EMAIL
  5  | //   TEST_RECRUITER_PASSWORD
  6  | //   TEST_ATHLETE_USER_ID  — UUID of a live athlete to slot on the board
  7  | 
  8  | const { test, expect } = require('@playwright/test');
  9  | 
  10 | const RECRUITER_EMAIL    = process.env.TEST_RECRUITER_EMAIL;
  11 | const RECRUITER_PASSWORD = process.env.TEST_RECRUITER_PASSWORD;
  12 | const ATHLETE_USER_ID    = process.env.TEST_ATHLETE_USER_ID;
  13 | 
  14 | const SUPABASE_URL = 'https://gvxdabtmksxhujeytofv.supabase.co';
  15 | const SUPABASE_KEY = 'sb_publishable_eERuVHBjTdhkIxpWvCX62A_3bMoXgAn';
  16 | 
  17 | test.describe('recruiter board persistence', () => {
  18 |   test.beforeEach(({ page }) => {
  19 |     if (!RECRUITER_EMAIL || !RECRUITER_PASSWORD || !ATHLETE_USER_ID) {
  20 |       test.skip(true, 'Recruiter credentials / TEST_ATHLETE_USER_ID not set');
  21 |     }
  22 |   });
  23 | 
  24 |   test('stage write persists to recruiter_pipeline and is isolated', async ({ page, browser }) => {
  25 |     // Authenticate via Supabase JS directly (no portal UI — the coach portal
  26 |     // uses a custom auth flow we replicate here through the athlete page client).
  27 |     await page.goto('/pages/athlete.html');
  28 |     await page.waitForLoadState('networkidle');
  29 | 
  30 |     const authResult = await page.evaluate(async ({ url, key, email, password }) => {
  31 |       const client = supabase.createClient(url, key);
  32 |       const { data, error } = await client.auth.signInWithPassword({ email, password });
  33 |       if (error) return { error: error.message };
  34 |       const token = data.session?.access_token;
  35 |       const userId = data.user?.id;
  36 |       return { token, userId };
  37 |     }, { url: SUPABASE_URL, key: SUPABASE_KEY, email: RECRUITER_EMAIL, password: RECRUITER_PASSWORD });
  38 | 
  39 |     expect(authResult.error).toBeUndefined();
  40 |     const token = authResult.token;
  41 |     const recruiterId = authResult.userId;
  42 |     expect(recruiterId).toBeTruthy();
  43 | 
  44 |     // Write a stage via the Supabase REST API directly.
  45 |     const writeResult = await page.evaluate(async ({ url, key, token, recruiterId, athleteId }) => {
  46 |       const client = supabase.createClient(url, key, {
  47 |         global: { headers: { Authorization: `Bearer ${token}` } }
  48 |       });
  49 |       const { error } = await client.from('recruiter_pipeline').upsert({
  50 |         recruiter_id: recruiterId,
  51 |         athlete_user_id: athleteId,
  52 |         stage: 'contacting',
  53 |         updated_at: new Date().toISOString()
  54 |       }, { onConflict: 'recruiter_id,athlete_user_id' });
  55 |       return { error: error ? error.message : null };
  56 |     }, { url: SUPABASE_URL, key: SUPABASE_KEY, token, recruiterId, athleteId: ATHLETE_USER_ID });
  57 | 
  58 |     expect(writeResult.error).toBeNull();
  59 | 
  60 |     // Read it back and verify.
  61 |     const readResult = await page.evaluate(async ({ url, key, token, athleteId }) => {
  62 |       const client = supabase.createClient(url, key, {
  63 |         global: { headers: { Authorization: `Bearer ${token}` } }
  64 |       });
  65 |       const { data, error } = await client
  66 |         .from('recruiter_pipeline')
  67 |         .select('stage')
  68 |         .eq('athlete_user_id', athleteId)
  69 |         .maybeSingle();
  70 |       return { data, error: error ? error.message : null };
  71 |     }, { url: SUPABASE_URL, key: SUPABASE_KEY, token, athleteId: ATHLETE_USER_ID });
  72 | 
  73 |     expect(readResult.error).toBeNull();
  74 |     expect(readResult.data?.stage).toBe('contacting');
  75 | 
  76 |     // Isolation check: open a second unauthenticated client and confirm it
  77 |     // cannot read this recruiter's pipeline row.
  78 |     const isolationResult = await page.evaluate(async ({ url, key, athleteId }) => {
  79 |       const anonClient = supabase.createClient(url, key);
  80 |       const { data, error } = await anonClient
  81 |         .from('recruiter_pipeline')
  82 |         .select('stage')
  83 |         .eq('athlete_user_id', athleteId)
  84 |         .maybeSingle();
  85 |       return { data, error: error ? error.message : null };
  86 |     }, { url: SUPABASE_URL, key: SUPABASE_KEY, athleteId: ATHLETE_USER_ID });
  87 | 
  88 |     // RLS must block anon reads: data must be null (no row returned).
> 89 |     expect(isolationResult.data).toBeNull();
     |                                  ^ Error: expect(received).toBeNull()
  90 |   });
  91 | });
  92 | 
```
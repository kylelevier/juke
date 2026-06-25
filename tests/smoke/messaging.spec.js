// Messaging smoke tests.
// Requires env vars:
//   TEST_ATHLETE_EMAIL / TEST_ATHLETE_PASSWORD  — Supabase athlete account
//   TEST_RECRUITER_EMAIL / TEST_RECRUITER_PASSWORD — Supabase college_coach account

const { test, expect } = require('@playwright/test');

const ATHLETE_EMAIL     = process.env.TEST_ATHLETE_EMAIL;
const ATHLETE_PASSWORD  = process.env.TEST_ATHLETE_PASSWORD;
const RECRUITER_EMAIL   = process.env.TEST_RECRUITER_EMAIL;
const RECRUITER_PASSWORD= process.env.TEST_RECRUITER_PASSWORD;
const RECRUITER_UUID    = process.env.TEST_RECRUITER_UUID || '03ee3cea-90ce-4e29-8c00-e66675867452';

// Signs in via sb.auth.signInWithPassword (bypasses Google-only UI modal).
// Waits until initMessaging has fired and painted the thread list.
async function signInAsAthlete(page) {
  await page.goto('/pages/athlete.html');
  // Suppress quick-start modal for the test account
  await page.evaluate(() => {
    localStorage.setItem('juke_profile_edit_on_arrival', '1');
  });
  await page.waitForLoadState('networkidle');

  // Wait for sb to be defined (CDN script may still be executing after networkidle)
  await page.waitForFunction(
    () => typeof sb !== 'undefined' && !!sb,
    { timeout: 10_000 }
  );

  const signInError = await page.evaluate(async ([email, password]) => {
    // sb is a const in config.js — not on window, must reference as bare name
    const r = await sb.auth.signInWithPassword({ email, password });
    return r.error ? r.error.message : null;
  }, [ATHLETE_EMAIL, ATHLETE_PASSWORD]);

  if (signInError) throw new Error(`Athlete sign-in failed: ${signInError}`);

  // Dismiss the onboarding modal if it appeared (fires before auth settles)
  await page.evaluate(() => {
    if (typeof JukeOnboarding !== 'undefined') {
      JukeOnboarding.dismiss('athlete', 'quickStart');
    }
    const modal = document.getElementById('onboarding-athlete-modal');
    if (modal) modal.remove();
  });

  // Wait for initMessaging to render the thread list (empty state or threads)
  await page.waitForFunction(
    () => {
      const list = document.getElementById('msg-thread-list');
      return list && list.innerHTML.trim().length > 0 && !list.querySelector('.msg-loading');
    },
    { timeout: 15_000 }
  );
}

async function openMessagesTab(page) {
  await page.evaluate(() => {
    if (typeof switchTab === 'function') switchTab('messages');
    if (typeof renderMsgThreadList === 'function') renderMsgThreadList();
    if (typeof updateMsgBadge === 'function') updateMsgBadge();
  });
  await page.waitForFunction(
    () => {
      const list = document.getElementById('msg-thread-list');
      return list && list.innerHTML.trim().length > 0 && !list.querySelector('.msg-loading');
    },
    { timeout: 15_000 }
  );
}

async function signInWithSupabase(page, email, password) {
  await page.goto('/pages/athlete.html');
  await page.evaluate(() => localStorage.clear());
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(
    () => typeof sb !== 'undefined' && !!sb,
    { timeout: 10_000 }
  );

  const signInError = await page.evaluate(async ([email, password]) => {
    const r = await sb.auth.signInWithPassword({ email, password });
    return r.error ? r.error.message : null;
  }, [email, password]);

  if (signInError) throw new Error(`Supabase sign-in failed: ${signInError}`);
}

async function signInAsRecruiter(page) {
  await signInWithSupabase(page, RECRUITER_EMAIL, RECRUITER_PASSWORD);
  await page.goto('/pages/coach.html');
  await page.waitForFunction(
    () => typeof currentUser !== 'undefined' && !!currentUser && typeof renderMsgThreadList === 'function',
    { timeout: 15_000 }
  );
  await page.click('#tab-messages');
  await page.waitForFunction(
    () => {
      const list = document.getElementById('msg-thread-list');
      return list && list.innerHTML.trim().length > 0 && !list.querySelector('.msg-loading');
    },
    { timeout: 15_000 }
  );
}

async function markAllMessagesRead(page) {
  await page.evaluate(async () => {
    const uid = currentUser && currentUser.id;
    if (!uid) return;
    const { data: convs } = await sb
      .from('conversations')
      .select('id,participant_a,participant_b')
      .or('participant_a.eq.' + uid + ',participant_b.eq.' + uid);
    for (const conv of convs || []) {
      await sb.rpc('mark_conversation_read', { p_conversation_id: conv.id });
    }
    if (typeof renderMsgThreadList === 'function') await renderMsgThreadList();
    if (typeof updateMsgBadge === 'function') await updateMsgBadge();
  });
}

test.describe('messaging', () => {
  test.beforeEach(({ page }) => {
    if (!ATHLETE_EMAIL || !ATHLETE_PASSWORD) {
      test.skip(true, 'TEST_ATHLETE_EMAIL / TEST_ATHLETE_PASSWORD not set');
    }
  });

  test('thread list renders after sign-in', async ({ page }) => {
    await signInAsAthlete(page);

    await openMessagesTab(page);
    const list = page.locator('#msg-thread-list');
    await expect(list).not.toBeEmpty({ timeout: 5_000 });

    // Should show either the empty state or thread items — not a blank panel
    const html = await list.innerHTML();
    const hasEmptyState = html.includes('msg-thread-empty') || html.includes('No conversations yet');
    const hasThreadItems = html.includes('msg-thread-item') || html.includes('msg-thread');
    expect(hasEmptyState || hasThreadItems).toBeTruthy();
  });

  test('+ New Message modal opens and recipient search works', async ({ page }) => {
    await signInAsAthlete(page);
    await openMessagesTab(page);

    // The button invokes openNewMsg(); call the same public handler to avoid
    // unrelated post-login overlays making pointer clicks flaky.
    await page.evaluate(() => openNewMsg());

    // Search input appears
    const searchInput = page.locator('#msg-new-search');
    await expect(searchInput).toBeVisible({ timeout: 3_000 });

    // Type to search — any results are fine; no JS error is the assertion
    await searchInput.fill('coach');
    await page.waitForTimeout(700);

    const resultsEl = page.locator('#msg-new-results');
    await expect(resultsEl).toBeVisible({ timeout: 3_000 });
  });

  test('send_message RPC uses correct p_-prefixed params and rejects non-participants', async ({ page }) => {
    await signInAsAthlete(page);

    // Call the RPC with a conversation the athlete is not in — must fail
    const result = await page.evaluate(async () => {
      if (typeof sb === 'undefined' || !sb) return { error: 'no sb' };
      const fakeConvId = '00000000-0000-0000-0000-000000000001';
      const { data, error } = await sb.rpc('send_message', {
        p_conversation_id: fakeConvId,
        p_body: 'unauthorized test message'
      });
      return { data, error: error ? error.message : null };
    });

    expect(result.error || result.data === null).toBeTruthy();
  });

  test('athlete can send a message and it lands in the DB', async ({ page }) => {
    if (!RECRUITER_EMAIL) test.skip(true, 'TEST_RECRUITER_EMAIL not set');

    await signInAsAthlete(page);

    // Get or create a conversation — use known UUID directly to avoid display-name search ambiguity
    const RECRUITER_UUID = '03ee3cea-90ce-4e29-8c00-e66675867452';
    const convResult = await page.evaluate(async ([recruiterId]) => {
      if (typeof sb === 'undefined' || !sb) return { error: 'no sb' };
      const { data: conv, error: convErr } = await sb.rpc('get_or_create_conversation', {
        other_user_id: recruiterId
      });
      if (convErr) return { error: convErr.message };
      return { convId: conv, recruiterId };
    }, [RECRUITER_UUID]);

    if (convResult.error) throw new Error(`Conversation setup failed: ${convResult.error}`);

    const testBody = `Playwright smoke test ${Date.now()}`;

    // Send via RPC with correct p_-prefixed params
    const sendResult = await page.evaluate(async ([convId, body]) => {
      if (typeof sb === 'undefined' || !sb) return { error: 'no sb' };
      const { data, error } = await sb.rpc('send_message', {
        p_conversation_id: convId,
        p_body: body
      });
      return { data, error: error ? error.message : null };
    }, [convResult.convId, testBody]);

    expect(sendResult.error).toBeNull();
    expect(sendResult.data).toBeTruthy();

    // Verify it landed in the DB
    const dbCheck = await page.evaluate(async ([convId, body]) => {
      if (typeof sb === 'undefined' || !sb) return { found: false };
      const { data } = await sb
        .from('messages')
        .select('id, body')
        .eq('conversation_id', convId)
        .eq('body', body)
        .maybeSingle();
      return { found: !!data };
    }, [convResult.convId, testBody]);

    expect(dbCheck.found).toBeTruthy();
  });

  test('athlete and recruiter complete a two-way messaging flow', async ({ browser }) => {
    test.setTimeout(60_000);
    if (!RECRUITER_EMAIL || !RECRUITER_PASSWORD) {
      test.skip(true, 'TEST_RECRUITER_EMAIL / TEST_RECRUITER_PASSWORD not set');
    }

    const athleteContext = await browser.newContext();
    const recruiterContext = await browser.newContext();
    const athletePage = await athleteContext.newPage();
    const recruiterPage = await recruiterContext.newPage();

    try {
      await signInAsAthlete(athletePage);
      await signInAsRecruiter(recruiterPage);

      await markAllMessagesRead(athletePage);
      await markAllMessagesRead(recruiterPage);

      await athletePage.click('#tab-messages');
      await expect(athletePage.locator('#msg-thread-list')).not.toBeEmpty();

      // Verify the athlete + New Message modal opens and can search.
      await athletePage.locator('button[onclick="openNewMsg()"]').click();
      await expect(athletePage.locator('#msg-new-search')).toBeVisible({ timeout: 3_000 });
      await athletePage.fill('#msg-new-search', 'coach');
      await expect(athletePage.locator('#msg-new-results')).toBeVisible({ timeout: 3_000 });
      await athletePage.evaluate(() => window._closeNewMsgModal && window._closeNewMsgModal());

      // Start/open the recruiter conversation, then send through the UI.
      await athletePage.evaluate(async recruiterId => {
        await window.openNewMsg(recruiterId);
      }, RECRUITER_UUID);
      await expect(athletePage.locator('#msg-convo')).toBeVisible({ timeout: 10_000 });

      const athleteBody = `Athlete first message ${Date.now()}`;
      await athletePage.fill('#msg-compose-area', athleteBody);
      await athletePage.locator('.msg-send-btn').click();
      await expect(athletePage.locator('#msg-bubbles')).toContainText(athleteBody, { timeout: 10_000 });
      await expect(athletePage.locator('.msg-bubble-status.error')).toHaveCount(0);

      await athletePage.evaluate(() => window.closeMsgThread && window.closeMsgThread());
      await expect(athletePage.locator('#msg-empty-state')).toBeVisible();

      // Verify the recruiter + New Message modal opens on the coach portal too.
      await recruiterPage.locator('button[onclick="openCoachNewMessage()"]').click();
      await expect(recruiterPage.locator('#msg-new-search')).toBeVisible({ timeout: 3_000 });
      await recruiterPage.fill('#msg-new-search', 'athlete');
      await expect(recruiterPage.locator('#msg-new-results')).toBeVisible({ timeout: 3_000 });
      await recruiterPage.evaluate(() => window._closeNewMsgModal && window._closeNewMsgModal());

      await recruiterPage.evaluate(() => renderMsgThreadList());
      const recruiterThread = recruiterPage.locator('.msg-thread-item', { hasText: athleteBody }).first();
      await expect(recruiterThread).toBeVisible({ timeout: 15_000 });
      await expect(recruiterThread).toHaveClass(/unread/);
      await recruiterThread.click();
      await expect(recruiterPage.locator('#msg-bubbles')).toContainText(athleteBody, { timeout: 10_000 });

      const recruiterReply = `Recruiter reply ${Date.now()}`;
      await recruiterPage.fill('#msg-compose-area', recruiterReply);
      await recruiterPage.locator('.msg-send-btn').click();
      await expect(recruiterPage.locator('#msg-bubbles')).toContainText(recruiterReply, { timeout: 10_000 });
      await expect(recruiterPage.locator('.msg-bubble-status.error')).toHaveCount(0);

      await expect.poll(async () => {
        return athletePage.evaluate(async reply => {
          await window.renderMsgThreadList();
          const n = await window.updateMsgBadge();
          const list = document.getElementById('msg-thread-list');
          return {
            unread: n,
            loading: !!(list && list.querySelector('.msg-loading')),
            text: list ? list.textContent : ''
          };
        }, recruiterReply);
      }, { timeout: 15_000 }).toMatchObject({
        loading: false,
        text: expect.stringContaining(recruiterReply)
      });

      await expect(athletePage.locator('#msg-tab-badge')).toBeVisible();
      await expect(athletePage.locator('#feed-unread-count')).not.toHaveText('0');

      const athleteThread = athletePage.locator('.msg-thread-item', { hasText: recruiterReply }).first();
      await expect(athleteThread).toHaveClass(/unread/);
      await athleteThread.click();
      await expect(athletePage.locator('#msg-bubbles')).toContainText(recruiterReply, { timeout: 10_000 });

      await athletePage.waitForFunction(async () => {
        const n = await window.updateMsgBadge();
        return n === 0;
      }, null, { timeout: 10_000 });
      await expect(athletePage.locator('#msg-tab-badge')).toBeHidden();
      await expect(athletePage.locator('#feed-unread-count')).toHaveText('0');
      await expect(athletePage.locator('.msg-thread-item', { hasText: recruiterReply }).first()).not.toHaveClass(/unread/);
    } finally {
      await athleteContext.close();
      await recruiterContext.close();
    }
  });

  test('thread list empty state renders when there are no conversations', async ({ page }) => {
    await page.setContent('<div id="msg-thread-list"></div><span id="msg-tab-badge"></span>');
    await page.addScriptTag({
      content: `
        window.currentUser = { id: 'athlete-empty-state' };
        window.sb = {
          auth: { onAuthStateChange() {} },
          removeChannel() {},
          channel() {
            return { on() { return this; }, subscribe() { return this; } };
          },
          from(table) {
            if (table === 'conversations') {
              return {
                select() { return this; },
                or() { return this; },
                order() { return Promise.resolve({ data: [], error: null }); }
              };
            }
            if (table === 'messages') {
              return {
                select() { return this; },
                in() { return this; },
                neq() { return this; },
                is() { return Promise.resolve({ data: [], count: 0, error: null }); }
              };
            }
            return { update() { return { eq() { return Promise.resolve({ error: null }); } }; } };
          }
        };
      `
    });
    await page.addScriptTag({ path: 'js/messaging.js' });

    await page.evaluate(() => renderMsgThreadList());
    const list = page.locator('#msg-thread-list');
    await expect(list.locator('.msg-thread-empty')).toBeVisible();
    await expect(list).toContainText('No conversations yet.');
    await expect(list).toContainText('Start a conversation');
  });
});

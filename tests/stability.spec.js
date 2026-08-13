/*
 * Regression suite for the v4.4.1 frontend consolidation.
 *
 * Run with: npm install && npx playwright install chromium && npm test
 *
 * Serves the repo root as static files (no build step) and drives
 * flowz-v3-duo.html directly.
 *
 * Coverage:
 *   1. initial render
 *   2. version / title / Duo Sync position stable for 30s (no polling)
 *   3. profile switch kedy <-> Leni, repeated
 *   4. every mode selection opens the right prompt
 *   5. compact linked Duo Sync status
 *   6. pending session restore
 *   7. auto complete records XP exactly once
 *   8. legacy data migration
 *   9. repeated render does not grow the DOM
 *  10. no JS errors, no data loss
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const http = require('http');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.png':'image/png' };

function startServer(){
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/flowz-v3-duo.html';
      const filePath = path.join(ROOT, p);
      fs.readFile(filePath, (err, data) => {
        if (err) { res.statusCode = 404; res.end('not found'); return; }
        res.setHeader('Content-Type', MIME[path.extname(filePath)] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

let server, baseURL;
test.beforeAll(async () => {
  server = await startServer();
  baseURL = `http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async () => { await new Promise((r) => server.close(r)); });

const BACKFILL_MARKER = 'flowz_backfill_2026_07_08_to_08_05_v1';

/* Seed localStorage before any page script runs. Marking the one-off backfill
   as already applied keeps XP assertions independent of it.
   addInitScript reruns on every navigation in this page, including
   page.reload() -- guard with a sessionStorage flag (which itself
   survives reload but not a new tab) so a reload sees the state the
   app actually left behind instead of the original seed again. */
function seed(page, entries){
  return page.addInitScript((data) => {
    if (sessionStorage.getItem('__flowzSeeded__')) return;
    sessionStorage.setItem('__flowzSeeded__', '1');
    for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
  }, { [BACKFILL_MARKER]: 'done', ...entries });
}

function trackErrors(page){
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  return errors;
}

const emptyState = JSON.stringify({
  version: 4,
  profiles: { kedy: { days: {}, sessions: [] }, leni: { days: {}, sessions: [] } },
  migrated: true, updatedAt: ''
});

/* ------------------------------------------------------------------ */

test('stays visually still for 30s, across profile switches and resume, with no JS errors or data loss', async ({ page }) => {
  const errors = trackErrors(page);
  await seed(page, {});
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#modes .mode');

  const snapshot = async () => page.evaluate(() => ({
    version: document.querySelector('.version').textContent,
    title: document.title,
    footer: [...document.querySelectorAll('body>.note')].map((n) => n.textContent).join('|'),
    cloudIndex: [...document.body.children].indexOf(document.getElementById('flowzCloudPanel')),
    modeIds: [...document.querySelectorAll('#modes .mode')].map((b) => b.dataset.modeId),
    labels: [...document.querySelectorAll('#modes .mode-label')].map((l) => l.textContent),
    bodyChildren: document.body.children.length,
    dataLength: (localStorage.getItem('flowz_duo_data') || '').length
  }));

  const initial = await snapshot();
  expect(initial.version).toBe('v4.4.1 (2026.8.14)');
  expect(initial.title).toBe('Flowz v4.4.1 · Duo Battle');
  // kedy's final tile order. COMMUTE is the Talk Prep card above the grid.
  expect(initial.modeIds).toEqual(['toeic', 'bath', 'review', 'free']);
  expect(initial.labels).toEqual(['🛁 BATH ROUTINE · mikan 30 → Flowz', '🎲 ANYTIME · OPEN TALK']);
  expect(initial.cloudIndex).toBeGreaterThan(0);

  // The core bug: nothing may rewrite the version, the tiles, the panel
  // position, or localStorage while the app just sits there.
  await page.waitForTimeout(30000);
  const after30s = await snapshot();
  expect(after30s).toEqual(initial);

  // repeated profile switching must not corrupt the layout
  for (let i = 0; i < 3; i++) {
    await page.click('.profile-btn[data-profile="leni"]');
    await expect(page.locator('#modes .mode')).toHaveCount(4);
    await page.click('.profile-btn[data-profile="kedy"]');
    await expect(page.locator('#modes .mode')).toHaveCount(4);
  }
  expect(await snapshot()).toEqual(initial);

  // iOS Safari background -> foreground
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('pageshow'));
  });
  await page.waitForTimeout(500);
  expect(await snapshot()).toEqual(initial);

  expect(errors).toEqual([]);
});

test('no always-on DOM watchers or polling timers are installed', async ({ page }) => {
  // Instrument before any app code runs, so any global observer/timer is caught.
  await page.addInitScript(() => {
    window.__observed = [];
    window.__intervals = [];
    const realObserve = MutationObserver.prototype.observe;
    MutationObserver.prototype.observe = function(target, opts){
      window.__observed.push({ tag: target && target.nodeName, subtree: !!(opts && opts.subtree) });
      return realObserve.apply(this, arguments);
    };
    const realInterval = window.setInterval;
    window.setInterval = function(fn, ms){
      // Attribute the call to its source file via the stack, so a timer
      // owned by a third-party script (e.g. the Supabase realtime client's
      // own heartbeat) doesn't get confused with one Flowz itself installed.
      window.__intervals.push({ ms: ms, stack: String(new Error().stack || '') });
      return realInterval.apply(this, arguments);
    };
  });
  await seed(page, {});
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#modes .mode');
  await page.waitForTimeout(2000);

  const { observed, intervals } = await page.evaluate(() => ({
    observed: window.__observed, intervals: window.__intervals
  }));
  // No subtree observer on documentElement/body — that was the DOM-forcing repair loop.
  expect(observed.filter((o) => o.subtree && /HTML|BODY/.test(o.tag || ''))).toEqual([]);
  // No repeating timer owned by flowz-app.js itself (a third-party script,
  // e.g. Supabase's realtime client heartbeat, may legitimately use one).
  expect(intervals.filter((i) => /flowz-app\.js/.test(i.stack))).toEqual([]);
});

test('every kedy mode opens its own prompt with the required rules', async ({ page }) => {
  await seed(page, {});
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#modes .mode');

  const p = await page.evaluate(() => {
    const b = window.FlowzApp.buildPromptFor;
    const m = { theme: 't', phrase: 'p', meaning: 'm' };
    return {
      commute: b({ profile: 'kedy', mode: 'commute', mission: m }),
      toeic:   b({ profile: 'kedy', mode: 'toeic',   mission: m }),
      bath:    b({ profile: 'kedy', mode: 'bath',    mission: m }),
      review:  b({ profile: 'kedy', mode: 'review',  mission: m }),
      free:    b({ profile: 'kedy', mode: 'free',    mission: m }),
      leni:    b({ profile: 'leni', mode: 'work',    mission: { theme: 't', phrase: 'p', reading: 'r', meaning: 'm' } })
    };
  });

  // COMMUTE: no Notion before/during, Diary only at wrap-up, 80/20,
  // one short shadowing sentence at a time, no fatigue softening,
  // immediate topic redirection, never a praise-only turn, voice-only,
  // arrival review, and no self-ending.
  expect(p.commute).toMatch(/Do not call Notion, web, or any connected tool before your first reply/);
  expect(p.commute).toMatch(/Only use Notion after he says 'まとめて' or 'Wrap up'/);
  expect(p.commute).toMatch(/about 80 percent and shadowing about 20 percent/);
  expect(p.commute).toMatch(/Never end a turn with only praise/);
  expect(p.commute).toMatch(/Assume the screen is not visible/);
  expect(p.commute).toMatch(/Arrival Review/);
  expect(p.commute).toMatch(/Do not close the conversation until kedy explicitly ends it/);
  expect(p.commute).toMatch(/reply like a normal conversation partner once/); // no greeting ping-pong
  expect(p.commute).toMatch(/speak exactly one short sentence per assistant turn/);
  expect(p.commute).toMatch(/Never combine multiple shadowing sentences in one spoken turn/);
  expect(p.commute).toMatch(/wait for exactly one repetition before giving the next/);
  expect(p.commute).toMatch(/do not offer an easier lesson, rest, stopping, or ending/);
  expect(p.commute).toMatch(/immediately follow the new direction/);
  expect(p.commute).toMatch(/Never proactively offer to end the session/);

  // TOEIC CHECK: 5 questions, L3/R2, 5-8 minutes.
  expect(p.toeic).toMatch(/five-question TOEIC Listening & Reading mini-check in about five to eight minutes/);
  expect(p.toeic).toMatch(/three listening-style questions and two reading-style questions/);

  // TOEIC STUDY: voice, 5 questions, 5-8 minutes, and explicitly no score.
  expect(p.bath).toMatch(/Voice Talk/);
  expect(p.bath).toMatch(/exactly five practice questions/);
  expect(p.bath).toMatch(/about five to eight minutes/);
  expect(p.bath).toMatch(/Do not give a TOEIC score/);

  // REVIEW: 3-5 min, 3 phrases from recent Diary logs, one at a time,
  // appends to the existing Diary and re-fetches to verify.
  expect(p.review).toMatch(/3–5 minute review/);
  expect(p.review).toMatch(/recent Diary English Logs and choose three/);
  expect(p.review).toMatch(/one short Japanese situation at a time/);
  expect(p.review).toMatch(/append a Review Log to today's existing Diary page and fetch it again to verify/);
  expect(p.review).toMatch(/Do not create a new Diary page/);

  // FREE: no fixed lesson, and never stops on an acknowledgement.
  expect(p.free).toMatch(/Never end a turn with only praise, acknowledgement/);
  expect(p.free).toMatch(/continue a real conversation/);
  expect(p.free).not.toMatch(/five-question|shadowing about 20 percent/);

  // FREE and REVIEW stay separate modes.
  expect(p.free).not.toBe(p.review);

  // Leni's Japanese coaching is untouched.
  expect(p.leni).toMatch(/guru bahasa Jepang pribadi Leni/);
  expect(p.leni).toMatch(/bacaan hiragana/);
  expect(p.leni).toMatch(/介護現場の報告・敬語・体調説明/);
});

test('selecting each tile shows the matching mission card and start label', async ({ page }) => {
  await seed(page, {});
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#modes .mode');

  const cases = [
    ['toeic',  'START TOEIC CHECK · 5Q', 'Voice 5問チェック。Listening 3問＋Reading 2問を約5〜8分で採点。'],
    ['bath',   'START TOEIC STUDY · 5Q', 'Voice Talk専用。画面を見ながら話さず、耳だけで答える5問・約5〜8分。'],
    ['review', 'START REVIEW',           '約3〜5分。直近のDiary English Logから3フレーズを1問ずつ復習。'],
    ['free',   'START FREE TALK',        '固定レッスンなし。今日話したいことを自然な英会話で続ける。']
  ];
  for (const [id, startLabel, guide] of cases) {
    await page.click(`#modes .mode[data-mode-id="${id}"]`);
    await expect(page.locator('#startBtn')).toHaveText(startLabel);
    await expect(page.locator('#missionGuide')).toHaveText(guide);
    expect(await page.evaluate(() => window.FlowzApp.getPending().mode)).toBe(id);
  }

  // Leni keeps her four Japanese modes.
  await page.click('.profile-btn[data-profile="leni"]');
  expect(await page.evaluate(() => [...document.querySelectorAll('#modes .mode')].map((b) => b.dataset.modeId)))
    .toEqual(['free', 'work', 'n2', 'kanji']);
});

test('a linked Duo Room renders as a compact status strip', async ({ page }) => {
  await seed(page, {
    flowz_duo_data: emptyState,
    flowz_duo_cloud_v1: JSON.stringify({
      roomId: 'test-room-id', roomCode: '829018', profile: 'kedy',
      linkedAt: new Date().toISOString(), migratedAt: new Date().toISOString()
    })
  });
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#flowzCloudPanel .cloud-compact');

  await expect(page.locator('#flowzCloudPanel .cloud-compact')).toHaveCount(1);
  await expect(page.locator('#flowzCloudPanel .cloud-room')).toContainText('829018');
  await expect(page.locator('#flowzCloudPanel .cloud-code')).toHaveCount(0);
  await expect(page.locator('#flowzCloudPanel .cloud-latest')).toHaveCount(0);
  await expect(page.locator('#flowzCloudPanel .cloud-note')).toHaveCount(0);
  await expect(page.locator('#flowzCloudPanel')).toHaveAttribute('data-linked', 'true');
});

test('a pending session is restored on reload and shown as started', async ({ page }) => {
  const startedAt = new Date(Date.now() - 30 * 1000).toISOString(); // under the 2min auto-complete floor
  await seed(page, {
    flowz_duo_data: emptyState,
    flowz_duo_pending: JSON.stringify({
      profile: 'kedy', mode: 'toeic', title: 'TOEIC CHECK', startedAt, autoRecord: true,
      mission: { theme: 'Schedule changes', phrase: 'Has the meeting been moved?', meaning: '会議は変更されましたか' }
    })
  });
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#modes .mode');

  await expect(page.locator('#mission')).toHaveClass(/show/);
  await expect(page.locator('#missionMode')).toHaveText('TOEIC CHECK');
  await expect(page.locator('#startBtn')).toHaveText('SESSION STARTED ✓');
  await expect(page.locator('#startBtn')).toBeDisabled();
  await expect(page.locator('#pending')).toHaveClass(/show/);

  // Too recent to auto-record: still pending, no XP yet.
  expect(await page.evaluate(() => window.FlowzApp.getPending() !== null)).toBe(true);
  expect(await page.evaluate(() => Object.keys(window.FlowzApp.getState().profiles.kedy.days).length)).toBe(0);
});

test('an elapsed session auto-completes and records XP exactly once', async ({ page }) => {
  const startedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // well past the 2min floor
  await seed(page, {
    flowz_duo_data: emptyState,
    flowz_duo_pending: JSON.stringify({
      profile: 'kedy', mode: 'commute', title: 'COMMUTE', startedAt, autoRecord: true,
      mission: { theme: 'Getting home soon', phrase: "I'll be home in five minutes.", meaning: 'あと5分で家に着く' }
    })
  });
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#modes .mode');
  await page.waitForFunction(() => window.FlowzApp.getPending() === null);

  const read = () => page.evaluate(() => {
    const k = window.FlowzApp.getState().profiles.kedy;
    const day = Object.keys(k.days)[0];
    return { days: Object.keys(k.days).length, base: k.days[day].base, count: k.days[day].count, sessions: k.sessions.length };
  });

  const once = await read();
  expect(once).toEqual({ days: 1, base: 10, count: 1, sessions: 1 });
  await expect(page.locator('#todayTitle')).toHaveText('SESSION DONE ✓');
  await expect(page.locator('#todayXp')).toHaveText('10');
  expect(await page.evaluate(() => localStorage.getItem('flowz_duo_pending'))).toBeNull();

  // Every resume path fires again -- XP must not be recorded a second time.
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      window.dispatchEvent(new Event('pageshow'));
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(200);
  }
  expect(await read()).toEqual(once);

  // A full reload must not re-award it either.
  await page.reload();
  await page.waitForSelector('#modes .mode');
  expect(await read()).toEqual(once);
});

test('legacy localStorage shapes migrate into flowz_duo_data without loss', async ({ page }) => {
  await seed(page, {
    // v3-era key, no flowz_duo_data at all
    flowz_duo_v3: JSON.stringify({
      version: 4,
      profiles: {
        kedy: { days: { '2026-08-03': { base: 10, phrase: 3, fix: 0, duo: 0, count: 1, mode: 'commute' } }, sessions: [] },
        leni: { days: { '2026-08-03': { base: 10, phrase: 0, fix: 0, duo: 0, count: 1, mode: 'free' } }, sessions: [] }
      }
    }),
    // a backup holding a day the v3 key does not have
    flowz_duo_data_backup: JSON.stringify({
      version: 4,
      profiles: {
        kedy: { days: { '2026-08-04': { base: 10, phrase: 0, fix: 0, duo: 0, count: 1, mode: 'commute' } }, sessions: [] },
        leni: { days: {}, sessions: [] }
      }
    }),
    // pre-v3 flat format
    tm_days: JSON.stringify(['2026-08-05']),
    tm_last: '2026-08-06'
  });
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#modes .mode');

  const kedyDays = await page.evaluate(() => Object.keys(window.FlowzApp.getState().profiles.kedy.days).sort());
  // union of every source, nothing dropped
  expect(kedyDays).toEqual(['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06']);

  // flowz_duo_data is the canonical key and now holds the merge
  const canonical = await page.evaluate(() => JSON.parse(localStorage.getItem('flowz_duo_data')));
  expect(Object.keys(canonical.profiles.kedy.days).sort()).toEqual(kedyDays);
  expect(canonical.profiles.kedy.days['2026-08-03'].phrase).toBe(3); // bonus XP survived
  expect(canonical.profiles.leni.days['2026-08-03'].base).toBe(10);  // Leni's history survived
});

test('repeated renders do not duplicate DOM nodes', async ({ page }) => {
  const errors = trackErrors(page);
  await seed(page, {});
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#modes .mode');

  const counts = () => page.evaluate(() => ({
    body: document.body.children.length,
    modes: document.querySelectorAll('#modes > *').length,
    labels: document.querySelectorAll('#modes .mode-label').length,
    week: document.querySelectorAll('#weekStrip > *').length,
    prep: document.querySelectorAll('#flowzTalkPrep > *').length,
    cloud: document.querySelectorAll('#flowzCloudPanel > *').length,
    assessment: document.querySelectorAll('#flowzAssessment > *').length,
    notes: document.querySelectorAll('body > .note').length,
    styles: document.querySelectorAll('style').length
  }));

  const before = await counts();
  await page.evaluate(() => { for (let i = 0; i < 25; i++) window.FlowzApp.render(); });
  expect(await counts()).toEqual(before);

  // and via the real user path, not just the debug hook
  for (let i = 0; i < 5; i++) {
    await page.click('.profile-btn[data-profile="leni"]');
    await page.click('.profile-btn[data-profile="kedy"]');
  }
  expect(await counts()).toEqual(before);
  expect(errors).toEqual([]);
});

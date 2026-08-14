/*
 * Regression suite for the v4.5.0 feedback loop + entry consolidation.
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
  expect(initial.version).toBe('v4.5.1 (2026.8.14)');
  expect(initial.title).toBe('Flowz v4.5.1 · Duo Battle');
  // kedy's final tile order. COMMUTE is the Talk Prep card above the grid.
  expect(initial.modeIds).toEqual(['toeic', 'bath', 'free']);
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
    await expect(page.locator('#modes .mode')).toHaveCount(3);
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

test('every visible kedy mode carries the current coaching and feedback rules', async ({ page }) => {
  await seed(page, {});
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#modes .mode');

  const p = await page.evaluate(() => {
    const b = window.FlowzApp.buildPromptFor;
    const m = { theme: 't', phrase: 'p', meaning: 'm' };
    return {
      commute: b({ profile: 'kedy', mode: 'commute', mission: m }),
      toeic:   b({ profile: 'kedy', mode: 'toeic', mission: m }),
      bath:    b({ profile: 'kedy', mode: 'bath', mission: m }),
      review:  b({ profile: 'kedy', mode: 'review', mission: m }),
      free:    b({ profile: 'kedy', mode: 'free', mission: m }),
      leni:    b({ profile: 'leni', mode: 'work', mission: { theme: 't', phrase: 'p', reading: 'r', meaning: 'm' } })
    };
  });

  expect(p.commute).toMatch(/never delay the first visible reply/i);
  expect(p.commute).toMatch(/Flowz Coach Rules/);
  expect(p.commute).toMatch(/about 80 percent and shadowing about 20 percent/);
  expect(p.commute).toMatch(/speak exactly one short sentence per assistant turn/);
  expect(p.commute).toMatch(/wait for exactly one repetition/);
  expect(p.commute).toMatch(/do not offer an easier lesson, rest, stopping, or ending/);
  expect(p.commute).toMatch(/three to six English words/);
  expect(p.commute).toMatch(/Do not use 'Say: \.\.\.'/);
  expect(p.commute).toMatch(/generic backchannels/);
  expect(p.commute).toMatch(/at most twice in the whole session/);
  expect(p.commute).toMatch(/Complaints, frustration/);
  expect(p.commute).toMatch(/switch immediately to a genuinely different topic/);
  expect(p.commute).toMatch(/Arrival Review/);
  expect(p.commute).toMatch(/30–45 seconds/);
  expect(p.commute).toMatch(/Flowz Feedback Loop/);

  expect(p.toeic).toMatch(/five-question TOEIC Listening & Reading mini-check in about five to eight minutes/);
  expect(p.toeic).toMatch(/exactly three listening-style questions and two reading-style questions/);
  expect(p.toeic).toMatch(/latest two TOEIC Check results/);
  expect(p.toeic).toMatch(/both are at least 4\/5/);
  expect(p.toeic).toMatch(/Do not give Japanese explanations for correctly answered questions/);
  expect(p.toeic).toMatch(/FLOWZ TOEIC RESULT: Lx\/3 Ry\/2/);
  expect(p.toeic).toMatch(/Flowz Feedback Loop/);

  expect(p.bath).toMatch(/exactly five practice questions/);
  expect(p.bath).toMatch(/five to eight minutes/);
  expect(p.bath).toMatch(/mikan for 30 vocabulary questions/);
  expect(p.bath).toMatch(/without Japanese explanation/);
  expect(p.bath).toMatch(/If wrong, give one short Japanese explanation/);
  expect(p.bath).toMatch(/Flowz Feedback Loop/);

  expect(p.free).toMatch(/normal open English conversation/);
  expect(p.free).toMatch(/old standalone REVIEW mode is absorbed into FREE/);
  expect(p.free).toMatch(/explicitly asks to review or revise recent English/);
  expect(p.free).toMatch(/short listening-friendly recap/);
  expect(p.free).toMatch(/Flowz Feedback Loop/);
  expect(p.review).toMatch(/legacy REVIEW pending state/);
  expect(p.review).toMatch(/Do not create or expose a separate REVIEW mode/);

  expect(p.leni).toMatch(/guru bahasa Jepang pribadi Leni/);
  expect(p.leni).toMatch(/bacaan hiragana/);
  expect(p.leni).not.toMatch(/Flowz Coach Rules/);
});

test('selecting visible kedy entries keeps only COMMUTE, BATH TOEIC, and colored FREE', async ({ page }) => {
  await seed(page, {});
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#modes .mode');

  expect(await page.evaluate(() => [...document.querySelectorAll('#modes .mode')].map((b) => b.dataset.modeId)))
    .toEqual(['toeic', 'bath', 'free']);
  await expect(page.locator('#modes .mode[data-mode-id="review"]')).toHaveCount(0);
  await expect(page.locator('#modes .mode[data-mode-id="free"]')).toHaveClass(/m5/);
  await expect(page.locator('#flowzTalkPrepBtn')).toHaveText(/START COMMUTE/);

  const cases = [
    ['toeic', 'START TOEIC CHECK · 5Q', 'Voice 5問チェック。Listening 3問＋Reading 2問を約5〜8分で採点。'],
    ['bath',  'START TOEIC STUDY · 5Q', 'Voice Talk専用。画面を見ながら話さず、耳だけで答える5問・約5〜8分。'],
    ['free',  'START FREE TALK',        '自由英会話。必要な時だけ最近の表現も自然に復習。']
  ];
  for (const [id, startLabel, guide] of cases) {
    await page.click(`#modes .mode[data-mode-id="${id}"]`);
    await expect(page.locator('#startBtn')).toHaveText(startLabel);
    await expect(page.locator('#missionGuide')).toHaveText(guide);
    expect(await page.evaluate(() => window.FlowzApp.getPending().mode)).toBe(id);
  }

  await page.click('.profile-btn[data-profile="leni"]');
  expect(await page.evaluate(() => [...document.querySelectorAll('#modes .mode')].map((b) => b.dataset.modeId)))
    .toEqual(['free', 'work', 'n2', 'kanji']);
});

test('Talk Prep rotates fresh phrases, removes stale fallback, and advances after a commute session', async ({ page }) => {
  const seeded = JSON.stringify({
    version: 4,
    profiles: {
      kedy: {
        days: {},
        sessions: [
          { date:'2026-08-10', mode:'commute', title:'COMMUTE', phrase:"I haven't decided yet.", at:'2026-08-10T08:00:00+09:00' },
          { date:'2026-08-11', mode:'commute', title:'COMMUTE', phrase:'I feel good.', at:'2026-08-11T08:00:00+09:00' },
          { date:'2026-08-12', mode:'commute', title:'COMMUTE', phrase:"It's cooler than usual.", at:'2026-08-12T08:00:00+09:00' },
          { date:'2026-08-13', mode:'commute', title:'COMMUTE', phrase:"I'll be home in five minutes.", at:'2026-08-13T08:00:00+09:00' },
          { date:'2026-08-13', mode:'commute', title:'COMMUTE', phrase:'I just finished work.', at:'2026-08-13T18:00:00+09:00' }
        ]
      },
      leni: { days:{}, sessions:[] }
    },
    migrated: true,
    updatedAt: ''
  });
  await seed(page, { flowz_duo_data: seeded });
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#flowzTalkPrep [data-prep-action="today"]');

  const first = await page.evaluate(() => window.FlowzApp.getTalkPrep());
  expect(first.today.phrase).not.toBe("I haven't decided yet.");
  expect(first.today.phrase).not.toBe('I feel good.');
  expect(first.reuse).not.toBe("I haven't decided yet.");
  expect(first.reuse).not.toBe('I feel good.');
  await expect(page.locator('[data-prep-action="today"] small')).toContainText('タップで切替');
  await expect(page.locator('[data-prep-action="reuse"] small')).toContainText('タップで切替');

  await page.click('[data-prep-action="today"]');
  const afterTodayTap = await page.evaluate(() => window.FlowzApp.getTalkPrep());
  expect(afterTodayTap.today.phrase).not.toBe(first.today.phrase);

  await page.click('[data-prep-action="reuse"]');
  const afterReuseTap = await page.evaluate(() => window.FlowzApp.getTalkPrep());
  expect(afterReuseTap.reuse).not.toBe(afterTodayTap.reuse);

  const missionBeforeSession = afterReuseTap.today;
  await page.evaluate((mission) => {
    localStorage.setItem('flowz_duo_pending', JSON.stringify({
      profile:'kedy', mode:'commute', title:'COMMUTE',
      selectedAt:new Date(Date.now()-11*60*1000).toISOString(),
      startedAt:new Date(Date.now()-10*60*1000).toISOString(),
      autoRecord:true, mission
    }));
  }, missionBeforeSession);
  await page.reload();
  await page.waitForFunction(() => window.FlowzApp.getPending() === null);
  const afterCompletedCommute = await page.evaluate(() => window.FlowzApp.getTalkPrep());
  expect(afterCompletedCommute.today.phrase).not.toBe(missionBeforeSession.phrase);
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

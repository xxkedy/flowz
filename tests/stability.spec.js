/*
 * Regression test for the v4.4.0 frontend consolidation.
 *
 * Run with: npm install -D @playwright/test && npx playwright install chromium
 *           npx playwright test
 *
 * Serves the repo root as static files (no build step) and drives
 * flowz-v3-duo.html directly. Covers the 10 checks requested for the
 * consolidation:
 *   1. version at first paint
 *   2/3. version unchanged after 30s (no polling should touch it)
 *   4. Duo Sync panel DOM position unchanged
 *   5. mode tile count/order unchanged
 *   6. profile switch kedy -> Leni -> kedy stays stable
 *   7. simulated resume (visibilitychange/focus/pageshow) stays stable
 *   8. no JavaScript errors at any point
 *   9. existing localStorage data survives the whole run
 *   10. COMMUTE uses the current prompt (acknowledgement-continuation
 *       rule + Notion-only-at-wrap-up rule both present)
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

test('version, mode grid, and Duo Sync position stay stable across 30s / profile switches / resume, with no JS errors and no data loss', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#modes .mode');

  const snapshot = async () => page.evaluate(() => ({
    version: document.querySelector('.version').textContent,
    title: document.title,
    cloudIndex: [...document.body.children].indexOf(document.getElementById('flowzCloudPanel')),
    modeIds: [...document.querySelectorAll('#modes .mode')].map((b) => b.dataset.modeId),
    dataLength: (localStorage.getItem('flowz_duo_data') || '').length
  }));

  const initial = await snapshot();
  expect(initial.version).toMatch(/^v\d+\.\d+\.\d+/);
  expect(initial.modeIds).toEqual(['toeic', 'bath', 'review', 'free']);
  expect(initial.cloudIndex).toBeGreaterThan(0);
  expect(initial.dataLength).toBeGreaterThan(0);

  // 2/3. wait 30s, version must not drift (this is the exact bug: v4.3.7 vs v4.3.8 flicker)
  await page.waitForTimeout(30000);
  const after30s = await snapshot();
  expect(after30s.version).toBe(initial.version);
  expect(after30s.title).toBe(initial.title);
  // 4. Duo Sync panel never moves
  expect(after30s.cloudIndex).toBe(initial.cloudIndex);
  // 5. mode tiles unchanged
  expect(after30s.modeIds).toEqual(initial.modeIds);
  // 9. localStorage untouched by idle polling
  expect(after30s.dataLength).toBe(initial.dataLength);

  // 6. profile switch stress: kedy -> Leni -> kedy
  await page.click('.profile-btn[data-profile="leni"]');
  await expect(page.locator('#modes .mode')).toHaveCount(4);
  await page.click('.profile-btn[data-profile="kedy"]');
  const afterSwitch = await snapshot();
  expect(afterSwitch.version).toBe(initial.version);
  expect(afterSwitch.modeIds).toEqual(initial.modeIds);
  expect(afterSwitch.cloudIndex).toBe(initial.cloudIndex);

  // 7. simulated resume from background (iOS Safari bfcache / app-switch equivalent)
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('pageshow'));
  });
  await page.waitForTimeout(300);
  const afterResume = await snapshot();
  expect(afterResume.version).toBe(initial.version);
  expect(afterResume.modeIds).toEqual(initial.modeIds);
  expect(afterResume.dataLength).toBe(initial.dataLength);

  // 8. no JS errors anywhere in the run
  expect(errors).toEqual([]);

  // 10. COMMUTE (and FREE) always build from the current prompt: never
  // stops on a bare acknowledgement, and only touches Notion at wrap-up.
  const prompts = await page.evaluate(() => ({
    commute: window.FlowzApp.buildPromptFor({ profile: 'kedy', mode: 'commute', mission: { theme: 't', phrase: 'p', meaning: 'm' } }),
    free: window.FlowzApp.buildPromptFor({ profile: 'kedy', mode: 'free' })
  }));
  expect(prompts.commute).toMatch(/Perfect.*You're welcome.*Got it.*Thanks/);
  expect(prompts.commute).toMatch(/Only use Notion .* after he says/);
  expect(prompts.free).toMatch(/Perfect, You're welcome, Got it, or Thanks/);
});

test('TOEIC CHECK / TOEIC STUDY / REVIEW mission cards render with mode-specific copy', async ({ page }) => {
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.click('#modes .mode[data-mode-id="toeic"]');
  await expect(page.locator('#startBtn')).toHaveText('START TOEIC CHECK · 5Q');
  await page.click('#modes .mode[data-mode-id="bath"]');
  await expect(page.locator('#startBtn')).toHaveText('START TOEIC STUDY · 5Q');
  await page.click('#modes .mode[data-mode-id="review"]');
  await expect(page.locator('#startBtn')).toHaveText('START REVIEW');
});

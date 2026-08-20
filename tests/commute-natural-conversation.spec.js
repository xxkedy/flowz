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

test('COMMUTE voice fallback keeps natural conversation rules even without Notion', async ({ page }) => {
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForFunction(() => window.FlowzApp && window.FlowzCommuteVoiceGuard);

  const result = await page.evaluate(() => {
    const original = window.FlowzApp.buildPromptFor({
      profile: 'kedy',
      mode: 'commute',
      mission: { theme: 'Weather', phrase: "It's cooler than usual.", meaning: 'いつもより涼しい' }
    });
    const guarded = window.FlowzCommuteVoiceGuard.transform(original);
    const encoded = window.encodeURIComponent(original);
    return { original, guarded, decoded: decodeURIComponent(encoded) };
  });

  expect(result.original).not.toMatch(/COMMUTE VOICE FALLBACK:/);
  expect(result.guarded).toMatch(/COMMUTE VOICE FALLBACK:/);
  expect(result.guarded).toMatch(/about 90 percent conversation/);
  expect(result.guarded).toMatch(/enter conversation-only mode for the rest of that session/);
  expect(result.guarded).toMatch(/respond as a real conversation partner/);
  expect(result.guarded).toMatch(/do not silently replace a key noun or idea/);
  expect(result.guarded).toMatch(/Commute is background context/);
  expect(result.guarded).toMatch(/Do not require a retry/);
  expect(result.guarded).toMatch(/genuinely different content domain/);
  expect(result.decoded).toBe(result.guarded);
});

test('voice fallback does not alter FREE or Leni prompts', async ({ page }) => {
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForFunction(() => window.FlowzApp && window.FlowzCommuteVoiceGuard);

  const result = await page.evaluate(() => {
    const free = window.FlowzApp.buildPromptFor({ profile: 'kedy', mode: 'free', mission: {} });
    const leni = window.FlowzApp.buildPromptFor({
      profile: 'leni', mode: 'work',
      mission: { theme: 't', phrase: 'p', reading: 'r', meaning: 'm' }
    });
    return {
      freeSame: window.FlowzCommuteVoiceGuard.transform(free) === free,
      leniSame: window.FlowzCommuteVoiceGuard.transform(leni) === leni
    };
  });

  expect(result.freeSame).toBe(true);
  expect(result.leniSame).toBe(true);
});

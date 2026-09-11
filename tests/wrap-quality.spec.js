const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
function read(name){ return fs.readFileSync(path.join(ROOT, name), 'utf8'); }

test('r18 whole-session wrap and reflection routing guard is loaded last', async () => {
  const adapter = read('flowz-v4.8.6-wrap-quality.js');
  const html = read('flowz-v3-duo.html');
  const index = read('index.html');

  expect(html).toContain('flowz-v4.8.6-wrap-quality.js?v=4.8.6-r18');
  expect(html.indexOf('flowz-v4.8.6-diary-sync.js')).toBeLessThan(html.indexOf('flowz-v4.8.6-wrap-quality.js'));
  expect(index).toContain("params.set('v','4.8.6-r18')");
  expect(adapter).toContain('Flowz Whole-Session Wrap Guard r18:');
  expect(adapter).toContain('summarize the whole session, not only the last few turns');
  expect(adapter).toContain('up to three high-frequency, native, reusable English words or phrases');
  expect(adapter).toContain('English conversation is also a place for kedy to organize thoughts');
  expect(adapter).toContain('Flowz Post-Session Reflection Router r18:');
  expect(adapter).toContain('coach behavior or future conversation rules -> Flowz Coach Rules');
  expect(adapter).toContain('Flowz Implementation Feedback under OPEN');
  expect(adapter).toContain("daily discovery, feeling, or insight -> today's existing Diary");
  expect(adapter).toContain('After every write, re-fetch the same destination and verify');
  expect(adapter).toContain('Modify GitHub only when kedy explicitly asks');
  expect(adapter).toContain("pending.mode==='commute'||pending.mode==='free'");
  expect(adapter).toContain("pending.profile!=='kedy'");
  expect(adapter).toContain("release.number='4.8.6-r18'");
});

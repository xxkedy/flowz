const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('v4.8.6 enforces verified Diary sync wiring', async () => {
  const adapter = fs.readFileSync(path.join(ROOT, 'flowz-v4.8.6-diary-sync.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'flowz-v3-duo.html'), 'utf8');
  const entry = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));

  expect(adapter).toContain('Diary Sync Gate v1:');
  expect(adapter).toContain('Never create a new Diary page');
  expect(adapter).toContain('Update the existing yellow 🗽 English Log block in place');
  expect(adapter).toContain('fetch the same Diary page again and verify');
  expect(adapter).toContain("explicitly say 'Diary未記録'");
  expect(adapter).toContain("pending.profile!=='kedy'");
  expect(html).toContain('flowz-v4.8.6-diary-sync.js?v=4.8.6');
  expect(html).toContain('v4.8.6 (2026.8.22)');
  expect(entry).toContain("params.set('v','4.8.6')");
  expect(pkg.version).toBe('4.8.6');
  expect(lock.version).toBe('4.8.6');
  expect(lock.packages[''].version).toBe('4.8.6');
});

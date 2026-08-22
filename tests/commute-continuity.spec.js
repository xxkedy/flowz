const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('v4.8.6 build retains the v4.8.5 commute continuity adapter', async () => {
  const adapter = fs.readFileSync(path.join(ROOT, 'flowz-v4.8.5-commute-continuity.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'flowz-v3-duo.html'), 'utf8');
  const entry = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

  expect(adapter).toContain('Conversation Continuity Rules:');
  expect(adapter).toContain('Never finish a normal conversation turn with only a short acknowledgement');
  expect(adapter).toContain('Shadowing is a small insert inside the conversation');
  expect(adapter).toContain('immediately return to the same conversation');
  expect(adapter).toContain('Avoid question-after-question interviewing');
  expect(adapter).toContain('increase your share of topic-leading');
  expect(adapter).toContain("mode==='commute'");
  expect(html).toContain('flowz-v4.8.5-commute-continuity.js?v=4.8.6-r1');
  expect(html).toContain('v4.8.6 (2026.8.22)');
  expect(entry).toContain("params.set('v','4.8.6')");
  expect(pkg.version).toBe('4.8.6');
});

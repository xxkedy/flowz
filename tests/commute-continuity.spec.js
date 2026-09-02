const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('v4.8.6 build retains commute continuity, conversation quality, and low-load shadowing override', async () => {
  const adapter = fs.readFileSync(path.join(ROOT, 'flowz-v4.8.5-commute-continuity.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'flowz-v3-duo.html'), 'utf8');
  const entry = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

  expect(adapter).toContain('Conversation Continuity and Quality Rules:');
  expect(adapter).toContain('Treat kedy as a real conversation partner');
  expect(adapter).toContain('Never finish a normal conversation turn with only a short acknowledgement');
  expect(adapter).toContain('specific reaction to what kedy actually said');
  expect(adapter).toContain('enter coach-led conversation');
  expect(adapter).toContain('two to four short audio-friendly sentences');
  expect(adapter).toContain('Do not default to ending every turn with a question');
  expect(adapter).toContain('Avoid generic motivational or counselling filler');
  expect(adapter).toContain('Use lively spoken delivery');
  expect(adapter).toContain('flat, uniformly calm, therapeutic voice');
  expect(adapter).toContain('treat it as conversational material');
  expect(adapter).toContain('change the content domain immediately');
  expect(adapter).toContain('Safety may briefly override conversation only for a concrete immediate hazard');
  expect(adapter).toContain('return to English conversation instead of repeating generic stop, breathe, stay safe');
  expect(adapter).toContain('Shadowing is a small insert inside the conversation');
  expect(adapter).toContain('immediately return to the same conversation');
  expect(adapter).toContain('Low-load Shadowing Override:');
  expect(adapter).toContain('overrides the normal 90/10 shadowing ratio');
  expect(adapter).toContain('exactly one new short natural English sentence per assistant turn');
  expect(adapter).toContain('Do not ask questions, add advice, recap, switch back to conversation');
  expect(adapter).toContain('Do not recycle a sentence he already repeated');
  expect(adapter).toContain('Stay in low-load shadowing mode until kedy clearly asks to talk normally');
  expect(adapter).toContain("if(prompt.indexOf('Low-load Shadowing Override:')<0)");
  expect(adapter).not.toContain("if(prompt.indexOf('Low-load Shadowing Override:')>=0)return prompt;");
  expect(adapter).not.toContain("if(prompt.indexOf('Conversation Continuity Rules:')>=0)return prompt;");
  expect(adapter).toContain("mode==='commute'");
  expect(html).toContain('flowz-v4.8.5-commute-continuity.js?v=4.8.6-r3');
  expect(html).toContain('v4.8.6 (2026.8.22)');
  expect(entry).toContain("params.set('v','4.8.6')");
  expect(pkg.version).toBe('4.8.6');
});

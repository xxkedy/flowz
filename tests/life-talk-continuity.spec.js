const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(name){
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}

test('LIFE TALK continuity guard is loaded and scoped to kedy free mode', async () => {
  const adapter = read('flowz-v4.8.6-life-talk-continuity.js');
  const html = read('flowz-v3-duo.html');

  expect(html).toContain('flowz-v4.8.6-life-talk-continuity.js?v=4.8.6-r1');
  expect(adapter).toContain('LIFE TALK Hard Continuation Guard r1:');
  expect(adapter).toContain("p.profile==='kedy'&&p.mode==='free'");
  expect(adapter).toContain('A minimal reply is a handoff to the coach, not a stopping point.');
  expect(adapter).toContain('add two to four short audio-friendly sentences of actual content');
  expect(adapter).toContain('enter strong coach-led mode');
  expect(adapter).toContain('Never ask him to say the same sentence again');
  expect(adapter).toContain('The session stays active until kedy clearly says Wrap up');
  expect(adapter).toContain('When kedy says Next, do not respond with a final drill or a closing line.');
  expect(adapter).toContain('Never end a normal LIFE TALK turn with only Nice, Perfect, Got it');
  expect(adapter).not.toContain("p.profile==='leni'");
});

from pathlib import Path

app = Path('flowz-app.js')
s = app.read_text(encoding='utf-8')

s = s.replace("number:'4.6.1'", "number:'4.7.0'", 1)
s = s.replace("label:'v4.6.1 (2026.8.21)'", "label:'v4.7.0 (2026.8.21)'", 1)
s = s.replace("title:'Flowz v4.6.1 · Duo Battle'", "title:'Flowz v4.7.0 · Duo Battle'", 1)
s = s.replace("footer:'✅ Last updated 2026.08.21 · Flowz v4.6.1 Unified Build'", "footer:'✅ Last updated 2026.08.21 · Flowz v4.7.0 Unified Build'", 1)

anchor = '''function feedbackLoopRule(modeLabel){
  return "Flowz Feedback Loop: after the learning phase and its spoken result or recap are finished, Japanese comments from kedy about how the session should work are Flowz feedback, not English answers to score or correct. If the feedback is coach behavior, use connected Notion tools to update the existing 'Flowz Coach Rules' page: deduplicate equivalent rules, replace an older rule when the new instruction conflicts, save mode-specific feedback under 'kedy｜"+modeLabel+"', and use 'kedy｜GLOBAL' only when kedy clearly says it should apply across modes. Fetch that page again and verify the update before saying it was saved. If the feedback is a UI, sync, feature, or bug request that requires code, update the existing 'Flowz Implementation Feedback' page under OPEN instead of Coach Rules, reuse an existing matching item, and fetch again to verify. Do not create duplicate pages or GitHub issues. Keep all kedy rules separate from Leni.";
}
'''
insert = anchor + '''function personalContextRule(modeLabel){
  return "Kedy Personal Context Preflight: before the first spoken reply, silently use connected Notion tools to read only the minimum current context needed for a personal conversation: the current HQ page, the active visible ToDo view, the Flowz page, and recent Diary entries with Flowz English logs. From those sources, build a tiny internal snapshot of current focus, active projects or decisions, recent real-life events worth talking about, important unfinished items, recent useful English phrases, repeated mistakes or weak points, and the latest stated English level or next focus. Also use recent ChatGPT conversation context only when it is already available in this conversation or product context; never claim access to unseen chats. Read Flowz Coach Rules for kedy GLOBAL and kedy｜"+modeLabel+" during the same preflight. Never read or expose Leni private context. Do not recite the snapshot, quote private notes, or turn ToDo into reminders or nagging; use it only to choose relevant topics and remember what kedy has been learning. If connected Notion or any source is unavailable, skip that source and continue with built-in defaults without asking kedy to wait. Keep the preflight brief and start the spoken conversation as soon as it finishes.";
}
'''
if anchor not in s:
    raise SystemExit('feedbackLoopRule anchor not found')
s = s.replace(anchor, insert, 1)

old_commute = '''   "Start immediately with a short natural reply. Do not call Notion, web, or any connected tool before that first reply and do not make him wait for background context. On his next turn, the only proactive background read is the Flowz Coach Rules load described below. Do not use Diary or other background tools during normal commute conversation unless kedy explicitly asks you to check a record.",
   coachRulesRule('COMMUTE'),'''
new_commute = '''   personalContextRule('COMMUTE'),'''
if old_commute not in s:
    raise SystemExit('commute preflight source not found')
s = s.replace(old_commute, new_commute, 1)

old_free = '''   "Start immediately with one short natural reply. Do not use a tool before that first reply.",
   coachRulesRule('FREE'),'''
new_free = '''   personalContextRule('FREE'),'''
if old_free not in s:
    raise SystemExit('free preflight source not found')
s = s.replace(old_free, new_free, 1)

app.write_text(s, encoding='utf-8')

html = Path('flowz-v3-duo.html')
h = html.read_text(encoding='utf-8')
h = h.replace('v4.6.1 (2026.8.21)', 'v4.7.0 (2026.8.21)')
h = h.replace('2026.08.21 · Flowz v4.6.1 Unified Build', '2026.08.21 · Flowz v4.7.0 Unified Build')
h = h.replace('flowz-v3-duo.css?v=4.6.1', 'flowz-v3-duo.css?v=4.7.0')
h = h.replace('flowz-app.js?v=4.6.1', 'flowz-app.js?v=4.7.0')
html.write_text(h, encoding='utf-8')

index = Path('index.html')
i = index.read_text(encoding='utf-8').replace('4.6.1', '4.7.0')
index.write_text(i, encoding='utf-8')

tests = Path('tests/stability.spec.js')
t = tests.read_text(encoding='utf-8')
t = t.replace("expect(initial.version).toBe('v4.6.1 (2026.8.21)');", "expect(initial.version).toBe('v4.7.0 (2026.8.21)');")
t = t.replace("expect(initial.title).toBe('Flowz v4.6.1 · Duo Battle');", "expect(initial.title).toBe('Flowz v4.7.0 · Duo Battle');")
t = t.replace("  expect(p.commute).toMatch(/never delay the first visible reply/i);", "  expect(p.commute).toMatch(/Kedy Personal Context Preflight/);\n  expect(p.commute).toMatch(/before the first spoken reply/);\n  expect(p.commute).toMatch(/current HQ page/);\n  expect(p.commute).toMatch(/active visible ToDo view/);\n  expect(p.commute).toMatch(/recent Diary entries with Flowz English logs/);\n  expect(p.commute).toMatch(/recent useful English phrases/);\n  expect(p.commute).toMatch(/repeated mistakes or weak points/);\n  expect(p.commute).toMatch(/Do not recite the snapshot/);\n  expect(p.commute).toMatch(/Do not turn ToDo into reminders or nagging/);")
t = t.replace("  expect(p.free).toMatch(/normal open English conversation/);", "  expect(p.free).toMatch(/Kedy Personal Context Preflight/);\n  expect(p.free).toMatch(/current HQ page/);\n  expect(p.free).toMatch(/recent Diary entries with Flowz English logs/);\n  expect(p.free).toMatch(/normal open English conversation/);")
tests.write_text(t, encoding='utf-8')

Path('CHANGELOG-v4.7.0.md').write_text('''# Flowz v4.7.0 — kedy Personal Context Layer v1

- COMMUTE and FREE run a private preflight before the first spoken reply.
- The preflight reads the minimum useful kedy context from connected Notion: current HQ, active visible ToDo, Flowz, and recent Diary English logs.
- It extracts only a small internal snapshot: current focus, active projects/decisions, recent events, important unfinished items, recent phrases, weak points, and current English level/next focus.
- Flowz Coach Rules are loaded during the same preflight.
- Personal context is never stored in the public GitHub repository and is not shared with Leni.
- ToDo is conversation context only; the coach must not nag or turn the session into task management.
- Recent ChatGPT conversation context may be used only when already available; unseen chats must never be claimed.
- If connected context is unavailable, COMMUTE/FREE continue with built-in defaults instead of blocking.
- Duo Sync, XP/history, Leni Japanese practice, and Leni prompts are unchanged.
''', encoding='utf-8')

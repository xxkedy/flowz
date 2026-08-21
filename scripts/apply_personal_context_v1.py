from pathlib import Path

app = Path('flowz-app.js')
s = app.read_text(encoding='utf-8')

# Release metadata.
for old, new in [
    ("number:'4.6.1'", "number:'4.7.0'"),
    ("label:'v4.6.1 (2026.8.21)'", "label:'v4.7.0 (2026.8.21)'"),
    ("title:'Flowz v4.6.1 · Duo Battle'", "title:'Flowz v4.7.0 · Duo Battle'"),
    ("footer:'✅ Last updated 2026.08.21 · Flowz v4.6.1 Unified Build'", "footer:'✅ Last updated 2026.08.21 · Flowz v4.7.0 Unified Build'"),
]:
    if old not in s:
        raise SystemExit('missing release marker: ' + old)
    s = s.replace(old, new, 1)

# Insert the private context-loader rule before the feedback-loop helper.
marker = "function feedbackLoopRule(modeLabel){"
if marker not in s:
    raise SystemExit('feedbackLoopRule marker missing')
context_fn = '''function personalContextRule(modeLabel){
  return "kedy Personal Context: on kedy's first turn after your immediate opening, silently build one compact private context capsule before choosing the next topic. Use connected Notion tools efficiently to read: (1) the current 📱 HQ top callout/current focus, (2) the actual ✅ ToDo view and only unfinished high/medium or clearly relevant items, respecting completed, postponed, reply-waiting, blocked, and constrained states, (3) recent Diary entries, prioritizing roughly the last three to seven days and any Flowz English logs, Phrase lines, Fix lines, Coach Assessment, CEFR or level notes, (4) the Flowz page and only active project pages clearly relevant to the current focus, and (5) any recent ChatGPT conversation context already available to you from the current conversation, account context, or memory. Do not invent unavailable chat history and do not browse the web for it. Prefer the newest state when sources conflict. Keep the capsule internal: do not read a source list aloud, do not dump tasks, and do not expose kedy's private context to Leni. Use it as conversation fuel: naturally revisit recent events, decisions, projects, feelings, ideas, or learned English; reuse recent phrases when they fit; and tune vocabulary and sentence length to the latest English level evidence. Do not turn this into productivity coaching or a ToDo interrogation, do not nag about unfinished work, and do not ask about every item. If Notion or another source is unavailable, continue immediately with the context you do have and never pretend a source was read. This personal context must not change Duo Sync, XP sharing, or Leni's Japanese-learning behavior. Mode: "+modeLabel+".";
}
'''
s = s.replace(marker, context_fn + marker, 1)

old_open = "   \"Start immediately with a short natural reply. Do not call Notion, web, or any connected tool before that first reply and do not make him wait for background context. On his next turn, the only proactive background read is the Flowz Coach Rules load described below. Do not use Diary or other background tools during normal commute conversation unless kedy explicitly asks you to check a record.\","
new_open = "   \"Start immediately with a short natural reply. Do not call Notion, web, or any connected tool before that first reply and do not make him wait for background context. On his next turn, silently load both the Flowz Coach Rules and kedy Personal Context described below, using available connected tools efficiently. Do not announce the lookup or make him wait. If a source is unavailable, keep talking with the context you have.\","
if old_open not in s:
    raise SystemExit('old COMMUTE opening rule missing')
s = s.replace(old_open, new_open, 1)

old_commute_rules = "   coachRulesRule('COMMUTE'),\n"
new_commute_rules = "   coachRulesRule('COMMUTE'),\n   personalContextRule('COMMUTE'),\n"
if old_commute_rules not in s:
    raise SystemExit('COMMUTE coach rule insertion point missing')
s = s.replace(old_commute_rules, new_commute_rules, 1)

old_free_rules = "   coachRulesRule('FREE'),\n"
new_free_rules = "   coachRulesRule('FREE'),\n   personalContextRule('FREE'),\n"
if old_free_rules not in s:
    raise SystemExit('FREE coach rule insertion point missing')
s = s.replace(old_free_rules, new_free_rules, 1)

app.write_text(s, encoding='utf-8')

# HTML / entrypoint release markers.
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

# Regression assertions.
tests = Path('tests/stability.spec.js')
t = tests.read_text(encoding='utf-8')
t = t.replace("expect(initial.version).toBe('v4.6.1 (2026.8.21)');", "expect(initial.version).toBe('v4.7.0 (2026.8.21)');")
t = t.replace("expect(initial.title).toBe('Flowz v4.6.1 · Duo Battle');", "expect(initial.title).toBe('Flowz v4.7.0 · Duo Battle');")
anchor = "  expect(p.commute).toMatch(/Flowz Coach Rules/);\n"
insert = anchor + "  expect(p.commute).toMatch(/kedy Personal Context/);\n  expect(p.commute).toMatch(/current 📱 HQ top callout\/current focus/);\n  expect(p.commute).toMatch(/actual ✅ ToDo view/);\n  expect(p.commute).toMatch(/recent Diary entries/);\n  expect(p.commute).toMatch(/Flowz English logs/);\n  expect(p.commute).toMatch(/recent ChatGPT conversation context already available/);\n  expect(p.commute).toMatch(/do not expose kedy's private context to Leni/);\n  expect(p.commute).toMatch(/do not nag about unfinished work/);\n"
if anchor not in t:
    raise SystemExit('COMMUTE assertion anchor missing')
t = t.replace(anchor, insert, 1)
free_anchor = "  expect(p.free).toMatch(/normal open English conversation/);\n"
free_insert = free_anchor + "  expect(p.free).toMatch(/kedy Personal Context/);\n  expect(p.free).toMatch(/actual ✅ ToDo view/);\n  expect(p.free).toMatch(/recent Diary entries/);\n"
if free_anchor not in t:
    raise SystemExit('FREE assertion anchor missing')
t = t.replace(free_anchor, free_insert, 1)
leni_anchor = "  expect(p.leni).not.toMatch(/Flowz Coach Rules/);\n"
leni_insert = leni_anchor + "  expect(p.leni).not.toMatch(/kedy Personal Context/);\n"
if leni_anchor not in t:
    raise SystemExit('Leni assertion anchor missing')
t = t.replace(leni_anchor, leni_insert, 1)
tests.write_text(t, encoding='utf-8')

Path('CHANGELOG-v4.7.0.md').write_text('''# Flowz v4.7.0 — kedy Personal Context Layer v1

- COMMUTE and FREE load a private kedy context capsule after the immediate opening reply when connected context tools are available.
- Context sources: current HQ focus, actual unfinished/relevant ToDo items, recent Diary entries, Flowz English logs/phrases/fixes/assessment/level notes, relevant active project context, and recent ChatGPT context already available to the assistant.
- The context is used to generate specific conversation topics, revisit recent events/decisions naturally, reuse learned phrases, and tune difficulty to recent English evidence.
- Completed/postponed/reply-waiting/blocked items are not treated as current actions.
- Context is conversation fuel, not productivity nagging or a task interrogation.
- Missing connectors never block the conversation and unavailable history is never invented.
- kedy private context is never exposed to Leni.
- Duo Sync, shared XP/streak behavior, and Leni Japanese-learning prompts remain unchanged.
''', encoding='utf-8')

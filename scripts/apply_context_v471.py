from pathlib import Path

app=Path('flowz-app.js')
s=app.read_text(encoding='utf-8')
for old,new in [
 ("number:'4.7.0'","number:'4.7.1'"),
 ("label:'v4.7.0 (2026.8.21)'","label:'v4.7.1 (2026.8.21)'"),
 ("title:'Flowz v4.7.0 · Duo Battle'","title:'Flowz v4.7.1 · Duo Battle'"),
 ("footer:'✅ Last updated 2026.08.21 · Flowz v4.7.0 Unified Build'","footer:'✅ Last updated 2026.08.21 · Flowz v4.7.1 Unified Build'")]:
    if old not in s: raise SystemExit('missing '+old)
    s=s.replace(old,new,1)

old='''function personalContextRule(modeLabel){
  return "Kedy Personal Context Preflight: before the first spoken reply, silently use connected Notion tools to read only the minimum current context needed for a personal conversation: the current HQ page, the active visible ToDo view, the Flowz page, and recent Diary entries with Flowz English logs. From those sources, build a tiny internal snapshot of current focus, active projects or decisions, recent real-life events worth talking about, important unfinished items, recent useful English phrases, repeated mistakes or weak points, and the latest stated English level or next focus. Also use recent ChatGPT conversation context only when it is already available in this conversation or product context; never claim access to unseen chats. Read Flowz Coach Rules for kedy GLOBAL and kedy｜"+modeLabel+" during the same preflight. Never read or expose Leni private context. Do not recite the snapshot or quote private notes. Do not turn ToDo into reminders or nagging. Use the snapshot only to choose relevant topics and remember what kedy has been learning. If connected Notion or any source is unavailable, skip that source and continue with built-in defaults without asking kedy to wait. Keep the preflight brief and start the spoken conversation as soon as it finishes.";
}'''
new='''function personalContextRule(modeLabel){
  return "Kedy Personal Context Preflight: before the first spoken reply, silently use connected Notion tools to read only the minimum current context needed for a personal conversation. Read the current HQ page first, specifically the 📱 HQ top callout/current focus, then the active visible ToDo view, specifically the actual ✅ ToDo view. From ToDo, use only unfinished high/medium or clearly relevant items and respect completed, postponed, reply-waiting, blocked, and constrained states; those are not current actions to push. Read the Flowz page and recent Diary entries with Flowz English logs from roughly the last three to seven days, including Phrase lines, Fix lines, Coach Assessment, CEFR/level or next-focus notes, and only the Active Project source pages that HQ/current focus makes clearly relevant. Do not crawl unrelated projects. From those sources, build a tiny internal snapshot of current focus, active projects or decisions, recent real-life events worth talking about, important unfinished items, recent useful English phrases, repeated mistakes or weak points, and the latest stated English level or next focus. Also use recent ChatGPT conversation context only when it is already available in this conversation or product context; never claim access to unseen chats and never browse the web to reconstruct them. Prefer the newest source state when records conflict. Read Flowz Coach Rules for kedy GLOBAL and kedy｜"+modeLabel+" during the same preflight. Never read or expose Leni private context. Do not recite the snapshot or quote private notes. Do not turn ToDo into reminders or nagging. Also do not dump tasks or turn the context into productivity coaching or an interrogation. Use the snapshot only to choose relevant topics, revisit recent events or decisions naturally, remember what kedy has been learning, reuse recent phrases when they fit, and tune vocabulary and sentence length to the latest English-level evidence. If connected Notion or any source is unavailable, skip that source and continue with built-in defaults without asking kedy to wait or pretending it was read. Keep the preflight brief and start the spoken conversation as soon as it finishes.";
}'''
if old not in s: raise SystemExit('personalContextRule source mismatch')
s=s.replace(old,new,1)
app.write_text(s,encoding='utf-8')

html=Path('flowz-v3-duo.html'); h=html.read_text(encoding='utf-8')
h=h.replace('v4.7.0 (2026.8.21)','v4.7.1 (2026.8.21)').replace('2026.08.21 · Flowz v4.7.0 Unified Build','2026.08.21 · Flowz v4.7.1 Unified Build').replace('flowz-v3-duo.css?v=4.7.0','flowz-v3-duo.css?v=4.7.1').replace('flowz-app.js?v=4.7.0','flowz-app.js?v=4.7.1')
html.write_text(h,encoding='utf-8')
idx=Path('index.html'); idx.write_text(idx.read_text(encoding='utf-8').replace('4.7.0','4.7.1'),encoding='utf-8')

t=Path('tests/stability.spec.js'); x=t.read_text(encoding='utf-8')
x=x.replace("expect(initial.version).toBe('v4.7.0 (2026.8.21)');","expect(initial.version).toBe('v4.7.1 (2026.8.21)');")
x=x.replace("expect(initial.title).toBe('Flowz v4.7.0 · Duo Battle');","expect(initial.title).toBe('Flowz v4.7.1 · Duo Battle');")
anchor="  expect(p.commute).toMatch(/Kedy Personal Context Preflight/);\n"
if anchor not in x: raise SystemExit('context assertion anchor missing')
add=anchor+"  expect(p.commute).toMatch(/actual ✅ ToDo view/);\n  expect(p.commute).toMatch(/completed, postponed, reply-waiting, blocked, and constrained states/);\n  expect(p.commute).toMatch(/last three to seven days/);\n  expect(p.commute).toMatch(/Phrase lines, Fix lines, Coach Assessment, CEFR\\/level/);\n  expect(p.commute).toMatch(/Active Project source pages/);\n  expect(p.commute).toMatch(/Do not crawl unrelated projects/);\n  expect(p.commute).toMatch(/never browse the web to reconstruct them/);\n  expect(p.commute).toMatch(/Prefer the newest source state/);\n  expect(p.commute).toMatch(/productivity coaching or an interrogation/);\n"
x=x.replace(anchor,add,1)
t.write_text(x,encoding='utf-8')
Path('CHANGELOG-v4.7.1.md').write_text('''# Flowz v4.7.1 — Personal Context source alignment

- Personal Context now starts from current HQ, then the actual active ToDo view, and follows only Active Project source pages clearly relevant to the current focus.
- Recent Diary context is scoped to roughly 3–7 days and explicitly includes Flowz Phrase, Fix, Coach Assessment, CEFR/level and next-focus notes.
- Completed, postponed, reply-waiting, blocked and constrained ToDo items are not treated as current actions.
- Recent ChatGPT context is used only when already available; unseen chats are not reconstructed from the web.
- Context is conversation fuel only: no task dumping, nagging, productivity coaching or interrogation.
- Leni private context, Leni Japanese-learning prompts, Duo Sync and shared XP/streak behavior remain unchanged.
''',encoding='utf-8')

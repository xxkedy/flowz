from pathlib import Path

app = Path('flowz-app.js')
s = app.read_text(encoding='utf-8')

replacements = [
    ("number:'4.6.0'", "number:'4.6.1'"),
    ("label:'v4.6.0 (2026.8.14)'", "label:'v4.6.1 (2026.8.21)'"),
    ("title:'Flowz v4.6.0 · Duo Battle'", "title:'Flowz v4.6.1 · Duo Battle'"),
    ("footer:'✅ Last updated 2026.08.14 · Flowz v4.6.0 Unified Build'", "footer:'✅ Last updated 2026.08.21 · Flowz v4.6.1 Unified Build'"),
    (
        '   "You are kedy\'s English coach in Flowz Duo Battle. He is a Japanese beginner using voice mode and usually listens without looking at the screen.",',
        '   "You are kedy\'s English conversation partner and coach in Flowz Duo Battle. He is a Japanese beginner using voice mode and usually listens without looking at the screen. Your main job is to make the conversation enjoyable and easy to follow, not to maximize teaching moments.",'
    ),
    (
        '   "Conversation should be about 80 percent and shadowing about 20 percent. If he asks to talk, says stay in chat, or otherwise says he wants conversation instead of repetition, stop shadowing immediately and do not suggest it again that session.",',
        '   "Conversation should be about 90 percent and shadowing at most 10 percent. Natural conversation is the default, not a lesson sequence. If he asks to talk, says he wants natural conversation, says stay in chat, or otherwise chooses conversation instead of repetition, enter conversation-only mode for the rest of that session: no shadowing, repetition drills, model-sentence drills, lesson framing, or requests to repeat. Do not suggest those again unless he explicitly asks for shadowing.",\n'
        '   "In conversation-only mode, respond as a real conversation partner. Answer his actual point first, share a short opinion or idea when natural, and ask only questions that genuinely move that topic forward. Do not turn the conversation into repeated A1 either-or prompts just because his English is simple.",\n'
        '   "Do not turn the whole conversation into an interview. Across several turns, mix questions with brief reactions, opinions, observations, or simple hypothetical ideas. It is fine to give him something to react to without ending every turn in a question.",\n'
        '   "If his speech is fragmented or voice recognition is uncertain, do not silently replace a key noun or idea with a different word. Use the word you heard when possible, or ask one very short confirmation only when the meaning would materially change. After one clarification, continue the topic instead of starting a correction loop.",\n'
        '   "Commute is background context. Do not repeatedly tell him to stay safe, focus on the road, keep steady, or use similar riding-safety reminders unless he asks about safety or there is an immediate safety concern.",'
    ),
    (
        '   "Use short natural spoken English. Correct only meaning-changing or strongly unnatural mistakes. Allow one retry, then return to conversation.",',
        '   "Use short natural spoken English. Correct only meaning-changing or strongly unnatural mistakes. In normal conversation, prefer one brief natural recast and keep the topic moving; do not require a retry. A retry is optional only when kedy clearly wants to practice the corrected line.",'
    ),
    (
        '   "If kedy says another topic, other topics, 話題変えて, or clearly requests a topic switch, switch immediately to a genuinely different topic. Do not rephrase the previous topic as a new question.",',
        '   "If kedy says another topic, other topics, 話題変えて, says the same words keep coming up, says he is bored, or clearly requests a topic switch, switch immediately to a genuinely different content domain. Do not rephrase the previous topic as a new question, and do not immediately return to recently rejected defaults such as mood, weather, music, food, plans, or commute conditions.",\n'
        '   "When you need to introduce a topic yourself, prefer a concrete subject with something to react to instead of another generic check-in. Rotate across ideas, AI or technology, games, culture, funny or strange everyday observations, choices, memories, and whatever emerges naturally from kedy\'s words.",'
    ),
]
for old, new in replacements:
    if old not in s:
        raise SystemExit('Missing expected flowz-app.js text: ' + old[:140])
    s = s.replace(old, new, 1)

old_mission = '''function currentCommuteMission(){
  var list=MISSIONS.kedy.commute,recent=recentCommutePhrases(3),blocked={};
  recent.forEach(function(p){blocked[p]=true});
  var start=(missionSeed('kedy','commute',today)+sessionCount('kedy')+commuteMissionOffset)%list.length;
  for(var step=0;step<list.length;step++){
    var item=list[(start+step)%list.length];
    if(!blocked[item.phrase])return {theme:item.theme,phrase:item.phrase,reading:'',meaning:item.meaning||'',guide:item.guide||''};
  }
  var fallback=list[start];
  return {theme:fallback.theme,phrase:fallback.phrase,reading:'',meaning:fallback.meaning||'',guide:fallback.guide||''};
}'''
new_mission = '''function currentCommuteMission(){
  var list=MISSIONS.kedy.commute,recent=recentCommutePhrases(3),blocked={},available=[];
  recent.forEach(function(p){blocked[p]=true});
  var base=(missionSeed('kedy','commute',today)+sessionCount('kedy'))%list.length;
  for(var step=0;step<list.length;step++){
    var item=list[(base+step)%list.length];
    if(!blocked[item.phrase])available.push(item);
  }
  var selected=available.length?available[commuteMissionOffset%available.length]:list[(base+commuteMissionOffset)%list.length];
  return {theme:selected.theme,phrase:selected.phrase,reading:'',meaning:selected.meaning||'',guide:selected.guide||''};
}'''
if old_mission not in s:
    raise SystemExit('Expected currentCommuteMission source not found')
s = s.replace(old_mission, new_mission, 1)
app.write_text(s, encoding='utf-8')

html = Path('flowz-v3-duo.html')
h = html.read_text(encoding='utf-8')

def remove_script_containing(text, marker):
    pos = text.find(marker)
    if pos < 0:
        return text
    start = text.rfind('<script>', 0, pos)
    end = text.find('</script>', pos)
    if start < 0 or end < 0:
        raise SystemExit('Could not isolate temporary inline script: ' + marker)
    end += len('</script>')
    if text[end:end+1] == '\n':
        end += 1
    return text[:start] + text[end:]

h = remove_script_containing(h, 'COMMUTE VOICE FALLBACK:')
h = remove_script_containing(h, "var beforePhrase='',retrying=false;")
h = h.replace('v4.6.0 (2026.8.14)', 'v4.6.1 (2026.8.21)')
h = h.replace('2026.08.14 · Flowz v4.6.0 Unified Build', '2026.08.21 · Flowz v4.6.1 Unified Build')
h = h.replace('flowz-v3-duo.css?v=4.6.0', 'flowz-v3-duo.css?v=4.6.1')
h = h.replace('flowz-app.js?v=4.6.0', 'flowz-app.js?v=4.6.1')
html.write_text(h, encoding='utf-8')

index = Path('index.html')
index.write_text(index.read_text(encoding='utf-8').replace('4.6.0', '4.6.1'), encoding='utf-8')

tests = Path('tests/stability.spec.js')
t = tests.read_text(encoding='utf-8')
t = t.replace("expect(initial.version).toBe('v4.6.0 (2026.8.14)');", "expect(initial.version).toBe('v4.6.1 (2026.8.21)');")
t = t.replace("expect(initial.title).toBe('Flowz v4.6.0 · Duo Battle');", "expect(initial.title).toBe('Flowz v4.6.1 · Duo Battle');")
old = "  expect(p.commute).toMatch(/about 80 percent and shadowing about 20 percent/);"
new = "  expect(p.commute).toMatch(/about 90 percent and shadowing at most 10 percent/);\n  expect(p.commute).toMatch(/conversation partner and coach/);\n  expect(p.commute).toMatch(/enter conversation-only mode for the rest of that session/);\n  expect(p.commute).toMatch(/respond as a real conversation partner/);\n  expect(p.commute).toMatch(/Do not turn the whole conversation into an interview/);\n  expect(p.commute).toMatch(/do not silently replace a key noun or idea/);\n  expect(p.commute).toMatch(/Commute is background context/);\n  expect(p.commute).toMatch(/do not require a retry/);"
if old not in t:
    raise SystemExit('Old commute ratio assertion not found')
t = t.replace(old, new, 1)
old = "  expect(p.commute).toMatch(/switch immediately to a genuinely different topic/);"
new = "  expect(p.commute).toMatch(/switch immediately to a genuinely different content domain/);\n  expect(p.commute).toMatch(/recently rejected defaults such as mood, weather, music, food, plans, or commute conditions/);\n  expect(p.commute).toMatch(/prefer a concrete subject with something to react to/);"
if old not in t:
    raise SystemExit('Old topic switch assertion not found')
tests.write_text(t.replace(old, new, 1), encoding='utf-8')

extra_test = Path('tests/commute-natural-conversation.spec.js')
if extra_test.exists():
    extra_test.unlink()

Path('CHANGELOG-v4.6.1.md').write_text('''# Flowz v4.6.1 — Natural COMMUTE conversation

- COMMUTE defaults to natural conversation (about 90%) with shadowing capped at about 10%.
- Once kedy chooses conversation instead of repetition, the rest of that session stays conversation-only unless he explicitly asks for shadowing.
- Questions are mixed with reactions, opinions, observations, and simple ideas instead of turning the chat into an interview.
- Uncertain voice recognition does not silently replace a key noun or idea.
- Repeated bike-commute safety reminders are suppressed unless safety is actually relevant.
- Normal corrections use brief recasts without mandatory retries.
- Boredom/topic-change signals force a genuinely different content domain and avoid recently rejected defaults.
- Talk Prep TODAY now rotates across the available non-recent phrases so one tap cannot resolve back to the same phrase.
- Duo Sync, XP/history logic, layout, and Leni prompts are unchanged.
''', encoding='utf-8')

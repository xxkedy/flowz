from pathlib import Path
import re


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, got {count}")
    return text.replace(old, new, 1)


def regex_once(text, pattern, repl, label, flags=0):
    out, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 regex match, got {count}")
    return out


app_path = Path("flowz-app.js")
app = app_path.read_text(encoding="utf-8")

app = replace_once(
    app,
    "var RELEASE={\n  number:'4.4.1',\n  label:'v4.4.1 (2026.8.14)',\n  title:'Flowz v4.4.1 · Duo Battle',\n  footer:'✅ Last updated 2026.08.14 · Flowz v4.4.1 Unified Build'\n};",
    "var RELEASE={\n  number:'4.5.0',\n  label:'v4.5.0 (2026.8.14)',\n  title:'Flowz v4.5.0 · Duo Battle',\n  footer:'✅ Last updated 2026.08.14 · Flowz v4.5.0 Unified Build'\n};",
    "release",
)

old_grid = """var KEDY_GRID=[
 {type:'label',text:'🛁 BATH ROUTINE · mikan 30 → Flowz'},
 {type:'tile',id:'toeic',title:'TOEIC CHECK',sub:'Voice 5Q · L3/R2 · 5–8min',icon:'🎯🎤',cls:'m2'},
 {type:'tile',id:'bath',title:'TOEIC STUDY',sub:'Voice 5Q · 5–8min',icon:'🛁🎤',cls:'m3'},
 {type:'tile',id:'review',title:'REVIEW',sub:'Recent phrases · 3–5min',icon:'🔁',cls:'m5 wide'},
 {type:'label',text:'🎲 ANYTIME · OPEN TALK'},
 {type:'tile',id:'free',title:'FREE',sub:'Open conversation · 10min',icon:'🎲',cls:'m6 wide'}
];"""
new_grid = """var KEDY_GRID=[
 {type:'label',text:'🛁 BATH ROUTINE · mikan 30 → Flowz'},
 {type:'tile',id:'toeic',title:'TOEIC CHECK',sub:'Voice 5Q · L3/R2 · 5–8min',icon:'🎯🎤',cls:'m2'},
 {type:'tile',id:'bath',title:'TOEIC STUDY',sub:'Voice 5Q · 5–8min',icon:'🛁🎤',cls:'m3'},
 {type:'label',text:'🎲 ANYTIME · OPEN TALK'},
 {type:'tile',id:'free',title:'FREE',sub:'Open talk · review inside',icon:'🎲',cls:'m5 wide'}
];"""
app = replace_once(app, old_grid, new_grid, "kedy visible grid")

new_kedy_prompts = r'''function coachRulesRule(modeLabel){
  return "Coach Rules: never delay the first visible reply. On kedy's first turn after your immediate natural opening, silently use connected Notion tools to find the existing child page named 'Flowz Coach Rules' under the Flowz page. Read only the checked active rules in 'kedy｜GLOBAL' and 'kedy｜"+modeLabel+"', then apply them for the rest of this session. Do not read or apply Leni rules. If Notion or that page is unavailable, continue with the built-in defaults and do not ask kedy to wait.";
}
function feedbackLoopRule(modeLabel){
  return "Flowz Feedback Loop: after the learning phase and its spoken result or recap are finished, Japanese comments from kedy about how the session should work are Flowz feedback, not English answers to score or correct. If the feedback is coach behavior, use connected Notion tools to update the existing 'Flowz Coach Rules' page: deduplicate equivalent rules, replace an older rule when the new instruction conflicts, save mode-specific feedback under 'kedy｜"+modeLabel+"', and use 'kedy｜GLOBAL' only when kedy clearly says it should apply across modes. Fetch that page again and verify the update before saying it was saved. If the feedback is a UI, sync, feature, or bug request that requires code, update the existing 'Flowz Implementation Feedback' page under OPEN instead of Coach Rules, reuse an existing matching item, and fetch again to verify. Do not create duplicate pages or GitHub issues. Keep all kedy rules separate from Leni.";
}
function commutePrompt(mission){
  return [
   "You are kedy's English coach in Flowz Duo Battle. He is a Japanese beginner using voice mode and usually listens without looking at the screen.",
   "Start immediately with a short natural reply. Do not call Notion, web, or any connected tool before that first reply and do not make him wait for background context. On his next turn, the only proactive background read is the Flowz Coach Rules load described below. Do not use Diary or other background tools during normal commute conversation unless kedy explicitly asks you to check a record.",
   coachRulesRule('COMMUTE'),
   "If he starts with a casual greeting, reply like a normal conversation partner once, then move into a real topic. Do not force one or two greeting exchanges. Do not announce a lesson, mission, correction, test, or shadowing.",
   "Run one continuous commute conversation. Morning and evening are one mode, so do not choose the opening from clock time. Have at least four meaningful exchanges before any planned shadowing.",
   "Today's hidden mission is: Theme: "+(mission.theme||'')+". Target phrase: \""+(mission.phrase||'')+"\". Meaning: "+(mission.meaning||'')+". Keep it hidden and bring it in only when the conversation naturally connects. Proactively introduce the target phrase at most twice in the whole session: one natural introduction and, if useful, one natural reuse. Do not force it after that.",
   "Use the current conversation as the main context. Avoid repetitive default topics. Do not default to after-work plans, dinner, or weekends unless kedy introduces them. Rotate real-life topics.",
   "Conversation should be about 80 percent and shadowing about 20 percent. If he asks to talk, says stay in chat, or otherwise says he wants conversation instead of repetition, stop shadowing immediately and do not suggest it again that session.",
   "Plan shadowing as one compact set of two or three short sentences overall, but speak exactly one short sentence per assistant turn. Never combine multiple shadowing sentences in one spoken turn. After each sentence, wait for exactly one repetition before giving the next. If a sentence is long, split it into natural spoken chunks and ask for one chunk at a time. Each chunk must be short enough to repeat from audio alone. If he casually echoes your praise or backchannel, acknowledge it once and continue; do not turn phrases such as nailed it, spot on, or sounds natural into a repetition chain. If he explicitly asks for more shadowing, give it.",
   "If kedy says he is tired, low, unmotivated, anxious, or not in the mood, do not offer an easier lesson, rest, stopping, or ending because of that. You may slow the pacing slightly, but keep normal English practice active unless he explicitly asks to stop English practice.",
   "If kedy rejects or redirects your advice, intention, or topic, immediately follow the new direction. Do not repeat or defend the previous coaching frame.",
   "Use short natural spoken English. Correct only meaning-changing or strongly unnatural mistakes. Allow one retry, then return to conversation.",
   "If kedy says 'I don't understand', 'It's difficult', 'too difficult', 'more easy', or says in Japanese that he cannot understand, immediately simplify to A1: usually one concrete idea in about three to six English words, avoid abstract vocabulary, and keep any explanation to at most two short sentences. This comprehension rule is separate from the fatigue rule above.",
   "Do not use 'Say: ...' as a normal teaching pattern. Use it only when kedy explicitly asks how to say something or clearly asks for a model sentence.",
   "Do not repeat generic backchannels such as Nice, Sounds good, That's okay, Perfect, or Stay safe. Avoid using the same generic acknowledgement more than twice in one session and always move the content forward.",
   "Complaints, frustration, strong words, or criticism of your coaching are not requests to end. Briefly adjust the behavior and continue unless kedy gives a clear ending request.",
   "If kedy says another topic, other topics, 話題変えて, or clearly requests a topic switch, switch immediately to a genuinely different topic. Do not rephrase the previous topic as a new question.",
   "Never end a turn with only praise, acknowledgement, or a closing phrase such as Perfect, You're welcome, Got it, or Thanks. After a brief acknowledgement, immediately continue with a natural question, topic, or next sentence. Never proactively offer to end the session. Do not close the conversation until kedy explicitly ends it.",
   "Assume the screen is not visible. Do not rely on spelling, markdown, headings, tables, or visual bullet lists.",
   "When he is almost at work or home, give a brief Arrival Review without ending: three phrases he used, up to two corrections, and one phrase to reuse next time. Then keep chatting unless he says 'まとめて' or 'Wrap up'.",
   "Never ask or prompt him to say Wrap up. Continue naturally until he says 'まとめて' or 'Wrap up'.",
   "At Wrap up, end the English-practice phase and give one conversational listening recap of about 30–45 seconds: summarize the actual topics, say three corrected or reusable sentences slowly, give one concise CEFR range with the next focus, and state the XP result. Do not require looking at the screen.",
   diaryRule(),
   feedbackLoopRule('COMMUTE')
  ].join(' ');
}
function freePrompt(){
  return [
   "You are kedy's practical English conversation partner in Flowz Duo Battle.",
   "Start immediately with one short natural reply. Do not use a tool before that first reply.",
   coachRulesRule('FREE'),
   "Default to a normal open English conversation, not a fixed lesson or quiz.",
   "The old standalone REVIEW mode is absorbed into FREE. Do not force review every FREE session. If a recent corrected or useful phrase naturally fits, you may reuse it. If kedy explicitly asks to review or revise recent English, use connected Notion tools to read recent Diary English Logs and run a short review inside FREE, one item at a time, then return to ordinary FREE conversation.",
   "Use short spoken English. Correct only meaning-changing or strongly unnatural mistakes and allow one retry before returning to conversation.",
   "Never end a turn with only praise or acknowledgement. Continue with a natural question or topic, and do not end unless kedy clearly ends the conversation.",
   "When kedy says 'まとめて' or 'Wrap up', end the English-practice phase with a short listening-friendly recap of the actual conversation, useful or corrected sentences, one next focus, and the XP result. Do not require looking at the screen.",
   diaryRule(),
   feedbackLoopRule('FREE')
  ].join(' ');
}
function reviewPrompt(){
  return freePrompt()+" This session came from a legacy REVIEW pending state. Keep it inside FREE: after the first reply, read recent Diary English Logs and run a short one-item-at-a-time review, then return to normal FREE behavior. Do not create or expose a separate REVIEW mode.";
}
function toeicCheckPrompt(mission){
  return [
   "You are kedy's TOEIC coach in Flowz Duo Battle. He is a Japanese beginner using voice mode, usually while taking a bath.",
   "If kedy starts with a greeting or casual check-in, respond naturally for one short exchange first. Do not use a tool before that first reply. Then ask, 'Ready for question one?' Do not begin the check until he answers.",
   coachRulesRule('TOEIC CHECK'),
   "Run an original five-question TOEIC Listening & Reading mini-check in about five to eight minutes. Use exactly three listening-style questions and two reading-style questions. Never copy official TOEIC questions.",
   "Use this exact mix: question 1 is a short-response listening item, question 2 is a short-conversation listening item, question 3 is a short-announcement listening item, question 4 is sentence completion, and question 5 is a very short passage question.",
   "Use plausible distractors, slightly longer natural sentences, and common workplace vocabulary. Keep a consistent moderate difficulty by default. On the first turn after your opening, when loading Flowz Coach Rules, also read the latest two TOEIC Check results from recent Diary logs if available. If both are at least 4/5, raise this check exactly one difficulty step; otherwise keep the current level. Do not delay the first visible reply for this lookup.",
   "Voice Talk may hide earlier text when kedy speaks. Read every choice aloud once. For reading questions, also show the sentence or short passage and choices as visible text, but keep them short enough to remember after one reading.",
   "Present one question at a time. Speak each listening item once at natural speed. Do not repeat or explain before the answer. Let kedy answer A, B, C, or D aloud.",
   "During the five scored questions, do not correct, praise, reveal correctness, or teach. Quietly record each answer and continue. If he asks to stop, score only the completed questions and clearly label the check incomplete.",
   "After question five, give Listening score out of three, Reading score out of two, total out of five, and explain only missed questions with very short Japanese explanations. Do not give Japanese explanations for correctly answered questions. Also give a broad estimated TOEIC L&R score band; never claim an official or exact score, use a band about 150 points wide, and label confidence LOW.",
   "Keep TOEIC scoring separate from conversation CEFR and separate from Flowz XP.",
   "Today's useful phrase is: \""+(mission.phrase||'Has the meeting been moved?')+"\". Meaning: "+(mission.meaning||'会議は変更されましたか')+". After scoring, use it in one short practical example, but do not use it as a scored question unless it fits naturally.",
   "Say the result once in this exact compact format so kedy can enter it in Flowz: FLOWZ TOEIC RESULT: Lx/3 Ry/2. Then give the normal explanation.",
   "At the end, use connected Notion tools to find today's existing Diary page by date. Append a TOEIC Check log with date, Listening /3, Reading /2, Total /5, estimated band, confidence, and up to three weak areas. Do not create a new Diary page. Fetch the page again to verify the update.",
   "Do not update GitHub for an ordinary TOEIC learning session.",
   feedbackLoopRule('TOEIC CHECK')
  ].join(' ');
}
function toeicStudyPrompt(){
  return [
   "You are kedy's TOEIC study coach in Flowz Duo Battle. He is using Voice Talk while taking a bath.",
   "Important opening rule: kedy usually begins with a casual greeting such as 'ChatGPT, how are you?' Respond like a normal conversation partner first. Do not use a tool before that first reply. Have one or two natural greeting exchanges before introducing practice.",
   coachRulesRule('TOEIC STUDY'),
   "This is a short daily teaching session, not a scored TOEIC Check. Do not give an estimated TOEIC L&R score; the practice result may be stated only as correct count out of five.",
   "Run exactly five practice questions and finish automatically after question five. Target about five to eight minutes. If he says 'まとめて' or 'Wrap up' early, stop and summarize the completed questions.",
   "Voice Talk hides previous text when kedy starts speaking. Every question must be answerable without looking back at earlier text. Never require him to read a sentence on screen while speaking.",
   "Use audio-first tasks. Read one complete item aloud, then ask for one short answer such as A, B, C, a word, or a brief phrase.",
   "Use this five-question mix: two listening questions, one Part 2-style response question, and two short grammar or sentence-completion questions covering a balanced mix of common TOEIC weak areas. Do not use Part 7 passages or long screen reading.",
   "kedy already uses mikan for 30 vocabulary questions, so do not run isolated word lists or flashcards.",
   "For each question, present one item and wait for his answer. If correct, confirm it briefly and move directly to the next question without Japanese explanation. If wrong, give one short Japanese explanation of the key point and one reusable TOEIC pattern, then continue.",
   "After question five, automatically give correct count out of five, up to three weak points, three useful TOEIC patterns, and one focus for the next TOEIC Check. Keep this compact and listening-friendly.",
   "At the end, use connected Notion tools to find today's existing Diary page by date. Append a TOEIC Study log without creating a new Diary page, then fetch it again to verify.",
   "Do not update GitHub for an ordinary learning session.",
   feedbackLoopRule('TOEIC STUDY')
  ].join(' ');
}
'''

app = regex_once(
    app,
    r"function commutePrompt\(mission\)\{.*?\n\}\nfunction leniPrompt\(mode,mission\)\{",
    new_kedy_prompts + "function leniPrompt(mode,mission){",
    "kedy prompt suite",
    re.S,
)

app = replace_once(
    app,
    "var MISSION_GUIDE_OVERRIDE={\n  toeic:'Voice 5問チェック。Listening 3問＋Reading 2問を約5〜8分で採点。',\n  bath:'Voice Talk専用。画面を見ながら話さず、耳だけで答える5問・約5〜8分。',\n  review:'約3〜5分。直近のDiary English Logから3フレーズを1問ずつ復習。',\n  free:'固定レッスンなし。今日話したいことを自然な英会話で続ける。'\n};",
    "var MISSION_GUIDE_OVERRIDE={\n  toeic:'Voice 5問チェック。Listening 3問＋Reading 2問を約5〜8分で採点。',\n  bath:'Voice Talk専用。画面を見ながら話さず、耳だけで答える5問・約5〜8分。',\n  review:'FREE内の旧互換Review。直近Diaryの表現を短く復習。',\n  free:'自由英会話。必要な時だけ最近の表現も自然に復習。'\n};",
    "mission guides",
)

app_path.write_text(app, encoding="utf-8")

# Versioned entry points. Do not alter the working inline Duo Room recovery logic.
for name in ("flowz-v3-duo.html", "index.html"):
    p = Path(name)
    text = p.read_text(encoding="utf-8")
    if "4.4.1" not in text:
        raise SystemExit(f"{name}: expected v4.4.1 marker")
    p.write_text(text.replace("4.4.1", "4.5.0"), encoding="utf-8")

for name in ("package.json", "package-lock.json"):
    p = Path(name)
    text = p.read_text(encoding="utf-8")
    p.write_text(text.replace('"version": "4.4.0"', '"version": "4.5.0"'), encoding="utf-8")

# Preserve the existing regression suite and update only the v4.5 surface/prompt contract.
tests_path = Path("tests/stability.spec.js")
tests = tests_path.read_text(encoding="utf-8")
tests = tests.replace("v4.4.1 frontend consolidation", "v4.5.0 feedback loop + entry consolidation")
tests = replace_once(tests, "expect(initial.version).toBe('v4.4.1 (2026.8.14)');", "expect(initial.version).toBe('v4.5.0 (2026.8.14)');", "test version")
tests = replace_once(tests, "expect(initial.title).toBe('Flowz v4.4.1 · Duo Battle');", "expect(initial.title).toBe('Flowz v4.5.0 · Duo Battle');", "test title")
tests = replace_once(tests, "expect(initial.modeIds).toEqual(['toeic', 'bath', 'review', 'free']);", "expect(initial.modeIds).toEqual(['toeic', 'bath', 'free']);", "test mode ids")
tests = replace_once(
    tests,
    "    await page.click('.profile-btn[data-profile=\"leni\"]');\n    await expect(page.locator('#modes .mode')).toHaveCount(4);\n    await page.click('.profile-btn[data-profile=\"kedy\"]');\n    await expect(page.locator('#modes .mode')).toHaveCount(4);",
    "    await page.click('.profile-btn[data-profile=\"leni\"]');\n    await expect(page.locator('#modes .mode')).toHaveCount(4);\n    await page.click('.profile-btn[data-profile=\"kedy\"]');\n    await expect(page.locator('#modes .mode')).toHaveCount(3);",
    "profile switch counts",
)

prompt_test = r'''test('every visible kedy mode carries the current coaching and feedback rules', async ({ page }) => {
  await seed(page, {});
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#modes .mode');

  const p = await page.evaluate(() => {
    const b = window.FlowzApp.buildPromptFor;
    const m = { theme: 't', phrase: 'p', meaning: 'm' };
    return {
      commute: b({ profile: 'kedy', mode: 'commute', mission: m }),
      toeic:   b({ profile: 'kedy', mode: 'toeic', mission: m }),
      bath:    b({ profile: 'kedy', mode: 'bath', mission: m }),
      review:  b({ profile: 'kedy', mode: 'review', mission: m }),
      free:    b({ profile: 'kedy', mode: 'free', mission: m }),
      leni:    b({ profile: 'leni', mode: 'work', mission: { theme: 't', phrase: 'p', reading: 'r', meaning: 'm' } })
    };
  });

  expect(p.commute).toMatch(/never delay the first visible reply/i);
  expect(p.commute).toMatch(/Flowz Coach Rules/);
  expect(p.commute).toMatch(/about 80 percent and shadowing about 20 percent/);
  expect(p.commute).toMatch(/speak exactly one short sentence per assistant turn/);
  expect(p.commute).toMatch(/wait for exactly one repetition/);
  expect(p.commute).toMatch(/do not offer an easier lesson, rest, stopping, or ending/);
  expect(p.commute).toMatch(/three to six English words/);
  expect(p.commute).toMatch(/Do not use 'Say: \.\.\.'/);
  expect(p.commute).toMatch(/generic backchannels/);
  expect(p.commute).toMatch(/at most twice in the whole session/);
  expect(p.commute).toMatch(/Complaints, frustration/);
  expect(p.commute).toMatch(/switch immediately to a genuinely different topic/);
  expect(p.commute).toMatch(/Arrival Review/);
  expect(p.commute).toMatch(/30–45 seconds/);
  expect(p.commute).toMatch(/Flowz Feedback Loop/);

  expect(p.toeic).toMatch(/five-question TOEIC Listening & Reading mini-check in about five to eight minutes/);
  expect(p.toeic).toMatch(/exactly three listening-style questions and two reading-style questions/);
  expect(p.toeic).toMatch(/latest two TOEIC Check results/);
  expect(p.toeic).toMatch(/both are at least 4\/5/);
  expect(p.toeic).toMatch(/Do not give Japanese explanations for correctly answered questions/);
  expect(p.toeic).toMatch(/FLOWZ TOEIC RESULT: Lx\/3 Ry\/2/);
  expect(p.toeic).toMatch(/Flowz Feedback Loop/);

  expect(p.bath).toMatch(/exactly five practice questions/);
  expect(p.bath).toMatch(/five to eight minutes/);
  expect(p.bath).toMatch(/mikan for 30 vocabulary questions/);
  expect(p.bath).toMatch(/without Japanese explanation/);
  expect(p.bath).toMatch(/If wrong, give one short Japanese explanation/);
  expect(p.bath).toMatch(/Flowz Feedback Loop/);

  expect(p.free).toMatch(/normal open English conversation/);
  expect(p.free).toMatch(/old standalone REVIEW mode is absorbed into FREE/);
  expect(p.free).toMatch(/explicitly asks to review or revise recent English/);
  expect(p.free).toMatch(/short listening-friendly recap/);
  expect(p.free).toMatch(/Flowz Feedback Loop/);
  expect(p.review).toMatch(/legacy REVIEW pending state/);
  expect(p.review).toMatch(/Do not create or expose a separate REVIEW mode/);

  expect(p.leni).toMatch(/guru bahasa Jepang pribadi Leni/);
  expect(p.leni).toMatch(/bacaan hiragana/);
  expect(p.leni).not.toMatch(/Flowz Coach Rules/);
});

'''
tests = regex_once(
    tests,
    r"test\('every kedy mode opens its own prompt with the required rules'.*?\n\}\);\n\ntest\('selecting each tile shows the matching mission card and start label'",
    prompt_test + "test('selecting each tile shows the matching mission card and start label'",
    "prompt regression test",
    re.S,
)

select_test = r'''test('selecting visible kedy entries keeps only COMMUTE, BATH TOEIC, and colored FREE', async ({ page }) => {
  await seed(page, {});
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#modes .mode');

  expect(await page.evaluate(() => [...document.querySelectorAll('#modes .mode')].map((b) => b.dataset.modeId)))
    .toEqual(['toeic', 'bath', 'free']);
  await expect(page.locator('#modes .mode[data-mode-id="review"]')).toHaveCount(0);
  await expect(page.locator('#modes .mode[data-mode-id="free"]')).toHaveClass(/m5/);
  await expect(page.locator('#flowzTalkPrepBtn')).toHaveText(/START COMMUTE/);

  const cases = [
    ['toeic', 'START TOEIC CHECK · 5Q', 'Voice 5問チェック。Listening 3問＋Reading 2問を約5〜8分で採点。'],
    ['bath',  'START TOEIC STUDY · 5Q', 'Voice Talk専用。画面を見ながら話さず、耳だけで答える5問・約5〜8分。'],
    ['free',  'START FREE TALK',        '自由英会話。必要な時だけ最近の表現も自然に復習。']
  ];
  for (const [id, startLabel, guide] of cases) {
    await page.click(`#modes .mode[data-mode-id="${id}"]`);
    await expect(page.locator('#startBtn')).toHaveText(startLabel);
    await expect(page.locator('#missionGuide')).toHaveText(guide);
    expect(await page.evaluate(() => window.FlowzApp.getPending().mode)).toBe(id);
  }

  await page.click('.profile-btn[data-profile="leni"]');
  expect(await page.evaluate(() => [...document.querySelectorAll('#modes .mode')].map((b) => b.dataset.modeId)))
    .toEqual(['free', 'work', 'n2', 'kanji']);
});

'''
tests = regex_once(
    tests,
    r"test\('selecting each tile shows the matching mission card and start label'.*?\n\}\);\n\ntest\('a linked Duo Room renders as a compact status strip'",
    select_test + "test('a linked Duo Room renders as a compact status strip'",
    "visible entry regression test",
    re.S,
)

tests_path.write_text(tests, encoding="utf-8")

Path("CHANGELOG-v4.5.0.md").write_text(
    """# Flowz v4.5.0 — 2026-08-14\n\n- kedy visible entries simplified to COMMUTE / BATH TOEIC CHECK+STUDY / FREE.\n- Standalone REVIEW removed; recent-phrase review is absorbed into FREE.\n- FREE uses the existing cyan accent class for visibility.\n- All visible kedy modes load profile/mode Coach Rules after the immediate opening without blocking the first reply.\n- Japanese post-session feedback updates Flowz Coach Rules, or Flowz Implementation Feedback when code changes are required.\n- COMMUTE remaining conversation-control rules consolidated.\n- TOEIC STUDY Japanese explanations are now wrong-answer-only.\n- Duo Sync, Room recovery, XP, history, and Leni prompts are intentionally unchanged.\n""",
    encoding="utf-8",
)

# Fail the patch before test execution if any agreed requirement was missed.
final_app = app_path.read_text(encoding="utf-8")
required = [
    "number:'4.5.0'",
    "coachRulesRule('COMMUTE')",
    "feedbackLoopRule('COMMUTE')",
    "coachRulesRule('TOEIC CHECK')",
    "feedbackLoopRule('TOEIC CHECK')",
    "coachRulesRule('TOEIC STUDY')",
    "feedbackLoopRule('TOEIC STUDY')",
    "coachRulesRule('FREE')",
    "feedbackLoopRule('FREE')",
    "id:'free',title:'FREE',sub:'Open talk · review inside',icon:'🎲',cls:'m5 wide'",
    "without Japanese explanation",
    "three to six English words",
    "Flowz Implementation Feedback",
]
for needle in required:
    if needle not in final_app:
        raise SystemExit(f"missing required implementation marker: {needle}")
if "id:'review',title:'REVIEW'" in final_app:
    raise SystemExit("standalone REVIEW tile still exists")

print("Flowz v4.5 patch applied")

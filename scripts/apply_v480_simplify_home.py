from pathlib import Path

app=Path('flowz-app.js')
s=app.read_text(encoding='utf-8')
for old,new in [
 ("number:'4.7.1'","number:'4.8.0'"),
 ("label:'v4.7.1 (2026.8.21)'","label:'v4.8.0 (2026.8.21)'"),
 ("title:'Flowz v4.7.1 · Duo Battle'","title:'Flowz v4.8.0 · Duo Battle'"),
 ("footer:'✅ Last updated 2026.08.21 · Flowz v4.7.1 Unified Build'","footer:'✅ Last updated 2026.08.21 · Flowz v4.8.0 Unified Build'")]:
    if old not in s: raise SystemExit('missing release token '+old)
    s=s.replace(old,new,1)

old_grid='''var KEDY_GRID=[
 {type:'label',text:'🛁 BATH ROUTINE · mikan 30 → Flowz'},
 {type:'tile',id:'toeic',title:'TOEIC CHECK',sub:'Voice 5Q · L3/R2 · 5–8min',icon:'🎯🎤',cls:'m2'},
 {type:'tile',id:'bath',title:'TOEIC STUDY',sub:'Voice 5Q · 5–8min',icon:'🛁🎤',cls:'m3'},
 {type:'label',text:'🎲 ANYTIME · OPEN TALK'},
 {type:'tile',id:'free',title:'FREE',sub:'Open talk · review inside',icon:'🎲',cls:'m5 wide'}
];'''
new_grid='''var KEDY_GRID=[
 {type:'tile',id:'toeic',title:'TOEIC',sub:'Voice 5Q · L3/R2 · 5–8min',icon:'🎯🎤',cls:'m2'},
 {type:'tile',id:'free',title:'FREE',sub:'Open talk · review inside',icon:'🎲',cls:'m5'}
];'''
if old_grid not in s: raise SystemExit('KEDY_GRID mismatch')
s=s.replace(old_grid,new_grid,1)

old_prep='''    card.innerHTML='<div class="prep-head"><div class="prep-title">🗣️ TALK PREP</div><span class="prep-chip">COMMUTE</span></div>'+ 
      '<div class="prep-grid">'+
        '<div class="prep-row"><span>OPEN</span><div><b>Hey ChatGPT, how’s it going?</b><small>普通に挨拶から始めてOK</small></div></div>'+ 
        '<div class="prep-row" data-prep-action="today" role="button" tabindex="0"><span>TODAY</span><div><b>'+escapeHtml(m.phrase)+'</b><small>'+escapeHtml(m.meaning)+' · タップで切替</small></div></div>'+ 
        '<div class="prep-row" data-prep-action="reuse" role="button" tabindex="0"><span>REUSE</span><div><b>'+escapeHtml(reuse)+'</b><small>最近の表現から選択 · タップで切替</small></div></div>'+ 
      '</div><button id="flowzTalkPrepBtn" type="button">⚡ START COMMUTE</button>';'''
new_prep='''    card.innerHTML='<div class="prep-head"><div class="prep-title">🗣️ TALK PREP</div><span class="prep-chip">COMMUTE</span></div>'+ 
      '<div class="prep-grid">'+
        '<div class="prep-row" data-prep-action="today" role="button" tabindex="0"><span>PHRASE</span><div><b>'+escapeHtml(m.phrase)+'</b><small>'+escapeHtml(m.meaning)+' · タップで次へ</small></div></div>'+ 
      '</div><button id="flowzTalkPrepBtn" type="button">⚡ START COMMUTE</button>';'''
if old_prep not in s: raise SystemExit('kedy Talk Prep block mismatch')
s=s.replace(old_prep,new_prep,1)

old_click='''  $('modes').addEventListener('click',function(e){
    var btn=e.target.closest&&e.target.closest('.mode');
    if(!btn||!btn.dataset.modeId)return;
    selectMission(findMode(current,btn.dataset.modeId));
  });'''
new_click='''  $('modes').addEventListener('click',function(e){
    var btn=e.target.closest&&e.target.closest('.mode');
    if(!btn||!btn.dataset.modeId)return;
    selectMission(findMode(current,btn.dataset.modeId));
    if(current==='kedy'&&(btn.dataset.modeId==='toeic'||btn.dataset.modeId==='free'))startSession();
  });'''
if old_click not in s: raise SystemExit('mode click block mismatch')
s=s.replace(old_click,new_click,1)

old_render="  renderModes();renderTalkPrep();renderMission();renderPending();renderWeek();renderAssessment();renderCloudPanel();renderVault();renderRelease();"
new_render="  renderModes();renderTalkPrep();renderMission();renderPending();renderAssessment();renderCloudPanel();renderVault();renderRelease();"
if old_render not in s: raise SystemExit('render pipeline mismatch')
s=s.replace(old_render,new_render,1)

old_note="html+='</div><p class=\"note\">mikan＝単語30問／TOEIC STUDY＝5問練習／TOEIC CHECK＝L3＋R2の5問推定。スコアは非公式の目安。</p>';"
new_note="html+='</div><p class=\"note\">mikan＝単語30問／Flowz TOEIC＝L3＋R2のVoice 5問。スコアは非公式の目安。</p>';"
if old_note in s:s=s.replace(old_note,new_note,1)
app.write_text(s,encoding='utf-8')

html=Path('flowz-v3-duo.html')
h=html.read_text(encoding='utf-8')
h=h.replace('Flowz v4.7.1 (2026.8.21)','Flowz v4.8.0 (2026.8.21)').replace('v4.7.1 (2026.8.21)','v4.8.0 (2026.8.21)').replace('2026.08.21 · Flowz v4.7.1 Unified Build','2026.08.21 · Flowz v4.8.0 Unified Build').replace('flowz-v3-duo.css?v=4.7.1','flowz-v3-duo.css?v=4.8.0').replace('flowz-app.js?v=4.7.1','flowz-app.js?v=4.8.0')
today='<section class="panel today-card" id="todayCard"><div class="today-line"><div class="today-main"><b id="todayTitle">NOT STARTED</b><span id="todayDetail">Complete 1 session for 10 XP</span></div><div class="today-score"><span id="todayXp">0</span><small> XP</small></div></div></section>\n'
if today not in h: raise SystemExit('today card missing')
h=h.replace(today,'',1)
week='<section class="panel"><div class="section-head"><div class="section-title" id="weekTitle">📅 LAST 7 DAYS</div><span class="chip" id="weekSessions">0 / 7 days</span></div><div class="week-strip" id="weekStrip"></div></section>\n'
if week not in h: raise SystemExit('week block missing')
h=h.replace(week,'',1)
anchor='<section class="panel" id="flowzAssessment"></section>\n'
if anchor not in h: raise SystemExit('assessment anchor missing')
h=h.replace(anchor,anchor+today,1)
html.write_text(h,encoding='utf-8')

idx=Path('index.html'); idx.write_text(idx.read_text(encoding='utf-8').replace('4.7.1','4.8.0'),encoding='utf-8')

tests=Path('tests/stability.spec.js')
t=tests.read_text(encoding='utf-8')
t=t.replace("expect(initial.version).toBe('v4.7.1 (2026.8.21)');","expect(initial.version).toBe('v4.8.0 (2026.8.21)');")
t=t.replace("expect(initial.title).toBe('Flowz v4.7.1 · Duo Battle');","expect(initial.title).toBe('Flowz v4.8.0 · Duo Battle');")
t=t.replace("expect(initial.modeIds).toEqual(['toeic', 'bath', 'free']);","expect(initial.modeIds).toEqual(['toeic', 'free']);")
t=t.replace("expect(initial.labels).toEqual(['🛁 BATH ROUTINE · mikan 30 → Flowz', '🎲 ANYTIME · OPEN TALK']);","expect(initial.labels).toEqual([]);")
start=t.index("test('selecting visible kedy entries")
end=t.index("test('Talk Prep rotates fresh phrases",start)
new_test='''test('kedy home exposes only COMMUTE, TOEIC, and FREE entry points with one-tap TOEIC/FREE', async ({ page }) => {\n  await seed(page, {});\n  await page.goto(`${baseURL}/flowz-v3-duo.html`);\n  await page.waitForSelector('#modes .mode');\n  expect(await page.evaluate(() => [...document.querySelectorAll('#modes .mode')].map((b) => b.dataset.modeId))).toEqual(['toeic','free']);\n  await expect(page.locator('#flowzTalkPrepBtn')).toHaveText(/START COMMUTE/);\n  await expect(page.locator('#modes .mode[data-mode-id="bath"]')).toHaveCount(0);\n  await expect(page.locator('#weekStrip')).toHaveCount(0);\n  const order=await page.evaluate(()=>{const prep=document.querySelector('#flowzTalkPrep'),today=document.querySelector('#todayCard');return prep.compareDocumentPosition(today)&Node.DOCUMENT_POSITION_FOLLOWING});\n  expect(order).toBeTruthy();\n  await page.click('.profile-btn[data-profile="leni"]');\n  expect(await page.evaluate(() => [...document.querySelectorAll('#modes .mode')].map((b) => b.dataset.modeId))).toEqual(['free','work','n2','kanji']);\n});\n\n'''
t=t[:start]+new_test+t[end:]
t=t.replace("  await expect(page.locator('[data-prep-action=\"today\"] small')).toContainText('タップで切替');\n  await expect(page.locator('[data-prep-action=\"reuse\"] small')).toContainText('タップで切替');","  await expect(page.locator('[data-prep-action=\"today\"] small')).toContainText('タップで次へ');\n  await expect(page.locator('#flowzTalkPrep .prep-row')).toHaveCount(1);")
t=t.replace("  await page.click('[data-prep-action=\"reuse\"]');\n  const afterReuseTap = await page.evaluate(() => window.FlowzApp.getTalkPrep());\n  expect(afterReuseTap.reuse).not.toBe(afterTodayTap.reuse);\n\n  const missionBeforeSession = afterReuseTap.today;","  const missionBeforeSession = afterTodayTap.today;")
style_start=t.find("test('Talk Prep TODAY and REUSE look tappable without coloring OPEN'")
if style_start!=-1:
    style_end=t.index("test('Leni gets a Talk Prep quick start",style_start)
    replacement='''test('kedy Talk Prep is one tappable rotating phrase with no OPEN or REUSE rows', async ({ page }) => {\n  await seed(page, {});\n  await page.goto(`${baseURL}/flowz-v3-duo.html`);\n  await page.waitForSelector('#flowzTalkPrep [data-prep-action="today"]');\n  await expect(page.locator('#flowzTalkPrep .prep-row')).toHaveCount(1);\n  await expect(page.locator('#flowzTalkPrep .prep-row')).toContainText('PHRASE');\n  await expect(page.locator('#flowzTalkPrep')).not.toContainText('OPEN');\n  await expect(page.locator('#flowzTalkPrep')).not.toContainText('REUSE');\n  const before=await page.locator('#flowzTalkPrep [data-prep-action="today"] b').textContent();\n  await page.click('#flowzTalkPrep [data-prep-action="today"]');\n  const after=await page.locator('#flowzTalkPrep [data-prep-action="today"] b').textContent();\n  expect(after).not.toBe(before);\n});\n\n'''
    t=t[:style_start]+replacement+t[style_end:]
tests.write_text(t,encoding='utf-8')

Path('CHANGELOG-v4.8.0.md').write_text('''# Flowz v4.8.0 — simplified kedy home\n\n- kedy home now has three practical entry points only: COMMUTE, TOEIC, and FREE.\n- TOEIC CHECK and TOEIC STUDY are consolidated into one TOEIC tile using the existing 5-question L3/R2 voice check flow.\n- TOEIC and FREE launch in one tap instead of stopping at an intermediate mission screen.\n- kedy TALK PREP removes OPEN and REUSE rows; one visible phrase row cycles to the next phrase on every tap.\n- NOT STARTED / daily XP card moves below the English assessment so it no longer blocks the main learning controls on iPhone.\n- LAST 7 DAYS calendar is removed; learning history remains protected in the underlying state, History Vault, XP and Duo Sync.\n- Leni Japanese-learning modes and Duo Sync remain unchanged.\n''',encoding='utf-8')

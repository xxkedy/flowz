from pathlib import Path

app = Path('flowz-app.js')
s = app.read_text(encoding='utf-8')
for old,new in [
    ("number:'4.8.0'", "number:'4.8.1'"),
    ("label:'v4.8.0 (2026.8.21)'", "label:'v4.8.1 (2026.8.21)'"),
    ("title:'Flowz v4.8.0 · Duo Battle'", "title:'Flowz v4.8.1 · Duo Battle'"),
    ("footer:'✅ Last updated 2026.08.21 · Flowz v4.8.0 Unified Build'", "footer:'✅ Last updated 2026.08.21 · Flowz v4.8.1 Unified Build'"),
]:
    if old not in s:
        raise SystemExit('missing release token: '+old)
    s = s.replace(old,new,1)

old = """function renderMission(){
  var panel=$('mission'),u=UI[current];
  if(!pending||pending.profile!==current||!pending.mission){panel.classList.remove('show');return}"""
new = """function renderMission(){
  var panel=$('mission'),u=UI[current];
  if(current==='kedy'){panel.classList.remove('show');return}
  if(!pending||pending.profile!==current||!pending.mission){panel.classList.remove('show');return}"""
if old not in s:
    raise SystemExit('renderMission block mismatch')
s = s.replace(old,new,1)
app.write_text(s,encoding='utf-8')

html = Path('flowz-v3-duo.html')
h = html.read_text(encoding='utf-8')
h = h.replace('Flowz v4.8.0 (2026.8.21)','Flowz v4.8.1 (2026.8.21)')
h = h.replace('v4.8.0 (2026.8.21)','v4.8.1 (2026.8.21)')
h = h.replace('2026.08.21 · Flowz v4.8.0 Unified Build','2026.08.21 · Flowz v4.8.1 Unified Build')
h = h.replace('flowz-v3-duo.css?v=4.8.0','flowz-v3-duo.css?v=4.8.1')
h = h.replace('flowz-app.js?v=4.8.0','flowz-app.js?v=4.8.1')
html.write_text(h,encoding='utf-8')

idx = Path('index.html')
idx.write_text(idx.read_text(encoding='utf-8').replace('4.8.0','4.8.1'),encoding='utf-8')

tests = Path('tests/stability.spec.js')
t = tests.read_text(encoding='utf-8')
t = t.replace("expect(initial.version).toBe('v4.8.0 (2026.8.21)');", "expect(initial.version).toBe('v4.8.1 (2026.8.21)');")
t = t.replace("expect(initial.title).toBe('Flowz v4.8.0 · Duo Battle');", "expect(initial.title).toBe('Flowz v4.8.1 · Duo Battle');")
needle = """  await expect(page.locator('#modes .mode[data-mode-id=\"bath\"]')).toHaveCount(0);
  await expect(page.locator('#weekStrip')).toHaveCount(0);"""
replacement = """  await expect(page.locator('#modes .mode[data-mode-id=\"bath\"]')).toHaveCount(0);
  await expect(page.locator('#weekStrip')).toHaveCount(0);
  await expect(page.locator('#mission')).not.toHaveClass(/show/);
  await page.click('#modes .mode[data-mode-id=\"toeic\"]');
  await page.waitForTimeout(100);
  await expect(page.locator('#mission')).not.toHaveClass(/show/);"""
if needle not in t:
    raise SystemExit('kedy home assertion block mismatch')
t = t.replace(needle,replacement,1)
leni_needle = """  await page.click('.profile-btn[data-profile=\"leni\"]');
  expect(await page.evaluate(() => [...document.querySelectorAll('#modes .mode')].map((b) => b.dataset.modeId))).toEqual(['free','work','n2','kanji']);"""
leni_replacement = """  await page.click('.profile-btn[data-profile=\"leni\"]');
  expect(await page.evaluate(() => [...document.querySelectorAll('#modes .mode')].map((b) => b.dataset.modeId))).toEqual(['free','work','n2','kanji']);
  await page.click('#modes .mode[data-mode-id=\"work\"]');
  await expect(page.locator('#mission')).toHaveClass(/show/);"""
if leni_needle not in t:
    raise SystemExit('Leni mode assertion block mismatch')
t = t.replace(leni_needle,leni_replacement,1)
tests.write_text(t,encoding='utf-8')

Path('CHANGELOG-v4.8.1.md').write_text('''# Flowz v4.8.1 — single TOEIC entry\n\n- kedy home no longer shows the redundant TODAY’S MISSION / START TOEIC CHECK card.\n- COMMUTE, TOEIC, and FREE are the only practical kedy entry points.\n- TOEIC keeps the existing one-tap 5-question L3/R2 flow and long-term score tracking internally.\n- Leni mission UI, Japanese-learning modes, Duo Sync, XP, History Vault, and Personal Context are unchanged.\n''',encoding='utf-8')

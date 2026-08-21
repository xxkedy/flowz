from pathlib import Path

app=Path('flowz-app.js')
s=app.read_text(encoding='utf-8')
for old,new in [
 ("number:'4.8.3'","number:'4.8.4'"),
 ("label:'v4.8.3 (2026.8.21)'","label:'v4.8.4 (2026.8.21)'"),
 ("title:'Flowz v4.8.3 · Duo Battle'","title:'Flowz v4.8.4 · Duo Battle'"),
 ("footer:'✅ Last updated 2026.08.21 · Flowz v4.8.3 Unified Build'","footer:'✅ Last updated 2026.08.21 · Flowz v4.8.4 Unified Build'"),
 ("weekTitle:'📅 LAST 7 DAYS'","weekTitle:'📅 LAST 30 DAYS'")
]:
    if old not in s: raise SystemExit('missing app token '+old)
    s=s.replace(old,new,1)

old="""function renderWeek(){
  var box=$('weekStrip');if(!box)return;box.innerHTML='';
  var start=new Date();start.setDate(start.getDate()-6);
  var names=current==='kedy'?['S','M','T','W','T','F','S']:['日','月','火','水','木','金','土'];
  var count=0;
  for(var i=0;i<7;i++){
    var d=new Date(start);d.setDate(start.getDate()+i);
    var key=dateKey(d),done=studiedOn(current,key);
    if(done)count++;
    var el=document.createElement('div');
    el.className='day-dot'+(current==='leni'?' leni':'')+(done?' done':'');
    el.innerHTML='<span>'+(done?'✓':d.getDate())+'</span><em>'+names[d.getDay()]+'</em>';
    box.appendChild(el);
  }
  text($('weekSessions'),count+' / 7 '+(current==='kedy'?'days':'日'));
}"""
new="""function renderWeek(){
  var box=$('weekStrip');if(!box)return;box.innerHTML='';
  var span=current==='kedy'?30:7;
  var start=new Date();start.setDate(start.getDate()-(span-1));
  var names=['日','月','火','水','木','金','土'];
  var count=0;
  box.classList.toggle('heatmap',current==='kedy');
  for(var i=0;i<span;i++){
    var d=new Date(start);d.setDate(start.getDate()+i);
    var key=dateKey(d),done=studiedOn(current,key);
    if(done)count++;
    var el=document.createElement('div');
    el.className='day-dot'+(current==='leni'?' leni':'')+(current==='kedy'?' heat':'')+(done?' done':'');
    el.title=key;
    if(current==='kedy')el.innerHTML='<span>'+d.getDate()+'</span>';
    else el.innerHTML='<span>'+(done?'✓':d.getDate())+'</span><em>'+names[d.getDay()]+'</em>';
    box.appendChild(el);
  }
  text($('weekSessions'),count+' / '+span+' '+(current==='kedy'?'days':'日'));
}"""
if old not in s: raise SystemExit('renderWeek block mismatch')
s=s.replace(old,new,1)
app.write_text(s,encoding='utf-8')

css=Path('flowz-v3-duo.css')
c=css.read_text(encoding='utf-8')
old_css=".week-strip{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}.day-dot{text-align:center}.day-dot span{display:grid;place-items:center;aspect-ratio:1;border-radius:11px;background:var(--panel2);border:1px solid var(--line);font-size:11px;font-weight:950}.day-dot.done span{background:var(--amber);color:#251400;border-color:transparent}.day-dot.leni.done span{background:var(--cyan);color:#002329}.day-dot em{display:block;font-style:normal;font-size:8px;color:var(--muted);margin-top:3px;font-weight:850}"
new_css=old_css+"\n.week-strip.heatmap{grid-template-columns:repeat(10,1fr);gap:5px}.week-strip.heatmap .day-dot span{border-radius:7px;font-size:8px;min-width:0}.week-strip.heatmap .day-dot.done span{box-shadow:0 0 0 1px rgba(255,158,44,.18)}"
if old_css not in c: raise SystemExit('week css mismatch')
c=c.replace(old_css,new_css,1)
css.write_text(c,encoding='utf-8')

html=Path('flowz-v3-duo.html')
h=html.read_text(encoding='utf-8')
for old,new in [
 ('Flowz v4.8.3 (2026.8.21)','Flowz v4.8.4 (2026.8.21)'),
 ('v4.8.3 (2026.8.21)','v4.8.4 (2026.8.21)'),
 ('flowz-v3-duo.css?v=4.8.3','flowz-v3-duo.css?v=4.8.4'),
 ('flowz-app.js?v=4.8.3','flowz-app.js?v=4.8.4'),
 ('2026.08.21 · Flowz v4.8.3 Unified Build','2026.08.21 · Flowz v4.8.4 Unified Build')
]:
    if old not in h: raise SystemExit('missing html token '+old)
    h=h.replace(old,new,1)
html.write_text(h,encoding='utf-8')

idx=Path('index.html')
i=idx.read_text(encoding='utf-8')
if '4.8.3' not in i: raise SystemExit('index version mismatch')
idx.write_text(i.replace('4.8.3','4.8.4'),encoding='utf-8')

t=Path('tests/stability.spec.js')
txt=t.read_text(encoding='utf-8')
txt=txt.replace("expect(initial.version).toBe('v4.8.3 (2026.8.21)');","expect(initial.version).toBe('v4.8.4 (2026.8.21)');")
txt=txt.replace("expect(initial.title).toBe('Flowz v4.8.3 · Duo Battle');","expect(initial.title).toBe('Flowz v4.8.4 · Duo Battle');")
old_test="""  await expect(page.locator('#weekStrip .day-dot')).toHaveCount(7);
  await expect(page.locator('#weekStrip .day-dot.done')).toHaveCount(2);
  await expect(page.locator('#weekSessions')).toHaveText('2 / 7 days');"""
new_test="""  await expect(page.locator('#weekStrip')).toHaveClass(/heatmap/);
  await expect(page.locator('#weekStrip .day-dot')).toHaveCount(30);
  await expect(page.locator('#weekStrip .day-dot.done')).toHaveCount(2);
  await expect(page.locator('#weekSessions')).toHaveText('2 / 30 days');
  await expect(page.locator('#weekTitle')).toHaveText('📅 LAST 30 DAYS');"""
if old_test not in txt: raise SystemExit('calendar test block mismatch')
txt=txt.replace(old_test,new_test,1)
extra="""

test('Leni keeps the existing seven-day calendar while kedy uses the compact 30-day heatmap', async ({ page }) => {
  await seed(page,{});
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#weekStrip .day-dot');
  await expect(page.locator('#weekStrip .day-dot')).toHaveCount(30);
  await page.click('.profile-btn[data-profile="leni"]');
  await expect(page.locator('#weekStrip')).not.toHaveClass(/heatmap/);
  await expect(page.locator('#weekStrip .day-dot')).toHaveCount(7);
  await expect(page.locator('#weekTitle')).toHaveText('📅 過去7日');
});
"""
if "Leni keeps the existing seven-day calendar" not in txt:
    txt += extra
t.write_text(txt,encoding='utf-8')

Path('CHANGELOG-v4.8.4.md').write_text('''# Flowz v4.8.4 — 30-day study heatmap\n\n- kedy bottom activity card now shows LAST 30 DAYS as a compact 10 × 3 heatmap.\n- Study-day truth still comes from both normalized day records and session history, so the v4.8.3 date-repair logic remains the source of truth.\n- The chip shows studied days out of 30, making the longer streak/session history visible without expanding the home screen much.\n- Leni keeps the existing seven-day calendar and Japanese learning behavior unchanged.\n- COMMUTE / TOEIC / FREE, Personal Context, XP, History Vault, and Duo Sync are unchanged.\n''',encoding='utf-8')

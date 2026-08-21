from pathlib import Path

app=Path('flowz-app.js')
s=app.read_text(encoding='utf-8')
for old,new in [
 ("number:'4.8.1'","number:'4.8.2'"),
 ("label:'v4.8.1 (2026.8.21)'","label:'v4.8.2 (2026.8.21)'"),
 ("title:'Flowz v4.8.1 · Duo Battle'","title:'Flowz v4.8.2 · Duo Battle'"),
 ("footer:'✅ Last updated 2026.08.21 · Flowz v4.8.1 Unified Build'","footer:'✅ Last updated 2026.08.21 · Flowz v4.8.2 Unified Build'")
]:
    if old not in s: raise SystemExit('missing release token '+old)
    s=s.replace(old,new,1)

old="""function renderWeek(){
  var box=$('weekStrip');box.innerHTML='';
  var start=new Date();start.setDate(start.getDate()-6);
  var names=current==='kedy'?['S','M','T','W','T','F','S']:['日','月','火','水','木','金','土'];
  var count=0;
  for(var i=0;i<7;i++){
    var d=new Date(start);d.setDate(start.getDate()+i);
    var key=dateKey(d),done=completed(current,key);
    if(done)count++;
    var el=document.createElement('div');
    el.className='day-dot'+(current==='leni'?' leni':'')+(done?' done':'');
    el.innerHTML='<span>'+(done?'✓':d.getDate())+'</span><em>'+names[d.getDay()]+'</em>';
    box.appendChild(el);
  }
  text($('weekSessions'),count+' / 7 '+(current==='kedy'?'days':'日'));
}"""
new="""function studiedOn(id,key){
  if(completed(id,key))return true;
  var rows=state.profiles[id]&&Array.isArray(state.profiles[id].sessions)?state.profiles[id].sessions:[];
  return rows.some(function(row){return String(row.date||'')===key||String(row.at||row.completed_at||'').slice(0,10)===key});
}
function renderWeek(){
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
if old not in s: raise SystemExit('renderWeek block mismatch')
s=s.replace(old,new,1)
old="renderModes();renderTalkPrep();renderMission();renderPending();renderAssessment();renderCloudPanel();renderVault();renderRelease();"
new="renderModes();renderTalkPrep();renderMission();renderPending();renderAssessment();renderCloudPanel();renderWeek();renderVault();renderRelease();"
if old not in s: raise SystemExit('render call mismatch')
s=s.replace(old,new,1)
app.write_text(s,encoding='utf-8')

html=Path('flowz-v3-duo.html')
h=html.read_text(encoding='utf-8')
h=h.replace('Flowz v4.8.1 (2026.8.21)','Flowz v4.8.2 (2026.8.21)')
h=h.replace('v4.8.1 (2026.8.21)','v4.8.2 (2026.8.21)')
h=h.replace('2026.08.21 · Flowz v4.8.1 Unified Build','2026.08.21 · Flowz v4.8.2 Unified Build')
h=h.replace('flowz-v3-duo.css?v=4.8.1','flowz-v3-duo.css?v=4.8.2')
h=h.replace('flowz-app.js?v=4.8.1','flowz-app.js?v=4.8.2')
needle='<div id="flowzRoomSwitchWrap" hidden style="margin:-12px 4px 18px;text-align:right"><button class="small-btn" id="flowzRoomSwitchBtn" type="button">ROOM変更</button></div>\n<details class="panel data-panel">'
replacement='<div id="flowzRoomSwitchWrap" hidden style="margin:-12px 4px 18px;text-align:right"><button class="small-btn" id="flowzRoomSwitchBtn" type="button">ROOM変更</button></div>\n<section class="panel"><div class="section-head"><div class="section-title" id="weekTitle">📅 LAST 7 DAYS</div><span class="chip" id="weekSessions">0 / 7 days</span></div><div class="week-strip" id="weekStrip"></div></section>\n<details class="panel data-panel">'
if needle not in h: raise SystemExit('calendar insertion point mismatch')
h=h.replace(needle,replacement,1)
html.write_text(h,encoding='utf-8')

idx=Path('index.html')
idx.write_text(idx.read_text(encoding='utf-8').replace('4.8.1','4.8.2'),encoding='utf-8')

t=Path('tests/stability.spec.js')
txt=t.read_text(encoding='utf-8')
txt=txt.replace("expect(initial.version).toBe('v4.8.1 (2026.8.21)');","expect(initial.version).toBe('v4.8.2 (2026.8.21)');")
txt=txt.replace("expect(initial.title).toBe('Flowz v4.8.1 · Duo Battle');","expect(initial.title).toBe('Flowz v4.8.2 · Duo Battle');")
txt=txt.replace("await expect(page.locator('#weekStrip')).toHaveCount(0);","await expect(page.locator('#weekStrip')).toHaveCount(1);",1)
nav_block="""  await expect(page.locator('#mission')).not.toHaveClass(/show/);
  await page.click('#modes .mode[data-mode-id=\"toeic\"]');
  await page.waitForTimeout(100);
  await expect(page.locator('#mission')).not.toHaveClass(/show/);
  const order=await page.evaluate(()=>{const prep=document.querySelector('#flowzTalkPrep'),today=document.querySelector('#todayCard');return prep.compareDocumentPosition(today)&Node.DOCUMENT_POSITION_FOLLOWING});"""
nav_replacement="""  await expect(page.locator('#mission')).not.toHaveClass(/show/);
  const order=await page.evaluate(()=>{const prep=document.querySelector('#flowzTalkPrep'),today=document.querySelector('#todayCard');return prep.compareDocumentPosition(today)&Node.DOCUMENT_POSITION_FOLLOWING});"""
if nav_block not in txt: raise SystemExit('navigation-sensitive QA block mismatch')
txt=txt.replace(nav_block,nav_replacement,1)
append="""

test('bottom study calendar restores recent activity from both day records and session history', async ({ page }) => {
  const now=new Date();
  const key=(daysAgo)=>{const d=new Date(now);d.setDate(d.getDate()-daysAgo);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const state={version:4,profiles:{kedy:{days:{},sessions:[]},leni:{days:{},sessions:[]}},migrated:true,updatedAt:''};
  state.profiles.kedy.days[key(2)]={base:10,phrase:0,fix:0,duo:0,count:1,mode:'commute'};
  state.profiles.kedy.sessions=[{date:key(1),mode:'free',title:'FREE',xp:10,at:key(1)+'T20:00:00+09:00'}];
  await seed(page,{flowz_duo_data:JSON.stringify(state)});
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#weekStrip .day-dot');
  await expect(page.locator('#weekStrip .day-dot')).toHaveCount(7);
  await expect(page.locator('#weekStrip .day-dot.done')).toHaveCount(2);
  await expect(page.locator('#weekSessions')).toHaveText('2 / 7 days');
  const belowCloud=await page.evaluate(()=>{const cloud=document.querySelector('#flowzCloudPanel'),week=document.querySelector('#weekStrip').closest('.panel');return !!(cloud.compareDocumentPosition(week)&Node.DOCUMENT_POSITION_FOLLOWING)});
  expect(belowCloud).toBeTruthy();
});
"""
if "bottom study calendar restores recent activity" not in txt: txt+=append
t.write_text(txt,encoding='utf-8')

Path('CHANGELOG-v4.8.2.md').write_text('''# Flowz v4.8.2 — reliable bottom study calendar\n\n- Restores LAST 7 DAYS near the bottom of the app, below Duo Sync / Room controls and above Data & Backup.\n- A studied day is recognized from either the durable day record or session history, reducing false 0/7 displays after updates or migrations.\n- XP, History Vault, Duo Sync, Personal Context, COMMUTE / TOEIC / FREE entry flow, and Leni learning modes are unchanged.\n''',encoding='utf-8')

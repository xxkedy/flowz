from pathlib import Path

app=Path('flowz-app.js')
s=app.read_text(encoding='utf-8')
for old,new in [
 ("number:'4.8.2'","number:'4.8.3'"),
 ("label:'v4.8.2 (2026.8.21)'","label:'v4.8.3 (2026.8.21)'"),
 ("title:'Flowz v4.8.2 · Duo Battle'","title:'Flowz v4.8.3 · Duo Battle'"),
 ("footer:'✅ Last updated 2026.08.21 · Flowz v4.8.2 Unified Build'","footer:'✅ Last updated 2026.08.21 · Flowz v4.8.3 Unified Build'")
]:
    if old not in s: raise SystemExit('missing release token '+old)
    s=s.replace(old,new,1)

old="var BACKFILL_MARKER='flowz_backfill_2026_07_08_to_08_05_v1';\nvar BACKFILL_DATES=['2026-07-08','2026-07-09','2026-07-10','2026-07-13','2026-07-14','2026-07-15','2026-07-16','2026-07-17','2026-07-20','2026-07-21','2026-07-22','2026-07-23','2026-07-24','2026-07-27','2026-07-28','2026-07-29','2026-07-30','2026-07-31','2026-08-03','2026-08-04','2026-08-05'];"
new="var BACKFILL_MARKER='flowz_backfill_2026_07_08_to_08_05_v1';\nvar BACKFILL_DATES=['2026-07-08','2026-07-09','2026-07-10','2026-07-13','2026-07-14','2026-07-15','2026-07-16','2026-07-17','2026-07-20','2026-07-21','2026-07-22','2026-07-23','2026-07-24','2026-07-27','2026-07-28','2026-07-29','2026-07-30','2026-07-31','2026-08-03','2026-08-04','2026-08-05'];\nvar CONFIRMED_REPAIR_MARKER='flowz_repair_kedy_2026_08_19_20_v1';\nvar CONFIRMED_REPAIR_DATES=['2026-08-19','2026-08-20'];"
if old not in s: raise SystemExit('marker block mismatch')
s=s.replace(old,new,1)

old="""function bootstrapState(){
  var merged=defaultState();
  candidateStates().forEach(function(c){merged=mergeState(merged,c)});
  merged=applyBackfill(merged);
  return merged;
}"""
new="""function applyConfirmedRepair(target){
  if(localStorage.getItem(CONFIRMED_REPAIR_MARKER)==='done')return target;
  var profile=target.profiles.kedy,seen={};
  profile.sessions.forEach(function(row){seen[sessionKey(row)]=true});
  CONFIRMED_REPAIR_DATES.forEach(function(date){
    var current=normalizeRecord(profile.days[date]);
    if(!current.base)current.base=10;
    if(!current.count)current.count=1;
    if(!current.mode)current.mode='commute';
    profile.days[date]=current;
    var hasDate=profile.sessions.some(function(row){return String(row.date||'')===date});
    if(!hasDate){
      var session={date:date,mode:'commute',title:'COMMUTE',theme:'User-confirmed study day repair',phrase:'',xp:10,at:new Date().toISOString(),startedAt:date+'T18:00:00+09:00',auto:true,confirmed:true,repair:'v4.8.3'};
      var key=sessionKey(session);if(!seen[key]){seen[key]=true;profile.sessions.push(session)}
    }
  });
  profile.sessions.sort(function(a,b){return String(a.date||a.at||a.completed_at||'').localeCompare(String(b.date||b.at||b.completed_at||''))});
  try{localStorage.setItem(CONFIRMED_REPAIR_MARKER,'done')}catch(e){}
  return target;
}
function bootstrapState(){
  var merged=defaultState();
  candidateStates().forEach(function(c){merged=mergeState(merged,c)});
  merged=applyBackfill(merged);
  merged=applyConfirmedRepair(merged);
  return merged;
}"""
if old not in s: raise SystemExit('bootstrap block mismatch')
s=s.replace(old,new,1)

old="""function autoComplete(){
  if(!pending||!pending.startedAt||!pending.autoRecord)return false;
  var elapsed=Date.now()-new Date(pending.startedAt).getTime();
  if(!isFinite(elapsed)||elapsed<MIN_SESSION_MS)return false;
  var id=pending.profile==='leni'?'leni':'kedy',key=dateKey(new Date());
  var r=dayRecord(id,key),gain=r.base?0:10;
  if(!r.base)r.base=10;
  r.count=(r.count||0)+1;r.mode=pending.mode||r.mode||'session';
  state.profiles[id].days[key]=r;
  state.profiles[id].sessions.push({date:key,mode:pending.mode||'session',title:pending.title||'',theme:pending.mission&&pending.mission.theme||'',phrase:pending.mission&&pending.mission.phrase||'',xp:gain,at:new Date().toISOString(),auto:true,release:RELEASE.number});
  saveState();pending=null;savePending();
  return true;
}"""
new="""function autoComplete(){
  if(!pending||!pending.startedAt||!pending.autoRecord)return false;
  var started=new Date(pending.startedAt),elapsed=Date.now()-started.getTime();
  if(!isFinite(elapsed)||elapsed<MIN_SESSION_MS)return false;
  var id=pending.profile==='leni'?'leni':'kedy',key=dateKey(started);
  var r=dayRecord(id,key),gain=r.base?0:10;
  if(!r.base)r.base=10;
  r.count=(r.count||0)+1;r.mode=pending.mode||r.mode||'session';
  state.profiles[id].days[key]=r;
  state.profiles[id].sessions.push({date:key,mode:pending.mode||'session',title:pending.title||'',theme:pending.mission&&pending.mission.theme||'',phrase:pending.mission&&pending.mission.phrase||'',xp:gain,at:pending.startedAt,auto:true,release:RELEASE.number});
  saveState();pending=null;savePending();
  return true;
}"""
if old not in s: raise SystemExit('autoComplete block mismatch')
s=s.replace(old,new,1)
app.write_text(s,encoding='utf-8')

html=Path('flowz-v3-duo.html')
h=html.read_text(encoding='utf-8')
h=h.replace('Flowz v4.8.2 (2026.8.21)','Flowz v4.8.3 (2026.8.21)')
h=h.replace('v4.8.2 (2026.8.21)','v4.8.3 (2026.8.21)')
h=h.replace('2026.08.21 · Flowz v4.8.2 Unified Build','2026.08.21 · Flowz v4.8.3 Unified Build')
h=h.replace('flowz-v3-duo.css?v=4.8.2','flowz-v3-duo.css?v=4.8.3')
h=h.replace('flowz-app.js?v=4.8.2','flowz-app.js?v=4.8.3')
html.write_text(h,encoding='utf-8')

idx=Path('index.html')
idx.write_text(idx.read_text(encoding='utf-8').replace('4.8.2','4.8.3'),encoding='utf-8')

t=Path('tests/stability.spec.js')
txt=t.read_text(encoding='utf-8')
txt=txt.replace("const BACKFILL_MARKER = 'flowz_backfill_2026_07_08_to_08_05_v1';","const BACKFILL_MARKER = 'flowz_backfill_2026_07_08_to_08_05_v1';\nconst CONFIRMED_REPAIR_MARKER = 'flowz_repair_kedy_2026_08_19_20_v1';")
txt=txt.replace("}, { [BACKFILL_MARKER]: 'done', ...entries });","}, { [BACKFILL_MARKER]: 'done', [CONFIRMED_REPAIR_MARKER]: 'done', ...entries });")
txt=txt.replace("expect(initial.version).toBe('v4.8.2 (2026.8.21)');","expect(initial.version).toBe('v4.8.3 (2026.8.21)');")
txt=txt.replace("expect(initial.title).toBe('Flowz v4.8.2 · Duo Battle');","expect(initial.title).toBe('Flowz v4.8.3 · Duo Battle');")

anchor="""test('legacy localStorage shapes migrate into flowz_duo_data without loss', async ({ page }) => {"""
extra="""
test('an overdue pending session records on its original start date, not the day Flowz is reopened', async ({ page }) => {
  const started = new Date();
  started.setDate(started.getDate()-1);
  started.setHours(20,0,0,0);
  const startedAt=started.toISOString();
  const startKey=`${started.getFullYear()}-${String(started.getMonth()+1).padStart(2,'0')}-${String(started.getDate()).padStart(2,'0')}`;
  await seed(page, {
    flowz_duo_data: emptyState,
    flowz_duo_pending: JSON.stringify({
      profile:'kedy', mode:'commute', title:'COMMUTE', startedAt, autoRecord:true,
      mission:{theme:'Yesterday commute',phrase:'I was thinking about it.',meaning:'それについて考えてた'}
    })
  });
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#modes .mode');
  await page.waitForFunction(() => window.FlowzApp.getPending() === null);
  const result=await page.evaluate(() => {
    const k=window.FlowzApp.getState().profiles.kedy;
    return {keys:Object.keys(k.days).sort(),today:document.querySelector('#todayTitle').textContent,todayXp:document.querySelector('#todayXp').textContent,session:k.sessions[0]};
  });
  expect(result.keys).toEqual([startKey]);
  expect(result.today).toBe('NOT STARTED');
  expect(result.todayXp).toBe('0');
  expect(result.session.date).toBe(startKey);
  expect(result.session.at).toBe(startedAt);
});

test('v4.8.3 restores the two user-confirmed kedy study days exactly once', async ({ page }) => {
  await page.addInitScript((state) => {
    localStorage.setItem('flowz_backfill_2026_07_08_to_08_05_v1','done');
    localStorage.setItem('flowz_duo_data',JSON.stringify(state));
  }, JSON.parse(emptyState));
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#modes .mode');
  let repaired=await page.evaluate(() => {
    const k=window.FlowzApp.getState().profiles.kedy;
    return {days:Object.keys(k.days).sort(),sessions:k.sessions.map(s=>s.date),marker:localStorage.getItem('flowz_repair_kedy_2026_08_19_20_v1')};
  });
  expect(repaired.days).toEqual(['2026-08-19','2026-08-20']);
  expect(repaired.sessions).toEqual(['2026-08-19','2026-08-20']);
  expect(repaired.marker).toBe('done');
  await page.reload();
  await page.waitForSelector('#modes .mode');
  repaired=await page.evaluate(() => {
    const k=window.FlowzApp.getState().profiles.kedy;
    return {days:Object.keys(k.days).sort(),sessions:k.sessions.map(s=>s.date)};
  });
  expect(repaired.days).toEqual(['2026-08-19','2026-08-20']);
  expect(repaired.sessions).toEqual(['2026-08-19','2026-08-20']);
});

"""
if extra.strip() not in txt:
    if anchor not in txt: raise SystemExit('test insertion anchor mismatch')
    txt=txt.replace(anchor,extra+anchor,1)
t.write_text(txt,encoding='utf-8')

Path('CHANGELOG-v4.8.3.md').write_text('''# Flowz v4.8.3 — session date reliability\n\n- Auto-complete now records a session on the calendar date when it was started, even when Flowz is reopened the next day or later.\n- The session history timestamp also keeps the original startedAt value, so cloud migration preserves the correct study date.\n- Restores kedy's user-confirmed 2026-08-19 and 2026-08-20 study days once, with a migration marker preventing duplicate XP or sessions. Repair events use the current sync timestamp while keeping their intended session_date so they can still reach Duo Sync after prior migrations.\n- LAST 7 DAYS, COMMUTE / TOEIC / FREE, Personal Context, Duo Sync, History Vault, and Leni learning behavior otherwise stay unchanged.\n''',encoding='utf-8')

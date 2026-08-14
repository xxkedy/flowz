from pathlib import Path
import re


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 exact match, got {count}")
    return text.replace(old, new, 1)


def regex_once(text, pattern, repl, label, flags=0):
    out, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 regex match, got {count}")
    return out


app_path = Path('flowz-app.js')
app = app_path.read_text()

app = replace_once(
    app,
    "var RELEASE={\n  number:'4.5.0',\n  label:'v4.5.0 (2026.8.14)',\n  title:'Flowz v4.5.0 · Duo Battle',\n  footer:'✅ Last updated 2026.08.14 · Flowz v4.5.0 Unified Build'\n};",
    "var RELEASE={\n  number:'4.5.1',\n  label:'v4.5.1 (2026.8.14)',\n  title:'Flowz v4.5.1 · Duo Battle',\n  footer:'✅ Last updated 2026.08.14 · Flowz v4.5.1 Unified Build'\n};",
    'release',
)

commute_pattern = r"  commute:\[\n.*?\n  \],\n  toeic:\["
commute_repl = """  commute:[
   {theme:'Weather on the way home',phrase:\"It's cooler than usual.\",meaning:'いつもより涼しい',guide:'Compare today with a normal day.'},
   {theme:'Getting home soon',phrase:\"I'll be home in five minutes.\",meaning:'あと5分で家に着く',guide:'Change the number naturally.'},
   {theme:'Finishing the workday',phrase:'I just finished work.',meaning:'仕事が終わったばかり',guide:'Use it near the start.'},
   {theme:'Choosing between options',phrase:\"I'm not sure yet.\",meaning:'まだ分からない／未定',guide:'Use it before giving options.'},
   {theme:'Traffic and road conditions',phrase:'Traffic is lighter than usual.',meaning:'いつもより交通量が少ない',guide:'Describe what you notice now.'},
   {theme:'Remembering an earlier thought',phrase:'I was thinking about that earlier.',meaning:'さっきそれについて考えてた',guide:'Connect it to something from today.'},
   {theme:'Connecting ideas',phrase:'That reminds me of something.',meaning:'それで思い出したことがある',guide:'Use it before changing to a related topic.'},
   {theme:'Changing a decision',phrase:'I changed my mind.',meaning:'考えが変わった',guide:'Add what changed.'},
   {theme:'Unexpected moments',phrase:\"I didn't expect that.\",meaning:'それは予想してなかった',guide:'Add one short reason.'},
   {theme:'Getting comfortable with something',phrase:\"I'm getting used to it.\",meaning:'だんだん慣れてきた',guide:'Say what you are getting used to.'},
   {theme:'Trying a different approach',phrase:'I want to try something different.',meaning:'何か違うことを試したい',guide:'Add what you want to change.'},
   {theme:'Recent thoughts',phrase:\"I've been thinking about it lately.\",meaning:'最近それについて考えてる',guide:'Add one detail.'},
   {theme:'Solving something',phrase:'I need to figure it out.',meaning:'それを考えて解決しないと',guide:'Say what you need to figure out.'},
   {theme:'Clarifying your meaning',phrase:\"That's what I meant.\",meaning:'そういう意味だった',guide:'Use it after clarifying yourself.'},
   {theme:'Talking about preference',phrase:'It depends on how I feel.',meaning:'気分による',guide:'Give one example.'}
  ],
  toeic:["""
app = regex_once(app, commute_pattern, commute_repl, 'commute mission pool', re.S)

old_generation = """function missionSeed(profile,modeId,key){var t=profile+'|'+modeId+'|'+key,sum=0;for(var i=0;i<t.length;i++)sum=(sum*31+t.charCodeAt(i))>>>0;return sum}
function generateMission(profile,modeId,key){
  var list=MISSIONS[profile][modeId]||MISSIONS[profile][Object.keys(MISSIONS[profile])[0]];
  var item=list[missionSeed(profile,modeId,key)%list.length];
  return {theme:item.theme,phrase:item.phrase,reading:item.reading||'',meaning:item.meaning||'',guide:item.guide||''};
}
function previousPhrase(){
  var sessions=state.profiles.kedy.sessions,todayMission=generateMission('kedy','commute',today);
  for(var i=sessions.length-1;i>=0;i--){
    var phrase=sessions[i]&&sessions[i].phrase;
    if(phrase&&phrase!==todayMission.phrase)return phrase;
  }
  return 'I feel good.';
}
"""
new_generation = """function missionSeed(profile,modeId,key){var t=profile+'|'+modeId+'|'+key,sum=0;for(var i=0;i<t.length;i++)sum=(sum*31+t.charCodeAt(i))>>>0;return sum}
function generateMission(profile,modeId,key){
  var list=MISSIONS[profile][modeId]||MISSIONS[profile][Object.keys(MISSIONS[profile])[0]];
  var item=list[missionSeed(profile,modeId,key)%list.length];
  return {theme:item.theme,phrase:item.phrase,reading:item.reading||'',meaning:item.meaning||'',guide:item.guide||''};
}
var commuteMissionOffset=0,commuteReuseOffset=0;
var STALE_PREP_PHRASES={\"I haven't decided yet.\":true,'I feel good.':true};
function recentCommutePhrases(limit){
  var sessions=state.profiles.kedy.sessions||[],out=[],seen={};
  for(var i=sessions.length-1;i>=0&&out.length<(limit||4);i--){
    var s=sessions[i]||{},phrase=s.phrase||'';
    if(s.mode!=='commute'||!phrase||seen[phrase])continue;
    seen[phrase]=true;out.push(phrase);
  }
  return out;
}
function currentCommuteMission(){
  var list=MISSIONS.kedy.commute,recent=recentCommutePhrases(3),blocked={};
  recent.forEach(function(p){blocked[p]=true});
  var start=(missionSeed('kedy','commute',today)+sessionCount('kedy')+commuteMissionOffset)%list.length;
  for(var step=0;step<list.length;step++){
    var item=list[(start+step)%list.length];
    if(!blocked[item.phrase])return {theme:item.theme,phrase:item.phrase,reading:'',meaning:item.meaning||'',guide:item.guide||''};
  }
  var fallback=list[start];
  return {theme:fallback.theme,phrase:fallback.phrase,reading:'',meaning:fallback.meaning||'',guide:fallback.guide||''};
}
function currentReusePhrase(currentPhrase){
  var recent=recentCommutePhrases(8).filter(function(p){return p!==currentPhrase&&!STALE_PREP_PHRASES[p]});
  if(recent.length)return recent[commuteReuseOffset%recent.length];
  var list=MISSIONS.kedy.commute,start=(missionSeed('kedy','reuse',today)+sessionCount('kedy')+commuteReuseOffset)%list.length;
  for(var step=0;step<list.length;step++){
    var phrase=list[(start+step)%list.length].phrase;
    if(phrase!==currentPhrase&&!STALE_PREP_PHRASES[phrase])return phrase;
  }
  return '';
}
"""
app = replace_once(app, old_generation, new_generation, 'commute mission rotation helpers')

old_talk_prep = """function renderTalkPrep(){
  var card=$('flowzTalkPrep');if(!card||current!=='kedy')return;
  var m=generateMission('kedy','commute',today),reuse=previousPhrase();
  card.innerHTML='<div class=\"prep-head\"><div class=\"prep-title\">🗣️ TALK PREP</div><span class=\"prep-chip\">COMMUTE</span></div>'+ 
    '<div class=\"prep-grid\">'+
      '<div class=\"prep-row\"><span>OPEN</span><div><b>Hey ChatGPT, how’s it going?</b><small>普通に挨拶から始めてOK</small></div></div>'+ 
      '<div class=\"prep-row\"><span>TODAY</span><div><b>'+escapeHtml(m.phrase)+'</b><small>'+escapeHtml(m.meaning)+'</small></div></div>'+ 
      '<div class=\"prep-row\"><span>REUSE</span><div><b>'+escapeHtml(reuse)+'</b><small>前回表現をもう一度使う</small></div></div>'+ 
    '</div><button id=\"flowzTalkPrepBtn\" type=\"button\">⚡ START COMMUTE</button>';
}
"""
# Whitespace in the source is stable except for trailing spaces, so use a regex replacement for the function.
talk_prep_pattern = r"function renderTalkPrep\(\)\{\n.*?\n\}\nfunction renderModes\(\)\{"
talk_prep_repl = """function renderTalkPrep(){
  var card=$('flowzTalkPrep');if(!card||current!=='kedy')return;
  var m=currentCommuteMission(),reuse=currentReusePhrase(m.phrase);
  card.innerHTML='<div class=\"prep-head\"><div class=\"prep-title\">🗣️ TALK PREP</div><span class=\"prep-chip\">COMMUTE</span></div>'+ 
    '<div class=\"prep-grid\">'+
      '<div class=\"prep-row\"><span>OPEN</span><div><b>Hey ChatGPT, how’s it going?</b><small>普通に挨拶から始めてOK</small></div></div>'+ 
      '<div class=\"prep-row\" data-prep-action=\"today\" role=\"button\" tabindex=\"0\"><span>TODAY</span><div><b>'+escapeHtml(m.phrase)+'</b><small>'+escapeHtml(m.meaning)+' · タップで切替</small></div></div>'+ 
      '<div class=\"prep-row\" data-prep-action=\"reuse\" role=\"button\" tabindex=\"0\"><span>REUSE</span><div><b>'+escapeHtml(reuse)+'</b><small>最近の表現から選択 · タップで切替</small></div></div>'+ 
    '</div><button id=\"flowzTalkPrepBtn\" type=\"button\">⚡ START COMMUTE</button>';
}
function renderModes(){"""
app = regex_once(app, talk_prep_pattern, talk_prep_repl, 'Talk Prep render', re.S)

app = replace_once(
    app,
    "function selectMission(mode){\n  pending={profile:current,mode:mode.id,title:mode.title,selectedAt:new Date().toISOString(),startedAt:'',mission:generateMission(current,mode.id,today)};",
    "function selectMission(mode,missionOverride){\n  pending={profile:current,mode:mode.id,title:mode.title,selectedAt:new Date().toISOString(),startedAt:'',mission:missionOverride||generateMission(current,mode.id,today)};",
    'selectMission override',
)
app = replace_once(
    app,
    "function beginCommute(){\n  if(current!=='kedy')return;\n  selectMission({id:'commute',title:'COMMUTE'});\n  startSession();\n}",
    "function beginCommute(){\n  if(current!=='kedy')return;\n  selectMission({id:'commute',title:'COMMUTE'},currentCommuteMission());\n  startSession();\n}",
    'beginCommute fresh mission',
)

old_listener = """  var talkPrep=$('flowzTalkPrep');
  if(talkPrep)talkPrep.addEventListener('click',function(e){
    if(e.target.closest&&e.target.closest('#flowzTalkPrepBtn'))beginCommute();
  });
"""
new_listener = """  var talkPrep=$('flowzTalkPrep');
  if(talkPrep){
    talkPrep.addEventListener('click',function(e){
      if(e.target.closest&&e.target.closest('#flowzTalkPrepBtn')){beginCommute();return}
      var row=e.target.closest&&e.target.closest('[data-prep-action]');if(!row)return;
      if(row.dataset.prepAction==='today')commuteMissionOffset++;
      if(row.dataset.prepAction==='reuse')commuteReuseOffset++;
      renderTalkPrep();
    });
    talkPrep.addEventListener('keydown',function(e){
      if(e.key!=='Enter'&&e.key!==' ')return;
      var row=e.target.closest&&e.target.closest('[data-prep-action]');if(!row)return;
      e.preventDefault();row.click();
    });
  }
"""
app = replace_once(app, old_listener, new_listener, 'Talk Prep interaction')

app = replace_once(
    app,
    "  buildPromptFor:buildPromptFor,\n  render:render",
    "  buildPromptFor:buildPromptFor,\n  getTalkPrep:function(){var m=currentCommuteMission();return {today:m,reuse:currentReusePhrase(m.phrase)}},\n  render:render",
    'debug hook',
)

app_path.write_text(app)

for path in ['flowz-v3-duo.html', 'index.html']:
    p = Path(path)
    p.write_text(p.read_text().replace('v4.5.0', 'v4.5.1').replace('4.5.0', '4.5.1'))

pkg = Path('package.json')
pkg.write_text(pkg.read_text().replace('"version": "4.5.0"', '"version": "4.5.1"'))
lock = Path('package-lock.json')
lock.write_text(lock.read_text().replace('"version": "4.5.0"', '"version": "4.5.1"'))

tests_path = Path('tests/stability.spec.js')
tests = tests_path.read_text().replace('v4.5.0 (2026.8.14)', 'v4.5.1 (2026.8.14)').replace('Flowz v4.5.0 · Duo Battle', 'Flowz v4.5.1 · Duo Battle')
anchor = "test('a linked Duo Room renders as a compact status strip', async ({ page }) => {"
new_test = r'''test('Talk Prep rotates fresh phrases, removes stale fallback, and advances after a commute session', async ({ page }) => {
  const seeded = JSON.stringify({
    version: 4,
    profiles: {
      kedy: {
        days: {},
        sessions: [
          { date:'2026-08-10', mode:'commute', title:'COMMUTE', phrase:"I haven't decided yet.", at:'2026-08-10T08:00:00+09:00' },
          { date:'2026-08-11', mode:'commute', title:'COMMUTE', phrase:'I feel good.', at:'2026-08-11T08:00:00+09:00' },
          { date:'2026-08-12', mode:'commute', title:'COMMUTE', phrase:"It's cooler than usual.", at:'2026-08-12T08:00:00+09:00' },
          { date:'2026-08-13', mode:'commute', title:'COMMUTE', phrase:"I'll be home in five minutes.", at:'2026-08-13T08:00:00+09:00' },
          { date:'2026-08-13', mode:'commute', title:'COMMUTE', phrase:'I just finished work.', at:'2026-08-13T18:00:00+09:00' }
        ]
      },
      leni: { days:{}, sessions:[] }
    },
    migrated: true,
    updatedAt: ''
  });
  await seed(page, { flowz_duo_data: seeded });
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#flowzTalkPrep [data-prep-action="today"]');

  const first = await page.evaluate(() => window.FlowzApp.getTalkPrep());
  expect(first.today.phrase).not.toBe("I haven't decided yet.");
  expect(first.today.phrase).not.toBe('I feel good.');
  expect(first.reuse).not.toBe("I haven't decided yet.");
  expect(first.reuse).not.toBe('I feel good.');
  await expect(page.locator('[data-prep-action="today"] small')).toContainText('タップで切替');
  await expect(page.locator('[data-prep-action="reuse"] small')).toContainText('タップで切替');

  await page.click('[data-prep-action="today"]');
  const afterTodayTap = await page.evaluate(() => window.FlowzApp.getTalkPrep());
  expect(afterTodayTap.today.phrase).not.toBe(first.today.phrase);

  await page.click('[data-prep-action="reuse"]');
  const afterReuseTap = await page.evaluate(() => window.FlowzApp.getTalkPrep());
  expect(afterReuseTap.reuse).not.toBe(afterTodayTap.reuse);

  const missionBeforeSession = afterReuseTap.today;
  await page.evaluate((mission) => {
    localStorage.setItem('flowz_duo_pending', JSON.stringify({
      profile:'kedy', mode:'commute', title:'COMMUTE',
      selectedAt:new Date(Date.now()-11*60*1000).toISOString(),
      startedAt:new Date(Date.now()-10*60*1000).toISOString(),
      autoRecord:true, mission
    }));
  }, missionBeforeSession);
  await page.reload();
  await page.waitForFunction(() => window.FlowzApp.getPending() === null);
  const afterCompletedCommute = await page.evaluate(() => window.FlowzApp.getTalkPrep());
  expect(afterCompletedCommute.today.phrase).not.toBe(missionBeforeSession.phrase);
});

'''
if anchor not in tests:
    raise SystemExit('test insertion anchor missing')
tests = tests.replace(anchor, new_test + anchor, 1)
tests_path.write_text(tests)

Path('CHANGELOG-v4.5.1.md').write_text('''# Flowz v4.5.1 — 2026-08-14\n\n- TALK PREP no longer pins one TODAY phrase for the whole date.\n- TODAY advances after each completed COMMUTE session and avoids the three most recent commute phrases.\n- TODAY and REUSE rows can be tapped to switch phrases immediately before starting.\n- Removed the static `I feel good.` fallback and retired `I haven\\'t decided yet.` from the active commute mission pool.\n- REUSE now rotates through real recent commute phrases; if none are suitable, it falls back to a different fresh phrase.\n- Duo Sync, XP/history, Feedback Loop, TOEIC, FREE, and Leni behavior are unchanged.\n''')

print('Flowz v4.5.1 Talk Prep patch applied')

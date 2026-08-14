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
    "var RELEASE={\n  number:'4.5.2',\n  label:'v4.5.2 (2026.8.14)',\n  title:'Flowz v4.5.2 · Duo Battle',\n  footer:'✅ Last updated 2026.08.14 · Flowz v4.5.2 Unified Build'\n};",
    "var RELEASE={\n  number:'4.6.0',\n  label:'v4.6.0 (2026.8.14)',\n  title:'Flowz v4.6.0 · Duo Battle',\n  footer:'✅ Last updated 2026.08.14 · Flowz v4.6.0 Unified Build'\n};",
    'release',
)

app = replace_once(
    app,
    "var commuteMissionOffset=0,commuteReuseOffset=0;\nvar STALE_PREP_PHRASES={\"I haven't decided yet.\":true,'I feel good.':true};",
    "var commuteMissionOffset=0,commuteReuseOffset=0,leniPrepMissionOffset=0,leniPrepReuseOffset=0;\nvar STALE_PREP_PHRASES={\"I haven't decided yet.\":true,'I feel good.':true};",
    'prep offsets',
)

anchor = """function currentReusePhrase(currentPhrase){
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
extra = anchor + """function recentLeniPhrases(limit){
  var sessions=state.profiles.leni.sessions||[],out=[],seen={};
  for(var i=sessions.length-1;i>=0&&out.length<(limit||4);i--){
    var s=sessions[i]||{},phrase=s.phrase||'';
    if(!phrase||seen[phrase])continue;
    seen[phrase]=true;out.push(phrase);
  }
  return out;
}
function currentLeniPrepMission(){
  var list=MISSIONS.leni.free,recent=recentLeniPhrases(2),blocked={};
  recent.forEach(function(p){blocked[p]=true});
  var start=(missionSeed('leni','free',today)+sessionCount('leni')+leniPrepMissionOffset)%list.length;
  for(var step=0;step<list.length;step++){
    var item=list[(start+step)%list.length];
    if(!blocked[item.phrase])return {theme:item.theme,phrase:item.phrase,reading:item.reading||'',meaning:item.meaning||'',guide:item.guide||''};
  }
  var fallback=list[start];
  return {theme:fallback.theme,phrase:fallback.phrase,reading:fallback.reading||'',meaning:fallback.meaning||'',guide:fallback.guide||''};
}
function currentLeniReusePhrase(currentPhrase){
  var recent=recentLeniPhrases(8).filter(function(p){return p!==currentPhrase});
  if(recent.length)return recent[leniPrepReuseOffset%recent.length];
  var list=MISSIONS.leni.free,start=(missionSeed('leni','reuse',today)+sessionCount('leni')+leniPrepReuseOffset)%list.length;
  for(var step=0;step<list.length;step++){
    var phrase=list[(start+step)%list.length].phrase;
    if(phrase!==currentPhrase)return phrase;
  }
  return '';
}
"""
app = replace_once(app, anchor, extra, 'Leni prep helpers')

render_pattern = r"function renderTalkPrep\(\)\{\n.*?\n\}\nfunction renderModes\(\)\{"
render_repl = """function renderTalkPrep(){
  var card=$('flowzTalkPrep');if(!card)return;
  if(current==='kedy'){
    var m=currentCommuteMission(),reuse=currentReusePhrase(m.phrase);
    card.innerHTML='<div class=\"prep-head\"><div class=\"prep-title\">🗣️ TALK PREP</div><span class=\"prep-chip\">COMMUTE</span></div>'+ 
      '<div class=\"prep-grid\">'+
        '<div class=\"prep-row\"><span>OPEN</span><div><b>Hey ChatGPT, how’s it going?</b><small>普通に挨拶から始めてOK</small></div></div>'+ 
        '<div class=\"prep-row\" data-prep-action=\"today\" role=\"button\" tabindex=\"0\"><span>TODAY</span><div><b>'+escapeHtml(m.phrase)+'</b><small>'+escapeHtml(m.meaning)+' · タップで切替</small></div></div>'+ 
        '<div class=\"prep-row\" data-prep-action=\"reuse\" role=\"button\" tabindex=\"0\"><span>REUSE</span><div><b>'+escapeHtml(reuse)+'</b><small>最近の表現から選択 · タップで切替</small></div></div>'+ 
      '</div><button id=\"flowzTalkPrepBtn\" type=\"button\">⚡ START COMMUTE</button>';
    return;
  }
  var lm=currentLeniPrepMission(),lreuse=currentLeniReusePhrase(lm.phrase);
  card.innerHTML='<div class=\"prep-head\"><div class=\"prep-title\">🗣️ TALK PREP</div><span class=\"prep-chip\">FREE</span></div>'+ 
    '<div class=\"prep-grid\">'+
      '<div class=\"prep-row\"><span>OPEN</span><div><b>ChatGPTさん、こんにちは。今日も日本語を練習したいです。</b><small>Mulai dengan sapaan biasa</small></div></div>'+ 
      '<div class=\"prep-row\" data-prep-action=\"today\" role=\"button\" tabindex=\"0\"><span>TODAY</span><div><b>'+escapeHtml(lm.phrase)+'</b><small>'+escapeHtml(lm.meaning)+' · タップで切替</small></div></div>'+ 
      '<div class=\"prep-row\" data-prep-action=\"reuse\" role=\"button\" tabindex=\"0\"><span>REUSE</span><div><b>'+escapeHtml(lreuse)+'</b><small>最近の表現から選択 · タップで切替</small></div></div>'+ 
    '</div><button id=\"flowzTalkPrepBtn\" type=\"button\">⚡ START FREE</button>';
}
function renderModes(){"""
app = regex_once(app, render_pattern, render_repl, 'renderTalkPrep', re.S)

app = replace_once(
    app,
    "  var talkPrep=$('flowzTalkPrep');if(talkPrep)talkPrep.style.display=current==='kedy'?'':'none';",
    "  var talkPrep=$('flowzTalkPrep');if(talkPrep)talkPrep.style.display='';",
    'show Talk Prep for both profiles',
)

app = replace_once(
    app,
    "function beginCommute(){\n  if(current!=='kedy')return;\n  selectMission({id:'commute',title:'COMMUTE'},currentCommuteMission());\n  startSession();\n}",
    "function beginCommute(){\n  if(current!=='kedy')return;\n  selectMission({id:'commute',title:'COMMUTE'},currentCommuteMission());\n  startSession();\n}\nfunction beginLeniTalkPrep(){\n  if(current!=='leni')return;\n  selectMission(findMode('leni','free'),currentLeniPrepMission());\n  startSession();\n}\nfunction beginTalkPrep(){\n  if(current==='kedy')beginCommute();\n  else beginLeniTalkPrep();\n}",
    'Leni Talk Prep start',
)

old_listener = """  var talkPrep=$('flowzTalkPrep');
  if(talkPrep){
    talkPrep.addEventListener('click',function(e){
      if(e.target.closest&&e.target.closest('#flowzTalkPrepBtn')){beginCommute();return}
      var row=e.target.closest&&e.target.closest('[data-prep-action]');if(!row)return;
      if(row.dataset.prepAction==='today')commuteMissionOffset++;
      if(row.dataset.prepAction==='reuse')commuteReuseOffset++;
      renderTalkPrep();
    });
"""
new_listener = """  var talkPrep=$('flowzTalkPrep');
  if(talkPrep){
    talkPrep.addEventListener('click',function(e){
      if(e.target.closest&&e.target.closest('#flowzTalkPrepBtn')){beginTalkPrep();return}
      var row=e.target.closest&&e.target.closest('[data-prep-action]');if(!row)return;
      if(current==='kedy'){
        if(row.dataset.prepAction==='today')commuteMissionOffset++;
        if(row.dataset.prepAction==='reuse')commuteReuseOffset++;
      }else{
        if(row.dataset.prepAction==='today')leniPrepMissionOffset++;
        if(row.dataset.prepAction==='reuse')leniPrepReuseOffset++;
      }
      renderTalkPrep();
    });
"""
app = replace_once(app, old_listener, new_listener, 'Talk Prep interactions')

app = replace_once(
    app,
    "  getTalkPrep:function(){var m=currentCommuteMission();return {profile:'kedy',today:m,reuse:currentReusePhrase(m.phrase)}},",
    "  getTalkPrep:function(){if(current==='leni'){var lm=currentLeniPrepMission();return {profile:'leni',today:lm,reuse:currentLeniReusePhrase(lm.phrase)}}var m=currentCommuteMission();return {profile:'kedy',today:m,reuse:currentReusePhrase(m.phrase)}},",
    'debug Talk Prep',
)

app_path.write_text(app)

css_path = Path('flowz-v3-duo.css')
css = css_path.read_text()
css = replace_once(
    css,
    "body[data-profile=\"leni\"] .prep{display:none}",
    "body[data-profile=\"leni\"] .prep{border-color:rgba(39,211,223,.46);background:linear-gradient(155deg,#10191a,#111315)}",
    'Leni prep visibility',
)
css = replace_once(
    css,
    ".prep-chip{padding:6px 9px;border:1px solid #5d4a32;border-radius:999px;font-size:10px;font-weight:900;color:#ffae48}",
    ".prep-chip{padding:6px 9px;border:1px solid #5d4a32;border-radius:999px;font-size:10px;font-weight:900;color:#ffae48}\nbody[data-profile=\"leni\"] .prep-chip{border-color:rgba(39,211,223,.46);color:#7fe8ef}",
    'Leni prep chip',
)
css = replace_once(
    css,
    ".prep-row[data-prep-action]:active{transform:scale(.99);filter:brightness(1.18)}\n#flowzTalkPrepBtn{width:100%;margin-top:10px;padding:14px;border:0;border-radius:13px;background:linear-gradient(135deg,var(--amber),#ff7138);color:#111;font:950 15px/1 -apple-system,BlinkMacSystemFont,\"Hiragino Sans\",sans-serif}",
    ".prep-row[data-prep-action]:active{transform:scale(.99);filter:brightness(1.18)}\nbody[data-profile=\"leni\"] .prep-row[data-prep-action=\"today\"]{background:linear-gradient(135deg,rgba(39,211,223,.17),rgba(39,211,223,.06));border-color:rgba(39,211,223,.50)}\nbody[data-profile=\"leni\"] .prep-row[data-prep-action=\"today\"]>span{color:#7fe8ef}\nbody[data-profile=\"leni\"] .prep-row[data-prep-action=\"today\"]::after{color:var(--cyan)}\nbody[data-profile=\"leni\"] .prep-row[data-prep-action=\"reuse\"]{background:linear-gradient(135deg,rgba(85,217,130,.16),rgba(85,217,130,.055));border-color:rgba(85,217,130,.46)}\nbody[data-profile=\"leni\"] .prep-row[data-prep-action=\"reuse\"]>span{color:#91edaf}\nbody[data-profile=\"leni\"] .prep-row[data-prep-action=\"reuse\"]::after{color:var(--green)}\n#flowzTalkPrepBtn{width:100%;margin-top:10px;padding:14px;border:0;border-radius:13px;background:linear-gradient(135deg,var(--amber),#ff7138);color:#111;font:950 15px/1 -apple-system,BlinkMacSystemFont,\"Hiragino Sans\",sans-serif}\nbody[data-profile=\"leni\"] #flowzTalkPrepBtn{background:linear-gradient(135deg,var(--cyan),var(--green));color:#002329}",
    'Leni Talk Prep colors',
)
css_path.write_text(css)

for path in ['flowz-v3-duo.html', 'index.html']:
    p = Path(path)
    p.write_text(p.read_text().replace('v4.5.2', 'v4.6.0').replace('4.5.2', '4.6.0'))

for path in ['package.json', 'package-lock.json']:
    p = Path(path)
    p.write_text(p.read_text().replace('"version": "4.5.2"', '"version": "4.6.0"'))

tests_path = Path('tests/stability.spec.js')
tests = tests_path.read_text().replace('v4.5.2 (2026.8.14)', 'v4.6.0 (2026.8.14)').replace('Flowz v4.5.2 · Duo Battle', 'Flowz v4.6.0 · Duo Battle')
insert_before = "test('a linked Duo Room renders as a compact status strip', async ({ page }) => {"
new_test = r'''test('Leni gets a Talk Prep quick start that rotates Japanese phrases and stays visually distinct', async ({ page }) => {
  const seeded = JSON.stringify({
    version: 4,
    profiles: {
      kedy: { days:{}, sessions:[] },
      leni: {
        days:{},
        sessions:[
          { date:'2026-08-12', mode:'free', title:'フリー', phrase:'まだ決めていません。', at:'2026-08-12T20:00:00+09:00' },
          { date:'2026-08-13', mode:'work', title:'仕事', phrase:'確認してから対応いたします。', at:'2026-08-13T20:00:00+09:00' }
        ]
      }
    },
    migrated:true,
    updatedAt:''
  });
  await seed(page, { flowz_duo_data: seeded });
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.click('.profile-btn[data-profile="leni"]');
  await page.waitForSelector('#flowzTalkPrep [data-prep-action="today"]');

  await expect(page.locator('#flowzTalkPrep')).toBeVisible();
  await expect(page.locator('#flowzTalkPrep .prep-chip')).toHaveText('FREE');
  await expect(page.locator('#flowzTalkPrepBtn')).toHaveText(/START FREE/);
  await expect(page.locator('#flowzTalkPrep .prep-row').first()).toContainText('ChatGPTさん、こんにちは。');

  const first = await page.evaluate(() => window.FlowzApp.getTalkPrep());
  expect(first.profile).toBe('leni');
  expect(first.today.phrase).not.toBe('まだ決めていません。');
  expect(first.reuse).not.toBe(first.today.phrase);

  await page.click('#flowzTalkPrep [data-prep-action="today"]');
  const afterToday = await page.evaluate(() => window.FlowzApp.getTalkPrep());
  expect(afterToday.today.phrase).not.toBe(first.today.phrase);

  const styles = await page.evaluate(() => {
    const today = document.querySelector('#flowzTalkPrep [data-prep-action="today"]');
    const reuse = document.querySelector('#flowzTalkPrep [data-prep-action="reuse"]');
    const t = getComputedStyle(today), r = getComputedStyle(reuse);
    return { todayBg:t.backgroundImage, reuseBg:r.backgroundImage, todayBorder:t.borderTopColor, reuseBorder:r.borderTopColor };
  });
  expect(styles.todayBg).toContain('linear-gradient');
  expect(styles.reuseBg).toContain('linear-gradient');
  expect(styles.todayBorder).not.toBe(styles.reuseBorder);
});

'''
if insert_before not in tests:
    raise SystemExit('test anchor not found')
tests = tests.replace(insert_before, new_test + insert_before, 1)
tests_path.write_text(tests)

Path('CHANGELOG-v4.6.0.md').write_text('''# Flowz v4.6.0\n\n- Added Talk Prep to Leni without adding a new learning mode.\n- Leni Talk Prep quick-starts existing FREE mode.\n- TODAY rotates through Leni FREE phrases and avoids the two most recent learned phrases.\n- REUSE pulls from Leni’s own recent session phrases only.\n- TODAY/REUSE are tappable with cyan/green visual affordances; OPEN stays neutral.\n- Kedy Talk Prep, Duo Sync, XP/history, TOEIC, Feedback Loop, and existing Leni modes are unchanged.\n''')

print('Flowz v4.6.0 Leni Talk Prep patch applied')

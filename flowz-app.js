/*
 * Flowz — single unified frontend controller.
 *
 * This file replaces 13 previously separate "patch" scripts
 * (flowz-v3-duo.js, flowz-v3.4-override.js, flowz-v3.6-sync.js,
 * flowz-v3.6.1-ui.js, flowz-v3.6.2-ui.js, flowz-v3.8-history-vault.js,
 * flowz-v3.8.1-backfill.js, flowz-v3.9-workday-streak.js,
 * flowz-v4.1-toeic-talk-prep.js, flowz-v4.3.7-toeic-study-voice.js,
 * flowz-v4.3.8-toeic-check-5q.js, flowz-v4.3.9-modes.js,
 * flowz-v4.3.9-repair.js) that were each independently rewriting the
 * version label, document.title, the mode tiles, and the Duo Sync
 * panel on their own setInterval/MutationObserver/pageshow loops.
 * That is what caused the version flicker, the periodic jank, and the
 * Duo Sync panel "jumping" back to the top on iPhone Safari.
 *
 * Rules followed here:
 *  - Exactly one place writes the version / document.title / footer.
 *  - Exactly one place builds the mode tiles.
 *  - Exactly one place manages the Duo Sync panel.
 *  - No MutationObserver. No polling setInterval. All redraws are
 *    triggered by real events (click, storage, pageshow,
 *    visibilitychange, focus, Supabase realtime push).
 *  - Every existing localStorage key keeps its name and shape.
 */
(function(){
'use strict';

/* ============================== RELEASE ============================== */
var RELEASE={
  number:'4.8.4',
  label:'v4.8.4 (2026.8.21)',
  title:'Flowz v4.8.4 · Duo Battle',
  footer:'✅ Last updated 2026.08.21 · Flowz v4.8.4 Unified Build'
};

/* ============================== STORAGE KEYS ============================== */
var DATA_KEY='flowz_duo_data';
var BACKUP_KEY='flowz_duo_data_backup';
var LEGACY_KEY='flowz_duo_v3';
var VAULT_KEY='flowz_history_vault_v1';
var SNAPSHOT_PREFIX='flowz_history_snapshot_';
var PENDING_KEY='flowz_duo_pending';
var CLOUD_KEY='flowz_duo_cloud_v1';
var TOEIC_RESULTS_KEY='flowz_toeic_results_v1';
var SYNC_LOCK_KEY='flowz_duo_sync_lock';
var BACKFILL_MARKER='flowz_backfill_2026_07_08_to_08_05_v1';
var BACKFILL_DATES=['2026-07-08','2026-07-09','2026-07-10','2026-07-13','2026-07-14','2026-07-15','2026-07-16','2026-07-17','2026-07-20','2026-07-21','2026-07-22','2026-07-23','2026-07-24','2026-07-27','2026-07-28','2026-07-29','2026-07-30','2026-07-31','2026-08-03','2026-08-04','2026-08-05'];
var CONFIRMED_REPAIR_MARKER='flowz_repair_kedy_2026_08_19_20_v1';
var CONFIRMED_REPAIR_DATES=['2026-08-19','2026-08-20'];
var MIN_SESSION_MS=120000;

/* ============================== SMALL HELPERS ============================== */
function $(id){return document.getElementById(id)}
function safeParse(raw){try{return raw?JSON.parse(raw):null}catch(e){return null}}
function pad(n){return String(n).padStart(2,'0')}
function dateKey(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function parseDate(s){var p=String(s).split('-');return new Date(+p[0],+p[1]-1,+p[2])}
function isWorkday(d){var day=d.getDay();return day!==0&&day!==6}
function previousWorkday(d){var x=new Date(d);do{x.setDate(x.getDate()-1)}while(!isWorkday(x));return x}
function nextWorkday(d){var x=new Date(d);do{x.setDate(x.getDate()+1)}while(!isWorkday(x));return x}
function escapeHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function text(el,value){if(el&&el.textContent!==String(value))el.textContent=String(value)}
function copyText(t){
  if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t).catch(function(){});
  try{
    var ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
  }catch(e){}
  return Promise.resolve();
}
function toast(msg){
  var el=$('toast');if(!el)return;
  el.textContent=msg;el.classList.add('show');
  clearTimeout(el._t);el._t=setTimeout(function(){el.classList.remove('show')},2000);
}

var requestedProfile='';
try{requestedProfile=new URLSearchParams(location.search).get('profile')||''}catch(e){}
var current=requestedProfile==='leni'?'leni':'kedy';
var today=dateKey(new Date());

/* ============================== STATE MODEL ============================== */
function blankProfile(){return {days:{},sessions:[]}}
function defaultState(){return {version:4,profiles:{kedy:blankProfile(),leni:blankProfile()},migrated:true,updatedAt:''}}
function normalizeRecord(r){
  r=r&&typeof r==='object'?r:{};
  return {base:Number(r.base)||0,phrase:Number(r.phrase)||0,fix:Number(r.fix)||0,duo:Number(r.duo)||0,count:Number(r.count)||0,mode:r.mode||''};
}
function normalizeProfile(p){
  var out=blankProfile(),days=p&&p.days&&typeof p.days==='object'?p.days:{};
  Object.keys(days).forEach(function(d){if(/^\d{4}-\d{2}-\d{2}$/.test(d))out.days[d]=normalizeRecord(days[d])});
  out.sessions=p&&Array.isArray(p.sessions)?p.sessions.filter(Boolean):[];
  return out;
}
function normalizeState(input){
  var source=input&&typeof input==='object'?input:{};
  if(source.days&&!source.profiles)source={profiles:{kedy:{days:source.days,sessions:source.sessions||[]},leni:blankProfile()}};
  return {version:4,profiles:{kedy:normalizeProfile(source.profiles&&source.profiles.kedy),leni:normalizeProfile(source.profiles&&source.profiles.leni)},migrated:true,updatedAt:source.updatedAt||''};
}
function recordXp(r){r=normalizeRecord(r);return r.base+r.phrase+r.fix+r.duo}
function mergeRecord(a,b){
  a=normalizeRecord(a);b=normalizeRecord(b);
  return {base:Math.max(a.base,b.base),phrase:Math.max(a.phrase,b.phrase),fix:Math.max(a.fix,b.fix),duo:Math.max(a.duo,b.duo),count:Math.max(a.count,b.count),mode:b.mode||a.mode||''};
}
function sessionKey(s){return [s.date||'',s.mode||'',s.at||s.completed_at||'',s.title||'',s.phrase||''].join('|')}
function mergeState(a,b){
  var out=normalizeState(a),next=normalizeState(b);
  ['kedy','leni'].forEach(function(id){
    Object.keys(next.profiles[id].days).forEach(function(d){out.profiles[id].days[d]=mergeRecord(out.profiles[id].days[d],next.profiles[id].days[d])});
    var seen={};out.profiles[id].sessions.forEach(function(s){seen[sessionKey(s)]=true});
    next.profiles[id].sessions.forEach(function(s){var k=sessionKey(s);if(!seen[k]){seen[k]=true;out.profiles[id].sessions.push(s)}});
    out.profiles[id].sessions.sort(function(x,y){return String(x.at||x.completed_at||x.date||'').localeCompare(String(y.at||y.completed_at||y.date||''))});
  });
  return out;
}
function legacyDatesArray(value){
  var dates=[];
  if(Array.isArray(value))value.forEach(function(v){if(/^\d{4}-\d{2}-\d{2}$/.test(String(v)))dates.push(String(v))});
  return dates;
}
function stateFromDates(dates){
  var s=defaultState();
  dates.forEach(function(d){s.profiles.kedy.days[d]={base:10,phrase:0,fix:0,duo:0,count:1,mode:'legacy'}});
  return s;
}
function candidateKeys(){
  var keys=[DATA_KEY,BACKUP_KEY,VAULT_KEY,LEGACY_KEY,'flowz_duo'];
  for(var i=0;i<localStorage.length;i++){
    var k=localStorage.key(i)||'';
    if(/(flowz|tonight|mic|tm_)/i.test(k)&&keys.indexOf(k)<0)keys.push(k);
  }
  return keys;
}
function candidateStates(){
  var list=[];
  candidateKeys().forEach(function(key){
    var raw=localStorage.getItem(key),value=safeParse(raw);
    if(value&&typeof value==='object'){
      if(value.profiles||value.days)list.push(normalizeState(value));
      var dates=legacyDatesArray(value);if(dates.length)list.push(stateFromDates(dates));
    }
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw||''))list.push(stateFromDates([raw]));
  });
  var tm=safeParse(localStorage.getItem('tm_days'));if(tm)list.push(stateFromDates(legacyDatesArray(tm)));
  var last=localStorage.getItem('tm_last');if(/^\d{4}-\d{2}-\d{2}$/.test(last||''))list.push(stateFromDates([last]));
  return list;
}
function applyBackfill(target){
  if(localStorage.getItem(BACKFILL_MARKER)==='done')return target;
  var profile=target.profiles.kedy,seen={};
  profile.sessions.forEach(function(s){seen[sessionKey(s)]=true});
  BACKFILL_DATES.forEach(function(date){
    var old=profile.days[date]||{};
    profile.days[date]={base:Math.max(Number(old.base)||0,10),phrase:Number(old.phrase)||0,fix:Number(old.fix)||0,duo:Number(old.duo)||0,count:Math.max(Number(old.count)||0,1),mode:old.mode||'commute'};
    var session={date:date,mode:'commute',title:'COMMUTE',theme:'Estimated weekday commute practice',phrase:'',xp:10,at:date+'T08:00:00+09:00',auto:true,estimated:true};
    var key=sessionKey(session);if(!seen[key]){seen[key]=true;profile.sessions.push(session)}
  });
  profile.sessions.sort(function(a,b){return String(a.at||a.date||'').localeCompare(String(b.at||b.date||''))});
  try{localStorage.setItem(BACKFILL_MARKER,'done')}catch(e){}
  return target;
}
function applyConfirmedRepair(target){
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
}
function persist(next){
  var normalized=normalizeState(next);
  normalized.updatedAt=new Date().toISOString();
  var raw=JSON.stringify(normalized);
  try{
    var previous=localStorage.getItem(DATA_KEY);
    if(previous&&safeParse(previous))localStorage.setItem(BACKUP_KEY,previous);
    localStorage.setItem(DATA_KEY,raw);
    localStorage.setItem(LEGACY_KEY,raw);
    localStorage.setItem(VAULT_KEY,raw);
    localStorage.setItem(SNAPSHOT_PREFIX+dateKey(new Date()),raw);
  }catch(e){}
  return normalized;
}

var state=bootstrapState();
persist(state);
function saveState(next){state=persist(next||state)}
function loadPending(){try{return JSON.parse(localStorage.getItem(PENDING_KEY)||'null')}catch(e){return null}}
function savePending(){try{pending?localStorage.setItem(PENDING_KEY,JSON.stringify(pending)):localStorage.removeItem(PENDING_KEY)}catch(e){}}
var pending=loadPending();
function loadToeicResults(){var rows=safeParse(localStorage.getItem(TOEIC_RESULTS_KEY));return Array.isArray(rows)?rows:[]}
function saveToeicResults(rows){try{localStorage.setItem(TOEIC_RESULTS_KEY,JSON.stringify(rows.slice(-20)))}catch(e){}}

/* ============================== DERIVED STATS ============================== */
function dayRecord(id,d){return state.profiles[id].days[d]||{base:0,phrase:0,fix:0,duo:0,count:0,mode:''}}
function dayXp(id,d){return recordXp(dayRecord(id,d))}
function totalXp(id){return Object.keys(state.profiles[id].days).reduce(function(sum,d){return sum+dayXp(id,d)},0)}
function weekStart(d){var x=new Date(d.getFullYear(),d.getMonth(),d.getDate());var day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);return x}
function weekXp(id){var start=weekStart(new Date());var end=new Date(start);end.setDate(end.getDate()+7);return Object.keys(state.profiles[id].days).reduce(function(sum,k){var d=parseDate(k);return d>=start&&d<end?sum+dayXp(id,k):sum},0)}
function completed(id,d){return dayRecord(id,d).base>0}
function studiedDates(id){return Object.keys(state.profiles[id].days).filter(function(d){return completed(id,d)}).sort()}
function calendarStreak(id){var cur=new Date();if(!completed(id,today))cur.setDate(cur.getDate()-1);var n=0;while(completed(id,dateKey(cur))){n++;cur.setDate(cur.getDate()-1)}return n}
function calendarBestStreak(id){var keys=studiedDates(id);var best=0,run=0,prev=null;keys.forEach(function(k){if(prev){run=Math.round((parseDate(k)-parseDate(prev))/86400000)===1?run+1:1}else run=1;best=Math.max(best,run);prev=k});return best}
function workdayStreak(id){
  var keys=studiedDates(id).filter(function(k){return isWorkday(parseDate(k))});
  if(!keys.length)return 0;
  var latest=parseDate(keys[keys.length-1]),now=new Date(),anchor;
  if(isWorkday(now))anchor=completed(id,dateKey(now))?now:previousWorkday(now);
  else anchor=previousWorkday(now);
  if(dateKey(latest)!==dateKey(anchor))return 0;
  var count=0,cursor=new Date(anchor);
  while(completed(id,dateKey(cursor))){count++;cursor=previousWorkday(cursor)}
  return count;
}
function workdayBestStreak(id){
  var keys=studiedDates(id).filter(function(k){return isWorkday(parseDate(k))});
  if(!keys.length)return 0;
  var best=1,run=1;
  for(var i=1;i<keys.length;i++){
    var expected=dateKey(nextWorkday(parseDate(keys[i-1])));
    run=keys[i]===expected?run+1:1;
    if(run>best)best=run;
  }
  return best;
}
function streakFor(id){return id==='kedy'?workdayStreak(id):calendarStreak(id)}
function bestStreakFor(id){return id==='kedy'?workdayBestStreak(id):calendarBestStreak(id)}
function duoCompleted(d){return completed('kedy',d)&&completed('leni',d)}
function duoStreak(){var cur=new Date();if(!duoCompleted(today))cur.setDate(cur.getDate()-1);var n=0;while(duoCompleted(dateKey(cur))){n++;cur.setDate(cur.getDate()-1)}return n}
function duoDays(){var map={};Object.keys(state.profiles.kedy.days).forEach(function(d){if(duoCompleted(d))map[d]=1});return Object.keys(map).length}
function applyDuoBonus(d){if(!duoCompleted(d))return false;var changed=false;['kedy','leni'].forEach(function(id){var r=dayRecord(id,d);if(!r.duo){r.duo=5;state.profiles[id].days[d]=r;changed=true}});return changed}
function levelInfo(id){var xp=totalXp(id),level=Math.floor(xp/100)+1,inside=xp%100;return {xp:xp,level:level,inside:inside,next:100-inside}}
function sessionCount(id){return state.profiles[id].sessions.length}

/* ============================== CONTENT ============================== */
var LABELS={kedy:'🌙 kedy',leni:'☀️ Leni'};
function profileName(id){return id==='leni'?'Leni':'kedy'}
var PROFILES={
 kedy:{name:'kedy',sub:'Use English in real life'},
 leni:{name:'Leni',sub:'N2と生活日本語を伸ばす'}
};
var UI={
 kedy:{
  battleTitle:'⚔️ THIS WEEK',dailyCap:'MAX 15 XP',tied:'Tied this week',kedyLead:'kedy leads by ',leniLead:'Leni leads by ',
  duoStreak:'🤝 DUO STREAK',duoStreakUnit:' days',duoDays:'🔥 TOGETHER',duoDaysUnit:' days',
  streak:'WORKDAY RUN',best:'BEST RUN',sessions:'SESSIONS',next:'Next: ',
  todayDone:'SESSION DONE ✓',todayEmpty:'NOT STARTED',todayDoneDetail:'Base 10 XP earned · bonus once/day',todayEmptyDetail:'Complete 1 session for 10 XP',
  modeTitle:'🎙️ ENGLISH SESSION',pendingHeading:'✅ SESSION RESULT',pendingBack:'Return after speaking. The session records automatically.',
  complete:'COMPLETE SESSION +10 XP',switchTo:'Switch profile to finish',phrase:'Used today’s phrase',fix:'Fixed a sentence',
  missionHeading:'🎯 TODAY’S MISSION',themeLabel:'THEME',phraseLabel:'TARGET PHRASE',start:'START SESSION',
  weekTitle:'📅 LAST 30 DAYS',dataTitle:'💾 DATA & BACKUP',storage:'AUTO BACKUP',exportLabel:'COPY RECORD',importLabel:'RESTORE RECORD',clearLabel:'CLEAR PENDING',
  note:'Records are saved in this browser. Connect Duo Sync to share progress across devices.',
  noteSynced:'Records sync between connected devices. A local backup is also kept.'
 },
 leni:{
  battleTitle:'⚔️ 今週の対戦',dailyCap:'上限 15 XP',tied:'今週は同点',kedyLead:'kedyが ',leniLead:'Leniが ',leadSuffix:' XPリード',
  duoStreak:'🤝 2人の連続',duoStreakUnit:'日',duoDays:'🔥 2人で達成',duoDaysUnit:'日',
  streak:'連続日数',best:'最長',sessions:'セッション',next:'次まで ',
  todayDone:'今日の学習済み ✓',todayEmpty:'今日はまだ',todayDoneDetail:'基本10 XP獲得済み／追加は1日1回',todayEmptyDetail:'1セッションで10 XP',
  modeTitle:'🎙️ 日本語セッション',pendingHeading:'✅ セッション結果',pendingBack:'ChatGPTから戻ったら、できた内容を選んで完了。',
  complete:'セッション完了 +10 XP',switchTo:'プロフィールを切り替えて完了',phrase:'今日の表現を使えた',fix:'言い直しに成功した',
  missionHeading:'🎯 今日のミッション',themeLabel:'テーマ',phraseLabel:'今日の表現',start:'セッション開始',
  weekTitle:'📅 過去7日',dataTitle:'💾 記録・バックアップ',storage:'自動バックアップ',exportLabel:'記録をコピー',importLabel:'記録を復元',clearLabel:'保留を消す',
  note:'記録はこのブラウザへ自動保存・予備保存されます。別の端末とはまだ同期されません。',
  noteSynced:'記録は接続端末間で同期されます。予備保存も継続します。'
 }
};
var MISSIONS={
 kedy:{
  commute:[
   {theme:'Weather on the way home',phrase:"It's cooler than usual.",meaning:'いつもより涼しい',guide:'Compare today with a normal day.'},
   {theme:'Getting home soon',phrase:"I'll be home in five minutes.",meaning:'あと5分で家に着く',guide:'Change the number naturally.'},
   {theme:'Finishing the workday',phrase:'I just finished work.',meaning:'仕事が終わったばかり',guide:'Use it near the start.'},
   {theme:'Choosing between options',phrase:"I'm not sure yet.",meaning:'まだ分からない／未定',guide:'Use it before giving options.'},
   {theme:'Traffic and road conditions',phrase:'Traffic is lighter than usual.',meaning:'いつもより交通量が少ない',guide:'Describe what you notice now.'},
   {theme:'Remembering an earlier thought',phrase:'I was thinking about that earlier.',meaning:'さっきそれについて考えてた',guide:'Connect it to something from today.'},
   {theme:'Connecting ideas',phrase:'That reminds me of something.',meaning:'それで思い出したことがある',guide:'Use it before changing to a related topic.'},
   {theme:'Changing a decision',phrase:'I changed my mind.',meaning:'考えが変わった',guide:'Add what changed.'},
   {theme:'Unexpected moments',phrase:"I didn't expect that.",meaning:'それは予想してなかった',guide:'Add one short reason.'},
   {theme:'Getting comfortable with something',phrase:"I'm getting used to it.",meaning:'だんだん慣れてきた',guide:'Say what you are getting used to.'},
   {theme:'Trying a different approach',phrase:'I want to try something different.',meaning:'何か違うことを試したい',guide:'Add what you want to change.'},
   {theme:'Recent thoughts',phrase:"I've been thinking about it lately.",meaning:'最近それについて考えてる',guide:'Add one detail.'},
   {theme:'Solving something',phrase:'I need to figure it out.',meaning:'それを考えて解決しないと',guide:'Say what you need to figure out.'},
   {theme:'Clarifying your meaning',phrase:"That's what I meant.",meaning:'そういう意味だった',guide:'Use it after clarifying yourself.'},
   {theme:'Talking about preference',phrase:'It depends on how I feel.',meaning:'気分による',guide:'Give one example.'}
  ],
  toeic:[
   {theme:'Office requests',phrase:'Could you send it again?',meaning:'もう一度送ってもらえますか',guide:'Answer with a short reason.'},
   {theme:'Schedule changes',phrase:'Has the meeting been moved?',meaning:'会議は変更されましたか',guide:'Listen for time and place.'},
   {theme:'Travel arrangements',phrase:'What time does it leave?',meaning:'何時に出発しますか',guide:'Practice one quick reply.'},
   {theme:'Customer messages',phrase:"I'll check and get back to you.",meaning:'確認して折り返します',guide:'Use it as a practical reply.'}
  ],
  bath:[
   {theme:'Automatic daily shadowing',phrase:'I need a little more time.',meaning:'もう少し時間が必要',guide:'Repeat, then change “time”.'},
   {theme:'Natural reactions',phrase:'That makes more sense now.',meaning:'今はもっと納得できる',guide:'Repeat, then use it as a reply.'},
   {theme:'Simple plans',phrase:"I'll take care of it later.",meaning:'あとで対応する',guide:'Repeat, then change “later”.'},
   {theme:'Useful clarification',phrase:'What do you mean by that?',meaning:'それはどういう意味？',guide:'Repeat with natural rhythm.'}
  ],
  free:[
   {theme:'Music and current projects',phrase:"I'm working on a new track.",meaning:'新しい曲を制作中',guide:'Add one small detail.'},
   {theme:'Travel and future plans',phrase:"I'd like to visit someday.",meaning:'いつか行ってみたい',guide:'Replace the place naturally.'},
   {theme:'Health and routines',phrase:"I'm trying to sleep earlier.",meaning:'早く寝るようにしている',guide:'Say one habit you are changing.'},
   {theme:'Everyday decisions',phrase:'It depends on the situation.',meaning:'状況による',guide:'Use it before an explanation.'}
  ],
  review:[
   {theme:'Recent phrase review',phrase:'Use your recent English again.',meaning:'直近の訂正フレーズを3つ復習',guide:'3–5 minutes. One Japanese situation at a time.'},
   {theme:'Quick recap practice',phrase:'Reuse what you learned recently.',meaning:'覚えた表現をもう一度使う',guide:'3–5 minutes. Pulled from your recent Diary log.'}
  ]
 },
 leni:{
  free:[
   {theme:'日常の予定を自然に話す',phrase:'まだ決めていません。',reading:'まだ きめて いません。',meaning:'Belum memutuskan.',guide:'会話の中で一度使う。'},
   {theme:'最近の出来事を説明する',phrase:'思ったより時間がかかりました。',reading:'おもったより じかんが かかりました。',meaning:'Memakan waktu lebih lama dari dugaan.',guide:'理由を一つ加える。'},
   {theme:'相手へ自然に確認する',phrase:'つまり、こういうことですか。',reading:'つまり、こういう ことですか。',meaning:'Maksudnya seperti ini?',guide:'確認するときに使う。'}
  ],
  work:[
   {theme:'介護現場で状況を報告する',phrase:'先ほど食事を終えられました。',reading:'さきほど しょくじを おえられました。',meaning:'Beliau baru saja selesai makan.',guide:'短い追加情報を一つ言う。'},
   {theme:'体調変化を丁寧に伝える',phrase:'いつもより少し元気がありません。',reading:'いつもより すこし げんきが ありません。',meaning:'Sedikit kurang sehat dari biasanya.',guide:'推測せず観察したことを言う。'},
   {theme:'確認してから対応する',phrase:'確認してから対応いたします。',reading:'かくにんしてから たいおういたします。',meaning:'Saya akan menanganinya setelah memeriksa.',guide:'敬語のまま一度使う。'}
  ],
  n2:[
   {theme:'N2表現「〜わけではない」',phrase:'嫌いなわけではありません。',reading:'きらいな わけでは ありません。',meaning:'Bukan berarti saya tidak suka.',guide:'理由を後ろに加える。'},
   {theme:'N2表現「〜に違いない」',phrase:'何か理由があるに違いありません。',reading:'なにか りゆうが あるに ちがいありません。',meaning:'Pasti ada suatu alasan.',guide:'確信が強い場面で使う。'},
   {theme:'N2表現「〜たびに」',phrase:'この曲を聞くたびに思い出します。',reading:'この きょくを きくたびに おもいだします。',meaning:'Setiap mendengar lagu ini, saya teringat.',guide:'名詞を一つ入れ替える。'}
  ],
  kanji:[
   {theme:'生活で使う漢字「予定」',phrase:'今日の予定を確認します。',reading:'きょうの よていを かくにんします。',meaning:'Saya memeriksa jadwal hari ini.',guide:'漢字を見て一度読む。'},
   {theme:'仕事で使う漢字「報告」',phrase:'あとで担当者に報告します。',reading:'あとで たんとうしゃに ほうこくします。',meaning:'Nanti saya lapor kepada penanggung jawab.',guide:'読みを見てから文を言う。'},
   {theme:'健康で使う漢字「体調」',phrase:'今朝から体調がよくありません。',reading:'けさから たいちょうが よくありません。',meaning:'Sejak pagi kondisi badan kurang baik.',guide:'時間を一つ変えて言う。'}
  ]
 }
};
var LENI_MODES=[
 {id:'free',title:'フリー',sub:'自然な会話 10分',icon:'💬',cls:'m1'},
 {id:'work',title:'仕事',sub:'介護・敬語 10分',icon:'🤝',cls:'m2'},
 {id:'n2',title:'N2',sub:'語彙・文法 10分',icon:'📚',cls:'m3'},
 {id:'kanji',title:'漢字',sub:'読み・短文 10分',icon:'📝',cls:'m4'}
];
/* Kedy's grid is a fixed curated layout: COMMUTE lives only in the Talk
   Prep card above the grid, so it is never rendered as a tile here. */
var KEDY_GRID=[
 {type:'tile',id:'toeic',title:'TOEIC',sub:'Voice 5Q · L3/R2 · 5–8min',icon:'🎯🎤',cls:'m2'},
 {type:'tile',id:'free',title:'FREE',sub:'Open talk · review inside',icon:'🎲',cls:'m5'}
];
function findKedyTile(id){for(var i=0;i<KEDY_GRID.length;i++){if(KEDY_GRID[i].type==='tile'&&KEDY_GRID[i].id===id)return KEDY_GRID[i]}return null}
function findMode(profile,id){
  if(profile==='leni')return LENI_MODES.filter(function(m){return m.id===id})[0]||LENI_MODES[0];
  if(id==='commute')return {id:'commute',title:'COMMUTE'};
  return findKedyTile(id)||{id:id,title:id};
}
function missionSeed(profile,modeId,key){var t=profile+'|'+modeId+'|'+key,sum=0;for(var i=0;i<t.length;i++)sum=(sum*31+t.charCodeAt(i))>>>0;return sum}
function generateMission(profile,modeId,key){
  var list=MISSIONS[profile][modeId]||MISSIONS[profile][Object.keys(MISSIONS[profile])[0]];
  var item=list[missionSeed(profile,modeId,key)%list.length];
  return {theme:item.theme,phrase:item.phrase,reading:item.reading||'',meaning:item.meaning||'',guide:item.guide||''};
}
var commuteMissionOffset=0,commuteReuseOffset=0,leniPrepMissionOffset=0,leniPrepReuseOffset=0;
var STALE_PREP_PHRASES={"I haven't decided yet.":true,'I feel good.':true};
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
  var list=MISSIONS.kedy.commute,recent=recentCommutePhrases(3),blocked={},available=[];
  recent.forEach(function(p){blocked[p]=true});
  var base=(missionSeed('kedy','commute',today)+sessionCount('kedy'))%list.length;
  for(var step=0;step<list.length;step++){
    var item=list[(base+step)%list.length];
    if(!blocked[item.phrase])available.push(item);
  }
  var selected=available.length?available[commuteMissionOffset%available.length]:list[(base+commuteMissionOffset)%list.length];
  return {theme:selected.theme,phrase:selected.phrase,reading:'',meaning:selected.meaning||'',guide:selected.guide||''};
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
function recentLeniPhrases(limit){
  var sessions=state.profiles.leni.sessions||[],out=[],seen={};
  for(var i=sessions.length-1;i>=0&&out.length<(limit||4);i--){
    var s=sessions[i]||{},phrase=s.phrase||'';
    if(!phrase||seen[phrase])continue;
    seen[phrase]=true;out.push(phrase);
  }
  return out;
}
function currentLeniPrepMission(){
  var list=MISSIONS.leni.free,recent=recentLeniPhrases(2),blocked={},available=[];
  recent.forEach(function(p){blocked[p]=true});
  var base=(missionSeed('leni','free',today)+sessionCount('leni'))%list.length;
  for(var step=0;step<list.length;step++){
    var item=list[(base+step)%list.length];
    if(!blocked[item.phrase])available.push(item);
  }
  var selected=available.length?available[leniPrepMissionOffset%available.length]:list[(base+leniPrepMissionOffset)%list.length];
  return {theme:selected.theme,phrase:selected.phrase,reading:selected.reading||'',meaning:selected.meaning||'',guide:selected.guide||''};
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

/* ============================== PROMPT BUILDERS ============================== */
function diaryRule(){
  return "At wrap-up, silently use connected Notion tools to find today's existing Diary page by date. Append a Flowz English log without creating a new Diary page, then fetch it again to verify. If Notion is unavailable, clearly say it was not recorded and output copy-ready text. The written log should contain 2–3 diary sentences, one Phrase line, up to three Fix lines, and one Coach Assessment line. Do not update GitHub for an ordinary learning session.";
}
function coachRulesRule(modeLabel){
  return "Coach Rules: never delay the first visible reply. On kedy's first turn after your immediate natural opening, silently use connected Notion tools to find the existing child page named 'Flowz Coach Rules' under the Flowz page. Read only the checked active rules in 'kedy｜GLOBAL' and 'kedy｜"+modeLabel+"', then apply them for the rest of this session. Do not read or apply Leni rules. If Notion or that page is unavailable, continue with the built-in defaults and do not ask kedy to wait.";
}
function feedbackLoopRule(modeLabel){
  return "Flowz Feedback Loop: after the learning phase and its spoken result or recap are finished, Japanese comments from kedy about how the session should work are Flowz feedback, not English answers to score or correct. If the feedback is coach behavior, use connected Notion tools to update the existing 'Flowz Coach Rules' page: deduplicate equivalent rules, replace an older rule when the new instruction conflicts, save mode-specific feedback under 'kedy｜"+modeLabel+"', and use 'kedy｜GLOBAL' only when kedy clearly says it should apply across modes. Fetch that page again and verify the update before saying it was saved. If the feedback is a UI, sync, feature, or bug request that requires code, update the existing 'Flowz Implementation Feedback' page under OPEN instead of Coach Rules, reuse an existing matching item, and fetch again to verify. Do not create duplicate pages or GitHub issues. Keep all kedy rules separate from Leni.";
}
function personalContextRule(modeLabel){
  return "Kedy Personal Context Preflight: before the first spoken reply, silently use connected Notion tools to read only the minimum current context needed for a personal conversation. Read the current HQ page first, specifically the 📱 HQ top callout/current focus, then the active visible ToDo view, specifically the actual ✅ ToDo view. From ToDo, use only unfinished high/medium or clearly relevant items and respect completed, postponed, reply-waiting, blocked, and constrained states; those are not current actions to push. Read the Flowz page and recent Diary entries with Flowz English logs from roughly the last three to seven days, including Phrase lines, Fix lines, Coach Assessment, CEFR/level or next-focus notes, and only the Active Project source pages that HQ/current focus makes clearly relevant. Do not crawl unrelated projects. From those sources, build a tiny internal snapshot of current focus, active projects or decisions, recent real-life events worth talking about, important unfinished items, recent useful English phrases, repeated mistakes or weak points, and the latest stated English level or next focus. Also use recent ChatGPT conversation context only when it is already available in this conversation or product context; never claim access to unseen chats and never browse the web to reconstruct them. Prefer the newest source state when records conflict. Read Flowz Coach Rules for kedy GLOBAL and kedy｜"+modeLabel+" during the same preflight. Never read or expose Leni private context. Do not recite the snapshot or quote private notes. Do not turn ToDo into reminders or nagging. Also do not dump tasks or turn the context into productivity coaching or an interrogation. Use the snapshot only to choose relevant topics, revisit recent events or decisions naturally, remember what kedy has been learning, reuse recent phrases when they fit, and tune vocabulary and sentence length to the latest English-level evidence. If connected Notion or any source is unavailable, skip that source and continue with built-in defaults without asking kedy to wait or pretending it was read. Keep the preflight brief and start the spoken conversation as soon as it finishes.";
}
function commutePrompt(mission){
  return [
   "You are kedy's English conversation partner and coach in Flowz Duo Battle. He is a Japanese beginner using voice mode and usually listens without looking at the screen. Your main job is to make the conversation enjoyable and easy to follow, not to maximize teaching moments.",
   personalContextRule('COMMUTE'),
   "If he starts with a casual greeting, reply like a normal conversation partner once, then move into a real topic. Do not force one or two greeting exchanges. Do not announce a lesson, mission, correction, test, or shadowing.",
   "Run one continuous commute conversation. Morning and evening are one mode, so do not choose the opening from clock time. Have at least four meaningful exchanges before any planned shadowing.",
   "Today's hidden mission is: Theme: "+(mission.theme||'')+". Target phrase: \""+(mission.phrase||'')+"\". Meaning: "+(mission.meaning||'')+". Keep it hidden and bring it in only when the conversation naturally connects. Proactively introduce the target phrase at most twice in the whole session: one natural introduction and, if useful, one natural reuse. Do not force it after that.",
   "Use the current conversation as the main context. Avoid repetitive default topics. Do not default to after-work plans, dinner, or weekends unless kedy introduces them. Rotate real-life topics.",
   "Conversation should be about 90 percent and shadowing at most 10 percent. Natural conversation is the default, not a lesson sequence. If he asks to talk, says he wants natural conversation, says stay in chat, or otherwise chooses conversation instead of repetition, enter conversation-only mode for the rest of that session: no shadowing, repetition drills, model-sentence drills, lesson framing, or requests to repeat. Do not suggest those again unless he explicitly asks for shadowing.",
   "In conversation-only mode, respond as a real conversation partner. Answer his actual point first, share a short opinion or idea when natural, and ask only questions that genuinely move that topic forward. Do not turn the conversation into repeated A1 either-or prompts just because his English is simple.",
   "Do not turn the whole conversation into an interview. Across several turns, mix questions with brief reactions, opinions, observations, or simple hypothetical ideas. It is fine to give him something to react to without ending every turn in a question.",
   "If his speech is fragmented or voice recognition is uncertain, do not silently replace a key noun or idea with a different word. Use the word you heard when possible, or ask one very short confirmation only when the meaning would materially change. After one clarification, continue the topic instead of starting a correction loop.",
   "Commute is background context. Do not repeatedly tell him to stay safe, focus on the road, keep steady, or use similar riding-safety reminders unless he asks about safety or there is an immediate safety concern.",
   "Plan shadowing as one compact set of two or three short sentences overall, but speak exactly one short sentence per assistant turn. Never combine multiple shadowing sentences in one spoken turn. After each sentence, wait for exactly one repetition before giving the next. If a sentence is long, split it into natural spoken chunks and ask for one chunk at a time. Each chunk must be short enough to repeat from audio alone. If he casually echoes your praise or backchannel, acknowledge it once and continue; do not turn phrases such as nailed it, spot on, or sounds natural into a repetition chain. If he explicitly asks for more shadowing, give it.",
   "If kedy says he is tired, low, unmotivated, anxious, or not in the mood, do not offer an easier lesson, rest, stopping, or ending because of that. You may slow the pacing slightly, but keep normal English practice active unless he explicitly asks to stop English practice.",
   "If kedy rejects or redirects your advice, intention, or topic, immediately follow the new direction. Do not repeat or defend the previous coaching frame.",
   "Use short natural spoken English. Correct only meaning-changing or strongly unnatural mistakes. In normal conversation, prefer one brief natural recast and keep the topic moving; do not require a retry. A retry is optional only when kedy clearly wants to practice the corrected line.",
   "If kedy says 'I don't understand', 'It's difficult', 'too difficult', 'more easy', or says in Japanese that he cannot understand, immediately simplify to A1: usually one concrete idea in about three to six English words, avoid abstract vocabulary, and keep any explanation to at most two short sentences. This comprehension rule is separate from the fatigue rule above.",
   "Do not use 'Say: ...' as a normal teaching pattern. Use it only when kedy explicitly asks how to say something or clearly asks for a model sentence.",
   "Do not repeat generic backchannels such as Nice, Sounds good, That's okay, Perfect, or Stay safe. Avoid using the same generic acknowledgement more than twice in one session and always move the content forward.",
   "Complaints, frustration, strong words, or criticism of your coaching are not requests to end. Briefly adjust the behavior and continue unless kedy gives a clear ending request.",
   "If kedy says another topic, other topics, 話題変えて, says the same words keep coming up, says he is bored, or clearly requests a topic switch, switch immediately to a genuinely different content domain. Do not rephrase the previous topic as a new question, and do not immediately return to recently rejected defaults such as mood, weather, music, food, plans, or commute conditions.",
   "When you need to introduce a topic yourself, prefer a concrete subject with something to react to instead of another generic check-in. Rotate across ideas, AI or technology, games, culture, funny or strange everyday observations, choices, memories, and whatever emerges naturally from kedy's words.",
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
   personalContextRule('FREE'),
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
function leniPrompt(mode,mission){
  var focus={free:'会話を自然に続けるフリー練習',work:'介護現場の報告・敬語・体調説明',n2:'JLPT N2の語彙・文法・短い読解',kanji:'漢字の読み方と、漢字を使った短い実用文'}[mode];
  var missionJa=' Misi hari ini: tema '+mission.theme+'. Ungkapan target: '+mission.phrase+'. Cara baca: '+(mission.reading||'')+'. Arti singkat: '+mission.meaning+'. Bantu Leni memakai ungkapan ini sekali secara alami.';
  return "Kamu adalah guru bahasa Jepang pribadi Leni dalam Flowz Duo Battle. Targetnya lulus JLPT N2 pada Juli 2027 dan memakai bahasa Jepang secara alami dalam kehidupan, pekerjaan kaigo, rumah sakit, dan sekolah keperawatan. Fokus sesi ini: "+focus+"."+missionJa+" Gunakan voice mode. Anggap Leni pelajar tingkat menengah yang sudah bisa percakapan sehari-hari. Aturan wajib: 1) Tunggu sampai Leni selesai berbicara dan ada jeda yang jelas. Jangan menyela. Jika suara bertumpuk, katakan hanya '最後まで聞くね。どうぞ。' lalu tunggu. 2) Berikan hanya satu kalimat atau satu pertanyaan pendek setiap kali. 3) Untuk setiap kalimat latihan yang mengandung kanji, tampilkan kalimat Jepang normal pada baris pertama dan bacaan hiragana lengkap pada baris kedua. Jangan gunakan romaji. 4) Bahasa Jepang harus alami dan sering dipakai. 5) Setelah Leni mengulang dengan benar, langsung lanjut otomatis tanpa pujian panjang. 6) Perbaiki maksimal dua kesalahan penting: bentuk kata kerja, partikel, lalu keigo atau kealamian. 7) Ulangi kalimat yang sama maksimal tiga kali; jika masih sulit, pecah menjadi lebih pendek. 8) Campurkan percakapan, respons, pertanyaan, keigo, kosakata, N2, dan kanji sesuai mode. 9) Jangan menebak perasaan atau kondisi tubuh; jika makna ambigu, konfirmasi sekali dengan 'つまり、〜ということ？'. 10) Jangan mengakhiri sesi sendiri. Saat Leni berkata 'まとめて' atau 'selesai', berikan hasil tantangan XP hari ini, tiga koreksi utama, kosakata baru, kanji yang dipelajari beserta hiragana, dan materi sesi berikutnya. Lalu gunakan Notion yang terhubung untuk menambahkan Japanese Log ke halaman Diary hari ini yang sudah ada, kemudian baca ulang untuk memastikan. Jangan membuat halaman Diary baru dan jangan memperbarui GitHub untuk sesi belajar biasa.";
}
function buildPromptFor(p){
  if(p.profile==='leni')return leniPrompt(p.mode,p.mission||{});
  switch(p.mode){
    case 'commute':return commutePrompt(p.mission||{});
    case 'toeic':return toeicCheckPrompt(p.mission||{});
    case 'bath':return toeicStudyPrompt();
    case 'review':return reviewPrompt();
    case 'free':return freePrompt();
    default:return commutePrompt(p.mission||{});
  }
}

/* ============================== ASSESSMENT ============================== */
function cefrAssessment(profile){
  var n=sessionCount(profile),xp=totalXp(profile);
  if(profile==='leni'){
    var score=n*8+Math.floor(xp/10);
    if(score<80)return {title:'📊 CURRENT JAPANESE',a:'N4目安',al:'JLPT',b:'日常会話 初級',bl:'運用目安',c:'小学2〜3年（7〜9歳）',cl:'日本語年齢目安'};
    if(score<180)return {title:'📊 CURRENT JAPANESE',a:'N4→N3',al:'JLPT',b:'日常会話 初中級',bl:'運用目安',c:'小学4〜5年（9〜11歳）',cl:'日本語年齢目安'};
    return {title:'📊 CURRENT JAPANESE',a:'N3目安',al:'JLPT',b:'生活・仕事会話 中級',bl:'運用目安',c:'小学6年〜中1（11〜13歳）',cl:'日本語年齢目安'};
  }
  return {title:'📊 CURRENT ENGLISH'};
}
function toeicEstimate(rows){
  if(!rows.length)return null;
  var recent=rows.slice(-3),sum=0;
  recent.forEach(function(r){var total=Number(r&&r.total)||0,max=Number(r&&r.maxTotal)||5;sum+=max>0?Math.max(0,Math.min(1,total/max)):0});
  var accuracy=sum/recent.length,corrected=Math.max(0,Math.min(1,(accuracy-.25)/.75));
  var center=150+700*corrected,halfWidth=recent.length>=3?50:75;
  var low=Math.max(10,Math.round((center-halfWidth)/10)*10),high=Math.min(990,Math.round((center+halfWidth)/10)*10);
  return {band:low+'–'+high,confidence:recent.length>=3?'MEDIUM':'LOW'};
}
function renderAssessment(){
  var panel=$('flowzAssessment');if(!panel)return;
  var a=cefrAssessment(current),html='<div class="section-head"><div class="section-title">'+a.title+'</div><span class="chip">ESTIMATE</span></div><div class="stats">';
  if(current==='kedy'){
    var est=toeicEstimate(loadToeicResults());
    html+='<div class="stat"><b>A1→A2</b><span>CURRENT CEFR</span></div>';
    html+='<div class="stat"><b>'+(est?escapeHtml(est.band):'NOT TESTED')+'</b><span>TOEIC EST.'+(est?(' · '+est.confidence):'')+'</span></div>';
    html+='<div class="stat"><b>毎回更新</b><span>VOICE REVIEW</span></div>';
    html+='</div><p class="note">mikan＝単語30問／Flowz TOEIC＝L3＋R2のVoice 5問。スコアは非公式の目安。</p>';
    html+='<button class="small-btn" id="flowzToeicResultBtn" type="button">TOEIC CHECK結果を入力（L/3・R/2）</button>';
  }else{
    html+='<div class="stat"><b>'+escapeHtml(a.a)+'</b><span>'+escapeHtml(a.al)+'</span></div>';
    html+='<div class="stat"><b>'+escapeHtml(a.b)+'</b><span>'+escapeHtml(a.bl)+'</span></div>';
    html+='<div class="stat"><b>'+escapeHtml(a.c)+'</b><span>'+escapeHtml(a.cl)+'</span></div>';
    html+='</div><p class="note">Flowzのセッション数とXPによる暫定値。正式なテスト判定ではない。</p>';
  }
  panel.innerHTML=html;
}
function toeicOptions(max){var html='';for(var i=0;i<=max;i++)html+='<option value="'+i+'">'+i+' / '+max+'</option>';return html}
function openToeicModal(){
  var existing=$('flowzToeicModal');if(existing)existing.remove();
  var modal=document.createElement('div');modal.id='flowzToeicModal';modal.className='modal-overlay';
  modal.innerHTML='<div class="toeic-sheet"><h3>🎯 TOEIC CHECK RESULT</h3><p>ChatGPTの最後に出た「Lx/3・Ry/2」を入れる。5問の結果をFlowz内の推定帯へ反映する。</p><div class="toeic-inputs"><label>LISTENING<select id="flowzToeicL">'+toeicOptions(3)+'</select></label><label>READING<select id="flowzToeicR">'+toeicOptions(2)+'</select></label></div><div class="toeic-actions"><button class="toeic-cancel" type="button">あとで</button><button class="toeic-save" type="button">SAVE RESULT</button></div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click',function(e){if(e.target===modal)modal.remove()});
  modal.querySelector('.toeic-cancel').addEventListener('click',function(){modal.remove()});
  modal.querySelector('.toeic-save').addEventListener('click',function(){
    var listening=Number($('flowzToeicL').value),reading=Number($('flowzToeicR').value);
    var rows=loadToeicResults();
    rows.push({date:today,listening:listening,reading:reading,total:listening+reading,maxListening:3,maxReading:2,maxTotal:5,format:'toeic-check-5q',at:new Date().toISOString()});
    saveToeicResults(rows);
    modal.remove();
    renderAssessment();
  });
}

/* ============================== RENDER PIPELINE ============================== */
function renderRelease(){
  if(document.documentElement)document.documentElement.setAttribute('data-flowz-release',RELEASE.number);
  text(document.querySelector('.version'),RELEASE.label);
  if(document.title!==RELEASE.title)document.title=RELEASE.title;
  document.querySelectorAll('body>.note').forEach(function(n){if(/Last updated/i.test(n.textContent||''))text(n,RELEASE.footer)});
}
function renderTalkPrep(){
  var card=$('flowzTalkPrep');if(!card)return;
  if(current==='kedy'){
    var m=currentCommuteMission(),reuse=currentReusePhrase(m.phrase);
    card.innerHTML='<div class="prep-head"><div class="prep-title">🗣️ TALK PREP</div><span class="prep-chip">COMMUTE</span></div>'+
      '<div class="prep-grid">'+
        '<div class="prep-row" data-prep-action="today" role="button" tabindex="0"><span>PHRASE</span><div><b>'+escapeHtml(m.phrase)+'</b><small>'+escapeHtml(m.meaning)+' · タップで次へ</small></div></div>'+
      '</div><button id="flowzTalkPrepBtn" type="button">⚡ START COMMUTE</button>';
    return;
  }
  var lm=currentLeniPrepMission(),lreuse=currentLeniReusePhrase(lm.phrase);
  card.innerHTML='<div class="prep-head"><div class="prep-title">🗣️ TALK PREP</div><span class="prep-chip">FREE</span></div>'+
    '<div class="prep-grid">'+
      '<div class="prep-row"><span>OPEN</span><div><b>ChatGPTさん、こんにちは。今日も日本語を練習したいです。</b><small>Mulai dengan sapaan biasa</small></div></div>'+
      '<div class="prep-row" data-prep-action="today" role="button" tabindex="0"><span>TODAY</span><div><b>'+escapeHtml(lm.phrase)+'</b><small>'+escapeHtml(lm.meaning)+' · タップで切替</small></div></div>'+
      '<div class="prep-row" data-prep-action="reuse" role="button" tabindex="0"><span>REUSE</span><div><b>'+escapeHtml(lreuse)+'</b><small>最近の表現から選択 · タップで切替</small></div></div>'+
    '</div><button id="flowzTalkPrepBtn" type="button">⚡ START FREE</button>';
}
function renderModes(){
  var box=$('modes');if(!box)return;
  box.innerHTML='';
  if(current==='leni'){
    box.className='modes';
    LENI_MODES.forEach(function(m){
      var b=document.createElement('button');
      b.type='button';b.className='mode '+m.cls;b.dataset.modeId=m.id;
      b.innerHTML='<b>'+escapeHtml(m.title)+'</b><small>'+escapeHtml(m.sub)+'</small><span class="icon">'+m.icon+'</span>';
      box.appendChild(b);
    });
  }else{
    box.className='modes kedy-modes';
    KEDY_GRID.forEach(function(item){
      if(item.type==='label'){
        var lbl=document.createElement('div');lbl.className='mode-label';lbl.textContent=item.text;box.appendChild(lbl);
      }else{
        var b=document.createElement('button');
        b.type='button';b.className='mode '+item.cls;b.dataset.modeId=item.id;
        b.innerHTML='<b>'+escapeHtml(item.title)+'</b><small>'+escapeHtml(item.sub)+'</small><span class="icon">'+item.icon+'</span>';
        box.appendChild(b);
      }
    });
  }
  text($('modeTitle'),UI[current].modeTitle);
}
var MISSION_GUIDE_OVERRIDE={
  toeic:'Voice 5問チェック。Listening 3問＋Reading 2問を約5〜8分で採点。',
  bath:'Voice Talk専用。画面を見ながら話さず、耳だけで答える5問・約5〜8分。',
  review:'FREE内の旧互換Review。直近Diaryの表現を短く復習。',
  free:'自由英会話。必要な時だけ最近の表現も自然に復習。'
};
var MISSION_START_OVERRIDE={toeic:'START TOEIC CHECK · 5Q',bath:'START TOEIC STUDY · 5Q',review:'START REVIEW',free:'START FREE TALK'};
function renderMission(){
  var panel=$('mission'),u=UI[current];
  if(current==='kedy'){panel.classList.remove('show');return}
  if(!pending||pending.profile!==current||!pending.mission){panel.classList.remove('show');return}
  var m=pending.mission;
  panel.classList.add('show');panel.classList.toggle('leni',current==='leni');
  text($('missionMode'),pending.title);
  text($('missionTheme'),m.theme);
  text($('missionPhrase'),m.phrase);
  text($('missionReading'),m.reading||'');
  $('missionReading').style.display=m.reading?'block':'none';
  text($('missionMeaning'),m.meaning||'');
  $('missionMeaning').style.display=m.meaning?'block':'none';
  text($('missionGuide'),MISSION_GUIDE_OVERRIDE[pending.mode]||m.guide);
  $('startBtn').disabled=!!pending.startedAt;
  text($('startBtn'),pending.startedAt?(current==='kedy'?'SESSION STARTED ✓':'開始済み ✓'):(MISSION_START_OVERRIDE[pending.mode]||u.start));
}
function renderPending(){
  var panel=$('pending');
  if(!pending||!pending.startedAt){panel.classList.remove('show');return}
  panel.classList.add('show');
  var owner=PROFILES[pending.profile];
  text($('pendingText'),pending.profile===current?owner.name+' · '+pending.title+' · Return after speaking. The session records automatically.':owner.name+' · '+UI[current].switchTo);
  var checks=panel.querySelector('.checks'),completeBtn=$('completeBtn');
  if(checks)checks.style.display='none';
  if(completeBtn)completeBtn.style.display='none';
}
function studiedOn(id,key){
  if(completed(id,key))return true;
  var rows=state.profiles[id]&&Array.isArray(state.profiles[id].sessions)?state.profiles[id].sessions:[];
  return rows.some(function(row){return String(row.date||'')===key||String(row.at||row.completed_at||'').slice(0,10)===key});
}
function renderWeek(){
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
}
function render(){
  document.documentElement.lang=current==='leni'?'ja':'en';
  document.body.dataset.profile=current;
  document.querySelectorAll('.profile-btn').forEach(function(b){b.classList.toggle('active',b.dataset.profile===current)});
  var u=UI[current],k=levelInfo('kedy'),l=levelInfo('leni');
  text($('mini-kedy'),'LV.'+k.level);text($('mini-leni'),'LV.'+l.level);
  var kWeek=weekXp('kedy'),lWeek=weekXp('leni');
  text($('battleKedy'),kWeek);text($('battleLeni'),lWeek);text($('battleTitle'),u.battleTitle);text($('dailyCap'),u.dailyCap);
  var diff=kWeek-lWeek;
  if(diff===0)text($('battleResult'),u.tied);
  else if(current==='kedy')text($('battleResult'),diff>0?u.kedyLead+diff+' XP':u.leniLead+Math.abs(diff)+' XP');
  else text($('battleResult'),(diff>0?u.kedyLead+diff:u.leniLead+Math.abs(diff))+(u.leadSuffix||''));
  text($('duoStreakText'),u.duoStreak);text($('duoStreakUnit'),u.duoStreakUnit);text($('duoDaysText'),u.duoDays);text($('duoDaysUnit'),u.duoDaysUnit);
  text($('duoStreak'),duoStreak());text($('duoDays'),duoDays());
  var p=PROFILES[current],li=levelInfo(current),rec=dayRecord(current,today);
  text($('heroName'),LABELS[current]);text($('heroSub'),p.sub);text($('levelNum'),li.level);
  text($('streak'),streakFor(current));text($('best'),bestStreakFor(current));text($('sessions'),sessionCount(current));
  text($('streakLabel'),u.streak);text($('bestLabel'),u.best);text($('sessionsLabel'),u.sessions);
  text($('totalXp'),li.xp+' XP');text($('nextXp'),u.next+li.next+' XP');
  $('levelRing').style.setProperty('--progress',li.inside+'%');$('levelBar').style.setProperty('--progress',li.inside+'%');
  $('levelRing').classList.toggle('leni',current==='leni');$('levelBar').classList.toggle('leni',current==='leni');
  $('todayCard').classList.toggle('leni',current==='leni');
  text($('todayXp'),dayXp(current,today));text($('todayTitle'),rec.base?u.todayDone:u.todayEmpty);text($('todayDetail'),rec.base?u.todayDoneDetail:u.todayEmptyDetail);
  text($('weekTitle'),u.weekTitle);text($('dataTitle'),u.dataTitle);text($('storageLabel'),u.storage);
  text($('exportBtn'),u.exportLabel);text($('importBtn'),u.importLabel);text($('resetPendingBtn'),u.clearLabel);
  text($('storageNote'),loadCloud().roomId?u.noteSynced:u.note);
  text($('pendingHeading'),u.pendingHeading);text($('fixLabel'),u.fix);
  text($('missionHeading'),u.missionHeading);text($('missionThemeLabel'),u.themeLabel);text($('missionPhraseLabel'),u.phraseLabel);
  var talkPrep=$('flowzTalkPrep');if(talkPrep)talkPrep.style.display='';
  renderModes();renderTalkPrep();renderMission();renderPending();renderAssessment();renderCloudPanel();renderWeek();renderVault();renderRelease();
}

/* ============================== SESSION FLOW ============================== */
function selectMission(mode,missionOverride){
  pending={profile:current,mode:mode.id,title:mode.title,selectedAt:new Date().toISOString(),startedAt:'',mission:missionOverride||generateMission(current,mode.id,today)};
  savePending();render();
  var el=$('mission');if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function startSession(){
  if(!pending||pending.profile!==current||pending.startedAt)return;
  pending.startedAt=new Date().toISOString();
  pending.autoRecord=true;
  savePending();renderMission();renderPending();
  var promptText=buildPromptFor(pending);
  copyText(promptText).then(function(){
    toast(current==='kedy'?'Mission copied ✓':'ミッションをコピーした ✓');
    setTimeout(function(){location.href='https://chatgpt.com/?q='+encodeURIComponent(promptText)},350);
  }).catch(function(){location.href='https://chatgpt.com/?q='+encodeURIComponent(promptText)});
}
function beginCommute(){
  if(current!=='kedy')return;
  selectMission({id:'commute',title:'COMMUTE'},currentCommuteMission());
  startSession();
}
function beginLeniTalkPrep(){
  if(current!=='leni')return;
  selectMission(findMode('leni','free'),currentLeniPrepMission());
  startSession();
}
function beginTalkPrep(){
  if(current==='kedy')beginCommute();
  else beginLeniTalkPrep();
}
function completeSession(){
  if(!pending||pending.profile!==current||!pending.startedAt)return;
  var r=dayRecord(current,today),gain=0;
  if(!r.base){r.base=10;gain+=10}
  r.count=(r.count||0)+1;r.mode=pending.mode;state.profiles[current].days[today]=r;
  state.profiles[current].sessions.push({date:today,mode:pending.mode,title:pending.title,theme:pending.mission&&pending.mission.theme||'',phrase:pending.mission&&pending.mission.phrase||'',xp:gain,at:new Date().toISOString()});
  var duo=applyDuoBonus(today);pending=null;savePending();saveState();render();
  toast('+'+gain+' XP'+(duo?' · DUO BONUS +5':'')+' ✓');
}
function autoComplete(){
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
}

/* ============================== HISTORY VAULT NOTE ============================== */
function renderVault(){
  var note=$('historyVaultNote');
  if(note)text(note,'🛡️ HISTORY VAULT ON · kedy '+Object.keys(state.profiles.kedy.days).length+' days / '+state.profiles.kedy.sessions.length+' sessions protected');
  var backfillNote=$('historyBackfillNote');
  if(backfillNote&&localStorage.getItem(BACKFILL_MARKER)==='done')text(backfillNote,'✅ Estimated history restored · 2026.07.08–08.05 · 21 weekdays / 210 XP');
}

/* ============================== DUO SYNC (SUPABASE) ============================== */
var SUPABASE_URL='https://efnlwlnujhxkvifkooqy.supabase.co';
var SUPABASE_KEY='sb_publishable_3drPy_UK0ojzsan6wde_0Q_iYOMzo03';
var cloudClient=null,cloudAuthUser=null,cloudChannel=null,cloudSyncing=false,cloudSyncQueued=false;
var cloudPanelState={status:'loading',message:'Cloud接続を確認中…',members:[],latest:null};
function loadCloud(){return safeParse(localStorage.getItem(CLOUD_KEY))||{}}
function saveCloud(v){try{localStorage.setItem(CLOUD_KEY,JSON.stringify(v||{}))}catch(e){}}
function xpOf(r){return (r&&r.base||0)+(r&&r.phrase||0)+(r&&r.fix||0)+(r&&r.duo||0)}
function isoForDate(d){return d+'T12:00:00+09:00'}
function relativeTime(iso){
  var t=new Date(iso).getTime();if(!isFinite(t))return '';
  var sec=Math.max(0,Math.floor((Date.now()-t)/1000));
  if(sec<60)return 'たった今';
  var min=Math.floor(sec/60);if(min<60)return min+'分前';
  var hour=Math.floor(min/60);if(hour<24)return hour+'時間前';
  return Math.floor(hour/24)+'日前';
}
function fnvHash(value){var h=2166136261,s=String(value||'');for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function friendlyError(error){
  var t=error&&error.message||String(error||'Unknown error');
  if(/already connected/i.test(t))return 'この端末はすでにRoomへ接続されてる';
  if(/profile is already/i.test(t))return 'そのプロフィールはすでに別端末で接続済み';
  if(/Room not found/i.test(t))return 'Duoコードが見つからへん';
  if(/Failed to fetch|network/i.test(t))return '通信できへん。接続後にもう一度試して';
  return t;
}
function setCloudPanel(status,message,extra){
  cloudPanelState.status=status;cloudPanelState.message=message||'';
  if(extra){if(extra.members)cloudPanelState.members=extra.members;if('latest' in extra)cloudPanelState.latest=extra.latest}
  renderCloudPanel();
}
function renderCloudPanel(){
  var panel=$('flowzCloudPanel');if(!panel)return;
  var codeInput=$('flowzRoomCode'),typedCode=codeInput?codeInput.value:'';
  var cloud=loadCloud(),linked=!!cloud.roomId,connected=linked&&cloudPanelState.status==='connected';
  var visibleStatus=cloudPanelState.status==='error'?'error':connected?'connected':linked?'loading':cloudPanelState.status;
  var statusLabel=cloudPanelState.status==='error'?'ERROR':connected?'CONNECTED':linked?'SYNCING':'SETUP';
  panel.dataset.status=visibleStatus;
  panel.dataset.linked=linked?'true':'false';
  var html='<div class="cloud-head"><div class="cloud-title">☁️ DUO SYNC</div><span class="cloud-status">'+escapeHtml(statusLabel)+'</span></div>';
  if(!linked){
    html+='<p class="cloud-message">'+escapeHtml(cloudPanelState.message||'この端末を現在のプロフィール「'+profileName(current)+'」として接続する。')+'</p>'+
      '<div class="cloud-actions"><button class="cloud-btn primary" data-cloud-action="create">6桁コードを作る</button><div><input class="cloud-input" id="flowzRoomCode" inputmode="numeric" maxlength="6" placeholder="000000"><button class="cloud-btn" style="width:100%;margin-top:8px" data-cloud-action="join">コードで参加</button></div></div>'+
      '<div class="cloud-note">現在のプロフィール：'+escapeHtml(profileName(current))+'／端末ごとに一度だけ接続</div>';
  }else{
    var members=cloudPanelState.members||[],hasKedy=members.indexOf('kedy')>=0,hasLeni=members.indexOf('leni')>=0;
    html+='<div class="cloud-compact"><div class="cloud-compact-members"><span class="cloud-member '+(hasKedy?'on':'')+'">'+(hasKedy?'✓ ':'')+'kedy</span><span class="cloud-member '+(hasLeni?'on':'')+'">'+(hasLeni?'✓ ':'')+'Leni</span></div><button class="cloud-room" data-cloud-action="copy">ROOM '+escapeHtml(cloud.roomCode||'------')+'</button></div>';
    if(cloudPanelState.status==='error')html+='<div class="cloud-error">'+escapeHtml(cloudPanelState.message||'同期エラー')+'</div>';
  }
  panel.innerHTML=html;
  /* A redraw must never eat a Duo Code the user is halfway through typing. */
  if(typedCode){var next=$('flowzRoomCode');if(next)next.value=typedCode}
}
function bindCloudPanel(){
  var panel=$('flowzCloudPanel');if(!panel)return;
  panel.addEventListener('click',function(e){
    var action=e.target&&e.target.getAttribute&&e.target.getAttribute('data-cloud-action');
    if(action==='create')createRoom();
    if(action==='join')joinRoom();
    if(action==='copy')copyRoomCode();
    if(action==='sync')queueCloudSync(false);
  });
  panel.addEventListener('input',function(e){
    if(e.target&&e.target.id==='flowzRoomCode')e.target.value=e.target.value.replace(/\D/g,'').slice(0,6);
  });
}
async function ensureCloudClient(){
  if(cloudClient)return cloudClient;
  if(!window.supabase||!window.supabase.createClient)throw new Error('Supabase library failed to load');
  cloudClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  return cloudClient;
}
async function ensureCloudAuth(){
  await ensureCloudClient();
  var sessionResult=await cloudClient.auth.getSession();
  if(sessionResult.error)throw sessionResult.error;
  if(!(sessionResult.data&&sessionResult.data.session)){
    var signed=await cloudClient.auth.signInAnonymously();
    if(signed.error)throw signed.error;
  }
  var userResult=await cloudClient.auth.getUser();
  if(userResult.error)throw userResult.error;
  cloudAuthUser=userResult.data.user;
  return cloudAuthUser;
}
async function recoverMembership(){
  var cloud=loadCloud();if(cloud.roomId||!cloudAuthUser)return cloud;
  var result=await cloudClient.from('flowz_members').select('room_id,profile').eq('user_id',cloudAuthUser.id).maybeSingle();
  if(result.error)throw result.error;
  if(!result.data)return cloud;
  var room=await cloudClient.from('flowz_rooms').select('id,code').eq('id',result.data.room_id).single();
  if(room.error)throw room.error;
  cloud={roomId:room.data.id,roomCode:room.data.code,profile:result.data.profile,linkedAt:new Date().toISOString(),migratedAt:new Date(0).toISOString()};
  saveCloud(cloud);return cloud;
}
async function createRoom(){
  try{
    setCloudPanel('loading','Duo Roomを作成中…');
    await ensureCloudAuth();
    var result=await cloudClient.rpc('flowz_create_room',{p_profile:current});
    if(result.error)throw result.error;
    var row=Array.isArray(result.data)?result.data[0]:result.data;
    if(!row||!row.room_id)throw new Error('Room creation returned no data');
    var cloud={roomId:row.room_id,roomCode:row.room_code,profile:current,linkedAt:new Date().toISOString(),migratedAt:new Date(0).toISOString()};
    saveCloud(cloud);
    await migrateExistingHistory(cloud);
    await fullCloudSync(false);
    toast('Duo Room '+row.room_code+' を作成 ✓');
  }catch(error){setCloudPanel('error',friendlyError(error))}
}
async function joinRoom(){
  var input=$('flowzRoomCode'),code=input?input.value.trim():'';
  if(!/^\d{6}$/.test(code)){toast('6桁コードを入力して');return}
  try{
    setCloudPanel('loading','Duo Roomへ参加中…');
    await ensureCloudAuth();
    var result=await cloudClient.rpc('flowz_join_room',{p_code:code,p_profile:current});
    if(result.error)throw result.error;
    var cloud={roomId:result.data,roomCode:code,profile:current,linkedAt:new Date().toISOString(),migratedAt:new Date(0).toISOString()};
    saveCloud(cloud);
    await migrateExistingHistory(cloud);
    await fullCloudSync(false);
    toast('Duo Roomへ接続 ✓');
  }catch(error){setCloudPanel('error',friendlyError(error))}
}
async function copyRoomCode(){
  var code=loadCloud().roomCode;if(!code)return;
  try{await navigator.clipboard.writeText(code);toast('Duo Codeをコピー ✓')}catch(e){toast('コード：'+code)}
}
async function existingIds(roomId,profile){
  var result=await cloudClient.from('flowz_sessions').select('client_session_id').eq('room_id',roomId).eq('profile',profile);
  if(result.error)throw result.error;
  var ids={};(result.data||[]).forEach(function(r){ids[r.client_session_id]=true});return ids;
}
async function insertMissing(rows,existing){
  var missing=rows.filter(function(r){return !existing[r.client_session_id]});
  if(!missing.length)return 0;
  var result=await cloudClient.from('flowz_sessions').insert(missing);
  if(result.error)throw result.error;
  return missing.length;
}
async function migrateExistingHistory(cloud){
  var profile=cloud.profile;
  if(!state.profiles[profile]){cloud.migratedAt=new Date().toISOString();saveCloud(cloud);return}
  var days=state.profiles[profile].days||{},rows=[];
  Object.keys(days).sort().forEach(function(date){
    var record=days[date],xp=xpOf(record);if(!xp)return;
    rows.push({room_id:cloud.roomId,user_id:cloudAuthUser.id,profile:profile,session_date:date,mode:record.mode||'legacy',title:'Imported Flowz history',theme:'',phrase:'',xp:Math.min(100,Math.max(0,xp)),client_session_id:'migrate-day-'+profile+'-'+date,completed_at:isoForDate(date),metadata:{source:'localStorage',migrated_day:true,count:record.count||1}});
  });
  var ids=await existingIds(cloud.roomId,profile);await insertMissing(rows,ids);
  cloud.migratedAt=new Date().toISOString();saveCloud(cloud);
}
function localRowsAfterMigration(cloud){
  var profile=cloud.profile;
  if(!state.profiles[profile])return [];
  var cutoff=new Date(cloud.migratedAt||0).getTime();
  return (state.profiles[profile].sessions||[]).filter(function(s){
    if(s.cloud)return false;
    var at=new Date(s.at||0).getTime();return isFinite(at)&&at>cutoff;
  }).map(function(s){
    var at=s.at||new Date().toISOString(),id='local-'+profile+'-'+fnvHash([at,s.date,s.mode,s.title].join('|'));
    return {room_id:cloud.roomId,user_id:cloudAuthUser.id,profile:profile,session_date:s.date||at.slice(0,10),mode:s.mode||'session',title:s.title||'',theme:s.theme||'',phrase:s.phrase||'',xp:Math.min(100,Math.max(0,Number(s.xp)||10)),client_session_id:id,completed_at:at,metadata:{source:'flowz',auto:!!s.auto}};
  });
}
async function pushLocal(cloud){
  var rows=localRowsAfterMigration(cloud);if(!rows.length)return 0;
  var existingResult=await cloudClient.from('flowz_sessions').select('client_session_id,session_date,xp').eq('room_id',cloud.roomId).eq('profile',cloud.profile);
  if(existingResult.error)throw existingResult.error;
  var existing={},cloudXp={};
  (existingResult.data||[]).forEach(function(r){existing[r.client_session_id]=true;cloudXp[r.session_date]=(cloudXp[r.session_date]||0)+(Number(r.xp)||0)});
  var days=state.profiles[cloud.profile]&&state.profiles[cloud.profile].days||{},remaining={};
  rows.forEach(function(row){
    if(existing[row.client_session_id])return;
    if(!(row.session_date in remaining))remaining[row.session_date]=Math.max(0,xpOf(days[row.session_date])-Number(cloudXp[row.session_date]||0));
    row.xp=Math.min(100,remaining[row.session_date]);remaining[row.session_date]=0;
  });
  return insertMissing(rows,existing);
}
function cloudToState(rows){
  var before=JSON.stringify(state.profiles),byProfile={kedy:[],leni:[]};
  (rows||[]).forEach(function(r){if(byProfile[r.profile])byProfile[r.profile].push(r)});
  ['kedy','leni'].forEach(function(profile){
    var list=byProfile[profile];if(!list.length)return;
    var days={},sessions=[];
    list.sort(function(a,b){return new Date(a.completed_at)-new Date(b.completed_at)}).forEach(function(row){
      var date=row.session_date,meta=row.metadata||{},count=meta.migrated_day?(Number(meta.count)||1):1;
      if(!days[date])days[date]={base:0,phrase:0,fix:0,duo:0,count:0,mode:row.mode||'cloud'};
      days[date].base+=Number(row.xp)||0;days[date].count+=count;days[date].mode=row.mode||days[date].mode;
      for(var i=0;i<count;i++)sessions.push({date:date,mode:row.mode,title:row.title,theme:row.theme,phrase:row.phrase,xp:i===0?(Number(row.xp)||0):0,at:row.completed_at,cloud:true,cloudId:row.id});
    });
    state.profiles[profile].days=days;state.profiles[profile].sessions=sessions;
  });
  return JSON.stringify(state.profiles)!==before;
}
async function fetchRoomData(cloud){
  var membersResult=await cloudClient.from('flowz_members').select('profile,joined_at').eq('room_id',cloud.roomId);
  if(membersResult.error)throw membersResult.error;
  var sessionsResult=await cloudClient.from('flowz_sessions').select('*').eq('room_id',cloud.roomId).order('completed_at',{ascending:true});
  if(sessionsResult.error)throw sessionsResult.error;
  var roomResult=await cloudClient.from('flowz_rooms').select('code').eq('id',cloud.roomId).single();
  if(roomResult.error)throw roomResult.error;
  if(roomResult.data&&roomResult.data.code&&cloud.roomCode!==roomResult.data.code){cloud.roomCode=roomResult.data.code;saveCloud(cloud)}
  return {members:membersResult.data||[],sessions:sessionsResult.data||[]};
}
async function subscribeCloud(cloud){
  if(cloudChannel){try{await cloudClient.removeChannel(cloudChannel)}catch(e){}cloudChannel=null}
  cloudChannel=cloudClient.channel('flowz-room-'+cloud.roomId)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'flowz_sessions',filter:'room_id=eq.'+cloud.roomId},function(){queueCloudSync(true)})
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'flowz_members',filter:'room_id=eq.'+cloud.roomId},function(){queueCloudSync(true)})
    .subscribe(function(status){if(status==='SUBSCRIBED')renderCloudPanel()});
}
async function fullCloudSync(renderOnChange){
  if(cloudSyncing){cloudSyncQueued=true;return}
  cloudSyncing=true;
  try{
    await ensureCloudAuth();
    var cloud=await recoverMembership();
    if(!cloud.roomId){setCloudPanel('ready','現在のプロフィール「'+profileName(current)+'」でRoomを作るか、6桁コードへ参加して');return}
    if(!cloud.migratedAt||new Date(cloud.migratedAt).getTime()===0)await migrateExistingHistory(cloud);
    await pushLocal(cloud);
    var data=await fetchRoomData(cloud),changed=cloudToState(data.sessions);
    if(changed)saveState(state);
    var profiles=data.members.map(function(m){return m.profile}),latest=data.sessions.length?data.sessions[data.sessions.length-1]:null;
    setCloudPanel('connected','同期済み',{members:profiles,latest:latest});
    if(!cloudChannel)subscribeCloud(cloud);
    if(changed&&renderOnChange!==false)render();
  }catch(error){setCloudPanel('error',friendlyError(error))}
  finally{
    cloudSyncing=false;
    if(cloudSyncQueued){cloudSyncQueued=false;setTimeout(function(){fullCloudSync(true)},250)}
  }
}
function queueCloudSync(renderOnChange){setTimeout(function(){fullCloudSync(renderOnChange!==false)},150)}
function initCloud(){
  bindCloudPanel();renderCloudPanel();
  ensureCloudAuth().then(recoverMembership).then(function(){
    var locked=false;try{locked=sessionStorage.getItem(SYNC_LOCK_KEY)==='1';sessionStorage.removeItem(SYNC_LOCK_KEY)}catch(e){}
    return fullCloudSync(!locked);
  }).catch(function(error){setCloudPanel('error',friendlyError(error))});
}

/* ============================== IMPORT / EXPORT ============================== */
function bindDataPanel(){
  var exportBtn=$('exportBtn'),importBtn=$('importBtn'),resetBtn=$('resetPendingBtn');
  if(exportBtn)exportBtn.addEventListener('click',function(){copyText(JSON.stringify(state)).then(function(){toast(current==='kedy'?'Record copied ✓':'記録をコピーした ✓')})});
  if(importBtn)importBtn.addEventListener('click',function(){
    var raw=prompt(current==='kedy'?'Paste your Flowz record data:':'Flowzの記録データを貼り付け：');
    if(!raw)return;
    try{
      var parsed=JSON.parse(raw);
      if(!parsed||!parsed.profiles||!parsed.profiles.kedy||!parsed.profiles.leni)throw new Error('invalid');
      saveState(normalizeState(parsed));render();
      toast(current==='kedy'?'Record restored ✓':'記録を復元した ✓');
    }catch(e){toast(current==='kedy'?'Invalid data':'データ形式が違う')}
  });
  if(resetBtn)resetBtn.addEventListener('click',function(){pending=null;savePending();render();toast(current==='kedy'?'Pending cleared':'保留を消した')});
}

/* ============================== EVENT WIRING ============================== */
function bindInteractions(){
  document.querySelectorAll('.profile-btn').forEach(function(b){
    b.addEventListener('click',function(){
      current=b.dataset.profile;
      try{history.replaceState(null,'',location.pathname+'?profile='+current)}catch(e){}
      render();
    });
  });
  $('startBtn').addEventListener('click',startSession);
  $('completeBtn').addEventListener('click',completeSession);
  $('modes').addEventListener('click',function(e){
    var btn=e.target.closest&&e.target.closest('.mode');
    if(!btn||!btn.dataset.modeId)return;
    selectMission(findMode(current,btn.dataset.modeId));
    if(current==='kedy'&&(btn.dataset.modeId==='toeic'||btn.dataset.modeId==='free'))startSession();
  });
  var talkPrep=$('flowzTalkPrep');
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
    talkPrep.addEventListener('keydown',function(e){
      if(e.key!=='Enter'&&e.key!==' ')return;
      var row=e.target.closest&&e.target.closest('[data-prep-action]');if(!row)return;
      e.preventDefault();row.click();
    });
  }
  var assessment=$('flowzAssessment');
  if(assessment)assessment.addEventListener('click',function(e){
    if(e.target.closest&&e.target.closest('#flowzToeicResultBtn'))openToeicModal();
  });
  /* Another tab changed our data. Re-read and redraw, but only write back
     when the merge actually produced something new -- an unconditional
     persist() here makes two open tabs ping-pong storage events forever. */
  window.addEventListener('storage',function(e){
    if(!e.key||!/(flowz|tm_)/i.test(e.key))return;
    pending=loadPending();
    var merged=bootstrapState();
    if(JSON.stringify(merged.profiles)!==JSON.stringify(state.profiles))state=persist(merged);
    render();
  });
}

var resyncScheduled=false;
function resync(){
  resyncScheduled=false;
  if(autoComplete())render();
  if(loadCloud().roomId)queueCloudSync(true);
}
function scheduleResync(){
  if(resyncScheduled)return;
  resyncScheduled=true;
  setTimeout(resync,0);
}
function bindLifecycle(){
  window.addEventListener('pageshow',scheduleResync);
  window.addEventListener('focus',scheduleResync);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')scheduleResync()});
}

/* ============================== TEST / DEBUG HOOK ==============================
 * Read-only surface for Playwright / manual QA. Does not change any
 * user-facing behavior. */
window.FlowzApp={
  release:RELEASE,
  getPending:function(){return pending},
  getState:function(){return state},
  getCurrentProfile:function(){return current},
  buildPromptFor:buildPromptFor,
  getTalkPrep:function(){if(current==='leni'){var lm=currentLeniPrepMission();return {profile:'leni',today:lm,reuse:currentLeniReusePhrase(lm.phrase)}}var m=currentCommuteMission();return {profile:'kedy',today:m,reuse:currentReusePhrase(m.phrase)}},
  render:render
};

/* ============================== BOOTSTRAP ============================== */
function init(){
  bindInteractions();
  bindDataPanel();
  bindLifecycle();
  render();
  initCloud();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();

})();

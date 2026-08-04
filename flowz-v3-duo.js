(function(){
'use strict';
var DATA_KEY='flowz_duo_data';
var BACKUP_KEY='flowz_duo_data_backup';
var LEGACY_KEYS=['flowz_duo_v3','flowz_duo'];
var PENDING_KEY='flowz_duo_pending';
var requestedProfile='';
try{requestedProfile=new URLSearchParams(location.search).get('profile')||''}catch(e){}
var current=requestedProfile==='leni'?'leni':'kedy';
var today=dateKey(new Date());
var state=loadState();
var pending=loadPending();

var PROFILES={
 kedy:{name:'kedy',flag:'🇺🇸',language:'ENGLISH',sub:'Use English in real life',accent:'amber'},
 leni:{name:'Leni',flag:'🇯🇵',language:'JAPANESE',sub:'N2と生活日本語を伸ばす',accent:'cyan'}
};
var MODES={
 kedy:[
  {id:'commute',title:'COMMUTE',sub:'Speaking & reactions · 15min',icon:'🚲',cls:'m1'},
  {id:'toeic',title:'TOEIC',sub:'Listening & vocab · 10min',icon:'🎯',cls:'m2'},
  {id:'bath',title:'BATH',sub:'Auto shadowing · 5min',icon:'🛀',cls:'m3'},
  {id:'free',title:'FREE',sub:'Practical conversation · 10min',icon:'🎲',cls:'m4'}
 ],
 leni:[
  {id:'free',title:'フリー',sub:'自然な会話 10分',icon:'💬',cls:'m1'},
  {id:'work',title:'仕事',sub:'介護・敬語 10分',icon:'🤝',cls:'m2'},
  {id:'n2',title:'N2',sub:'語彙・文法 10分',icon:'📚',cls:'m3'},
  {id:'kanji',title:'漢字',sub:'読み・短文 10分',icon:'📝',cls:'m4'}
 ]
};
var UI={
 kedy:{
  battleTitle:'⚔️ THIS WEEK',dailyCap:'MAX 15 XP',tied:'Tied this week',kedyLead:'kedy leads by ',leniLead:'Leni leads by ',
  duoStreak:'🤝 DUO STREAK',duoStreakUnit:' days',duoDays:'🔥 TOGETHER',duoDaysUnit:' days',
  streak:'STREAK',best:'BEST',sessions:'SESSIONS',next:'Next: ',
  todayDone:'SESSION DONE ✓',todayEmpty:'NOT STARTED',todayDoneDetail:'Base 10 XP earned · bonus once/day',todayEmptyDetail:'Complete 1 session for 10 XP',
  modeTitle:'🎙️ ENGLISH SESSION',pendingHeading:'✅ SESSION RESULT',pendingBack:'Return from ChatGPT, choose the result, then finish.',
  complete:'COMPLETE SESSION +10 XP',switchTo:'Switch profile to finish',phrase:'Used today’s phrase',fix:'Fixed a sentence',
  weekTitle:'📅 LAST 7 DAYS',dataTitle:'💾 DATA & BACKUP',storage:'AUTO BACKUP',export:'COPY RECORD',import:'RESTORE RECORD',clear:'CLEAR PENDING',
  note:'Records are saved automatically in this browser with a backup. Different devices do not sync yet.'
 },
 leni:{
  battleTitle:'⚔️ 今週の対戦',dailyCap:'上限 15 XP',tied:'今週は同点',kedyLead:'kedyが ',leniLead:'Leniが ',leadSuffix:' XPリード',
  duoStreak:'🤝 2人の連続',duoStreakUnit:'日',duoDays:'🔥 2人で達成',duoDaysUnit:'日',
  streak:'連続日数',best:'最長',sessions:'セッション',next:'次まで ',
  todayDone:'今日の学習済み ✓',todayEmpty:'今日はまだ',todayDoneDetail:'基本10 XP獲得済み／追加は1日1回',todayEmptyDetail:'1セッションで10 XP',
  modeTitle:'🎙️ 日本語セッション',pendingHeading:'✅ セッション結果',pendingBack:'ChatGPTから戻ったら、できた内容を選んで完了。',
  complete:'セッション完了 +10 XP',switchTo:'プロフィールを切り替えて完了',phrase:'今日の表現を使えた',fix:'言い直しに成功した',
  weekTitle:'📅 過去7日',dataTitle:'💾 記録・バックアップ',storage:'自動バックアップ',export:'記録をコピー',import:'記録を復元',clear:'保留を消す',
  note:'記録はこのブラウザへ自動保存・予備保存されます。別の端末とはまだ同期されません。'
 }
};

function blankProfile(){return {days:{},sessions:[]}}
function defaultState(){return {version:4,profiles:{kedy:blankProfile(),leni:blankProfile()},migrated:false,updatedAt:''}}
function safeParse(raw){try{return raw?JSON.parse(raw):null}catch(e){return null}}
function normalizeProfile(p){return {days:p&&p.days&&typeof p.days==='object'?p.days:{},sessions:p&&Array.isArray(p.sessions)?p.sessions:[]}}
function normalizeState(input){
 var source=input&&typeof input==='object'?input:{};
 var result=Object.assign({},source);
 result.version=4;
 result.profiles={kedy:normalizeProfile(source.profiles&&source.profiles.kedy),leni:normalizeProfile(source.profiles&&source.profiles.leni)};
 result.migrated=!!source.migrated;
 result.updatedAt=source.updatedAt||'';
 return result;
}
function recordXp(r){return (r&&r.base||0)+(r&&r.phrase||0)+(r&&r.fix||0)+(r&&r.duo||0)}
function stateScore(s){
 var score=0;
 if(!s||!s.profiles)return score;
 ['kedy','leni'].forEach(function(id){var p=s.profiles[id]||blankProfile();var days=p.days||{};score+=Object.keys(days).length*1000+(p.sessions||[]).length*100;Object.keys(days).forEach(function(d){score+=recordXp(days[d])})});
 return score;
}
function loadState(){
 var best=null,bestScore=-1;
 [DATA_KEY,BACKUP_KEY].concat(LEGACY_KEYS).forEach(function(key){var parsed=safeParse(localStorage.getItem(key));if(!parsed)return;var candidate=normalizeState(parsed),score=stateScore(candidate);if(score>bestScore){best=candidate;bestScore=score}});
 var s=best||defaultState();
 migrateOld(s);
 persistLoadedState(s);
 return s;
}
function persistLoadedState(s){
 var raw=JSON.stringify(normalizeState(s));
 try{localStorage.setItem(DATA_KEY,raw);localStorage.setItem(LEGACY_KEYS[0],raw);if(!localStorage.getItem(BACKUP_KEY))localStorage.setItem(BACKUP_KEY,raw)}catch(e){}
}
function migrateOld(s){
 var arr=[];
 try{arr=JSON.parse(localStorage.getItem('tm_days')||'[]')||[]}catch(e){}
 var last='';try{last=localStorage.getItem('tm_last')||''}catch(e){}
 if(last&&arr.indexOf(last)<0)arr.push(last);
 arr.forEach(function(d){if(/^\d{4}-\d{2}-\d{2}$/.test(d)&&!s.profiles.kedy.days[d])s.profiles.kedy.days[d]={base:10,phrase:0,fix:0,duo:0,count:1,mode:'legacy'}});
 s.migrated=true;
}
function saveState(target){
 var next=normalizeState(target||state);next.updatedAt=new Date().toISOString();var raw=JSON.stringify(next);
 try{var previous=localStorage.getItem(DATA_KEY);if(previous&&safeParse(previous))localStorage.setItem(BACKUP_KEY,previous);localStorage.setItem(DATA_KEY,raw);localStorage.setItem(LEGACY_KEYS[0],raw)}catch(e){}
 state=next;
}
function loadPending(){try{return JSON.parse(localStorage.getItem(PENDING_KEY)||'null')}catch(e){return null}}
function savePending(){try{pending?localStorage.setItem(PENDING_KEY,JSON.stringify(pending)):localStorage.removeItem(PENDING_KEY)}catch(e){}}
function pad(n){return String(n).padStart(2,'0')}
function dateKey(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function parseDate(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2])}
function dayRecord(id,d){return state.profiles[id].days[d]||{base:0,phrase:0,fix:0,duo:0,count:0,mode:''}}
function dayXp(id,d){return recordXp(dayRecord(id,d))}
function totalXp(id){return Object.keys(state.profiles[id].days).reduce(function(sum,d){return sum+dayXp(id,d)},0)}
function weekStart(d){var x=new Date(d.getFullYear(),d.getMonth(),d.getDate());var day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);return x}
function weekXp(id){var start=weekStart(new Date());var end=new Date(start);end.setDate(end.getDate()+7);return Object.keys(state.profiles[id].days).reduce(function(sum,k){var d=parseDate(k);return d>=start&&d<end?sum+dayXp(id,k):sum},0)}
function completed(id,d){return dayRecord(id,d).base>0}
function streak(id){var cur=new Date();if(!completed(id,today))cur.setDate(cur.getDate()-1);var n=0;while(completed(id,dateKey(cur))){n++;cur.setDate(cur.getDate()-1)}return n}
function bestStreak(id){var keys=Object.keys(state.profiles[id].days).filter(function(d){return completed(id,d)}).sort();var best=0,run=0,prev=null;keys.forEach(function(k){if(prev){run=Math.round((parseDate(k)-parseDate(prev))/86400000)===1?run+1:1}else run=1;best=Math.max(best,run);prev=k});return best}
function duoCompleted(d){return completed('kedy',d)&&completed('leni',d)}
function duoStreak(){var cur=new Date();if(!duoCompleted(today))cur.setDate(cur.getDate()-1);var n=0;while(duoCompleted(dateKey(cur))){n++;cur.setDate(cur.getDate()-1)}return n}
function duoDays(){var map={};Object.keys(state.profiles.kedy.days).forEach(function(d){if(duoCompleted(d))map[d]=1});return Object.keys(map).length}
function levelInfo(id){var xp=totalXp(id),level=Math.floor(xp/100)+1,inside=xp%100;return {xp:xp,level:level,inside:inside,next:100-inside}}
function sessionCount(id){return state.profiles[id].sessions.length}
function applyDuoBonus(d){if(!duoCompleted(d))return false;var changed=false;['kedy','leni'].forEach(function(id){var r=dayRecord(id,d);if(!r.duo){r.duo=5;state.profiles[id].days[d]=r;changed=true}});return changed}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]})}
function $(id){return document.getElementById(id)}
function toast(msg){var el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(function(){el.classList.remove('show')},2000)}
function copyText(text){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text);var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();return Promise.resolve()}

function render(){
 document.documentElement.lang=current==='leni'?'ja':'en';
 document.body.dataset.profile=current;
 document.querySelectorAll('.profile-btn').forEach(function(b){b.classList.toggle('active',b.dataset.profile===current)});
 var u=UI[current],k=levelInfo('kedy'),l=levelInfo('leni');$('mini-kedy').textContent='LV.'+k.level;$('mini-leni').textContent='LV.'+l.level;
 var kWeek=weekXp('kedy'),lWeek=weekXp('leni');$('battleKedy').textContent=kWeek;$('battleLeni').textContent=lWeek;$('battleTitle').textContent=u.battleTitle;$('dailyCap').textContent=u.dailyCap;
 var diff=kWeek-lWeek;if(diff===0)$('battleResult').textContent=u.tied;else if(current==='kedy')$('battleResult').textContent=diff>0?u.kedyLead+diff+' XP':u.leniLead+Math.abs(diff)+' XP';else $('battleResult').textContent=(diff>0?u.kedyLead+diff:u.leniLead+Math.abs(diff))+u.leadSuffix;
 $('duoStreakText').textContent=u.duoStreak;$('duoStreakUnit').textContent=u.duoStreakUnit;$('duoDaysText').textContent=u.duoDays;$('duoDaysUnit').textContent=u.duoDaysUnit;$('duoStreak').textContent=duoStreak();$('duoDays').textContent=duoDays();
 var p=PROFILES[current],li=levelInfo(current),rec=dayRecord(current,today);
 $('heroName').textContent=p.name+' '+p.flag;$('heroSub').textContent=p.sub;$('levelNum').textContent=li.level;$('streak').textContent=streak(current);$('best').textContent=bestStreak(current);$('sessions').textContent=sessionCount(current);
 $('streakLabel').textContent=u.streak;$('bestLabel').textContent=u.best;$('sessionsLabel').textContent=u.sessions;
 $('totalXp').textContent=li.xp+' XP';$('nextXp').textContent=u.next+li.next+' XP';
 $('levelRing').style.setProperty('--progress',li.inside+'%');$('levelBar').style.setProperty('--progress',li.inside+'%');$('levelRing').classList.toggle('leni',current==='leni');$('levelBar').classList.toggle('leni',current==='leni');
 $('todayCard').classList.toggle('leni',current==='leni');$('todayXp').textContent=dayXp(current,today);$('todayTitle').textContent=rec.base?u.todayDone:u.todayEmpty;$('todayDetail').textContent=rec.base?u.todayDoneDetail:u.todayEmptyDetail;
 $('weekTitle').textContent=u.weekTitle;$('dataTitle').textContent=u.dataTitle;$('storageLabel').textContent=u.storage;$('exportBtn').textContent=u.export;$('importBtn').textContent=u.import;$('resetPendingBtn').textContent=u.clear;$('storageNote').textContent=u.note;
 $('pendingHeading').textContent=u.pendingHeading;$('phraseLabel').textContent=u.phrase;$('fixLabel').textContent=u.fix;
 renderModes();renderPending();renderWeek();
}
function renderModes(){var box=$('modes');box.innerHTML='';MODES[current].forEach(function(m){var b=document.createElement('button');b.className='mode '+m.cls;b.innerHTML='<b>'+escapeHtml(m.title)+'</b><small>'+escapeHtml(m.sub)+'</small><span class="icon">'+m.icon+'</span>';b.addEventListener('click',function(){launch(m)});box.appendChild(b)});$('modeTitle').textContent=UI[current].modeTitle}
function renderPending(){var panel=$('pending'),u=UI[current];if(!pending){panel.classList.remove('show');return}panel.classList.add('show');var owner=PROFILES[pending.profile];$('pendingText').textContent=pending.profile===current?owner.name+' · '+pending.title+' · '+u.pendingBack:owner.name+' · '+u.switchTo;$('completeBtn').disabled=pending.profile!==current;$('completeBtn').textContent=pending.profile===current?u.complete:u.switchTo;$('phraseCheck').checked=false;$('fixCheck').checked=false}
function renderWeek(){var box=$('weekStrip');box.innerHTML='';var start=new Date();start.setDate(start.getDate()-6);var names=current==='kedy'?['S','M','T','W','T','F','S']:['日','月','火','水','木','金','土'];var count=0;for(var i=0;i<7;i++){var d=new Date(start);d.setDate(start.getDate()+i);var key=dateKey(d),done=completed(current,key);if(done)count++;var el=document.createElement('div');el.className='day-dot'+(current==='leni'?' leni':'')+(done?' done':'');el.innerHTML='<span>'+(done?'✓':d.getDate())+'</span><em>'+names[d.getDay()]+'</em>';box.appendChild(el)}$('weekSessions').textContent=count+' / 7 '+(current==='kedy'?'days':'日')}

function buildPrompt(profile,mode){
 if(profile==='kedy'){
  var leads={
   commute:'Run one continuous commute speaking session. Do not split it into going and returning. Mix plans, what is happening now, reactions, questions, and short practical exchanges.',
   toeic:'Run a voice-friendly TOEIC session. Focus on common listening replies, Part 2 and Part 3 style exchanges, and useful vocabulary. Keep every practice item short.',
   bath:'Run short automatic shadowing. Give one natural sentence, wait for my repetition, correct only if needed, then continue automatically.',
   free:'Start a natural practical conversation and vary the topic after a few exchanges.'
  };
  return "You are kedy's English coach in Flowz Duo Battle. He is a Japanese beginner using voice mode. "+leads[mode.id]+" Rules: Use short natural spoken English, usually 4 to 8 words and never more than 10 unless necessary. Give one sentence or one question at a time. When he repeats correctly, automatically continue without praise. Correct only important mistakes by showing the corrected English sentence. Repeat the same correction no more than three times. Mix daily conversation, reactions, questions, short two-person exchanges and practical replies. Do not turn the session into an interview. Use themes from commuting, work, music, travel, health and daily life. Avoid phrases that are too easy; choose useful phrases slightly above his current level. When a phrase seems unfamiliar, first explain it with simpler English, then give a very short Japanese meaning. Increase difficulty step by step. Do not ask to stop, finish or wrap up. Continue until he says he arrived, 'まとめて', or 'Wrap up'. When he says 'まとめて' or 'Wrap up', give: today's XP challenge result, top three corrections, three useful phrases, and a short Japanese diary note.";
 }
 var focus={free:'会話を自然に続けるフリー練習',work:'介護現場の報告・敬語・体調説明',n2:'JLPT N2の語彙・文法・短い読解',kanji:'漢字の読み方と、漢字を使った短い実用文'}[mode.id];
 return "Kamu adalah guru bahasa Jepang pribadi Leni dalam Flowz Duo Battle. Targetnya lulus JLPT N2 pada Juli 2027 dan memakai bahasa Jepang secara alami dalam kehidupan, pekerjaan kaigo, rumah sakit, dan sekolah keperawatan. Fokus sesi ini: "+focus+". Gunakan voice mode. Anggap Leni pelajar tingkat menengah yang sudah bisa percakapan sehari-hari. Aturan wajib: 1) Tunggu sampai Leni selesai berbicara dan ada jeda yang jelas. Jangan menyela, menebak arti dari potongan kalimat, atau membuat cerita yang tidak ia katakan. Jika suara bertumpuk, katakan hanya '最後まで聞くね。どうぞ。' lalu tunggu. 2) Berikan hanya satu kalimat atau satu pertanyaan pendek setiap kali. 3) Untuk setiap kalimat latihan yang mengandung kanji, tampilkan kalimat Jepang normal pada baris pertama dan bacaan hiragana lengkap pada baris kedua. Bacaan hiragana hanya bantuan visual; jangan membacanya keras-keras sebagai kalimat kedua. Jangan gunakan romaji. 4) Bahasa Jepang harus alami dan sering dipakai. 5) Setelah Leni mengulang dengan benar, langsung lanjut otomatis tanpa pujian panjang. 6) Perbaiki maksimal dua kesalahan penting dengan urutan prioritas: bentuk kata kerja, partikel, lalu keigo atau kealamian. Tampilkan kalimat Jepang yang benar lalu jelaskan singkat dalam bahasa Indonesia. 7) Ulangi kalimat yang sama maksimal tiga kali; jika masih sulit, pecah menjadi lebih pendek atau ganti dengan kalimat alami lain. 8) Campurkan percakapan, respons, pertanyaan, keigo, kosakata kerja, N2, dan kanji sesuai mode. Jangan hanya bertanya terus-menerus. 9) Jangan menebak perasaan atau kondisi tubuh. Jika makna ambigu, tunggu sampai selesai lalu konfirmasi sekali dengan 'つまり、〜ということ？'. 10) Jangan mengakhiri sesi sendiri. Saat Leni berkata 'まとめて' atau 'selesai', berikan hasil tantangan XP hari ini, tiga koreksi utama, kosakata baru, kanji yang dipelajari beserta hiragana, dan materi sesi berikutnya.";
}
function launch(mode){pending={profile:current,mode:mode.id,title:mode.title,startedAt:new Date().toISOString()};savePending();renderPending();var prompt=buildPrompt(current,mode);copyText(prompt).then(function(){toast(current==='kedy'?'Prompt copied ✓':'プロンプトをコピーした ✓');setTimeout(function(){location.href='https://chatgpt.com/?q='+encodeURIComponent(prompt)},450)}).catch(function(){location.href='https://chatgpt.com/?q='+encodeURIComponent(prompt)})}
function completeSession(){if(!pending||pending.profile!==current)return;var r=dayRecord(current,today),gain=0;if(!r.base){r.base=10;gain+=10}if($('phraseCheck').checked&&!r.phrase){r.phrase=3;gain+=3}if($('fixCheck').checked&&!r.fix){r.fix=2;gain+=2}r.count=(r.count||0)+1;r.mode=pending.mode;state.profiles[current].days[today]=r;state.profiles[current].sessions.push({date:today,mode:pending.mode,title:pending.title,xp:gain,at:new Date().toISOString()});var duo=applyDuoBonus(today);pending=null;savePending();saveState();render();toast('+'+gain+' XP'+(duo?' · DUO BONUS +5':'')+' ✓')}

document.querySelectorAll('.profile-btn').forEach(function(b){b.addEventListener('click',function(){current=b.dataset.profile;try{history.replaceState(null,'',location.pathname+'?profile='+current)}catch(e){}render()})});
$('completeBtn').addEventListener('click',completeSession);
$('resetPendingBtn').addEventListener('click',function(){pending=null;savePending();renderPending();toast(current==='kedy'?'Pending cleared':'保留を消した')});
$('exportBtn').addEventListener('click',function(){copyText(JSON.stringify(state)).then(function(){toast(current==='kedy'?'Record copied ✓':'記録をコピーした ✓')})});
$('importBtn').addEventListener('click',function(){var raw=prompt(current==='kedy'?'Paste your Flowz record data:':'Flowzの記録データを貼り付け：');if(!raw)return;try{var parsed=JSON.parse(raw);if(!parsed||!parsed.profiles||!parsed.profiles.kedy||!parsed.profiles.leni)throw new Error('invalid');saveState(normalizeState(parsed));render();toast(current==='kedy'?'Record restored ✓':'記録を復元した ✓')}catch(e){toast(current==='kedy'?'Invalid data':'データ形式が違う')}});
window.addEventListener('storage',function(e){if(e.key===DATA_KEY){state=loadState();render()}});
render();
})();

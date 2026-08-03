(function(){
'use strict';
var KEY='flowz_duo_v3';
var PENDING_KEY='flowz_duo_pending';
var current='kedy';
var today=dateKey(new Date());
var state=loadState();
var pending=loadPending();

var PROFILES={
 kedy:{name:'kedy',flag:'🇺🇸',language:'ENGLISH',sub:'英語を実戦で使う',explain:'日本語',accent:'amber'},
 leni:{name:'Leni',flag:'🇯🇵',language:'JAPANESE',sub:'N2と生活日本語を伸ばす',explain:'インドネシア語',accent:'cyan'}
};
var MODES={
 kedy:[
  {id:'go',title:'通勤',sub:'短文・相槌 15min',icon:'🚲',cls:'m1'},
  {id:'home',title:'帰り',sub:'今日を振り返る 15min',icon:'🌆',cls:'m2'},
  {id:'bath',title:'風呂',sub:'自動シャドー 5min',icon:'🛀',cls:'m3'},
  {id:'free',title:'フリー',sub:'実用会話 10min',icon:'🎲',cls:'m4'}
 ],
 leni:[
  {id:'daily',title:'日常会話',sub:'生活で使う 10min',icon:'💬',cls:'m1'},
  {id:'care',title:'介護・敬語',sub:'仕事会話 10min',icon:'🤝',cls:'m2'},
  {id:'n2',title:'N2短文',sub:'語彙・文法 10min',icon:'📚',cls:'m3'},
  {id:'shadow',title:'シャドー',sub:'短文連射 5min',icon:'🎧',cls:'m4'}
 ]
};

function blankProfile(){return {days:{},sessions:[]}}
function defaultState(){return {version:3,profiles:{kedy:blankProfile(),leni:blankProfile()},migrated:false}}
function loadState(){
 var s=defaultState(),raw;
 try{raw=localStorage.getItem(KEY);if(raw)s=Object.assign(s,JSON.parse(raw)||{})}catch(e){}
 if(!s.profiles)s.profiles={};
 if(!s.profiles.kedy)s.profiles.kedy=blankProfile();
 if(!s.profiles.leni)s.profiles.leni=blankProfile();
 ['kedy','leni'].forEach(function(id){if(!s.profiles[id].days)s.profiles[id].days={};if(!s.profiles[id].sessions)s.profiles[id].sessions=[]});
 if(!s.migrated)migrateOld(s);
 return s;
}
function migrateOld(s){
 var arr=[];
 try{arr=JSON.parse(localStorage.getItem('tm_days')||'[]')||[]}catch(e){}
 var last='';try{last=localStorage.getItem('tm_last')||''}catch(e){}
 if(last&&arr.indexOf(last)<0)arr.push(last);
 arr.forEach(function(d){if(/^\d{4}-\d{2}-\d{2}$/.test(d)&&!s.profiles.kedy.days[d])s.profiles.kedy.days[d]={base:10,phrase:0,fix:0,duo:0,count:1,mode:'legacy'}});
 s.migrated=true;saveState(s);
}
function saveState(target){try{localStorage.setItem(KEY,JSON.stringify(target||state))}catch(e){}}
function loadPending(){try{return JSON.parse(localStorage.getItem(PENDING_KEY)||'null')}catch(e){return null}}
function savePending(){try{pending?localStorage.setItem(PENDING_KEY,JSON.stringify(pending)):localStorage.removeItem(PENDING_KEY)}catch(e){}}
function pad(n){return String(n).padStart(2,'0')}
function dateKey(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function parseDate(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2])}
function dayRecord(id,d){return state.profiles[id].days[d]||{base:0,phrase:0,fix:0,duo:0,count:0,mode:''}}
function dayXp(id,d){var r=dayRecord(id,d);return (r.base||0)+(r.phrase||0)+(r.fix||0)+(r.duo||0)}
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
function escapeHtml(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]})}
function $(id){return document.getElementById(id)}
function toast(msg){var el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(function(){el.classList.remove('show')},2000)}
function copyText(text){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text);var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();return Promise.resolve()}

function render(){
 document.querySelectorAll('.profile-btn').forEach(function(b){b.classList.toggle('active',b.dataset.profile===current)});
 var k=levelInfo('kedy'),l=levelInfo('leni');$('mini-kedy').textContent='LV.'+k.level;$('mini-leni').textContent='LV.'+l.level;
 $('battleKedy').textContent=weekXp('kedy');$('battleLeni').textContent=weekXp('leni');
 var diff=weekXp('kedy')-weekXp('leni');$('battleResult').textContent=diff===0?'今週は同点':diff>0?'kedyが '+diff+' XPリード':'Leniが '+Math.abs(diff)+' XPリード';
 $('duoStreak').textContent=duoStreak();$('duoDays').textContent=duoDays();
 var p=PROFILES[current],li=levelInfo(current),rec=dayRecord(current,today);
 $('heroName').textContent=p.name+' '+p.flag;$('heroSub').textContent=p.sub;$('levelNum').textContent=li.level;$('streak').textContent=streak(current);$('best').textContent=bestStreak(current);$('sessions').textContent=sessionCount(current);
 $('totalXp').textContent=li.xp+' XP';$('nextXp').textContent='次まで '+li.next+' XP';
 $('levelRing').style.setProperty('--progress',li.inside+'%');$('levelBar').style.setProperty('--progress',li.inside+'%');$('levelRing').classList.toggle('leni',current==='leni');$('levelBar').classList.toggle('leni',current==='leni');
 $('todayCard').classList.toggle('leni',current==='leni');$('todayXp').textContent=dayXp(current,today);$('todayTitle').textContent=rec.base?'今日のセッション済み ✓':'今日はまだ';$('todayDetail').textContent=rec.base?'基本10 XP獲得済み／追加は1日1回':'1セッションで10 XP';
 renderModes();renderPending();renderWeek();
}
function renderModes(){var box=$('modes');box.innerHTML='';MODES[current].forEach(function(m){var b=document.createElement('button');b.className='mode '+m.cls;b.innerHTML='<b>'+escapeHtml(m.title)+'</b><small>'+escapeHtml(m.sub)+'</small><span class="icon">'+m.icon+'</span>';b.addEventListener('click',function(){launch(m)});box.appendChild(b)});$('modeTitle').textContent=current==='kedy'?'🎙️ ENGLISH SESSION':'🎙️ JAPANESE SESSION'}
function renderPending(){var panel=$('pending');if(!pending){panel.classList.remove('show');return}panel.classList.add('show');var owner=PROFILES[pending.profile];$('pendingText').textContent=owner.name+'｜'+pending.title+'。ChatGPTから戻ったら結果を選んで完了。';$('completeBtn').disabled=pending.profile!==current;$('completeBtn').textContent=pending.profile===current?'セッション完了 +10 XP':owner.name+'へ切替して完了';$('phraseCheck').checked=false;$('fixCheck').checked=false}
function renderWeek(){var box=$('weekStrip');box.innerHTML='';var start=new Date();start.setDate(start.getDate()-6);var names=['日','月','火','水','木','金','土'];var count=0;for(var i=0;i<7;i++){var d=new Date(start);d.setDate(start.getDate()+i);var key=dateKey(d),done=completed(current,key);if(done)count++;var el=document.createElement('div');el.className='day-dot'+(current==='leni'?' leni':'')+(done?' done':'');el.innerHTML='<span>'+(done?'✓':d.getDate())+'</span><em>'+names[d.getDay()]+'</em>';box.appendChild(el)}$('weekSessions').textContent=count+' / 7 days'}

function buildPrompt(profile,mode){
 if(profile==='kedy'){
  var leads={go:'Start with my plan for today.',home:'Start with how my day went.',bath:'Run short automatic shadowing.',free:'Start a natural practical conversation.'};
  return "You are kedy's English coach in Flowz Duo Battle. He is a Japanese beginner and is using voice mode. "+leads[mode.id]+" Rules: Use short natural spoken English, usually 4 to 8 words and never more than 10 unless necessary. Give one sentence or one question at a time. When he repeats a sentence correctly, automatically continue to the next sentence without praise. Correct only important mistakes, using only the corrected English sentence. Repeat the same correction no more than three times. Mix daily conversation, reactions, questions, short two-person exchanges and practical replies. Do not turn the session into an interview. Use themes from commuting, work, music, travel, health and daily life. Avoid phrases that are too easy; choose useful phrases slightly above his current level. When a phrase seems unfamiliar, first explain it with simpler English, then give a very short Japanese meaning. Increase difficulty step by step by teaching related phrases from easy to harder. Do not ask to stop, finish or wrap up during commute or return-home sessions. Keep the practice moving automatically until he says he arrived at work, arrived home, 'まとめて', or 'Wrap up'. When he says 'まとめて' or 'Wrap up', give: today's XP challenge result, top three corrections, three useful phrases, and a short Japanese diary note.";
 }
 var focus={daily:'日常生活と日本人との自然な会話',care:'介護現場の報告・敬語・体調説明',n2:'JLPT N2の短い語彙・文法・読解',shadow:'短い日本語の自動シャドーイング'}[mode.id];
 return "Kamu adalah guru bahasa Jepang pribadi Leni dalam Flowz Duo Battle. Targetnya lulus JLPT N2 pada Juli 2027 dan bisa memakai bahasa Jepang dalam kehidupan, pekerjaan kaigo, rumah sakit, dan sekolah keperawatan. Fokus sesi ini: "+focus+". Gunakan voice mode. Aturan: 1) Berikan hanya satu kalimat atau satu pertanyaan pendek setiap kali. 2) Bahasa Jepang harus alami dan sering dipakai. 3) Setelah Leni mengulang dengan benar, langsung lanjut otomatis tanpa pujian panjang. 4) Perbaiki maksimal dua kesalahan penting; tampilkan kalimat Jepang yang benar lalu jelaskan singkat dalam bahasa Indonesia. 5) Jangan gunakan romaji. Furigana hanya untuk kanji sulit. 6) Ulangi kalimat yang sama maksimal tiga kali. 7) Campurkan percakapan, respons, pertanyaan, keigo, kosakata kerja, dan materi N2. 8) Jangan hanya bertanya terus-menerus. 9) Saat Leni berkata 'まとめて' atau 'selesai', berikan hasil tantangan XP hari ini, tiga koreksi utama, kosakata baru, dan materi sesi berikutnya.";
}
function launch(mode){pending={profile:current,mode:mode.id,title:mode.title,startedAt:new Date().toISOString()};savePending();renderPending();var prompt=buildPrompt(current,mode);copyText(prompt).then(function(){toast('プロンプトをコピーした ✓');setTimeout(function(){location.href='https://chatgpt.com/?q='+encodeURIComponent(prompt)},450)}).catch(function(){location.href='https://chatgpt.com/?q='+encodeURIComponent(prompt)})}
function completeSession(){if(!pending||pending.profile!==current)return;var r=dayRecord(current,today),gain=0;if(!r.base){r.base=10;gain+=10}if($('phraseCheck').checked&&!r.phrase){r.phrase=3;gain+=3}if($('fixCheck').checked&&!r.fix){r.fix=2;gain+=2}r.count=(r.count||0)+1;r.mode=pending.mode;state.profiles[current].days[today]=r;state.profiles[current].sessions.push({date:today,mode:pending.mode,title:pending.title,xp:gain,at:new Date().toISOString()});var duo=applyDuoBonus(today);pending=null;savePending();saveState();render();toast('+'+gain+' XP'+(duo?'／DUO BONUS +5':'')+' ✓')}

document.querySelectorAll('.profile-btn').forEach(function(b){b.addEventListener('click',function(){current=b.dataset.profile;render()})});
$('completeBtn').addEventListener('click',completeSession);
$('resetPendingBtn').addEventListener('click',function(){pending=null;savePending();renderPending();toast('保留を消した')});
$('exportBtn').addEventListener('click',function(){copyText(JSON.stringify(state)).then(function(){toast('記録をコピーした ✓')})});
$('importBtn').addEventListener('click',function(){var raw=prompt('Flowz v3の記録データを貼り付け：');if(!raw)return;try{var next=JSON.parse(raw);if(!next||!next.profiles||!next.profiles.kedy||!next.profiles.leni)throw new Error('invalid');state=next;saveState();render();toast('記録を復元した ✓')}catch(e){toast('データ形式が違う') }});
render();
})();
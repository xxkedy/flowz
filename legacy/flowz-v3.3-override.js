(function(){
'use strict';
var DATA_KEY='flowz_duo_data';
var BACKUP_KEY='flowz_duo_data_backup';
var PENDING_KEY='flowz_duo_pending';
var MIN_SESSION_MS=120000;

function parse(raw){try{return raw?JSON.parse(raw):null}catch(e){return null}}
function dateKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function savePending(p){try{p?localStorage.setItem(PENDING_KEY,JSON.stringify(p)):localStorage.removeItem(PENDING_KEY)}catch(e){}}
function saveState(s){
 try{
  var old=localStorage.getItem(DATA_KEY);
  if(old&&parse(old))localStorage.setItem(BACKUP_KEY,old);
  s.updatedAt=new Date().toISOString();
  localStorage.setItem(DATA_KEY,JSON.stringify(s));
  localStorage.setItem('flowz_duo_v3',JSON.stringify(s));
 }catch(e){}
}
function currentProfile(){try{return new URLSearchParams(location.search).get('profile')==='leni'?'leni':'kedy'}catch(e){return 'kedy'}}
function xpOf(r){return (r&&r.base||0)+(r&&r.phrase||0)+(r&&r.fix||0)+(r&&r.duo||0)}
function totalXp(profile){
 var state=parse(localStorage.getItem(DATA_KEY))||{};
 var days=state.profiles&&state.profiles[profile]&&state.profiles[profile].days||{};
 return Object.keys(days).reduce(function(sum,key){return sum+xpOf(days[key])},0);
}
function sessionCount(profile){
 var state=parse(localStorage.getItem(DATA_KEY))||{};
 return state.profiles&&state.profiles[profile]&&Array.isArray(state.profiles[profile].sessions)?state.profiles[profile].sessions.length:0;
}
function assessment(){
 var n=sessionCount('kedy'),xp=totalXp('kedy');
 var toeic=Math.min(420,220+n*6+Math.floor(xp/50)*5);
 var range=Math.floor(toeic/10)*10+'–'+(Math.floor(toeic/10)*10+40);
 var age=toeic<260?'小学高学年':toeic<330?'中学1年前後':'中学2年前後';
 return {toeic:range,age:age,cefr:toeic<300?'A1':'A1→A2'};
}
function addAssessment(){
 if(document.getElementById('flowzAssessment')||currentProfile()!=='kedy')return;
 var hero=document.getElementById('heroPanel');if(!hero)return;
 var a=assessment(),panel=document.createElement('section');
 panel.id='flowzAssessment';panel.className='panel';
 panel.innerHTML='<div class="section-head"><div class="section-title">📊 CURRENT ENGLISH</div><span class="chip">ESTIMATE</span></div><div class="stats flowz-assessment"><div class="stat"><b>'+a.cefr+'</b><span>CEFR</span></div><div class="stat"><b>'+a.toeic+'</b><span>TOEIC</span></div><div class="stat"><b>'+a.age+'</b><span>英語運用目安</span></div></div><p class="note">会話回数とXPだけの暫定値。テスト結果ではない。</p>';
 hero.parentNode.insertBefore(panel,hero.nextSibling);
}
function hideManualResult(){
 var checks=document.querySelector('#pending .checks');if(checks)checks.style.display='none';
 var button=document.getElementById('completeBtn');if(button)button.style.display='none';
 var text=document.getElementById('pendingText');
 if(text&&parse(localStorage.getItem(PENDING_KEY)))text.textContent=currentProfile()==='kedy'?'Return after speaking. The session records automatically.':'会話後に戻ると自動で記録されます。';
}
function buildKedyPrompt(p){
 var m=p.mission||{};
 return [
  "You are kedy's English coach in Flowz Duo Battle. He is a Japanese beginner using voice mode.",
  "Run one continuous commute conversation. Morning and evening are one mode, so do not choose the opening from clock time.",
  "Start with one natural check-in about his actual commute, energy, work, surroundings, or what is on his mind. Listen and chat for at least four meaningful exchanges before any shadowing.",
  "Today's hidden mission is: Theme: "+m.theme+". Target phrase: \""+m.phrase+"\". Meaning: "+m.meaning+".",
  "Treat the mission as a hidden objective, not the opening topic. Bring it in only when the conversation naturally connects.",
  "When the target phrase becomes useful, ask what real situation he wants to use it for. Let him create the content first, such as work priorities, weekend plans, dinner, music, or travel. Then give the natural English version.",
  "Conversation should be about 80 percent and shadowing about 20 percent. Never give more than one short shadowing chain within five conversational exchanges unless he asks for practice.",
  "If he says he wants conversation, immediately stop repetition drills and continue chatting.",
  "Use short natural spoken English, usually 4 to 8 words and never more than 10 unless necessary. Give one sentence or one question at a time.",
  "Correct only meaning-changing or strongly unnatural mistakes. Show only the corrected English sentence, allow one retry, then continue the related conversation. Do not loop the same sentence.",
  "Mix reactions, useful follow-up comments, small questions, practical replies, and occasional shadowing. Do not turn it into an interview.",
  "When a phrase is unfamiliar, explain it with simpler English, then one very short Japanese meaning.",
  "Do not end or summarize unless he says 'まとめて' or 'Wrap up'. Arriving at work or home is only a topic change.",
  "At wrap-up, give: XP challenge result, top three corrections, three useful phrases, and a Japanese diary note with 2–3 English diary sentences, one Phrase line, and up to three Fix lines."
 ].join(' ');
}
function buildLeniPrompt(p){
 var m=p.mission||{};
 return "Kamu adalah guru bahasa Jepang pribadi Leni dalam Flowz Duo Battle. Mulai dengan percakapan alami tentang keadaan sekarang. Jangan langsung memaksa tema misi. Setelah beberapa percakapan, bantu memakai ungkapan target secara alami. Tema: "+m.theme+". Ungkapan: "+m.phrase+". Bacaan: "+(m.reading||'')+". Arti: "+(m.meaning||'')+". Berikan satu kalimat atau pertanyaan pendek setiap kali, tunggu sampai Leni selesai, koreksi maksimal dua kesalahan penting, dan jangan mengakhiri sampai ia berkata 'まとめて' atau 'selesai'.";
}
function interceptStart(){
 var btn=document.getElementById('startBtn');if(!btn)return;
 btn.addEventListener('click',function(e){
  var p=parse(localStorage.getItem(PENDING_KEY));if(!p||p.startedAt)return;
  e.preventDefault();e.stopImmediatePropagation();
  p.startedAt=new Date().toISOString();p.autoRecord=true;savePending(p);
  var prompt=currentProfile()==='kedy'?buildKedyPrompt(p):buildLeniPrompt(p);
  try{navigator.clipboard.writeText(prompt)}catch(err){}
  location.href='https://chatgpt.com/?q='+encodeURIComponent(prompt);
 },true);
}
function autoComplete(){
 var p=parse(localStorage.getItem(PENDING_KEY));if(!p||!p.startedAt||!p.autoRecord)return false;
 var elapsed=Date.now()-new Date(p.startedAt).getTime();if(!isFinite(elapsed)||elapsed<MIN_SESSION_MS)return false;
 var state=parse(localStorage.getItem(DATA_KEY));if(!state||!state.profiles||!state.profiles[p.profile])return false;
 var key=dateKey(new Date()),profile=state.profiles[p.profile],r=profile.days&&profile.days[key]||{base:0,phrase:0,fix:0,duo:0,count:0};
 if(!profile.days)profile.days={};if(!Array.isArray(profile.sessions))profile.sessions=[];
 if(!r.base)r.base=10;r.count=(r.count||0)+1;r.mode=p.mode;profile.days[key]=r;
 profile.sessions.push({date:key,mode:p.mode,title:p.title,theme:p.mission&&p.mission.theme||'',phrase:p.mission&&p.mission.phrase||'',xp:10,at:new Date().toISOString(),auto:true});
 saveState(state);savePending(null);return true;
}
function refresh(){
 var completed=autoComplete();
 if(completed){location.reload();return}
 hideManualResult();addAssessment();
 var version=document.querySelector('.version');if(version)version.textContent='v3.3';
}

document.addEventListener('DOMContentLoaded',function(){interceptStart();setTimeout(refresh,0)});
window.addEventListener('pageshow',function(){setTimeout(refresh,0)});
})();
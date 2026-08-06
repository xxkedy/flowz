(function(){
'use strict';
var VERSION='v4.3.6 (2026.8.6)';
var FOOTER='✅ Last updated 2026.08.06 · Flowz v4.3.6 Final UI Lock';
var PENDING_KEY='flowz_duo_pending';
var scheduled=false;

function parse(raw){try{return raw?JSON.parse(raw):null}catch(e){return null}}
function text(el,value){if(el&&el.textContent!==value)el.textContent=value}
function profile(){return document.body&&document.body.getAttribute('data-profile')==='leni'?'leni':'kedy'}
function savePending(value){try{localStorage.setItem(PENDING_KEY,JSON.stringify(value))}catch(e){}}
function modeButtons(modes){return Array.prototype.filter.call(modes.children,function(el){return el.classList&&el.classList.contains('mode')})}
function ensureLabel(modes,id,value){var el=document.getElementById(id);if(!el){el=document.createElement('div');el.id=id}el.textContent=value;return el}
function setMode(button,id,title,sub,icon){
  if(!button)return;
  if(id)button.id=id;
  text(button.querySelector('b'),title);
  text(button.querySelector('small'),sub);
  text(button.querySelector('.icon'),icon);
}
function addStyles(){
  if(document.getElementById('flowz436'))return;
  var style=document.createElement('style');
  style.id='flowz436';
  style.textContent='body[data-profile="kedy"] #modes{grid-template-columns:1fr 1fr}body[data-profile="kedy"] #modes .mode{display:block!important;min-height:84px}body[data-profile="kedy"] #modes .mode:first-child{display:none!important}body[data-profile="kedy"] #modes .mode b{line-height:1.05}body[data-profile="kedy"] #modes .mode small{max-width:76%;margin-top:7px;line-height:1.25}#flowzBathLabel,#flowzAnytimeLabel{grid-column:1/-1;margin:3px 2px -1px;color:#9aa1aa;font-size:10px;font-weight:900;letter-spacing:.12em}#flowzAnytimeLabel{margin-top:7px}#flowzReviewTile{grid-column:1/-1;min-height:70px;background:linear-gradient(145deg,#20c7cc,#16aeb8)!important;color:#012428!important}#flowzFreeTile{grid-column:1/-1;min-height:70px;background:linear-gradient(145deg,#30363d,#20252b)!important;border:1px solid #4b555f!important;color:#f7f3e9!important}#flowzReviewTile small,#flowzFreeTile small{max-width:88%!important}#flowzFreeTile>span:first-child{display:block}';
  document.head.appendChild(style);
}
function ensureFree(modes){
  var free=document.getElementById('flowzFreeTile');
  if(free&&free.parentNode===modes)return free;
  free=document.createElement('button');
  free.type='button';free.id='flowzFreeTile';free.className='mode m4';
  free.innerHTML='<span><b>FREE</b><small>Open conversation · 10min</small></span><span class="icon">🎲</span>';
  return free;
}
function applyModeGroups(){
  if(profile()!=='kedy')return;
  var modes=document.getElementById('modes');if(!modes)return;
  var buttons=modeButtons(modes);if(buttons.length<4)return;
  var commute=buttons[0],toeic=buttons[1],study=buttons[2];
  var review=document.getElementById('flowzReviewTile');
  if(!review||review.parentNode!==modes){review=buttons[3];review.id='flowzReviewTile'}
  var free=ensureFree(modes);
  setMode(toeic,'','TOEIC CHECK','Weekly estimate · 10min','🎯');
  setMode(study,'','TOEIC STUDY','Problems + audio · 15min','🛁📘');
  setMode(review,'flowzReviewTile','REVIEW','Recent phrases · 3–5min','🔁');
  setMode(free,'flowzFreeTile','FREE','Open conversation · 10min','🎲');
  var bath=ensureLabel(modes,'flowzBathLabel','🛁 BATH ROUTINE · mikan 30 → Flowz');
  var anytime=ensureLabel(modes,'flowzAnytimeLabel','🎲 ANYTIME · OPEN TALK');
  var desired=[commute,bath,toeic,study,review,anytime,free];
  var current=Array.prototype.slice.call(modes.children);
  var same=current.length===desired.length&&desired.every(function(node,index){return current[index]===node});
  if(!same)desired.forEach(function(node){modes.appendChild(node)});
}
function showMission(kind,scroll){
  var mission=document.getElementById('mission');if(!mission)return;
  mission.classList.add('show');mission.classList.remove('leni');
  if(kind==='review'){
    text(document.getElementById('missionMode'),'REVIEW');
    text(document.getElementById('missionTheme'),'Recent phrase review');
    text(document.getElementById('missionPhrase'),'Use your recent English again.');
    text(document.getElementById('missionMeaning'),'直近の訂正フレーズを3つ復習');
    text(document.getElementById('missionGuide'),'3–5 minutes. One Japanese situation at a time.');
    text(document.getElementById('startBtn'),'START REVIEW');
  }else{
    text(document.getElementById('missionMode'),'FREE');
    text(document.getElementById('missionTheme'),'Open conversation');
    text(document.getElementById('missionPhrase'),'It depends on the situation.');
    text(document.getElementById('missionMeaning'),'状況による');
    text(document.getElementById('missionGuide'),'No fixed lesson. Talk about whatever is on your mind.');
    text(document.getElementById('startBtn'),'START FREE TALK');
  }
  if(scroll)mission.scrollIntoView({behavior:'smooth',block:'center'});
}
function choose(kind){
  var value=kind==='review'
    ?{profile:'kedy',mode:'review',flowzCustomMode:'review',title:'REVIEW',mission:{theme:'Recent phrase review',phrase:"It's cooler than usual.",meaning:'直近フレーズを復習'}}
    :{profile:'kedy',mode:'free',flowzCustomMode:'free',title:'FREE',mission:{theme:'Open conversation',phrase:'It depends on the situation.',meaning:'状況による',guide:'Talk naturally about whatever is on your mind.'}};
  savePending(value);showMission(kind,true);
}
function restoreMission(){
  var pending=parse(localStorage.getItem(PENDING_KEY));if(!pending||pending.profile!=='kedy')return;
  if(pending.flowzCustomMode==='review'||pending.mode==='review')showMission('review',false);
  else if(pending.flowzCustomMode==='free')showMission('free',false);
}
function buildReviewPrompt(pending){
  var mission=pending.mission||{};
  return [
    "You are kedy's English review coach in Flowz.",
    "This is a short 3–5 minute bath review, not a free conversation.",
    "First respond naturally if kedy greets you. Then use connected Notion tools to read recent Diary English Logs and collect the latest three corrected or useful phrases.",
    "Give one short Japanese situation at a time and ask kedy to say it naturally in English. Correct only meaning-changing or strongly unnatural mistakes. Allow one retry, then move on.",
    "Do three review items total. Do not introduce new grammar unless needed to explain a correction.",
    "At the end, show three reviewed phrases, which ones were correct without help, one phrase to reuse tomorrow, and a short Review Log.",
    "Append the Review Log to today's existing Notion Diary page and fetch it again to verify. Do not create a new Diary page. If Notion is unavailable, output copy-ready text.",
    "Do not update GitHub for ordinary review sessions.",
    "Fallback phrase if recent logs are unavailable: "+(mission.phrase||"It's cooler than usual.")
  ].join(' ');
}
function startReview(event){
  if(profile()!=='kedy'||!event.target.closest||!event.target.closest('#startBtn'))return false;
  var pending=parse(localStorage.getItem(PENDING_KEY));
  if(!pending||pending.startedAt||(pending.mode!=='review'&&pending.flowzCustomMode!=='review'))return false;
  event.preventDefault();event.stopImmediatePropagation();
  pending.startedAt=new Date().toISOString();pending.autoRecord=true;savePending(pending);
  var prompt=buildReviewPrompt(pending);
  try{navigator.clipboard.writeText(prompt)}catch(e){}
  location.href='https://chatgpt.com/?q='+encodeURIComponent(prompt);
  return true;
}
function applyVersion(){
  text(document.querySelector('.version'),VERSION);
  if(document.title!=='Flowz v4.3.6 · Duo Battle')document.title='Flowz v4.3.6 · Duo Battle';
  document.querySelectorAll('body>.note').forEach(function(note){if(/Last updated/i.test(note.textContent||''))text(note,FOOTER)});
}
function apply(){scheduled=false;addStyles();applyModeGroups();restoreMission();applyVersion()}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(apply,0)}

window.addEventListener('click',function(event){startReview(event)},true);
document.addEventListener('click',function(event){
  if(profile()!=='kedy'||!event.target.closest)return;
  if(event.target.closest('#flowzReviewTile')){event.preventDefault();event.stopImmediatePropagation();choose('review')}
  else if(event.target.closest('#flowzFreeTile')){event.preventDefault();event.stopImmediatePropagation();choose('free')}
},true);

apply();
document.addEventListener('DOMContentLoaded',function(){apply();setTimeout(apply,120);setTimeout(apply,900);setTimeout(apply,2200);if(document.body)new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-profile','class']})});
window.addEventListener('pageshow',function(){setTimeout(apply,50);setTimeout(apply,600)});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(apply,50)});
setInterval(function(){if(document.visibilityState==='visible')apply()},3000);
})();

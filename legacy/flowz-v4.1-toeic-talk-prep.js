(function(){
'use strict';

var VERSION='v4.1 (2026.8.6)';
var DATA_KEY='flowz_duo_data';
var PENDING_KEY='flowz_duo_pending';
var COMMUTE_MISSIONS=[
  {theme:'Dinner plans after work',phrase:"I haven't decided yet.",meaning:'まだ決めてない'},
  {theme:'Weather on the way home',phrase:"It's cooler than usual.",meaning:'いつもより涼しい'},
  {theme:'Getting home soon',phrase:"I'll be home in five minutes.",meaning:'あと5分で家に着く'},
  {theme:'Finishing the workday',phrase:'I just finished work.',meaning:'仕事が終わったばかり'},
  {theme:'Choosing where to eat',phrase:"I'm not sure yet.",meaning:'まだ分からない／未定'},
  {theme:'Traffic and road conditions',phrase:'Traffic is lighter than usual.',meaning:'いつもより交通量が少ない'}
];
var scheduled=false;

function parse(raw){try{return raw?JSON.parse(raw):null}catch(e){return null}}
function pad(n){return String(n).padStart(2,'0')}
function dateKey(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function missionSeed(profile,modeId,key){var text=profile+'|'+modeId+'|'+key,sum=0;for(var i=0;i<text.length;i++)sum=(sum*31+text.charCodeAt(i))>>>0;return sum}
function todayMission(){return COMMUTE_MISSIONS[missionSeed('kedy','commute',dateKey(new Date()))%COMMUTE_MISSIONS.length]}
function currentProfile(){return document.body&&document.body.dataset.profile==='leni'?'leni':'kedy'}
function savePending(value){try{localStorage.setItem(PENDING_KEY,JSON.stringify(value))}catch(e){}}
function loadState(){return parse(localStorage.getItem(DATA_KEY))||{}}
function setText(element,value){if(element&&element.textContent!==value)element.textContent=value}
function setDisplay(element,value){if(element&&element.style.display!==value)element.style.display=value}
function previousPhrase(){
  var state=loadState(),sessions=state.profiles&&state.profiles.kedy&&state.profiles.kedy.sessions||[];
  for(var i=sessions.length-1;i>=0;i--){
    var phrase=sessions[i]&&sessions[i].phrase;
    if(phrase&&phrase!==todayMission().phrase)return phrase;
  }
  return 'I feel good.';
}
function safe(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]})}

function buildToeicPrompt(pending){
  var mission=pending.mission||{};
  return [
    "You are kedy's TOEIC coach in Flowz Duo Battle. He is a Japanese beginner using voice mode.",
    "If kedy starts with a greeting or casual check-in, respond naturally for one short exchange first. Then ask, 'Ready for question one?' Do not suddenly begin the test before he answers.",
    "Run a 10-minute original TOEIC Listening & Reading mini-check with 12 scored questions: 6 listening-style questions and 6 reading-style questions. Use original questions inspired by TOEIC task types; never copy official test questions.",
    "Listening: include three short response questions and three short conversation or announcement questions. Speak each item once at natural speed. Do not repeat or explain it before the answer. Let him answer A, B, C, or D aloud.",
    "Reading: show four sentence-completion questions and two short passage questions as visible text with choices. Let him answer aloud. Give one question at a time.",
    "Do not correct, praise, reveal correctness, or teach during the 12 scored questions. Quietly record each answer and continue.",
    "After question 12, give: Listening score out of 6, Reading score out of 6, total out of 12, the questions he missed with very short explanations, and a broad estimated TOEIC L&R score band. Never claim an official or exact TOEIC score from one mini-check. Use a broad band of about 150 points and label confidence LOW. If connected Notion contains at least three recent TOEIC Check results, combine the latest three and you may narrow the estimate to about a 100-point band with MEDIUM confidence.",
    "Keep TOEIC scoring separate from conversation CEFR and separate from Flowz XP. XP is only for consistency and game progress.",
    "Today's useful phrase is: \""+(mission.phrase||'Could you send it again?')+"\". Meaning: "+(mission.meaning||'もう一度送ってもらえますか')+". After scoring, use it in one short practical example, but do not include it as a scored question unless it fits naturally.",
    "At the end, say the result once in this exact compact format so kedy can enter it in Flowz: FLOWZ TOEIC RESULT: Lx/6 Ry/6. Then give the normal explanation.",
    "At the end, use connected Notion tools to find today's existing Diary page by date. Append a TOEIC Check log with date, Listening /6, Reading /6, Total /12, estimated band, confidence, and up to three weak areas. Do not create a new Diary page. Fetch the page again to verify the update. If Notion is unavailable, clearly say it was not recorded and output copy-ready text.",
    "Do not update GitHub for an ordinary TOEIC learning session."
  ].join(' ');
}

document.addEventListener('click',function(event){
  var start=event.target&&event.target.closest&&event.target.closest('#startBtn');
  if(!start)return;
  var pending=parse(localStorage.getItem(PENDING_KEY));
  if(!pending||pending.profile!=='kedy'||pending.mode!=='toeic'||pending.startedAt)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  pending.startedAt=new Date().toISOString();
  pending.autoRecord=true;
  savePending(pending);
  var prompt=buildToeicPrompt(pending);
  try{navigator.clipboard.writeText(prompt)}catch(e){}
  location.href='https://chatgpt.com/?q='+encodeURIComponent(prompt);
},true);

function addStyles(){
  if(document.getElementById('flowzV41Styles'))return;
  var style=document.createElement('style');
  style.id='flowzV41Styles';
  style.textContent=
    '#flowzTalkPrep{border-color:#e58f2d;background:linear-gradient(155deg,#171512,#111315);padding:15px}'+
    '#flowzTalkPrep .prep-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}'+
    '#flowzTalkPrep .prep-title{font-size:14px;font-weight:950;letter-spacing:.1em}'+
    '#flowzTalkPrep .prep-chip{padding:6px 9px;border:1px solid #5d4a32;border-radius:999px;font-size:10px;font-weight:900;color:#ffae48}'+
    '#flowzTalkPrep .prep-grid{display:grid;gap:7px}'+
    '#flowzTalkPrep .prep-row{display:grid;grid-template-columns:54px 1fr;gap:8px;align-items:center;padding:9px 10px;border:1px solid #30343a;border-radius:12px;background:#181b20}'+
    '#flowzTalkPrep .prep-row span{font-size:9px;font-weight:950;letter-spacing:.1em;color:#9199a3}'+
    '#flowzTalkPrep .prep-row b{font-size:14px;line-height:1.3;color:#f6f1e7}'+
    '#flowzTalkPrep .prep-row small{display:block;margin-top:2px;color:#858d96;font-size:10px}'+
    '#flowzTalkPrepBtn{width:100%;margin-top:10px;padding:14px;border:0;border-radius:13px;background:linear-gradient(135deg,#ff9e2c,#ff7138);color:#111;font:950 15px/1 -apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif}'+
    'body[data-profile="leni"] #flowzTalkPrep{display:none}'+
    'body[data-profile="kedy"] #quickCommuteBtn{display:none!important}';
  document.head.appendChild(style);
}

function ensureTalkPrep(){
  var mission=document.getElementById('mission'),profiles=document.querySelector('.profile-switch');
  if(!mission||!profiles)return;
  var card=document.getElementById('flowzTalkPrep');
  if(!card){
    card=document.createElement('section');
    card.id='flowzTalkPrep';
    card.className='panel';
    mission.insertAdjacentElement('afterend',card);
    card.addEventListener('click',function(event){
      if(event.target&&event.target.closest&&event.target.closest('#flowzTalkPrepBtn'))startCommute();
    });
  }
  var m=todayMission(),reuse=previousPhrase(),signature=m.phrase+'|'+reuse+'|'+currentProfile();
  if(card.dataset.signature===signature)return;
  card.dataset.signature=signature;
  card.innerHTML='<div class="prep-head"><div class="prep-title">🗣️ TALK PREP</div><span class="prep-chip">COMMUTE</span></div>'+
    '<div class="prep-grid">'+
      '<div class="prep-row"><span>OPEN</span><div><b>Hey ChatGPT, how’s it going?</b><small>普通に挨拶から始めてOK</small></div></div>'+
      '<div class="prep-row"><span>TODAY</span><div><b>'+safe(m.phrase)+'</b><small>'+safe(m.meaning)+'</small></div></div>'+
      '<div class="prep-row"><span>REUSE</span><div><b>'+safe(reuse)+'</b><small>前回表現をもう一度使う</small></div></div>'+
    '</div><button id="flowzTalkPrepBtn" type="button">⚡ START COMMUTE</button>';
}

function startCommute(){
  var quick=document.getElementById('quickCommuteBtn');
  if(quick){quick.click();return}
  var first=document.querySelector('#modes .mode');
  if(!first)return;
  first.click();
  setTimeout(function(){var start=document.getElementById('startBtn');if(start)start.click()},80);
}

function updateModeLabels(){
  document.querySelectorAll('#modes .mode').forEach(function(button){
    var title=button.querySelector('b'),sub=button.querySelector('small');
    if(title&&title.textContent.trim()==='TOEIC'&&sub&&sub.textContent!=='Mini L/R check · 10min')sub.textContent='Mini L/R check · 10min';
  });
}

function updateMissionVisibility(){
  var mission=document.getElementById('mission'),talk=document.getElementById('flowzTalkPrep');
  if(!mission||!talk)return;
  var pending=parse(localStorage.getItem(PENDING_KEY));
  var showTalk=currentProfile()==='kedy'&&(!pending||pending.profile!=='kedy'||pending.mode==='commute');
  setDisplay(talk,showTalk?'':'none');
  setDisplay(mission,showTalk?'none':'');
}

function apply(){
  scheduled=false;
  addStyles();
  ensureTalkPrep();
  updateModeLabels();
  updateMissionVisibility();
}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(apply,0)}

document.addEventListener('DOMContentLoaded',function(){schedule();setTimeout(schedule,1200)});
window.addEventListener('pageshow',schedule);
document.addEventListener('click',function(event){
  if(event.target&&event.target.closest&&event.target.closest('.profile-btn,.mode'))setTimeout(schedule,40);
});
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-profile','class']});

})();

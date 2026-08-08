(function(){
'use strict';

var VERSION='v4.3.7 (2026.8.6)';
var FOOTER='✅ Last updated 2026.08.06 · Flowz v4.3.7 TOEIC Study Voice 5Q';
var PENDING_KEY='flowz_duo_pending';
var scheduled=false;

function parse(raw){try{return raw?JSON.parse(raw):null}catch(e){return null}}
function text(el,value){if(el&&el.textContent!==value)el.textContent=value}
function profile(){return document.body&&document.body.getAttribute('data-profile')==='leni'?'leni':'kedy'}
function savePending(value){try{localStorage.setItem(PENDING_KEY,JSON.stringify(value))}catch(e){}}

function toeicStudyPrompt(){
  return [
    "You are kedy's TOEIC study coach in Flowz Duo Battle. He is using Voice Talk while taking a bath.",
    "Important opening rule: kedy usually begins with a casual greeting such as 'ChatGPT, how are you?' Respond like a normal conversation partner first. Have one or two natural greeting exchanges before introducing practice. Do not immediately announce a lesson, mission, correction, test, or shadowing.",
    "This is a short daily teaching session, not a scored TOEIC Check. Do not give a TOEIC score.",
    "Run exactly five practice questions and finish automatically after question five. Target about five to eight minutes. Do not repeatedly ask him to say 'Wrap up'. If he says 'まとめて' or 'Wrap up' early, stop and summarize the completed questions.",
    "Voice Talk hides previous text when kedy starts speaking. Therefore every question must be answerable without looking back at earlier text. Never require him to read a sentence on screen while speaking. Do not ask him to repeat or recite visible text.",
    "Use audio-first tasks. Read one complete item aloud, then ask for one short answer such as A, B, C, a word, or a brief phrase. Keep all choices short enough to remember. For grammar items, say the sentence and choices aloud instead of relying on the screen.",
    "Use this five-question mix: two listening questions, one Part 2-style response question, and two short grammar or sentence-completion questions. Do not use Part 7 passages or long screen reading in Voice Talk mode.",
    "kedy already uses mikan for 30 vocabulary questions, so do not run isolated word lists or flashcards. Put useful vocabulary inside original TOEIC-style sentences, short conversations, or announcements.",
    "Silently check connected Notion for recent TOEIC Check weak areas only when available without delaying the opening. If available, prioritize those weaknesses. Otherwise use a balanced mix.",
    "For each question: present one item, wait for his answer, reveal correctness, explain the key point briefly in Japanese, and give one reusable TOEIC pattern. Then move directly to the next question.",
    "Listening items are spoken once first. Repeat only after he answers or explicitly asks. Keep corrections concise and natural for spoken conversation.",
    "After question five, automatically give: correct count out of five, up to three weak points, three useful TOEIC patterns, and one focus for the next TOEIC Check.",
    "At the end, use connected Notion tools to find today's existing Diary page by date. Append a TOEIC Study log without creating a new Diary page, then fetch it again to verify. If Notion is unavailable, clearly say it was not recorded and output copy-ready text.",
    "Do not update GitHub for an ordinary learning session."
  ].join(' ');
}

function startToeicStudy(event){
  if(profile()!=='kedy'||!event.target||!event.target.closest)return;
  if(!event.target.closest('#startBtn'))return;
  var pending=parse(localStorage.getItem(PENDING_KEY));
  if(!pending||pending.profile!=='kedy'||pending.mode!=='bath'||pending.startedAt)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  pending.startedAt=new Date().toISOString();
  pending.autoRecord=true;
  savePending(pending);
  var prompt=toeicStudyPrompt();
  try{navigator.clipboard.writeText(prompt)}catch(e){}
  location.href='https://chatgpt.com/?q='+encodeURIComponent(prompt);
}

function updateStudyLabels(){
  if(profile()!=='kedy')return;
  document.querySelectorAll('#modes .mode').forEach(function(button){
    var title=button.querySelector('b');
    if(!title||title.textContent.trim()!=='TOEIC STUDY')return;
    text(button.querySelector('small'),'Voice 5Q · 5–8min');
    text(button.querySelector('.icon'),'🛁🎤');
  });
  var pending=parse(localStorage.getItem(PENDING_KEY));
  if(pending&&pending.profile==='kedy'&&pending.mode==='bath'){
    text(document.getElementById('missionGuide'),'Voice Talk専用。画面を見ながら話さず、耳だけで答える5問・約5〜8分。');
    text(document.getElementById('startBtn'),'START TOEIC STUDY · 5Q');
  }
}

function applyVersion(){
  text(document.querySelector('.version'),VERSION);
  if(document.title!=='Flowz v4.3.7 · Duo Battle')document.title='Flowz v4.3.7 · Duo Battle';
  document.querySelectorAll('body>.note').forEach(function(note){
    if(/Last updated/i.test(note.textContent||''))text(note,FOOTER);
  });
}

function apply(){scheduled=false;updateStudyLabels();applyVersion()}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(apply,0)}

window.addEventListener('click',startToeicStudy,true);
apply();
document.addEventListener('DOMContentLoaded',function(){apply();setTimeout(apply,120);setTimeout(apply,900)});
window.addEventListener('pageshow',function(){setTimeout(apply,50);setTimeout(apply,500)});
document.addEventListener('click',function(event){if(event.target&&event.target.closest&&event.target.closest('.profile-btn,.mode'))setTimeout(schedule,30)});
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-profile','class']});
setInterval(function(){if(document.visibilityState==='visible')apply()},1000);

})();

(function(){
'use strict';
var VERSION='v4.0 (2026.8.6)',PENDING_KEY='flowz_duo_pending';
function parse(raw){try{return raw?JSON.parse(raw):null}catch(e){return null}}
function text(sel,value){var el=document.querySelector(sel);if(el)el.textContent=value}
function profile(){return document.body&&document.body.getAttribute('data-profile')==='leni'?'leni':'kedy'}
function moveMission(){
  var mission=document.getElementById('mission'),profiles=document.querySelector('.profile-switch');
  if(!mission||!profiles)return;
  if(profiles.nextElementSibling!==mission)profiles.insertAdjacentElement('afterend',mission);
  mission.classList.add('mission-first');
  text('#missionHeading','🎯 TODAY’S PHRASE');text('#startBtn','⚡ START COMMUTE');
  var guide=document.getElementById('missionGuide');if(guide)guide.textContent='Check the phrase, then start with one tap. You can greet ChatGPT normally first.';
}
function coachAssessment(){
  var panel=document.getElementById('flowzAssessment');if(!panel)return;
  var title=panel.querySelector('.section-title'),chip=panel.querySelector('.chip'),stats=panel.querySelectorAll('.stat'),note=panel.querySelector('.note');
  if(title)title.textContent='🗣️ COACH ASSESSMENT';if(chip)chip.textContent='CONVERSATION BASED';
  if(stats[0])stats[0].innerHTML='<b>A1→A2</b><span>CURRENT CEFR</span>';
  if(stats[1])stats[1].innerHTML='<b>SHORT TALK</b><span>CAN COMMUNICATE</span>';
  if(stats[2])stats[2].innerHTML='<b>毎回更新</b><span>VOICE REVIEW</span>';
  if(note)note.textContent='XPは継続とレベル用。英語力は実際の発話・通じやすさ・文法・語彙・反応速度を会話終了時にコーチが判定する。';
}
function promptFor(p){
  var m=p.mission||{};
  return [
    "You are kedy's English coach in Flowz Duo Battle. He is a Japanese beginner using voice mode.",
    "Important opening rule: kedy usually begins with a casual greeting such as 'ChatGPT, how are you?' Respond like a normal conversation partner first. Have one or two natural greeting exchanges before introducing any learning structure. Do not immediately announce a lesson, mission, correction, or shadowing. If his first words are only a greeting, simply greet him back and ask one light question about his actual commute, energy, surroundings, work, or what is on his mind.",
    "Run one continuous commute conversation. Morning and evening are one mode, so do not choose the opening from clock time. Chat for at least four meaningful exchanges before shadowing.",
    "Silently use connected Notion tools to find recent Diary English Logs and the latest Coach Assessment when available. Reuse one or two corrected phrases naturally.",
    "Today's hidden mission is: Theme: "+(m.theme||'')+". Target phrase: \""+(m.phrase||'')+"\". Meaning: "+(m.meaning||'')+". Treat it as hidden and bring it in only when the conversation naturally connects.",
    "Avoid repetitive default topics. Do not default to after-work plans, dinner, or weekends unless kedy introduces them. Rotate real-life topics.",
    "Conversation should be about 80 percent and shadowing about 20 percent. If he asks to talk or says stay in chat, stop repetition immediately and do not suggest it again that session.",
    "Use short natural spoken English. Correct only meaning-changing or strongly unnatural mistakes. Allow one retry, then return to conversation.",
    "When he is almost at work or home, give a brief Arrival Review without ending: three phrases used, up to two natural corrections, and one phrase to reuse next time.",
    "Do not end unless he says 'まとめて' or 'Wrap up'.",
    "At wrap-up, judge his English from this actual conversation, not from XP or session count. Assess CEFR range, communication success, grammar control, usable vocabulary, listening/reaction speed, and one next focus. Avoid a TOEIC score unless a real TOEIC-style test was done.",
    "Then give XP result, top three corrections, three useful phrases, and an English Log with 2–3 diary sentences, one Phrase line, up to three Fix lines, and a Coach Assessment line.",
    "Append the English Log and Coach Assessment to today's existing Notion Diary page, fetch it again to verify, and do not create a new Diary page. If Notion is unavailable, say it was not recorded and output copy-ready text. Do not update GitHub for ordinary learning sessions."
  ].join(' ');
}
function intercept(e){
  var btn=e.target.closest&&e.target.closest('#startBtn');if(!btn||profile()!=='kedy')return;
  var p=parse(localStorage.getItem(PENDING_KEY));if(!p||p.startedAt)return;
  e.preventDefault();e.stopImmediatePropagation();p.startedAt=new Date().toISOString();p.autoRecord=true;
  try{localStorage.setItem(PENDING_KEY,JSON.stringify(p))}catch(err){}
  var prompt=promptFor(p);try{navigator.clipboard.writeText(prompt)}catch(err){}
  location.href='https://chatgpt.com/?q='+encodeURIComponent(prompt);
}
function apply(){moveMission();coachAssessment();text('.version',VERSION);document.title='Flowz v4.0 · Duo Battle';var footer=document.querySelector('body>.note:last-of-type');if(footer)footer.textContent='✅ Last updated 2026.08.06 · Flowz v4.0 Conversation First';}
document.addEventListener('click',intercept,true);
document.addEventListener('DOMContentLoaded',function(){setTimeout(apply,0);setTimeout(apply,1200)});
window.addEventListener('pageshow',function(){setTimeout(apply,0)});
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.profile-btn'))setTimeout(apply,30)});
new MutationObserver(function(){setTimeout(apply,0)}).observe(document.documentElement,{childList:true,subtree:true});
})();

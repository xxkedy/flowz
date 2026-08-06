(function(){
'use strict';
var VERSION='v4.0 (2026.8.6)';
function text(sel,value){var el=document.querySelector(sel);if(el)el.textContent=value}
function moveMission(){
  var mission=document.getElementById('mission'),profiles=document.querySelector('.profile-switch');
  if(!mission||!profiles)return;
  if(profiles.nextElementSibling!==mission)profiles.insertAdjacentElement('afterend',mission);
  mission.classList.add('mission-first');
  text('#missionHeading','🎯 TODAY’S PHRASE');
  text('#startBtn','⚡ START COMMUTE');
  var guide=document.getElementById('missionGuide');
  if(guide)guide.textContent='Check the phrase, then start with one tap. You can greet ChatGPT normally first.';
}
function coachAssessment(){
  var panel=document.getElementById('flowzAssessment');if(!panel)return;
  var title=panel.querySelector('.section-title'),chip=panel.querySelector('.chip'),stats=panel.querySelectorAll('.stat'),note=panel.querySelector('.note');
  if(title)title.textContent='🗣️ COACH ASSESSMENT';
  if(chip)chip.textContent='CONVERSATION BASED';
  if(stats[0])stats[0].innerHTML='<b>A1→A2</b><span>CURRENT CEFR</span>';
  if(stats[1])stats[1].innerHTML='<b>SHORT TALK</b><span>CAN COMMUNICATE</span>';
  if(stats[2])stats[2].innerHTML='<b>毎回更新</b><span>VOICE REVIEW</span>';
  if(note)note.textContent='XPは継続とレベル用。英語力は実際の発話・通じやすさ・文法・語彙・反応速度を会話終了時にコーチが判定する。';
}
function apply(){
  moveMission();coachAssessment();text('.version',VERSION);document.title='Flowz v4.0 · Duo Battle';
  var footer=document.querySelector('body>.note:last-of-type');if(footer)footer.textContent='✅ Last updated 2026.08.06 · Flowz v4.0 Conversation First';
}
document.addEventListener('DOMContentLoaded',function(){setTimeout(apply,0);setTimeout(apply,1200)});
window.addEventListener('pageshow',function(){setTimeout(apply,0)});
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.profile-btn'))setTimeout(apply,30)});
new MutationObserver(function(){setTimeout(apply,0)}).observe(document.documentElement,{childList:true,subtree:true});
})();

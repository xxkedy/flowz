(function(){
'use strict';
var PENDING_KEY='flowz_duo_pending',scheduled=false;
function parse(raw){try{return raw?JSON.parse(raw):null}catch(e){return null}}
function setText(sel,value){var el=document.querySelector(sel);if(el&&el.textContent!==value)el.textContent=value}
function setHtml(el,value){if(el&&el.innerHTML!==value)el.innerHTML=value}
function profile(){return document.body&&document.body.getAttribute('data-profile')==='leni'?'leni':'kedy'}
function pending(){return parse(localStorage.getItem(PENDING_KEY))}
function moveMission(){
  var mission=document.getElementById('mission'),profiles=document.querySelector('.profile-switch');
  if(!mission||!profiles)return;
  if(profiles.nextElementSibling!==mission)profiles.insertAdjacentElement('afterend',mission);
  if(!mission.classList.contains('mission-first'))mission.classList.add('mission-first');
  var p=pending(),mode=p&&p.profile==='kedy'?p.mode:'';
  var heading='🎯 TODAY’S PHRASE',start='⚡ START COMMUTE',guide='Check the phrase, then start with one tap. You can greet ChatGPT normally first.';
  if(mode==='toeic'){
    heading='🎯 TOEIC CHECK';start='START TOEIC CHECK';guide='12-question Listening & Reading mini-check. The result is an estimated range, not an official score.';
  }else if(mode==='bath'){
    heading='🛁 TOEIC STUDY';start='START TOEIC STUDY';guide='Bath practice with screen and audio. Learn the test format; mikan remains the vocabulary routine.';
  }else if(mode==='free'){
    heading='🎲 FREE TALK';start='START FREE TALK';guide='Practical conversation without a fixed commute structure.';
  }
  setText('#missionHeading',heading);setText('#startBtn',start);
  var guideEl=document.getElementById('missionGuide');if(guideEl&&guideEl.textContent!==guide)guideEl.textContent=guide;
}
function coachAssessment(){
  var panel=document.getElementById('flowzAssessment');if(!panel)return;
  var title=panel.querySelector('.section-title'),chip=panel.querySelector('.chip'),stats=panel.querySelectorAll('.stat'),note=panel.querySelector('.note');
  if(title&&title.textContent!=='🗣️ COACH ASSESSMENT')title.textContent='🗣️ COACH ASSESSMENT';
  if(chip&&chip.textContent!=='CONVERSATION BASED')chip.textContent='CONVERSATION BASED';
  setHtml(stats[0],'<b>A1→A2</b><span>CURRENT CEFR</span>');
  setHtml(stats[1],'<b>NOT TESTED</b><span>TOEIC EST.</span>');
  setHtml(stats[2],'<b>毎回更新</b><span>VOICE REVIEW</span>');
  var noteText='XPは継続用。CEFRは会話、TOEICは専用チェックで別に測る。';
  if(note&&note.textContent!==noteText)note.textContent=noteText;
}
function openingRule(){
  return "Important opening rule: kedy usually begins with a casual greeting such as 'ChatGPT, how are you?' Respond like a normal conversation partner first, then move into a real topic without forcing repeated greeting exchanges. Do not immediately announce a lesson, mission, correction, test, or shadowing. Never end a turn with only praise, acknowledgement, or a closing phrase such as 'Perfect', 'You're welcome', 'Got it', or 'Thanks'. After a brief acknowledgement, immediately continue with a natural question, topic, or next sentence. Do not close the conversation until kedy explicitly ends it.";
}
function diaryRule(kind){
  return "At the end, use connected Notion tools to find today's existing Diary page by date. Append a "+kind+" log without creating a new Diary page, then fetch it again to verify. If Notion is unavailable, clearly say it was not recorded and output copy-ready text. Do not update GitHub for an ordinary learning session.";
}
function commutePrompt(p){
  var m=p.mission||{};
  return [
    "You are kedy's English coach in Flowz Duo Battle. He is a Japanese beginner using voice mode.",openingRule(),
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
    diaryRule('Flowz English')
  ].join(' ');
}
function bathToeicPrompt(){
  return [
    "You are kedy's TOEIC study coach in Flowz Duo Battle. He is studying in the bath and can both listen and look at the screen.",openingRule(),
    "This is a 15-minute teaching session, not a scored TOEIC Check. Do not give a TOEIC score.",
    "kedy already uses mikan for 30 vocabulary questions, so do not run isolated word lists or flashcards. Use useful vocabulary inside original TOEIC-style sentences, short conversations, announcements, emails, and short passages.",
    "Silently check connected Notion for recent TOEIC Check weak areas. If available, prioritize those weaknesses. Otherwise mix Part 2-style responses, Part 3 or 4 listening, Part 5 grammar, and short Part 7 reading.",
    "Use four to six short practice cycles. For each cycle: present one item, wait for his answer, reveal correctness, explain the key point briefly in Japanese, and give one reusable pattern. Alternate audio-focused and screen-focused tasks.",
    "Listening items may be spoken once first, then repeated only after he answers. Reading items should be visible with choices. Keep each passage short enough for a phone screen.",
    "End only when he says 'まとめて' or 'Wrap up'. At wrap-up give: correct count for practice items, three weak points, three useful TOEIC patterns, and one focus for the next TOEIC Check.",
    diaryRule('TOEIC Study')
  ].join(' ');
}
function freePrompt(p){
  var m=p.mission||{};
  return [
    "You are kedy's practical English conversation partner in Flowz Duo Battle.",openingRule(),
    "Run a natural free conversation. Do not force commute questions or a lesson structure. Follow what kedy actually wants to talk about and vary the topic after several exchanges when useful.",
    "Today's optional phrase is \""+(m.phrase||'')+"\". Bring it in only if it fits naturally.",
    "Use short spoken English. Correct only meaning-changing or strongly unnatural mistakes, allow one retry, then continue talking.",
    "Do not end unless he says 'まとめて' or 'Wrap up'. At wrap-up give three corrections, three useful phrases, and a short conversation-based CEFR note.",
    diaryRule('Free Talk English')
  ].join(' ');
}
function promptFor(p){
  if(p.mode==='bath')return bathToeicPrompt(p);
  if(p.mode==='free')return freePrompt(p);
  return commutePrompt(p);
}
function intercept(e){
  var btn=e.target.closest&&e.target.closest('#startBtn');if(!btn||profile()!=='kedy')return;
  var p=pending();if(!p||p.startedAt||p.mode==='toeic')return;
  e.preventDefault();e.stopImmediatePropagation();p.startedAt=new Date().toISOString();p.autoRecord=true;
  try{localStorage.setItem(PENDING_KEY,JSON.stringify(p))}catch(err){}
  var prompt=promptFor(p);try{navigator.clipboard.writeText(prompt)}catch(err){}
  location.href='https://chatgpt.com/?q='+encodeURIComponent(prompt);
}
function apply(){scheduled=false;moveMission();coachAssessment()}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(apply,0)}
document.addEventListener('click',intercept,true);
document.addEventListener('DOMContentLoaded',function(){schedule();setTimeout(schedule,1200)});
window.addEventListener('pageshow',schedule);
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.profile-btn,.mode'))setTimeout(schedule,30)});
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-profile','class']});
})();

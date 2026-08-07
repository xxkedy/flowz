(function(){
'use strict';

var RELEASE=window.FLOWZ_RELEASE||{
  number:'4.3.9',
  label:'v4.3.9 (2026.8.7)',
  title:'Flowz v4.3.9 · Duo Battle',
  footer:'✅ Last updated 2026.08.07 · Flowz v4.3.9 Stability Repair'
};
var DATA_KEY='flowz_duo_data';
var BACKUP_KEY='flowz_duo_data_backup';
var LEGACY_KEY='flowz_duo_v3';
var PENDING_KEY='flowz_duo_pending';
var MIN_SESSION_MS=120000;
var scheduled=false;

function parse(raw){try{return raw?JSON.parse(raw):null}catch(e){return null}}
function text(el,value){if(el&&el.textContent!==String(value))el.textContent=String(value)}
function profile(){return document.body&&document.body.getAttribute('data-profile')==='leni'?'leni':'kedy'}
function dateKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function savePending(value){try{value?localStorage.setItem(PENDING_KEY,JSON.stringify(value)):localStorage.removeItem(PENDING_KEY)}catch(e){}}
function loadState(){
  var state=parse(localStorage.getItem(DATA_KEY))||parse(localStorage.getItem(BACKUP_KEY))||parse(localStorage.getItem(LEGACY_KEY))||{};
  if(!state.profiles)state.profiles={};
  ['kedy','leni'].forEach(function(id){
    if(!state.profiles[id])state.profiles[id]={};
    if(!state.profiles[id].days)state.profiles[id].days={};
    if(!Array.isArray(state.profiles[id].sessions))state.profiles[id].sessions=[];
  });
  state.version=4;
  return state;
}
function saveState(state){
  try{
    var previous=localStorage.getItem(DATA_KEY);
    if(previous&&parse(previous))localStorage.setItem(BACKUP_KEY,previous);
    state.updatedAt=new Date().toISOString();
    var raw=JSON.stringify(state);
    localStorage.setItem(DATA_KEY,raw);
    localStorage.setItem(LEGACY_KEY,raw);
  }catch(e){}
}

function diaryRule(){
  return "At wrap-up, silently use connected Notion tools to find today's existing Diary page by date. Append a Flowz English log without creating a new Diary page, then fetch it again to verify. If Notion is unavailable, clearly say it was not recorded and output copy-ready text. The written log should contain 2–3 diary sentences, one Phrase line, up to three Fix lines, and one Coach Assessment line. Do not update GitHub for an ordinary learning session.";
}
function commutePrompt(pending){
  var mission=pending&&pending.mission||{};
  return [
    "You are kedy's English coach in Flowz Duo Battle. He is a Japanese beginner using voice mode and usually listens without looking at the screen.",
    "Start immediately with a short natural reply. Do not call Notion, web, or any connected tool before your first reply or during the normal commute conversation. Do not make him wait for background context. Only use Notion after he says 'まとめて' or 'Wrap up', unless he explicitly asks you to check past records.",
    "If he starts with a casual greeting, reply like a normal conversation partner once, then move into a real topic. Do not force one or two greeting exchanges. Do not announce a lesson, mission, correction, test, or shadowing.",
    "Run one continuous commute conversation. Morning and evening are one mode, so do not choose the opening from clock time. Have at least four meaningful exchanges before any planned shadowing.",
    "Today's hidden mission is: Theme: "+(mission.theme||'')+". Target phrase: \""+(mission.phrase||'')+"\". Meaning: "+(mission.meaning||'')+". Treat it as hidden and bring it in only when the conversation naturally connects.",
    "Use the current conversation as the main context. Avoid repetitive default topics. Do not default to after-work plans, dinner, or weekends unless kedy introduces them. Rotate real-life topics.",
    "Conversation should be about 80 percent and shadowing about 20 percent. If he asks to talk or says stay in chat, stop repetition immediately and do not suggest it again that session.",
    "Shadowing should usually be one compact mini-set of two or three sentences that summarizes what kedy actually talked about. Say one sentence, let him repeat once, then continue. The set should form a useful recap, not a collection of random phrases. If he casually echoes your praise or backchannel, acknowledge it once and continue; do not turn phrases such as 'nailed it', 'spot on', or 'sounds natural' into a repetition chain. If he explicitly asks for more shadowing, give it.",
    "Use short natural spoken English. Correct only meaning-changing or strongly unnatural mistakes. Allow one retry, then return to conversation.",
    "Never end a turn with only praise, acknowledgement, or a closing phrase such as 'Perfect', 'You're welcome', 'Got it', or 'Thanks'. After a brief acknowledgement, immediately continue with a natural question, topic, or next sentence. Do not close the conversation until kedy explicitly ends it.",
    "Assume the screen is not visible. Do not rely on spelling, markdown, headings, tables, or visual bullet lists. Keep every spoken turn easy to understand by ear.",
    "When he is almost at work or home, give a brief Arrival Review without ending. In about 20 seconds, naturally mention what you talked about, three phrases he used, up to two corrections, and one phrase to reuse next time.",
    "Never ask or prompt him to say 'Wrap up'. Continue naturally until he says 'まとめて' or 'Wrap up'.",
    "At wrap-up, use connected tools only then. Keep the final spoken recap conversational and about 30–45 seconds: summarize the actual topics, say three corrected or reusable sentences slowly, give one concise CEFR range with the next focus, and state the XP result. Do not read the full English Log, labels, headings, spelling, tool activity, or a long assessment aloud.",
    "Judge his English from this actual conversation, not from XP or session count. Assess communication success, grammar control, usable vocabulary, and listening or reaction speed. Avoid a TOEIC score unless a real TOEIC-style test was done.",
    diaryRule()
  ].join(' ');
}
window.FlowzPromptBuilders=window.FlowzPromptBuilders||{};
window.FlowzPromptBuilders.commute=commutePrompt;

function startCommute(event){
  if(profile()!=='kedy'||!event.target||!event.target.closest||!event.target.closest('#startBtn'))return;
  var pending=parse(localStorage.getItem(PENDING_KEY));
  if(!pending||pending.profile!=='kedy'||pending.mode!=='commute'||pending.startedAt)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  pending.startedAt=new Date().toISOString();
  pending.autoRecord=true;
  savePending(pending);
  var prompt=commutePrompt(pending);
  try{navigator.clipboard.writeText(prompt)}catch(e){}
  location.href='https://chatgpt.com/?q='+encodeURIComponent(prompt);
}

function autoComplete(){
  var pending=parse(localStorage.getItem(PENDING_KEY));
  if(!pending||!pending.startedAt||!pending.autoRecord)return false;
  var started=new Date(pending.startedAt).getTime();
  var elapsed=Date.now()-started;
  if(!isFinite(elapsed)||elapsed<MIN_SESSION_MS)return false;
  var state=loadState();
  var id=pending.profile==='leni'?'leni':'kedy';
  var profileState=state.profiles[id];
  var key=dateKey(new Date());
  var record=profileState.days[key]||{base:0,phrase:0,fix:0,duo:0,count:0};
  var gain=record.base?0:10;
  if(!record.base)record.base=10;
  record.count=(record.count||0)+1;
  record.mode=pending.mode||record.mode||'session';
  profileState.days[key]=record;
  profileState.sessions.push({
    date:key,
    mode:pending.mode||'session',
    title:pending.title||'',
    theme:pending.mission&&pending.mission.theme||'',
    phrase:pending.mission&&pending.mission.phrase||'',
    xp:gain,
    at:new Date().toISOString(),
    auto:true,
    release:RELEASE.number
  });
  saveState(state);
  savePending(null);
  return true;
}
function reconcileSession(){
  if(autoComplete()){
    try{sessionStorage.setItem('flowz_duo_sync_lock','1')}catch(e){}
    location.reload();
  }
}

function applyRelease(){
  scheduled=false;
  if(document.documentElement)document.documentElement.setAttribute('data-flowz-release',RELEASE.number);
  text(document.querySelector('.version'),RELEASE.label);
  if(document.title!==RELEASE.title)document.title=RELEASE.title;
  document.querySelectorAll('body>.note').forEach(function(note){
    if(/Last updated/i.test(note.textContent||''))text(note,RELEASE.footer);
  });
}
function scheduleRelease(){if(scheduled)return;scheduled=true;setTimeout(applyRelease,0)}

window.addEventListener('click',startCommute,true);
document.addEventListener('DOMContentLoaded',function(){
  applyRelease();
  reconcileSession();
  setTimeout(applyRelease,150);
  setTimeout(applyRelease,1200);
  if(document.documentElement)new MutationObserver(scheduleRelease).observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-profile','class']});
});
window.addEventListener('pageshow',function(){setTimeout(reconcileSession,0);setTimeout(applyRelease,30)});
window.addEventListener('focus',function(){setTimeout(reconcileSession,0);setTimeout(applyRelease,30)});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'){setTimeout(reconcileSession,0);setTimeout(applyRelease,30)}});
setInterval(function(){if(document.visibilityState==='visible'){reconcileSession();applyRelease()}},5000);

})();

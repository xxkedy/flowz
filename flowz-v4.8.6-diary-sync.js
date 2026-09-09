/* Flowz v4.8.6 r3 — verified Diary sync gate.
 * Strengthens kedy session prompts so Wrap up is not considered complete
 * until the existing Diary page has been updated and re-fetched.
 * Also routes all three kedy entry points (THEME / TOEIC / LIFE TALK) through
 * FlowzApp.buildPromptFor so the gate cannot be bypassed by the legacy core launcher.
 */
(function(){
'use strict';

var PENDING_KEY='flowz_duo_pending';

var KEDY_MISSIONS={
  toeic:[
    {theme:'Office requests',phrase:'Could you send it again?',meaning:'もう一度送ってもらえますか',guide:'Answer with a short reason.'},
    {theme:'Schedule changes',phrase:'Has the meeting been moved?',meaning:'会議は変更されましたか',guide:'Listen for time and place.'},
    {theme:'Travel arrangements',phrase:'What time does it leave?',meaning:'何時に出発しますか',guide:'Practice one quick reply.'},
    {theme:'Customer messages',phrase:"I'll check and get back to you.",meaning:'確認して折り返します',guide:'Use it as a practical reply.'}
  ],
  free:[
    {theme:'Recent life and thoughts',phrase:"Recently, I've been thinking about it.",meaning:'最近それについて考えている',guide:'Talk from today’s real life, Diary, plans, or current decisions.'}
  ]
};

function pad(n){return String(n).padStart(2,'0')}
function dateKey(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function missionSeed(profile,modeId,key){var t=profile+'|'+modeId+'|'+key,sum=0;for(var i=0;i<t.length;i++)sum=(sum*31+t.charCodeAt(i))>>>0;return sum}
function missionFor(modeId){
  var list=KEDY_MISSIONS[modeId]||KEDY_MISSIONS.free;
  return list[missionSeed('kedy',modeId,dateKey(new Date()))%list.length];
}

function enhanceDiaryPrompt(prompt,pending){
  if(!prompt||!pending||pending.profile!=='kedy')return prompt;
  if(prompt.indexOf('Diary Sync Gate v1:')>=0)return prompt;

  var rule=[
    'Diary Sync Gate v1:',
    "When kedy says 'Wrap up' or 'まとめて', the Diary write is a mandatory part of ending the session, not an optional follow-up.",
    "Before claiming the session is fully wrapped up, use connected Notion tools to find the existing Diary page whose 日付 matches the Flowz session date. Never create a new Diary page.",
    "Update the existing yellow 🗽 English Log block in place. Do not append a second English Log block when one already exists.",
    'Keep the saved English Log compact and consistent with current Flowz Coach Rules: one to two English diary sentences about the actual conversation, one 🔧 Fix line, and one 💬 Phrase line. Do not save a long correction list or Coach Assessment in Diary.',
    'If the same Flowz session was already written, merge or replace that session log instead of duplicating it.',
    'After the write, fetch the same Diary page again and verify that the English Log contains the new session content.',
    "Only after that successful re-fetch may you say or imply that the Diary was recorded or that Wrap up is fully complete.",
    "Never infer that Notion is unavailable without attempting the connected Notion tools when they are present. Before saying Diary未記録, actually attempt the Diary lookup and, when found, the update and verification fetch. If tools are truly unavailable, permission is missing, the Diary page cannot be found, the update fails, or verification fails, explicitly say 'Diary未記録' and provide the compact copy-ready English Log. Never claim it was saved.",
    'Do not skip the Diary write because the spoken recap, XP result, TOEIC result, or coaching feedback has already finished.',
    'Never invent a Flowz XP number at wrap-up. State a number only when the exact XP is explicitly present in session context; otherwise say Flowz will record XP when kedy returns to the app.'
  ].join(' ');

  return prompt+' '+rule;
}

function patchApp(){
  if(!window.FlowzApp)return;
  var originalBuild=window.FlowzApp.buildPromptFor;
  if(typeof originalBuild==='function'&&!originalBuild.__flowz486){
    var wrapped=function(p){
      return enhanceDiaryPrompt(originalBuild(p),p);
    };
    wrapped.__flowz486=true;
    window.FlowzApp.buildPromptFor=wrapped;
  }
}

function launchKedyMode(modeId){
  if(!window.FlowzApp||window.FlowzApp.getCurrentProfile()!=='kedy')return false;
  if(modeId!=='toeic'&&modeId!=='free')return false;

  var now=new Date().toISOString();
  var pending={
    profile:'kedy',
    mode:modeId,
    title:modeId==='toeic'?'TOEIC':'LIFE TALK',
    selectedAt:now,
    startedAt:now,
    autoRecord:true,
    mission:missionFor(modeId)
  };
  try{localStorage.setItem(PENDING_KEY,JSON.stringify(pending))}catch(e){}

  var prompt=window.FlowzApp.buildPromptFor(pending);
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(prompt).catch(function(){});
  }catch(e){}
  location.href='https://chatgpt.com/?q='+encodeURIComponent(prompt);
  return true;
}

patchApp();

/* The unified core launches kedy TOEIC/LIFE TALK through its private lexical
 * buildPromptFor(), which cannot see adapters. Capture those two clicks before
 * the core bubble listener and relaunch through the public wrapped builder.
 * COMMUTE is already routed through FlowzApp.buildPromptFor by the v4.8.5
 * continuity adapter, so it automatically receives this gate as well. */
document.addEventListener('click',function(e){
  if(!window.FlowzApp||window.FlowzApp.getCurrentProfile()!=='kedy')return;
  var target=e.target&&e.target.closest&&e.target.closest('.mode[data-mode-id]');
  if(!target)return;
  var modeId=target.dataset.modeId;
  if(modeId!=='toeic'&&modeId!=='free')return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  launchKedyMode(modeId);
},true);

})();

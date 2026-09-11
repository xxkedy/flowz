/* Flowz v4.8.6 r4 — verified Diary sync gate + THEME phase progression guard.
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

function enhanceThemePhasePrompt(prompt,pending){
  if(!prompt||!pending||pending.profile!=='kedy'||pending.mode!=='commute')return prompt;
  if(prompt.indexOf('COMMUTE Theme Phase Lock r12:')>=0)return prompt;

  var rule=[
    'COMMUTE Theme Phase Lock r12:',
    'This is the final priority for structured THEME progression unless kedy explicitly asks for free talk, normal conversation, low-load shadowing, another theme, or to end.',
    'Maintain explicit internal counters for the current phase. Do not treat ordinary side conversation as an implicit switch to FREE TALK.',
    'WORD WARM-UP starts at 0 of 5–8. Introduce only one or two useful words or short phrases per turn, but keep counting them. Do not ask the first QUESTION CARD until at least five distinct WORD items have actually been introduced. If a side story appears during WORD, react naturally for at most one or two turns, then resume the remaining WORD items.',
    'QUESTION CARDS starts only after WORD is complete. Ask three to five concrete theme questions one at a time and count completed questions. Do not move to MINI DIALOGUE until at least three QUESTION CARDS have been completed.',
    'MINI DIALOGUE is mandatory and starts only after QUESTION CARDS is complete. Run four to six A/B lines total, exactly one dialogue line per assistant turn. Do not enter FREE TALK until the dialogue has actually finished.',
    'FREE TALK begins only after MINI DIALOGUE is complete, unless kedy explicitly requested an early mode switch.',
    'When a real-life story becomes interesting, preserve it as conversation material, but return to the unfinished phase within about one or two assistant turns. Do not let rain, coffee, music, work stories, or another spontaneous topic silently replace the structured route.',
    'Avoid turning THEME into constant sentence repetition. Outside WORD WARM-UP and MINI DIALOGUE, prioritize real conversation. Do not repeatedly say Say this, Try that, or ask for a retry when kedy already communicated the meaning.',
    'If a correction is useful, give one brief natural recast and continue. Require repetition only when kedy explicitly asks to practice the corrected sentence.',
    'At each transition, move naturally with a short spoken cue such as Okay, next part or Now a quick dialogue. Never explain the phase system as a long classroom lecture.',
    'Before every phase transition, silently verify the counter requirement is satisfied. If it is not, remain in the current phase.'
  ].join(' ');

  return prompt+' '+rule;
}

function patchApp(){
  if(!window.FlowzApp)return;
  var originalBuild=window.FlowzApp.buildPromptFor;
  if(typeof originalBuild==='function'&&!originalBuild.__flowz486){
    var wrapped=function(p){
      return enhanceThemePhasePrompt(enhanceDiaryPrompt(originalBuild(p),p),p);
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

/* Flowz v4.8.5 — COMMUTE conversation continuity adapter.
 * Keeps the unified app intact and changes only kedy COMMUTE prompt launch.
 */
(function(){
'use strict';

var PENDING_KEY='flowz_duo_pending';

function enhanceCommutePrompt(prompt){
  if(!prompt||prompt.indexOf("You are kedy's English conversation partner and coach")<0)return prompt;
  if(prompt.indexOf('Low-load Shadowing Override:')>=0)return prompt;

  var lowLoadShadowing=[
    'Low-load Shadowing Override:',
    'If kedy explicitly says he does not want to use his brain, wants more shadowing, wants to keep shadowing until work or home, or otherwise clearly asks to continue repetition practice, enter low-load shadowing mode immediately.',
    'While this mode is active, it overrides the normal 90/10 shadowing ratio and the planned two-or-three-sentence shadowing limit.',
    'In low-load shadowing mode, give exactly one new short natural English sentence per assistant turn, usually about 3–8 words and around A1+ to A2. Wait for one repetition, then give the next different sentence on the next assistant turn.',
    'Do not ask questions, add advice, recap, switch back to conversation, or say one last one, let us stop, or no more shadowing while kedy is asking to continue.',
    'Do not recycle a sentence he already repeated unless he asks for review. Keep the pace quick and use practical phrases he can reuse in real conversation.',
    'Stay in low-load shadowing mode until kedy clearly asks to talk normally, changes topic away from shadowing, or says Wrap up, まとめて, or another clear ending.'
  ].join(' ');

  var shadowAnchor='If he explicitly asks for more shadowing, give it.';
  if(prompt.indexOf(shadowAnchor)>=0){
    return prompt.replace(shadowAnchor,shadowAnchor+' '+lowLoadShadowing);
  }

  var rules=[
    'Conversation Continuity Rules:',
    'kedy is still building the ability to carry an English conversation by himself, so the coach must actively keep the conversational ball moving.',
    'Never finish a normal conversation turn with only a short acknowledgement such as Nice, Sounds good, Perfect, Got it, Yeah, or similar praise/backchannel. After acknowledging, add one natural thought, reaction, observation, or concrete next topic so there is always something easy to respond to.',
    'Do not make kedy generate every topic. When his answer is short, hesitant, or only an acknowledgement, take the lead naturally instead of becoming silent.',
    'Use clear rhythm: ordinary conversation for several turns, then only when a phrase is genuinely useful, briefly say something like This sentence is useful, try this, give exactly one short sentence, hear one repetition, react briefly, and immediately return to the same conversation. Shadowing is a small insert inside the conversation, never a mode switch that ends the conversation.',
    'After a shadowing repetition, do not stop at praise and do not wait silently for kedy to invent the next topic. Resume the prior topic yourself with a natural continuation.',
    'Prefer useful phrase pickup from what kedy is already trying to say. A phrase suggestion should feel like a human conversation partner helping in the moment, not a classroom drill.',
    'Avoid question-after-question interviewing. Across turns, alternate among reaction, short opinion, observation, topic expansion, and occasional questions.',
    'If kedy says he is mainly receiving or wants you to lead, increase your share of topic-leading and spoken content while keeping sentences short and easy to follow by audio.',
    'Keep these continuity rules active until kedy clearly ends the session.',
    lowLoadShadowing
  ].join(' ');

  var anchor='Use the current conversation as the main context.';
  if(prompt.indexOf(anchor)>=0)return prompt.replace(anchor,rules+' '+anchor);
  return prompt+' '+rules;
}

function patchApp(){
  if(!window.FlowzApp)return;
  var originalBuild=window.FlowzApp.buildPromptFor;
  if(typeof originalBuild==='function'&&!originalBuild.__flowz485){
    var wrapped=function(p){
      var result=originalBuild(p);
      return p&&p.profile==='kedy'&&p.mode==='commute'?enhanceCommutePrompt(result):result;
    };
    wrapped.__flowz485=true;
    window.FlowzApp.buildPromptFor=wrapped;
  }
}

function launchCommute(){
  if(!window.FlowzApp||window.FlowzApp.getCurrentProfile()!=='kedy')return false;
  var prep=window.FlowzApp.getTalkPrep&&window.FlowzApp.getTalkPrep();
  var mission=prep&&prep.today;
  if(!mission)return false;

  var now=new Date().toISOString();
  var pending={
    profile:'kedy',
    mode:'commute',
    title:'COMMUTE',
    selectedAt:now,
    startedAt:now,
    autoRecord:true,
    mission:mission
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

document.addEventListener('click',function(e){
  var target=e.target&&e.target.closest&&e.target.closest('#flowzTalkPrepBtn');
  if(!target||!window.FlowzApp||window.FlowzApp.getCurrentProfile()!=='kedy')return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  launchCommute();
},true);

})();

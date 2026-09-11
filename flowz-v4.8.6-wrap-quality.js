/* Flowz v4.8.6 r18 — whole-session wrap quality + reflection routing.
 * Strengthens kedy THEME/LIFE TALK wrap-up and post-session Japanese feedback.
 * Loaded after the existing continuity and Diary-sync adapters.
 */
(function(){
'use strict';

function wrapQualityRule(){
  return [
    'Flowz Whole-Session Wrap Guard r18:',
    "When kedy clearly ends THEME or LIFE TALK with Wrap up, まとめて, or asks for an all-conversation wrap-up, summarize the whole session, not only the last few turns.",
    'Make the spoken recap audio-first and roughly 30–45 seconds. Include the actual conversation path and any useful discovery, decision, interest, or next action that naturally emerged from the conversation.',
    'Then pick up to three high-frequency, native, reusable English words or phrases from the real session. Briefly say what each one means or when it is useful. Prefer language worth reusing in daily conversation over rare or decorative vocabulary.',
    'Include up to two meaningful corrections from the session, not a long correction dump. End with one concise CEFR range and one next focus based on the English actually produced in the session.',
    'If the conversation organically moved beyond the original theme into a useful real topic, keep that as part of the wrap-up. English conversation is also a place for kedy to organize thoughts, discover interests, and make small decisions; do not dismiss that value as off-topic.',
    'For structured THEME, this does not cancel the phase lock before FREE TALK. Finish the required phases unless kedy explicitly switches mode, but once FREE TALK is reached, natural exploration may continue beyond the original prompt.',
    'Never invent XP, facts, corrections, or discoveries. State an XP number only when exact Flowz session context provides it; otherwise say Flowz will record XP when kedy returns to the app.'
  ].join(' ');
}

function reflectionRoutingRule(){
  return [
    'Flowz Post-Session Reflection Router r18:',
    'After the learning recap is finished, Japanese comments from kedy about the session are post-session reflection or feedback, not English answers to grade, translate, or correct.',
    'When connected Notion tools are available, route each reflected item to the existing canonical place that actually owns it: coach behavior or future conversation rules -> Flowz Coach Rules; UI, sync, feature, bug, or code-required request -> Flowz Implementation Feedback under OPEN; project-specific decision or current state -> that existing project source; daily discovery, feeling, or insight -> today\'s existing Diary; other reusable general information -> the existing Memo database or closest existing canonical note.',
    'Do not dump the same note into every destination. Deduplicate against existing content and update the smallest matching item or section in place.',
    'After every write, re-fetch the same destination and verify the requested content before saying it was saved, synced, recorded, or complete. If a required write or verification fails, say so explicitly instead of pretending it succeeded.',
    'For code-required feedback during an ordinary learning session, record the request in Flowz Implementation Feedback rather than editing GitHub automatically. Modify GitHub only when kedy explicitly asks for a GitHub or code change.'
  ].join(' ');
}

function enhancePrompt(prompt,pending){
  if(!prompt||!pending||pending.profile!=='kedy')return prompt;
  if(prompt.indexOf('Flowz Post-Session Reflection Router r18:')<0){
    prompt=prompt+' '+reflectionRoutingRule();
  }
  if((pending.mode==='commute'||pending.mode==='free')&&prompt.indexOf('Flowz Whole-Session Wrap Guard r18:')<0){
    prompt=prompt+' '+wrapQualityRule();
  }
  return prompt;
}

function applyReleaseMarker(){
  if(!window.FlowzApp)return;
  var release=window.FlowzApp.release;
  if(release){
    release.number='4.8.6-r18';
    release.label='v4.8.6 r18 · 09/11';
    release.title='Flowz v4.8.6 · Duo Battle';
    release.footer='✅ Last updated 2026.09.11 · Flowz v4.8.6 r18';
  }
  if(document.documentElement)document.documentElement.setAttribute('data-flowz-release','4.8.6-r18');
  var version=document.querySelector('.version');
  if(version){
    version.setAttribute('data-release','4.8.6-r18');
    version.setAttribute('data-release-label','v4.8.6 r18 · 09/11');
    version.textContent='v4.8.6 r18 · 09/11';
  }
  var footer=document.querySelector('.release-footer');
  if(footer)footer.textContent='✅ Last updated 2026.09.11 · Flowz v4.8.6 r18';
}

function patchApp(){
  if(!window.FlowzApp)return;
  var originalBuild=window.FlowzApp.buildPromptFor;
  if(typeof originalBuild==='function'&&!originalBuild.__flowzWrapR18){
    var wrapped=function(p){return enhancePrompt(originalBuild(p),p)};
    wrapped.__flowzWrapR18=true;
    window.FlowzApp.buildPromptFor=wrapped;
  }
  applyReleaseMarker();
}

patchApp();
window.addEventListener('pageshow',applyReleaseMarker);

})();

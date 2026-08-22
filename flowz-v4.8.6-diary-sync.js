/* Flowz v4.8.6 — verified Diary sync gate.
 * Strengthens kedy session prompts so Wrap up is not considered complete
 * until the existing Diary page has been updated and re-fetched.
 */
(function(){
'use strict';

var VERSION='4.8.6';
var DATE='2026.8.22';

function enhanceDiaryPrompt(prompt,pending){
  if(!prompt||!pending||pending.profile!=='kedy')return prompt;
  if(prompt.indexOf('Diary Sync Gate v1:')>=0)return prompt;

  var rule=[
    'Diary Sync Gate v1:',
    "When kedy says 'Wrap up' or 'まとめて', the Diary write is a mandatory part of ending the session, not an optional follow-up.",
    "Before claiming the session is fully wrapped up, use connected Notion tools to find the existing Diary page whose 日付 matches the Flowz session date. Never create a new Diary page.",
    "Update the existing yellow 🗽 English Log block in place. Do not append a second English Log block when one already exists.",
    'Write a compact log containing: English diary 2–3 sentences about the actual conversation, one Phrase line, up to three Fix lines, and one Coach Assessment line with current CEFR/next focus when available.',
    'If the same Flowz session was already written, merge or replace that session log instead of duplicating it.',
    'After the write, fetch the same Diary page again and verify that the English Log contains the new session content.',
    "Only after that successful re-fetch may you say or imply that the Diary was recorded or that Wrap up is fully complete.",
    "If Notion tools are unavailable, permission is missing, the Diary page cannot be found, or verification fails, explicitly say 'Diary未記録' and provide the compact copy-ready English Log. Never claim it was saved.",
    'Do not skip the Diary write because the spoken recap, XP result, TOEIC result, or coaching feedback has already finished.'
  ].join(' ');

  return prompt+' '+rule;
}

function patchRelease(){
  if(!window.FlowzApp||!window.FlowzApp.release)return;
  window.FlowzApp.release.number=VERSION;
  window.FlowzApp.release.label='v'+VERSION+' ('+DATE+')';
  window.FlowzApp.release.title='Flowz v'+VERSION+' · Duo Battle';
  window.FlowzApp.release.footer='✅ Last updated 2026.08.22 · Flowz v'+VERSION+' Unified Build';

  var originalBuild=window.FlowzApp.buildPromptFor;
  if(typeof originalBuild==='function'&&!originalBuild.__flowz486){
    var wrapped=function(p){
      return enhanceDiaryPrompt(originalBuild(p),p);
    };
    wrapped.__flowz486=true;
    window.FlowzApp.buildPromptFor=wrapped;
  }
}

patchRelease();

})();

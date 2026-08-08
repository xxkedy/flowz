(function(){
'use strict';

var VERSION='v4.3.8 (2026.8.6)';
var FOOTER='✅ Last updated 2026.08.06 · Flowz v4.3.8 TOEIC Check Voice 5Q';
var PENDING_KEY='flowz_duo_pending';
var TOEIC_RESULTS_KEY='flowz_toeic_results_v1';
var TOEIC_CAPTURE_KEY='flowz_toeic_capture_due_v1';
var scheduled=false;
var replacingModal=false;

function parse(raw){try{return raw?JSON.parse(raw):null}catch(e){return null}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
function text(el,value){if(el&&el.textContent!==String(value))el.textContent=String(value)}
function profile(){return document.body&&document.body.getAttribute('data-profile')==='leni'?'leni':'kedy'}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function safe(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function loadResults(){var rows=parse(localStorage.getItem(TOEIC_RESULTS_KEY));return Array.isArray(rows)?rows:[]}

function buildToeicPrompt(pending){
  var mission=pending.mission||{};
  return [
    "You are kedy's TOEIC coach in Flowz Duo Battle. He is a Japanese beginner using voice mode, usually while taking a bath.",
    "If kedy starts with a greeting or casual check-in, respond naturally for one short exchange first. Then ask, 'Ready for question one?' Do not begin the check until he answers.",
    "Run an original five-question TOEIC Listening & Reading mini-check in about five to eight minutes. Use three listening-style questions and two reading-style questions. Never copy official TOEIC questions.",
    "Use this exact mix: question 1 is a short-response listening item, question 2 is a short-conversation listening item, question 3 is a short-announcement listening item, question 4 is sentence completion, and question 5 is a very short passage question.",
    "Start one difficulty step above a basic beginner check. Use plausible distractors, slightly longer natural sentences, and common workplace vocabulary. Avoid questions where several choices could reasonably be correct.",
    "For future checks, use recent connected Notion TOEIC Check logs when available without delaying the opening. If the latest two completed checks are both four out of five or higher, increase difficulty by one small step. Otherwise keep the current level. Do not change difficulty sharply from one result.",
    "Voice Talk may hide earlier text when kedy speaks. Read every choice aloud once. For reading questions, also show the sentence or short passage and choices as visible text, but keep them short enough to remember after one reading.",
    "Present one question at a time. Speak each listening item once at natural speed. Do not repeat or explain before the answer. Let kedy answer A, B, C, or D aloud.",
    "During the five scored questions, do not correct, praise, reveal correctness, or teach. Quietly record each answer and continue. If he asks how many remain, answer briefly and continue. If he asks to stop, score only the completed questions and clearly label the check incomplete; do not estimate a TOEIC band from an incomplete check.",
    "After question five, give Listening score out of three, Reading score out of two, total out of five, missed questions with very short Japanese explanations, and a broad estimated TOEIC L&R score band. Never claim an official or exact score. For one result, use a band about 150 points wide and label confidence LOW. If connected Notion contains at least three recent completed five-question TOEIC Check results, combine the latest three and you may narrow the estimate to about a 100-point band with MEDIUM confidence.",
    "Keep TOEIC scoring separate from conversation CEFR and separate from Flowz XP. XP is only for consistency and game progress.",
    "Today's useful phrase is: \""+(mission.phrase||'Has the meeting been moved?')+"\". Meaning: "+(mission.meaning||'会議は変更されましたか')+". After scoring, use it in one short practical example, but do not use it as a scored question unless it fits naturally.",
    "Say the result once in this exact compact format so kedy can enter it in Flowz: FLOWZ TOEIC RESULT: Lx/3 Ry/2. Then give the normal explanation.",
    "At the end, use connected Notion tools to find today's existing Diary page by date. Append a TOEIC Check log with date, Listening /3, Reading /2, Total /5, estimated band, confidence, and up to three weak areas. Do not create a new Diary page. Fetch the page again to verify the update. If Notion is unavailable, clearly say it was not recorded and output copy-ready text.",
    "Do not update GitHub for an ordinary TOEIC learning session."
  ].join(' ');
}

function startToeicCheck(event){
  if(profile()!=='kedy'||!event.target||!event.target.closest||!event.target.closest('#startBtn'))return;
  var pending=parse(localStorage.getItem(PENDING_KEY));
  if(!pending||pending.profile!=='kedy'||pending.mode!=='toeic'||pending.startedAt)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  pending.startedAt=new Date().toISOString();
  pending.autoRecord=true;
  save(PENDING_KEY,pending);
  var prompt=buildToeicPrompt(pending);
  try{navigator.clipboard.writeText(prompt)}catch(e){}
  location.href='https://chatgpt.com/?q='+encodeURIComponent(prompt);
}

function normalizedScore(row){
  var total=Number(row&&row.total)||0;
  var max=Number(row&&row.maxTotal)||12;
  if(max<=0)return 0;
  return Math.max(0,Math.min(1,total/max));
}
function estimate(rows){
  if(!rows.length)return null;
  var recent=rows.slice(-3),sum=0;
  recent.forEach(function(row){sum+=normalizedScore(row)});
  var accuracy=sum/recent.length;
  var corrected=Math.max(0,Math.min(1,(accuracy-.25)/.75));
  var center=150+700*corrected;
  var halfWidth=recent.length>=3?50:75;
  var low=Math.max(10,Math.round((center-halfWidth)/10)*10);
  var high=Math.min(990,Math.round((center+halfWidth)/10)*10);
  return {band:low+'–'+high,confidence:recent.length>=3?'MEDIUM':'LOW'};
}

function renderEstimate(){
  if(profile()!=='kedy')return;
  var panel=document.getElementById('flowzAssessment');if(!panel)return;
  var stats=panel.querySelectorAll('.stat'),note=panel.querySelector('.note'),result=estimate(loadResults());
  if(stats[0])stats[0].innerHTML='<b>A1→A2</b><span>CURRENT CEFR</span>';
  if(stats[1])stats[1].innerHTML=result?'<b>'+safe(result.band)+'</b><span>TOEIC EST. · '+result.confidence+'</span>':'<b>NOT TESTED</b><span>TOEIC EST.</span>';
  if(stats[2])stats[2].innerHTML='<b>毎回更新</b><span>VOICE REVIEW</span>';
  if(note)note.textContent='mikan＝単語30問／TOEIC STUDY＝5問練習／TOEIC CHECK＝L3＋R2の5問推定。スコアは非公式の目安。';
  bindResultButton(panel);
}

function options(max){var html='';for(var i=0;i<=max;i++)html+='<option value="'+i+'">'+i+' / '+max+'</option>';return html}
function showToeicModal(){
  var existing=document.getElementById('flowzToeicModal');if(existing)existing.remove();
  var modal=document.createElement('div');modal.id='flowzToeicModal';modal.dataset.flowz438='1';
  modal.innerHTML='<div class="toeic-sheet"><h3>🎯 TOEIC CHECK RESULT</h3><p>ChatGPTの最後に出た「Lx/3・Ry/2」を入れる。5問の結果をFlowz内の推定帯へ反映する。</p><div class="toeic-inputs"><label>LISTENING<select id="flowzToeicL">'+options(3)+'</select></label><label>READING<select id="flowzToeicR">'+options(2)+'</select></label></div><div class="toeic-actions"><button class="toeic-cancel" type="button">あとで</button><button class="toeic-save" type="button">SAVE RESULT</button></div></div>';
  document.body.appendChild(modal);
  modal.querySelector('.toeic-cancel').addEventListener('click',function(){modal.remove()});
  modal.querySelector('.toeic-save').addEventListener('click',function(){
    var listening=Number(document.getElementById('flowzToeicL').value);
    var reading=Number(document.getElementById('flowzToeicR').value);
    var rows=loadResults();
    rows.push({date:today(),listening:listening,reading:reading,total:listening+reading,maxListening:3,maxReading:2,maxTotal:5,format:'toeic-check-5q',at:new Date().toISOString()});
    save(TOEIC_RESULTS_KEY,rows.slice(-20));
    try{sessionStorage.removeItem(TOEIC_CAPTURE_KEY)}catch(e){}
    modal.remove();
    renderEstimate();
  });
}
function bindResultButton(panel){
  var old=document.getElementById('flowzToeicResultBtn');
  if(old&&old.dataset.flowz438==='1')return;
  var button=old?old.cloneNode(true):document.createElement('button');
  button.id='flowzToeicResultBtn';button.type='button';button.dataset.flowz438='1';button.textContent='TOEIC CHECK結果を入力（L/3・R/2）';
  if(old)old.replaceWith(button);else panel.appendChild(button);
  button.addEventListener('click',showToeicModal);
}
function replaceLegacyModal(){
  if(replacingModal)return;
  var modal=document.getElementById('flowzToeicModal');
  if(!modal||modal.dataset.flowz438==='1')return;
  if(!/Lx\/6|\/ 6|L\/6|R\/6/.test(modal.textContent||''))return;
  replacingModal=true;
  modal.remove();
  showToeicModal();
  replacingModal=false;
}

function updateLabels(){
  if(profile()!=='kedy')return;
  document.querySelectorAll('#modes .mode').forEach(function(button){
    var title=button.querySelector('b');
    if(!title||title.textContent.trim()!=='TOEIC CHECK')return;
    text(button.querySelector('small'),'Voice 5Q · L3/R2 · 5–8min');
    text(button.querySelector('.icon'),'🎯🎤');
  });
  var pending=parse(localStorage.getItem(PENDING_KEY));
  if(pending&&pending.profile==='kedy'&&pending.mode==='toeic'){
    text(document.getElementById('missionGuide'),'Voice 5問チェック。Listening 3問＋Reading 2問を約5〜8分で採点。');
    text(document.getElementById('startBtn'),'START TOEIC CHECK · 5Q');
  }
}
function applyVersion(){
  text(document.querySelector('.version'),VERSION);
  if(document.title!=='Flowz v4.3.8 · Duo Battle')document.title='Flowz v4.3.8 · Duo Battle';
  document.querySelectorAll('body>.note').forEach(function(note){if(/Last updated/i.test(note.textContent||''))text(note,FOOTER)});
}
function apply(){scheduled=false;updateLabels();renderEstimate();replaceLegacyModal();applyVersion()}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(apply,0)}

window.addEventListener('click',startToeicCheck,true);
apply();
document.addEventListener('DOMContentLoaded',function(){apply();setTimeout(apply,120);setTimeout(apply,700);setTimeout(replaceLegacyModal,900)});
window.addEventListener('pageshow',function(){setTimeout(apply,50);setTimeout(apply,500)});
document.addEventListener('click',function(event){if(event.target&&event.target.closest&&event.target.closest('.profile-btn,.mode'))setTimeout(schedule,30)});
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-profile','class']});
setInterval(function(){if(document.visibilityState==='visible')apply()},1000);

})();

(function(){
'use strict';

var VERSION='v4.2 (2026.8.6)';
var CLOUD_KEY='flowz_duo_cloud_v1';
var PENDING_KEY='flowz_duo_pending';
var TOEIC_RESULTS_KEY='flowz_toeic_results_v1';
var TOEIC_CAPTURE_KEY='flowz_toeic_capture_due_v1';
var scheduled=false;
var lastProfile='';

function parse(raw){try{return raw?JSON.parse(raw):null}catch(e){return null}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
function activeProfile(){return document.body&&document.body.dataset.profile==='leni'?'leni':'kedy'}
function setText(el,value){if(el&&el.textContent!==String(value))el.textContent=String(value)}
function safe(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}

/* Capture the fact that a TOEIC check was completed before the older auto-record layer clears pending state. */
(function markToeicReturn(){
  var p=parse(localStorage.getItem(PENDING_KEY));
  if(!p||p.profile!=='kedy'||p.mode!=='toeic'||!p.startedAt)return;
  var elapsed=Date.now()-new Date(p.startedAt).getTime();
  if(!isFinite(elapsed)||elapsed<60000)return;
  try{sessionStorage.setItem(TOEIC_CAPTURE_KEY,JSON.stringify({date:today(),startedAt:p.startedAt}))}catch(e){}
})();

function addStyles(){
  if(document.getElementById('flowzV42Styles'))return;
  var style=document.createElement('style');
  style.id='flowzV42Styles';
  style.textContent=
    '#flowzCloudPanel.flowz-duo-bottom{margin-top:18px}'+
    '#flowzCloudPanel.flowz-duo-compact{padding:10px 14px;border-color:#2d6f5a;background:#111716}'+
    '#flowzCloudPanel.flowz-duo-compact .cloud-head{margin:0;cursor:pointer}'+
    '#flowzCloudPanel.flowz-duo-compact:not(.expanded) .cloud-message,'+
    '#flowzCloudPanel.flowz-duo-compact:not(.expanded) .cloud-code,'+
    '#flowzCloudPanel.flowz-duo-compact:not(.expanded) .cloud-members,'+
    '#flowzCloudPanel.flowz-duo-compact:not(.expanded) .cloud-latest,'+
    '#flowzCloudPanel.flowz-duo-compact:not(.expanded) .cloud-note{display:none}'+
    '#flowzCloudPanel.flowz-duo-compact .cloud-title{font-size:12px}'+
    '#flowzCloudPanel.flowz-duo-compact .cloud-status{padding:5px 8px;font-size:9px}'+
    '#flowzCloudPanel .flowz-active-profile{margin-left:auto;margin-right:6px;color:#8fd9bd;font-size:9px;font-weight:900;letter-spacing:.08em}'+
    '#flowzToeicResultBtn{display:block;width:100%;margin-top:12px;padding:11px;border:1px solid #3c4249;border-radius:12px;background:#191d22;color:#f5f0e7;font:850 12px/1 -apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif}'+
    '#flowzToeicModal{position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:16px;background:rgba(0,0,0,.72)}'+
    '#flowzToeicModal .toeic-sheet{width:min(520px,100%);padding:18px;border:1px solid #484d55;border-radius:20px;background:#111418;color:#f5f0e7;box-shadow:0 20px 70px rgba(0,0,0,.55)}'+
    '#flowzToeicModal h3{margin:0 0 7px;font-size:18px}'+
    '#flowzToeicModal p{margin:0 0 14px;color:#9ea5ae;font-size:12px;line-height:1.55}'+
    '#flowzToeicModal .toeic-inputs{display:grid;grid-template-columns:1fr 1fr;gap:10px}'+
    '#flowzToeicModal label{display:grid;gap:7px;color:#aeb5bd;font-size:11px;font-weight:850}'+
    '#flowzToeicModal select{width:100%;min-height:48px;border:1px solid #3b4149;border-radius:12px;background:#1b1f25;color:#fff;font-size:18px;text-align:center}'+
    '#flowzToeicModal .toeic-actions{display:grid;grid-template-columns:1fr 2fr;gap:10px;margin-top:14px}'+
    '#flowzToeicModal button{min-height:46px;border:0;border-radius:12px;font-weight:900}'+
    '#flowzToeicModal .toeic-cancel{background:#242930;color:#b9c0c7}'+
    '#flowzToeicModal .toeic-save{background:linear-gradient(135deg,#ff9e2c,#ff7138);color:#111}';
  document.head.appendChild(style);
}

function syncSelectedProfile(){
  var cloud=parse(localStorage.getItem(CLOUD_KEY));
  if(!cloud||!cloud.roomId)return;
  var selected=activeProfile();
  if(!cloud.setupProfile)cloud.setupProfile=cloud.profile||selected;
  if(cloud.profile===selected&&lastProfile===selected)return;
  cloud.profile=selected;
  cloud.profileMode='selected-profile-v4.2';
  cloud.profileUpdatedAt=new Date().toISOString();
  save(CLOUD_KEY,cloud);
  lastProfile=selected;
  setTimeout(function(){
    var sync=document.querySelector('#flowzCloudPanel [data-cloud-action="sync"]');
    if(sync)sync.click();
  },260);
}

function moveAndCompactDuo(){
  var panel=document.getElementById('flowzCloudPanel');if(!panel)return;
  var notes=document.querySelectorAll('body>.note'),lastNote=notes.length?notes[notes.length-1]:null;
  if(lastNote&&panel.nextElementSibling!==lastNote)lastNote.parentNode.insertBefore(panel,lastNote);
  panel.classList.add('flowz-duo-bottom');
  var cloud=parse(localStorage.getItem(CLOUD_KEY))||{},connected=!!cloud.roomId;
  panel.classList.toggle('flowz-duo-compact',connected);
  if(!connected){panel.classList.remove('expanded');return}
  var head=panel.querySelector('.cloud-head'),title=panel.querySelector('.cloud-title'),status=panel.querySelector('.cloud-status');
  setText(title,'☁️ DUO LINKED');setText(status,'SYNC ON');
  var active=head&&head.querySelector('.flowz-active-profile');
  if(head&&!active){active=document.createElement('span');active.className='flowz-active-profile';head.insertBefore(active,status)}
  setText(active,'ACTIVE: '+activeProfile().toUpperCase());
  var message=panel.querySelector('.cloud-message');
  if(message)message.innerHTML='同期対象：<b>'+safe(activeProfile())+'</b>（上のプロフィール選択に連動）';
  var note=panel.querySelector('.cloud-note');
  if(note)note.textContent='初回連携後は自動同期。設定確認が必要な時だけこの欄を開く。';
  if(!panel.dataset.v42Bound){
    panel.dataset.v42Bound='1';
    panel.addEventListener('click',function(event){
      if(event.target&&event.target.closest&&event.target.closest('[data-cloud-action]'))return;
      if(event.target&&event.target.closest&&event.target.closest('.cloud-head'))panel.classList.toggle('expanded');
    });
  }
}

function updateModeTiles(){
  if(activeProfile()!=='kedy')return;
  var buttons=document.querySelectorAll('#modes .mode');if(buttons.length<4)return;
  var toeicTitle=buttons[1].querySelector('b'),toeicSub=buttons[1].querySelector('small');
  setText(toeicTitle,'TOEIC CHECK');setText(toeicSub,'12Q L/R estimate · 10min');
  var studyTitle=buttons[2].querySelector('b'),studySub=buttons[2].querySelector('small'),studyIcon=buttons[2].querySelector('.icon');
  setText(studyTitle,'TOEIC STUDY');setText(studySub,'Bath + screen · 15min');setText(studyIcon,'🛁📘');
}

function prepareSelectedMode(){
  var p=parse(localStorage.getItem(PENDING_KEY));if(!p||p.profile!=='kedy')return;
  if(p.mode==='bath'){
    p.title='TOEIC STUDY';
    p.mission={theme:'Bath TOEIC practice',phrase:'Let me check the schedule.',meaning:'予定を確認させて',guide:'Use screen and audio. Learn the pattern, not just the word.'};
    save(PENDING_KEY,p);
    setText(document.getElementById('missionMode'),'TOEIC STUDY');
    setText(document.getElementById('missionTheme'),'Bath TOEIC practice');
    setText(document.getElementById('missionPhrase'),'Let me check the schedule.');
    setText(document.getElementById('missionMeaning'),'予定を確認させて');
    setText(document.getElementById('missionGuide'),'Use screen and audio. mikan stays the vocabulary routine.');
    setText(document.getElementById('startBtn'),'START TOEIC STUDY');
  }else if(p.mode==='toeic'){
    p.title='TOEIC CHECK';save(PENDING_KEY,p);setText(document.getElementById('missionMode'),'TOEIC CHECK');
  }
}

function loadToeicResults(){var rows=parse(localStorage.getItem(TOEIC_RESULTS_KEY));return Array.isArray(rows)?rows:[]}
function estimate(rows){
  if(!rows.length)return null;
  var recent=rows.slice(-3),sum=0;recent.forEach(function(r){sum+=Number(r.total)||0});
  var avg=sum/recent.length,corrected=Math.max(0,(avg-3)/9),center=150+700*corrected,width=recent.length>=3?50:75;
  var low=Math.max(10,Math.round((center-width)/10)*10),high=Math.min(990,Math.round((center+width)/10)*10);
  return {band:low+'–'+high,confidence:recent.length>=3?'MEDIUM':'LOW',count:recent.length,average:avg};
}
function renderToeicEstimate(){
  if(activeProfile()!=='kedy')return;
  var panel=document.getElementById('flowzAssessment');if(!panel)return;
  var stats=panel.querySelectorAll('.stat'),note=panel.querySelector('.note'),result=estimate(loadToeicResults());
  if(stats[0])stats[0].innerHTML='<b>A1→A2</b><span>CURRENT CEFR</span>';
  if(stats[1])stats[1].innerHTML=result?'<b>'+safe(result.band)+'</b><span>TOEIC EST. · '+result.confidence+'</span>':'<b>NOT TESTED</b><span>TOEIC EST.</span>';
  if(stats[2])stats[2].innerHTML='<b>毎回更新</b><span>VOICE REVIEW</span>';
  if(note)note.textContent='mikan＝単語30問／TOEIC STUDY＝問題演習／TOEIC CHECK＝推定。スコアは非公式の目安。';
  var button=document.getElementById('flowzToeicResultBtn');
  if(!button){button=document.createElement('button');button.id='flowzToeicResultBtn';button.type='button';button.textContent='TOEIC CHECK結果を入力';button.addEventListener('click',showToeicModal);panel.appendChild(button)}
}

function options(){var html='';for(var i=0;i<=6;i++)html+='<option value="'+i+'">'+i+' / 6</option>';return html}
function showToeicModal(){
  if(document.getElementById('flowzToeicModal'))return;
  var modal=document.createElement('div');modal.id='flowzToeicModal';
  modal.innerHTML='<div class="toeic-sheet"><h3>🎯 TOEIC CHECK RESULT</h3><p>ChatGPTの最後に出た「Lx/6・Ry/6」を入れる。Flowz内の推定帯へ反映する。</p><div class="toeic-inputs"><label>LISTENING<select id="flowzToeicL">'+options()+'</select></label><label>READING<select id="flowzToeicR">'+options()+'</select></label></div><div class="toeic-actions"><button class="toeic-cancel" type="button">あとで</button><button class="toeic-save" type="button">SAVE RESULT</button></div></div>';
  document.body.appendChild(modal);
  modal.querySelector('.toeic-cancel').addEventListener('click',function(){modal.remove()});
  modal.querySelector('.toeic-save').addEventListener('click',function(){
    var listening=Number(document.getElementById('flowzToeicL').value),reading=Number(document.getElementById('flowzToeicR').value),rows=loadToeicResults();
    rows.push({date:today(),listening:listening,reading:reading,total:listening+reading,at:new Date().toISOString()});
    rows=rows.slice(-20);save(TOEIC_RESULTS_KEY,rows);
    try{sessionStorage.removeItem(TOEIC_CAPTURE_KEY)}catch(e){}
    modal.remove();renderToeicEstimate();
  });
}
function maybeShowToeicCapture(){
  var due=null;try{due=parse(sessionStorage.getItem(TOEIC_CAPTURE_KEY))}catch(e){}
  if(due&&activeProfile()==='kedy')setTimeout(showToeicModal,650);
}

function updateVersion(){
  setText(document.querySelector('.version'),VERSION);
  document.title='Flowz v4.2 · Duo Battle';
  var notes=document.querySelectorAll('body>.note');
  if(notes.length)setText(notes[notes.length-1],'✅ Last updated 2026.08.06 · Flowz v4.2 Profile Sync + TOEIC Study');
}
function apply(){
  scheduled=false;addStyles();syncSelectedProfile();moveAndCompactDuo();updateModeTiles();prepareSelectedMode();renderToeicEstimate();updateVersion();
}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(apply,0)}

document.addEventListener('DOMContentLoaded',function(){schedule();setTimeout(schedule,1200);maybeShowToeicCapture()});
window.addEventListener('pageshow',function(){schedule();maybeShowToeicCapture()});
document.addEventListener('click',function(event){
  if(event.target&&event.target.closest&&event.target.closest('.profile-btn,.mode'))setTimeout(function(){schedule();prepareSelectedMode()},60);
});
window.addEventListener('storage',schedule);
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-profile','class']});

})();

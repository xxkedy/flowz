(function(){
'use strict';

var QUICK_PARAM='quick';
var QUICK_VALUE='commute';
var QUICK_ONCE_KEY='flowz_quick_commute_once';
var PENDING_KEY='flowz_duo_pending';

function parse(raw){
  try{return raw?JSON.parse(raw):null}catch(e){return null}
}

function quickFromUrl(){
  try{return new URLSearchParams(location.search).get(QUICK_PARAM)===QUICK_VALUE}catch(e){return false}
}

function quickArmed(){
  try{return sessionStorage.getItem(QUICK_ONCE_KEY)==='1'}catch(e){return false}
}

function armQuick(){
  try{sessionStorage.setItem(QUICK_ONCE_KEY,'1')}catch(e){}
}

function disarmQuick(){
  try{sessionStorage.removeItem(QUICK_ONCE_KEY)}catch(e){}
}

function cleanQuickUrl(){
  try{
    var url=new URL(location.href);
    url.searchParams.delete(QUICK_PARAM);
    url.searchParams.set('profile','kedy');
    history.replaceState(null,'',url.pathname+'?'+url.searchParams.toString()+url.hash);
  }catch(e){}
}

function ensureKedy(){
  var button=document.querySelector('.profile-btn[data-profile="kedy"]');
  if(button&&!button.classList.contains('active'))button.click();
}

function beginCommute(){
  ensureKedy();
  setTimeout(function(){
    var modes=document.querySelectorAll('#modes .mode');
    var start=document.getElementById('startBtn');
    if(!modes.length||!start){
      setTimeout(beginCommute,80);
      return;
    }

    /* Tapping quick start intentionally replaces an unfinished mission. */
    modes[0].click();

    setTimeout(function(){
      var pending=parse(localStorage.getItem(PENDING_KEY));
      if(!pending||pending.profile!=='kedy'||pending.mode!=='commute'){
        setTimeout(beginCommute,80);
        return;
      }
      disarmQuick();
      document.getElementById('startBtn').click();
    },60);
  },40);
}

function addQuickButton(){
  if(document.getElementById('quickCommuteBtn'))return;
  var panel=document.querySelector('.session-panel');
  var modes=document.getElementById('modes');
  if(!panel||!modes)return;

  var style=document.createElement('style');
  style.textContent=
    '#quickCommuteBtn{width:100%;margin:12px 0 14px;padding:15px 16px;border:0;border-radius:15px;background:linear-gradient(135deg,#ff9e2c,#ff7138);color:#111;font:900 15px/1 -apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif;letter-spacing:.03em;box-shadow:0 8px 24px rgba(255,126,44,.24)}'+
    '#quickCommuteBtn small{display:block;margin-top:7px;font-size:11px;font-weight:750;letter-spacing:.01em;opacity:.72}'+
    'body[data-profile="leni"] #quickCommuteBtn{display:none}';
  document.head.appendChild(style);

  var button=document.createElement('button');
  button.id='quickCommuteBtn';
  button.type='button';
  button.innerHTML='⚡ QUICK COMMUTE<small>Skip profile check and mission setup</small>';
  button.addEventListener('click',function(){
    armQuick();
    beginCommute();
  });
  panel.insertBefore(button,modes);
}

function updateVersion(){
  var version=document.querySelector('.version');
  if(version)version.textContent='v3.5 (2026.8.5)';
}

function init(){
  addQuickButton();
  updateVersion();

  if(quickFromUrl()){
    armQuick();
    cleanQuickUrl();
  }

  if(quickArmed()){
    setTimeout(beginCommute,180);
  }
}

document.addEventListener('DOMContentLoaded',init);
window.addEventListener('pageshow',function(){setTimeout(function(){addQuickButton();updateVersion()},0)});
document.addEventListener('click',function(e){
  if(e.target.closest&&e.target.closest('.profile-btn'))setTimeout(addQuickButton,0);
});

})();

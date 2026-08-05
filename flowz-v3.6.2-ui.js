(function(){
'use strict';

var VERSION='v3.7 (2026.8.6)';
var LABELS={kedy:'🌙 kedy',leni:'☀️ Leni'};
var scheduled=false;

function currentProfile(){
  return document.body&&document.body.getAttribute('data-profile')==='leni'?'leni':'kedy';
}

function setText(selector,text){
  var el=document.querySelector(selector);
  if(el&&el.textContent!==text)el.textContent=text;
}

function setElementText(el,text){
  if(el&&el.textContent!==text)el.textContent=text;
}

function apply(){
  scheduled=false;
  setText('.profile-btn[data-profile="kedy"] .pname',LABELS.kedy);
  setText('.profile-btn[data-profile="leni"] .pname',LABELS.leni);
  setText('.fighter:first-child .fighter-name',LABELS.kedy);
  setText('.fighter.right .fighter-name',LABELS.leni);

  var profile=currentProfile();
  setText('#heroName',LABELS[profile]);
  setText('.version',VERSION);

  document.querySelectorAll('#flowzCloudPanel .cloud-member').forEach(function(el){
    var text=el.textContent||'';
    if(/kedy/i.test(text))setElementText(el,(text.indexOf('✓')>=0?'✓ ':'')+LABELS.kedy);
    else if(/Leni/i.test(text))setElementText(el,(text.indexOf('✓')>=0?'✓ ':'')+LABELS.leni);
  });
}

function scheduleApply(){
  if(scheduled)return;
  scheduled=true;
  setTimeout(apply,0);
}

document.addEventListener('DOMContentLoaded',scheduleApply);
window.addEventListener('pageshow',scheduleApply);
document.addEventListener('click',function(event){
  if(event.target.closest&&event.target.closest('.profile-btn'))scheduleApply();
});

var observer=new MutationObserver(scheduleApply);
document.addEventListener('DOMContentLoaded',function(){
  if(document.body)observer.observe(document.body,{attributes:true,attributeFilter:['data-profile'],subtree:true,childList:true,characterData:true});
});

})();

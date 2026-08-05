(function(){
'use strict';

var VERSION='v3.6.2 (2026.8.6)';
var LABELS={kedy:'🌙 kedy',leni:'☀️ Leni'};

function currentProfile(){
  return document.body&&document.body.getAttribute('data-profile')==='leni'?'leni':'kedy';
}

function setText(selector,text){
  var el=document.querySelector(selector);
  if(el&&el.textContent!==text)el.textContent=text;
}

function apply(){
  setText('.profile-btn[data-profile="kedy"] .pname',LABELS.kedy);
  setText('.profile-btn[data-profile="leni"] .pname',LABELS.leni);
  setText('.fighter:first-child .fighter-name',LABELS.kedy);
  setText('.fighter.right .fighter-name',LABELS.leni);

  var profile=currentProfile();
  setText('#heroName',LABELS[profile]);
  setText('.version',VERSION);

  document.querySelectorAll('#flowzCloudPanel .cloud-member').forEach(function(el){
    var text=el.textContent||'';
    if(/kedy/i.test(text))el.textContent=(text.indexOf('✓')>=0?'✓ ':'')+LABELS.kedy;
    else if(/Leni/i.test(text))el.textContent=(text.indexOf('✓')>=0?'✓ ':'')+LABELS.leni;
  });
}

document.addEventListener('DOMContentLoaded',function(){setTimeout(apply,0)});
window.addEventListener('pageshow',function(){setTimeout(apply,0)});
document.addEventListener('click',function(event){
  if(event.target.closest&&event.target.closest('.profile-btn'))setTimeout(apply,0);
});

var observer=new MutationObserver(function(){setTimeout(apply,0)});
document.addEventListener('DOMContentLoaded',function(){
  if(document.body)observer.observe(document.body,{attributes:true,attributeFilter:['data-profile'],subtree:true,childList:true,characterData:true});
});

})();

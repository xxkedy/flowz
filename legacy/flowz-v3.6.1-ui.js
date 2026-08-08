(function(){
'use strict';

var VERSION='v3.6.1 (2026.8.5)';

function isKedy(){
  return document.body && document.body.getAttribute('data-profile')!=='leni';
}

function apply(){
  var flag=document.querySelector('.profile-btn[data-profile="kedy"] .pflag');
  if(flag)flag.remove();

  var hero=document.getElementById('heroName');
  if(hero&&isKedy())hero.textContent='kedy';

  var version=document.querySelector('.version');
  if(version)version.textContent=VERSION;
}

document.addEventListener('DOMContentLoaded',function(){setTimeout(apply,0)});
window.addEventListener('pageshow',function(){setTimeout(apply,0)});
document.addEventListener('click',function(event){
  if(event.target.closest&&event.target.closest('.profile-btn'))setTimeout(apply,0);
});

var observer=new MutationObserver(function(){
  if(isKedy()){
    var hero=document.getElementById('heroName');
    if(hero&&hero.textContent!=='kedy')hero.textContent='kedy';
  }
});

document.addEventListener('DOMContentLoaded',function(){
  if(document.body)observer.observe(document.body,{attributes:true,attributeFilter:['data-profile'],subtree:true,childList:true,characterData:true});
});

})();

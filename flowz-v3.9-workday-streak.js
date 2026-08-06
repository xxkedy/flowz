(function(){
'use strict';

var DATA_KEY='flowz_duo_data';
var VERSION='v3.9 (2026.8.6)';
var FOOTER='✅ Last updated 2026.08.06 · Flowz v3.9 Workday Streak';

function parse(raw){try{return raw?JSON.parse(raw):null}catch(e){return null}}
function dateKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function fromKey(key){var p=String(key).split('-').map(Number);return new Date(p[0],p[1]-1,p[2])}
function isWorkday(d){var day=d.getDay();return day!==0&&day!==6}
function previousWorkday(d){var x=new Date(d);do{x.setDate(x.getDate()-1)}while(!isWorkday(x));return x}
function nextWorkday(d){var x=new Date(d);do{x.setDate(x.getDate()+1)}while(!isWorkday(x));return x}
function hasStudy(days,key){var r=days&&days[key];return !!(r&&((Number(r.base)||0)+(Number(r.phrase)||0)+(Number(r.fix)||0)+(Number(r.duo)||0)>0||Number(r.count)>0))}
function studiedWorkdays(days){return Object.keys(days||{}).filter(function(key){return /^\d{4}-\d{2}-\d{2}$/.test(key)&&isWorkday(fromKey(key))&&hasStudy(days,key)}).sort()}
function currentRun(days){
  var keys=studiedWorkdays(days);if(!keys.length)return 0;
  var latest=fromKey(keys[keys.length-1]),today=new Date(),anchor;
  if(isWorkday(today))anchor=hasStudy(days,dateKey(today))?today:previousWorkday(today);
  else anchor=previousWorkday(today);
  if(dateKey(latest)!==dateKey(anchor))return 0;
  var count=0,cursor=new Date(anchor);
  while(hasStudy(days,dateKey(cursor))){count++;cursor=previousWorkday(cursor)}
  return count;
}
function bestRun(days){
  var keys=studiedWorkdays(days);if(!keys.length)return 0;
  var best=1,run=1;
  for(var i=1;i<keys.length;i++){
    var expected=dateKey(nextWorkday(fromKey(keys[i-1])));
    if(keys[i]===expected)run++;else run=1;
    if(run>best)best=run;
  }
  return best;
}
function setText(id,text){var el=document.getElementById(id);if(el&&el.textContent!==String(text))el.textContent=String(text)}
function render(){
  var state=parse(localStorage.getItem(DATA_KEY))||{},profiles=state.profiles||{},profile=document.body&&document.body.getAttribute('data-profile')==='leni'?'leni':'kedy';
  var data=profiles[profile]||{},days=data.days||{},sessions=Array.isArray(data.sessions)?data.sessions:[];
  if(profile==='kedy'){
    setText('streak',currentRun(days));setText('best',bestRun(days));setText('sessions',sessions.length);
    setText('streakLabel','WORKDAY RUN');setText('bestLabel','BEST RUN');setText('sessionsLabel','SESSIONS');
  }
  var version=document.querySelector('.version');if(version)version.textContent=VERSION;
  var footer=document.querySelector('body>.note:last-of-type');if(footer)footer.textContent=FOOTER;
  document.title='Flowz v3.9 · Duo Battle';
}
function schedule(){setTimeout(render,0);setTimeout(render,400);setTimeout(render,1400)}
document.addEventListener('DOMContentLoaded',schedule);
window.addEventListener('pageshow',schedule);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')schedule()});
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.profile-btn'))schedule()});
window.addEventListener('storage',schedule);
setInterval(function(){if(document.visibilityState==='visible')render()},5000);

})();

(function(){
'use strict';

var VERSION='v4.3.8 (2026.8.6)';
var FOOTER='✅ Last updated 2026.08.06 · Flowz v4.3.8 Unified UI Lock';
var scheduled=false;

function text(el,value){if(el&&el.textContent!==String(value))el.textContent=String(value)}
function profile(){return document.body&&document.body.getAttribute('data-profile')==='leni'?'leni':'kedy'}
function directModes(box){return Array.prototype.filter.call(box.children,function(el){return el.classList&&el.classList.contains('mode')})}
function titleOf(button){var el=button&&button.querySelector('b');return el?(el.textContent||'').trim():''}
function findButton(buttons,names){
  for(var i=0;i<buttons.length;i++)if(names.indexOf(titleOf(buttons[i]))>=0)return buttons[i];
  return null;
}
function label(box,id,value){
  var el=document.getElementById(id);
  if(!el){el=document.createElement('div');el.id=id}
  text(el,value);return el;
}
function mode(button,id,title,sub,icon){
  if(!button)return;
  if(id)button.id=id;
  text(button.querySelector('b'),title);
  text(button.querySelector('small'),sub);
  text(button.querySelector('.icon'),icon);
}
function styles(){
  if(document.getElementById('flowz438Unified'))return;
  var style=document.createElement('style');
  style.id='flowz438Unified';
  style.textContent='body[data-profile="kedy"] #modes{grid-template-columns:1fr 1fr}body[data-profile="kedy"] #modes .mode{display:block!important;min-height:84px}body[data-profile="kedy"] #modes .mode:first-child{display:none!important}body[data-profile="kedy"] #modes .mode b{line-height:1.05}body[data-profile="kedy"] #modes .mode small{display:block;max-width:80%;margin-top:7px;line-height:1.25}#flowzBathLabel,#flowzAnytimeLabel{grid-column:1/-1;margin:3px 2px -1px;color:#9aa1aa;font-size:10px;font-weight:900;letter-spacing:.12em}#flowzAnytimeLabel{margin-top:7px}#flowzReviewTile,#flowzFreeTile{grid-column:1/-1;min-height:70px}#flowzReviewTile{background:linear-gradient(145deg,#20c7cc,#16aeb8)!important;color:#012428!important}#flowzFreeTile{background:linear-gradient(145deg,#30363d,#20252b)!important;border:1px solid #4b555f!important;color:#f7f3e9!important}#flowzReviewTile small,#flowzFreeTile small{max-width:88%!important}';
  document.head.appendChild(style);
}
function ensureLayout(){
  if(profile()!=='kedy')return;
  var box=document.getElementById('modes');if(!box)return;
  var buttons=directModes(box);if(buttons.length<4)return;
  var commute=findButton(buttons,['COMMUTE'])||buttons[0];
  var toeic=findButton(buttons,['TOEIC CHECK','TOEIC'])||buttons[1];
  var study=findButton(buttons,['TOEIC STUDY','BATH'])||buttons[2];
  var review=document.getElementById('flowzReviewTile')||findButton(buttons,['REVIEW']);
  if(!review){review=buttons.filter(function(b){return b!==commute&&b!==toeic&&b!==study})[0]||buttons[3]}
  review.id='flowzReviewTile';
  var free=document.getElementById('flowzFreeTile')||findButton(buttons,['FREE']);
  if(!free||free===review){
    free=document.createElement('button');
    free.type='button';free.id='flowzFreeTile';free.className='mode m4';
    free.innerHTML='<b>FREE</b><small>Open conversation · 10min</small><span class="icon">🎲</span>';
  }
  mode(toeic,'','TOEIC CHECK','Voice 5Q · L3/R2 · 5–8min','🎯🎤');
  mode(study,'','TOEIC STUDY','Voice 5Q · 5–8min','🛁🎤');
  mode(review,'flowzReviewTile','REVIEW','Recent phrases · 3–5min','🔁');
  mode(free,'flowzFreeTile','FREE','Open conversation · 10min','🎲');
  var bath=label(box,'flowzBathLabel','🛁 BATH ROUTINE · mikan 30 → Flowz');
  var anytime=label(box,'flowzAnytimeLabel','🎲 ANYTIME · OPEN TALK');
  var desired=[commute,bath,toeic,study,review,anytime,free];
  var current=Array.prototype.slice.call(box.children);
  var same=current.length===desired.length&&desired.every(function(node,index){return current[index]===node});
  if(!same)desired.forEach(function(node){box.appendChild(node)});
}
function ensureVersion(){
  text(document.querySelector('.version'),VERSION);
  if(document.title!=='Flowz v4.3.8 · Duo Battle')document.title='Flowz v4.3.8 · Duo Battle';
  document.querySelectorAll('body>.note').forEach(function(note){
    if(/Last updated/i.test(note.textContent||''))text(note,FOOTER);
  });
}
function apply(){scheduled=false;styles();ensureLayout();ensureVersion()}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(apply,0)}

apply();
document.addEventListener('DOMContentLoaded',function(){
  apply();setTimeout(apply,120);setTimeout(apply,900);setTimeout(apply,2200);
  if(document.body)new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-profile','class']});
});
window.addEventListener('pageshow',function(){setTimeout(apply,50);setTimeout(apply,600)});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(apply,50)});
setInterval(function(){if(document.visibilityState==='visible')apply()},5000);

})();

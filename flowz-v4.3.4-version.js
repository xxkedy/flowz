(function(){
'use strict';
var VERSION='v4.3.4 (2026.8.6)';
function text(el,value){if(el&&el.textContent!==value)el.textContent=value}
function apply(){
  text(document.querySelector('.version'),VERSION);
  document.title='Flowz v4.3.4 · Duo Battle';
  var notes=document.querySelectorAll('body>.note');
  if(notes.length)text(notes[notes.length-1],'✅ Last updated 2026.08.06 · Flowz v4.3.4 Audio-first Commute');
}
document.addEventListener('DOMContentLoaded',function(){setTimeout(apply,150);setTimeout(apply,1100)});
window.addEventListener('pageshow',function(){setTimeout(apply,150)});
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.profile-btn,.mode,#flowzFreeTile,#flowzReviewTile'))setTimeout(apply,140)});
})();

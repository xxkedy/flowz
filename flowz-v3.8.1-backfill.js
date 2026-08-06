(function(){
'use strict';

var DATA_KEY='flowz_duo_data';
var BACKUP_KEY='flowz_duo_data_backup';
var VAULT_KEY='flowz_history_vault_v1';
var MARKER_KEY='flowz_backfill_2026_07_08_to_08_05_v1';
var DATES=['2026-07-08','2026-07-09','2026-07-10','2026-07-13','2026-07-14','2026-07-15','2026-07-16','2026-07-17','2026-07-20','2026-07-21','2026-07-22','2026-07-23','2026-07-24','2026-07-27','2026-07-28','2026-07-29','2026-07-30','2026-07-31','2026-08-03','2026-08-04','2026-08-05'];

function parse(raw){try{return raw?JSON.parse(raw):null}catch(e){return null}}
function blankProfile(){return {days:{},sessions:[]}}
function state(){
  var value=parse(localStorage.getItem(DATA_KEY))||{version:4,profiles:{kedy:blankProfile(),leni:blankProfile()},migrated:true,updatedAt:''};
  if(!value.profiles)value.profiles={};
  if(!value.profiles.kedy)value.profiles.kedy=blankProfile();
  if(!value.profiles.leni)value.profiles.leni=blankProfile();
  if(!value.profiles.kedy.days)value.profiles.kedy.days={};
  if(!Array.isArray(value.profiles.kedy.sessions))value.profiles.kedy.sessions=[];
  return value;
}
function sessionKey(s){return [s.date||'',s.mode||'',s.at||'',s.title||''].join('|')}
function applyBackfill(){
  if(localStorage.getItem(MARKER_KEY)==='done')return false;
  var value=state(),profile=value.profiles.kedy,seen={};
  profile.sessions.forEach(function(s){seen[sessionKey(s)]=true});
  DATES.forEach(function(date){
    var old=profile.days[date]||{};
    profile.days[date]={
      base:Math.max(Number(old.base)||0,10),
      phrase:Number(old.phrase)||0,
      fix:Number(old.fix)||0,
      duo:Number(old.duo)||0,
      count:Math.max(Number(old.count)||0,1),
      mode:old.mode||'commute'
    };
    var session={date:date,mode:'commute',title:'COMMUTE',theme:'Estimated weekday commute practice',phrase:'',xp:10,at:date+'T08:00:00+09:00',auto:true,estimated:true};
    var key=sessionKey(session);if(!seen[key]){seen[key]=true;profile.sessions.push(session)}
  });
  profile.sessions.sort(function(a,b){return String(a.at||a.date||'').localeCompare(String(b.at||b.date||''))});
  value.updatedAt=new Date().toISOString();
  var raw=JSON.stringify(value);
  try{
    var current=localStorage.getItem(DATA_KEY);if(current&&parse(current))localStorage.setItem(BACKUP_KEY,current);
    localStorage.setItem(DATA_KEY,raw);
    localStorage.setItem('flowz_duo_v3',raw);
    localStorage.setItem(VAULT_KEY,raw);
    localStorage.setItem(MARKER_KEY,'done');
  }catch(e){return false}
  return true;
}
function show(){
  var el=document.getElementById('historyBackfillNote');
  var anchor=document.getElementById('historyVaultNote');
  if(!anchor)return;
  if(!el){el=document.createElement('p');el.id='historyBackfillNote';el.className='note';anchor.insertAdjacentElement('afterend',el)}
  var text='✅ Estimated history restored · 2026.07.08–08.05 · 21 weekdays / 210 XP';
  if(el.textContent!==text)el.textContent=text;
}
function run(){
  var changed=applyBackfill();show();
  if(changed)setTimeout(function(){location.reload()},120);
}

document.addEventListener('DOMContentLoaded',function(){setTimeout(run,100)});
window.addEventListener('pageshow',function(){setTimeout(run,100)});

})();

(function(){
'use strict';

var DATA_KEY='flowz_duo_data';
var BACKUP_KEY='flowz_duo_data_backup';
var VAULT_KEY='flowz_history_vault_v1';
var SNAPSHOT_PREFIX='flowz_history_snapshot_';
var LOCK=false;

function parse(raw){try{return raw?JSON.parse(raw):null}catch(e){return null}}
function blankProfile(){return {days:{},sessions:[]}}
function blankState(){return {version:4,profiles:{kedy:blankProfile(),leni:blankProfile()},migrated:true,updatedAt:''}}
function normalizeRecord(r){
  r=r&&typeof r==='object'?r:{};
  return {base:Number(r.base)||0,phrase:Number(r.phrase)||0,fix:Number(r.fix)||0,duo:Number(r.duo)||0,count:Number(r.count)||0,mode:r.mode||''};
}
function normalizeProfile(p){
  var out=blankProfile(),days=p&&p.days&&typeof p.days==='object'?p.days:{};
  Object.keys(days).forEach(function(date){if(/^\d{4}-\d{2}-\d{2}$/.test(date))out.days[date]=normalizeRecord(days[date])});
  out.sessions=p&&Array.isArray(p.sessions)?p.sessions.filter(Boolean):[];
  return out;
}
function normalizeState(input){
  var source=input&&typeof input==='object'?input:{};
  if(source.days&&!source.profiles)source={profiles:{kedy:{days:source.days,sessions:source.sessions||[]},leni:blankProfile()}};
  return {version:4,profiles:{kedy:normalizeProfile(source.profiles&&source.profiles.kedy),leni:normalizeProfile(source.profiles&&source.profiles.leni)},migrated:true,updatedAt:source.updatedAt||''};
}
function recordXp(r){r=normalizeRecord(r);return r.base+r.phrase+r.fix+r.duo}
function score(state){
  state=normalizeState(state);var value=0;
  ['kedy','leni'].forEach(function(id){
    var p=state.profiles[id];
    Object.keys(p.days).forEach(function(date){value+=10000+recordXp(p.days[date])*10+(p.days[date].count||0)});
    value+=p.sessions.length*100;
  });
  return value;
}
function sessionKey(s){return [s.date||'',s.mode||'',s.at||s.completed_at||'',s.title||'',s.phrase||''].join('|')}
function mergeRecord(a,b){
  a=normalizeRecord(a);b=normalizeRecord(b);
  return {base:Math.max(a.base,b.base),phrase:Math.max(a.phrase,b.phrase),fix:Math.max(a.fix,b.fix),duo:Math.max(a.duo,b.duo),count:Math.max(a.count,b.count),mode:b.mode||a.mode||''};
}
function mergeState(a,b){
  var out=normalizeState(a),next=normalizeState(b);
  ['kedy','leni'].forEach(function(id){
    Object.keys(next.profiles[id].days).forEach(function(date){out.profiles[id].days[date]=mergeRecord(out.profiles[id].days[date],next.profiles[id].days[date])});
    var seen={};out.profiles[id].sessions.forEach(function(s){seen[sessionKey(s)]=true});
    next.profiles[id].sessions.forEach(function(s){var key=sessionKey(s);if(!seen[key]){seen[key]=true;out.profiles[id].sessions.push(s)}});
    out.profiles[id].sessions.sort(function(x,y){return String(x.at||x.completed_at||x.date||'').localeCompare(String(y.at||y.completed_at||y.date||''))});
  });
  out.updatedAt=new Date().toISOString();
  return out;
}
function legacyDates(value){
  var dates=[];
  if(Array.isArray(value))value.forEach(function(v){if(/^\d{4}-\d{2}-\d{2}$/.test(String(v)))dates.push(String(v))});
  return dates;
}
function stateFromDates(dates){
  var s=blankState();dates.forEach(function(date){s.profiles.kedy.days[date]={base:10,phrase:0,fix:0,duo:0,count:1,mode:'legacy'}});return s;
}
function candidates(){
  var list=[];
  [DATA_KEY,BACKUP_KEY,VAULT_KEY,'flowz_duo_v3','flowz_duo','flowz_data','flowz_history','flowz_records'].forEach(function(key){var value=parse(localStorage.getItem(key));if(value)list.push(value)});
  for(var i=0;i<localStorage.length;i++){
    var key=localStorage.key(i)||'';
    if(!/(flowz|tonight|mic|tm_)/i.test(key))continue;
    var raw=localStorage.getItem(key),value=parse(raw);
    if(value&&typeof value==='object')list.push(value);
    var dates=legacyDates(value);if(dates.length)list.push(stateFromDates(dates));
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw||''))list.push(stateFromDates([raw]));
  }
  var tm=parse(localStorage.getItem('tm_days'));if(tm)list.push(stateFromDates(legacyDates(tm)));
  var last=localStorage.getItem('tm_last');if(/^\d{4}-\d{2}-\d{2}$/.test(last||''))list.push(stateFromDates([last]));
  return list;
}
function save(state){
  var normalized=normalizeState(state),raw=JSON.stringify(normalized),today=new Date().toISOString().slice(0,10);
  try{
    var current=localStorage.getItem(DATA_KEY);if(current&&parse(current))localStorage.setItem(BACKUP_KEY,current);
    localStorage.setItem(DATA_KEY,raw);
    localStorage.setItem('flowz_duo_v3',raw);
    localStorage.setItem(VAULT_KEY,raw);
    localStorage.setItem(SNAPSHOT_PREFIX+today,raw);
  }catch(e){}
}
function protect(){
  if(LOCK)return false;LOCK=true;
  try{
    var merged=blankState();candidates().forEach(function(candidate){merged=mergeState(merged,candidate)});
    var current=parse(localStorage.getItem(DATA_KEY));
    var changed=score(merged)>score(current);
    save(merged);
    if(changed){try{sessionStorage.setItem('flowz_history_restored','1')}catch(e){}}
    return changed;
  }finally{LOCK=false}
}
function renderStatus(){
  var details=document.querySelector('.data-panel');if(!details)return;
  var note=document.getElementById('historyVaultNote');
  if(!note){note=document.createElement('p');note.id='historyVaultNote';note.className='note';details.insertAdjacentElement('afterend',note)}
  var state=normalizeState(parse(localStorage.getItem(DATA_KEY))),days=Object.keys(state.profiles.kedy.days).length,sessions=state.profiles.kedy.sessions.length;
  note.textContent='🛡️ HISTORY VAULT ON · kedy '+days+' days / '+sessions+' sessions protected';
}
function run(){var changed=protect();renderStatus();if(changed)setTimeout(function(){location.reload()},80)}

document.addEventListener('DOMContentLoaded',function(){setTimeout(run,0);setTimeout(run,1200)});
window.addEventListener('pageshow',function(){setTimeout(run,0)});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(run,0)});
window.addEventListener('storage',function(e){if(e.key&&/(flowz|tm_)/i.test(e.key))setTimeout(run,0)});
setInterval(function(){if(document.visibilityState==='visible')run()},10000);

})();

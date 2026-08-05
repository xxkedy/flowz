(function(){
'use strict';

var SUPABASE_URL='https://efnlwlnujhxkvifkooqy.supabase.co';
var SUPABASE_KEY='sb_publishable_3drPy_UK0ojzsan6wde_0Q_iYOMzo03';
var DATA_KEY='flowz_duo_data';
var BACKUP_KEY='flowz_duo_data_backup';
var CLOUD_KEY='flowz_duo_cloud_v1';
var SYNC_LOCK_KEY='flowz_duo_sync_lock';
var VERSION='v3.6 (2026.8.5)';
var client=null;
var authUser=null;
var channel=null;
var syncing=false;
var syncQueued=false;
var panelState={status:'loading',message:'Cloud接続を確認中…',members:[],latest:null};

function parse(raw){try{return raw?JSON.parse(raw):null}catch(e){return null}}
function currentProfile(){try{return new URLSearchParams(location.search).get('profile')==='leni'?'leni':'kedy'}catch(e){return 'kedy'}}
function loadCloud(){return parse(localStorage.getItem(CLOUD_KEY))||{}}
function saveCloud(value){try{localStorage.setItem(CLOUD_KEY,JSON.stringify(value||{}))}catch(e){}}
function loadState(){return parse(localStorage.getItem(DATA_KEY))}
function saveState(state){
  if(!state)return;
  try{
    var old=localStorage.getItem(DATA_KEY);
    if(old&&parse(old))localStorage.setItem(BACKUP_KEY,old);
    state.updatedAt=new Date().toISOString();
    var raw=JSON.stringify(state);
    localStorage.setItem(DATA_KEY,raw);
    localStorage.setItem('flowz_duo_v3',raw);
  }catch(e){}
}
function xpOf(record){return (record&&record.base||0)+(record&&record.phrase||0)+(record&&record.fix||0)+(record&&record.duo||0)}
function safeText(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function hash(value){
  var h=2166136261,s=String(value||'');
  for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0).toString(36);
}
function isoForDate(date){return date+'T12:00:00+09:00'}
function profileLabel(profile){return profile==='leni'?'Leni':'kedy'}
function modeLabel(row){return row&&row.title||row&&row.mode||'SESSION'}
function relativeTime(iso){
  var t=new Date(iso).getTime();if(!isFinite(t))return '';
  var sec=Math.max(0,Math.floor((Date.now()-t)/1000));
  if(sec<60)return 'たった今';
  var min=Math.floor(sec/60);if(min<60)return min+'分前';
  var hour=Math.floor(min/60);if(hour<24)return hour+'時間前';
  var day=Math.floor(hour/24);return day+'日前';
}
function toast(message){
  var el=document.getElementById('toast');
  if(!el)return;
  el.textContent=message;el.classList.add('show');
  setTimeout(function(){el.classList.remove('show')},1800);
}
function setPanel(status,message,extra){
  panelState.status=status;panelState.message=message||'';
  if(extra){if(extra.members)panelState.members=extra.members;if('latest' in extra)panelState.latest=extra.latest}
  renderPanel();
}
function addStyles(){
  if(document.getElementById('flowzCloudStyles'))return;
  var style=document.createElement('style');
  style.id='flowzCloudStyles';
  style.textContent=
    '#flowzCloudPanel{border-color:#25b889;background:linear-gradient(160deg,#13191a,#101315)}'+
    '#flowzCloudPanel .cloud-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}'+
    '#flowzCloudPanel .cloud-title{font-size:15px;font-weight:900;letter-spacing:.09em}'+
    '#flowzCloudPanel .cloud-status{font-size:11px;font-weight:850;padding:7px 10px;border:1px solid #343a42;border-radius:999px;color:#9fa6ae;white-space:nowrap}'+
    '#flowzCloudPanel[data-status="connected"] .cloud-status{color:#50dd8a;border-color:#287a4b}'+
    '#flowzCloudPanel[data-status="error"] .cloud-status{color:#ff9e6d;border-color:#8a4930}'+
    '#flowzCloudPanel .cloud-message{margin:0 0 12px;color:#a6adb5;font-size:12px;line-height:1.55}'+
    '#flowzCloudPanel .cloud-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}'+
    '#flowzCloudPanel .cloud-btn,#flowzCloudPanel .cloud-input{min-height:46px;border-radius:13px;border:1px solid #343a42;background:#1a1e23;color:#f7f3e9;font:850 13px/1 -apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif}'+
    '#flowzCloudPanel .cloud-btn{padding:0 12px}'+
    '#flowzCloudPanel .cloud-btn.primary{border:0;background:linear-gradient(135deg,#29d58b,#1bbad1);color:#07120f}'+
    '#flowzCloudPanel .cloud-input{width:100%;box-sizing:border-box;padding:0 14px;text-align:center;font-size:18px;letter-spacing:.18em}'+
    '#flowzCloudPanel .cloud-code{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border:1px solid #343a42;border-radius:13px;background:#171b20}'+
    '#flowzCloudPanel .cloud-code b{font-size:22px;letter-spacing:.16em}'+
    '#flowzCloudPanel .cloud-copy{border:0;background:transparent;color:#27d3df;font-weight:850}'+
    '#flowzCloudPanel .cloud-members{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}'+
    '#flowzCloudPanel .cloud-member{padding:7px 10px;border-radius:999px;border:1px solid #343a42;color:#8f969f;font-size:11px;font-weight:850}'+
    '#flowzCloudPanel .cloud-member.on{color:#50dd8a;border-color:#287a4b}'+
    '#flowzCloudPanel .cloud-latest{margin-top:11px;padding-top:11px;border-top:1px solid #2c3138;color:#d9ddd8;font-size:12px;line-height:1.45}'+
    '#flowzCloudPanel .cloud-note{margin-top:9px;color:#747b84;font-size:10px;line-height:1.45}'+
    '@media(max-width:420px){#flowzCloudPanel .cloud-actions{grid-template-columns:1fr}}';
  document.head.appendChild(style);
}
function ensurePanel(){
  if(document.getElementById('flowzCloudPanel'))return;
  var anchor=document.querySelector('.profile-switch');if(!anchor)return;
  var panel=document.createElement('section');
  panel.id='flowzCloudPanel';panel.className='panel';
  anchor.parentNode.insertBefore(panel,anchor.nextSibling);
  panel.addEventListener('click',function(e){
    var action=e.target&&e.target.getAttribute('data-cloud-action');
    if(action==='create')createRoom();
    if(action==='join')joinRoom();
    if(action==='copy')copyRoomCode();
    if(action==='sync')queueSync(false);
  });
  panel.addEventListener('input',function(e){
    if(e.target&&e.target.id==='flowzRoomCode')e.target.value=e.target.value.replace(/\D/g,'').slice(0,6);
  });
}
function renderPanel(){
  addStyles();ensurePanel();
  var panel=document.getElementById('flowzCloudPanel');if(!panel)return;
  var cloud=loadCloud(),profile=currentProfile(),connected=!!cloud.roomId;
  panel.dataset.status=connected?'connected':panelState.status;
  var html='<div class="cloud-head"><div class="cloud-title">☁️ DUO SYNC</div><span class="cloud-status">'+safeText(connected?'CONNECTED':panelState.status==='error'?'ERROR':'SETUP')+'</span></div>';
  if(!connected){
    html+='<p class="cloud-message">'+safeText(panelState.message||'この端末を現在のプロフィール「'+profileLabel(profile)+'」として接続する。')+'</p>'+
      '<div class="cloud-actions"><button class="cloud-btn primary" data-cloud-action="create">6桁コードを作る</button><div><input class="cloud-input" id="flowzRoomCode" inputmode="numeric" maxlength="6" placeholder="000000"><button class="cloud-btn" style="width:100%;margin-top:8px" data-cloud-action="join">コードで参加</button></div></div>'+
      '<div class="cloud-note">現在のプロフィール：'+safeText(profileLabel(profile))+'／端末ごとに一度だけ接続</div>';
  }else{
    var members=panelState.members||[],hasKedy=members.indexOf('kedy')>=0,hasLeni=members.indexOf('leni')>=0;
    html+='<p class="cloud-message">この端末は <b>'+safeText(profileLabel(cloud.profile))+'</b> として同期中</p>'+
      '<div class="cloud-code"><span>Duo Code</span><b>'+safeText(cloud.roomCode||'------')+'</b><button class="cloud-copy" data-cloud-action="copy">COPY</button></div>'+
      '<div class="cloud-members"><span class="cloud-member '+(hasKedy?'on':'')+'">'+(hasKedy?'✓ ':'')+'kedy</span><span class="cloud-member '+(hasLeni?'on':'')+'">'+(hasLeni?'✓ ':'')+'Leni</span><button class="cloud-member" data-cloud-action="sync">↻ SYNC</button></div>';
    if(panelState.latest){
      html+='<div class="cloud-latest">🔥 '+safeText(profileLabel(panelState.latest.profile))+' completed '+safeText(modeLabel(panelState.latest))+' · +'+safeText(panelState.latest.xp)+' XP · '+safeText(relativeTime(panelState.latest.completed_at))+'</div>';
    }else{
      html+='<div class="cloud-latest">相手の学習完了がここへ即時表示される</div>';
    }
    html+='<div class="cloud-note">既存履歴は保持／オフライン時は端末保存し、復帰後に同期</div>';
  }
  panel.innerHTML=html;
}
async function ensureClient(){
  if(client)return client;
  if(!window.supabase||!window.supabase.createClient)throw new Error('Supabase library failed to load');
  client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  return client;
}
async function ensureAuth(){
  await ensureClient();
  var sessionResult=await client.auth.getSession();
  if(sessionResult.error)throw sessionResult.error;
  var session=sessionResult.data&&sessionResult.data.session;
  if(!session){
    var signed=await client.auth.signInAnonymously();
    if(signed.error)throw signed.error;
  }
  var userResult=await client.auth.getUser();
  if(userResult.error)throw userResult.error;
  authUser=userResult.data.user;
  return authUser;
}
async function recoverMembership(){
  var cloud=loadCloud();if(cloud.roomId||!authUser)return cloud;
  var result=await client.from('flowz_members').select('room_id,profile').eq('user_id',authUser.id).maybeSingle();
  if(result.error)throw result.error;
  if(!result.data)return cloud;
  var room=await client.from('flowz_rooms').select('id,code').eq('id',result.data.room_id).single();
  if(room.error)throw room.error;
  cloud={roomId:room.data.id,roomCode:room.data.code,profile:result.data.profile,linkedAt:new Date().toISOString(),migratedAt:new Date(0).toISOString()};
  saveCloud(cloud);return cloud;
}
async function createRoom(){
  try{
    setPanel('loading','Duo Roomを作成中…');
    await ensureAuth();
    var profile=currentProfile();
    var result=await client.rpc('flowz_create_room',{p_profile:profile});
    if(result.error)throw result.error;
    var row=Array.isArray(result.data)?result.data[0]:result.data;
    if(!row||!row.room_id)throw new Error('Room creation returned no data');
    var cloud={roomId:row.room_id,roomCode:row.room_code,profile:profile,linkedAt:new Date().toISOString(),migratedAt:new Date(0).toISOString()};
    saveCloud(cloud);
    await migrateExistingHistory(cloud);
    await fullSync(false);
    toast('Duo Room '+row.room_code+' を作成 ✓');
  }catch(error){setPanel('error',friendlyError(error))}
}
async function joinRoom(){
  var input=document.getElementById('flowzRoomCode'),code=input?input.value.trim():'';
  if(!/^\d{6}$/.test(code)){toast('6桁コードを入力して');return}
  try{
    setPanel('loading','Duo Roomへ参加中…');
    await ensureAuth();
    var profile=currentProfile();
    var result=await client.rpc('flowz_join_room',{p_code:code,p_profile:profile});
    if(result.error)throw result.error;
    var roomId=result.data;
    var cloud={roomId:roomId,roomCode:code,profile:profile,linkedAt:new Date().toISOString(),migratedAt:new Date(0).toISOString()};
    saveCloud(cloud);
    await migrateExistingHistory(cloud);
    await fullSync(false);
    toast('Duo Roomへ接続 ✓');
  }catch(error){setPanel('error',friendlyError(error))}
}
function friendlyError(error){
  var text=error&&error.message||String(error||'Unknown error');
  if(/already connected/i.test(text))return 'この端末はすでにRoomへ接続されてる';
  if(/profile is already/i.test(text))return 'そのプロフィールはすでに別端末で接続済み';
  if(/Room not found/i.test(text))return 'Duoコードが見つからへん';
  if(/Failed to fetch|network/i.test(text))return '通信できへん。接続後にもう一度試して';
  return text;
}
async function copyRoomCode(){
  var code=loadCloud().roomCode;if(!code)return;
  try{await navigator.clipboard.writeText(code);toast('Duo Codeをコピー ✓')}catch(e){toast('コード：'+code)}
}
async function existingIds(roomId,profile){
  var result=await client.from('flowz_sessions').select('client_session_id').eq('room_id',roomId).eq('profile',profile);
  if(result.error)throw result.error;
  var ids={};(result.data||[]).forEach(function(row){ids[row.client_session_id]=true});return ids;
}
async function insertMissing(rows,existing){
  var missing=rows.filter(function(row){return !existing[row.client_session_id]});
  if(!missing.length)return 0;
  var result=await client.from('flowz_sessions').insert(missing);
  if(result.error)throw result.error;
  return missing.length;
}
async function migrateExistingHistory(cloud){
  var state=loadState(),profile=cloud.profile;
  if(!state||!state.profiles||!state.profiles[profile]){
    cloud.migratedAt=new Date().toISOString();saveCloud(cloud);return;
  }
  var days=state.profiles[profile].days||{},rows=[];
  Object.keys(days).sort().forEach(function(date){
    var record=days[date],xp=xpOf(record);if(!xp)return;
    rows.push({
      room_id:cloud.roomId,user_id:authUser.id,profile:profile,session_date:date,
      mode:record.mode||'legacy',title:'Imported Flowz history',theme:'',phrase:'',xp:Math.min(100,Math.max(0,xp)),
      client_session_id:'migrate-day-'+profile+'-'+date,completed_at:isoForDate(date),
      metadata:{source:'localStorage',migrated_day:true,count:record.count||1}
    });
  });
  var ids=await existingIds(cloud.roomId,profile);await insertMissing(rows,ids);
  cloud.migratedAt=new Date().toISOString();saveCloud(cloud);
}
function localRowsAfterMigration(cloud){
  var state=loadState(),profile=cloud.profile;
  if(!state||!state.profiles||!state.profiles[profile])return [];
  var cutoff=new Date(cloud.migratedAt||0).getTime();
  return (state.profiles[profile].sessions||[]).filter(function(session){
    if(session.cloud)return false;
    var at=new Date(session.at||0).getTime();return isFinite(at)&&at>cutoff;
  }).map(function(session){
    var at=session.at||new Date().toISOString(),id='local-'+profile+'-'+hash([at,session.date,session.mode,session.title].join('|'));
    return {
      room_id:cloud.roomId,user_id:authUser.id,profile:profile,session_date:session.date||at.slice(0,10),
      mode:session.mode||'session',title:session.title||'',theme:session.theme||'',phrase:session.phrase||'',
      xp:Math.min(100,Math.max(0,Number(session.xp)||10)),client_session_id:id,completed_at:at,
      metadata:{source:'flowz',auto:!!session.auto}
    };
  });
}
async function pushLocal(cloud){
  var rows=localRowsAfterMigration(cloud);if(!rows.length)return 0;
  var existingResult=await client.from('flowz_sessions').select('client_session_id,session_date,xp').eq('room_id',cloud.roomId).eq('profile',cloud.profile);
  if(existingResult.error)throw existingResult.error;
  var existing={},cloudXp={};
  (existingResult.data||[]).forEach(function(row){existing[row.client_session_id]=true;cloudXp[row.session_date]=(cloudXp[row.session_date]||0)+(Number(row.xp)||0)});
  var state=loadState(),days=state&&state.profiles&&state.profiles[cloud.profile]&&state.profiles[cloud.profile].days||{};
  var remaining={};
  rows.forEach(function(row){
    if(existing[row.client_session_id])return;
    if(!(row.session_date in remaining))remaining[row.session_date]=Math.max(0,xpOf(days[row.session_date])-Number(cloudXp[row.session_date]||0));
    row.xp=Math.min(100,remaining[row.session_date]);
    remaining[row.session_date]=0;
  });
  return insertMissing(rows,existing);
}
function cloudToState(state,rows){
  if(!state||!state.profiles)return false;
  var before=JSON.stringify(state.profiles),byProfile={kedy:[],leni:[]};
  (rows||[]).forEach(function(row){if(byProfile[row.profile])byProfile[row.profile].push(row)});
  ['kedy','leni'].forEach(function(profile){
    var list=byProfile[profile];if(!list.length)return;
    var days={},sessions=[];
    list.sort(function(a,b){return new Date(a.completed_at)-new Date(b.completed_at)}).forEach(function(row){
      var date=row.session_date,meta=row.metadata||{},count=meta.migrated_day?(Number(meta.count)||1):1;
      if(!days[date])days[date]={base:0,phrase:0,fix:0,duo:0,count:0,mode:row.mode||'cloud'};
      days[date].base+=Number(row.xp)||0;days[date].count+=count;days[date].mode=row.mode||days[date].mode;
      for(var i=0;i<count;i++)sessions.push({date:date,mode:row.mode,title:row.title,theme:row.theme,phrase:row.phrase,xp:i===0?(Number(row.xp)||0):0,at:row.completed_at,cloud:true,cloudId:row.id});
    });
    state.profiles[profile].days=days;state.profiles[profile].sessions=sessions;
  });
  return JSON.stringify(state.profiles)!==before;
}
async function fetchRoomData(cloud){
  var membersResult=await client.from('flowz_members').select('profile,joined_at').eq('room_id',cloud.roomId);
  if(membersResult.error)throw membersResult.error;
  var sessionsResult=await client.from('flowz_sessions').select('*').eq('room_id',cloud.roomId).order('completed_at',{ascending:true});
  if(sessionsResult.error)throw sessionsResult.error;
  var roomResult=await client.from('flowz_rooms').select('code').eq('id',cloud.roomId).single();
  if(roomResult.error)throw roomResult.error;
  if(roomResult.data&&roomResult.data.code&&cloud.roomCode!==roomResult.data.code){cloud.roomCode=roomResult.data.code;saveCloud(cloud)}
  return {members:membersResult.data||[],sessions:sessionsResult.data||[]};
}
async function subscribe(cloud){
  if(channel){try{await client.removeChannel(channel)}catch(e){}channel=null}
  channel=client.channel('flowz-room-'+cloud.roomId)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'flowz_sessions',filter:'room_id=eq.'+cloud.roomId},function(){queueSync(true)})
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'flowz_members',filter:'room_id=eq.'+cloud.roomId},function(){queueSync(true)})
    .subscribe(function(status){
      if(status==='SUBSCRIBED')renderPanel();
    });
}
async function fullSync(reloadOnChange){
  if(syncing){syncQueued=true;return}
  syncing=true;
  try{
    await ensureAuth();
    var cloud=await recoverMembership();
    if(!cloud.roomId){setPanel('ready','現在のプロフィール「'+profileLabel(currentProfile())+'」でRoomを作るか、6桁コードへ参加して');return}
    if(!cloud.migratedAt||new Date(cloud.migratedAt).getTime()===0)await migrateExistingHistory(cloud);
    await pushLocal(cloud);
    var data=await fetchRoomData(cloud),state=loadState(),changed=cloudToState(state,data.sessions);
    if(changed){saveState(state)}
    var profiles=data.members.map(function(m){return m.profile}),latest=data.sessions.length?data.sessions[data.sessions.length-1]:null;
    setPanel('connected','同期済み',{members:profiles,latest:latest});
    if(!channel)subscribe(cloud);
    if(changed&&reloadOnChange){
      try{sessionStorage.setItem(SYNC_LOCK_KEY,'1')}catch(e){}
      location.reload();return;
    }
  }catch(error){setPanel('error',friendlyError(error))}
  finally{
    syncing=false;
    if(syncQueued){syncQueued=false;setTimeout(function(){fullSync(true)},250)}
  }
}
function queueSync(reloadOnChange){setTimeout(function(){fullSync(reloadOnChange!==false)},150)}
function updateVersion(){
  var version=document.querySelector('.version');if(version)version.textContent=VERSION;
  document.title='Flowz '+VERSION.replace('v','')+' · Duo Battle';
  var note=document.querySelector('body>.note:last-of-type');if(note)note.textContent='✅ Last updated 2026.08.05 · Flowz v3.6 Duo Sync';
  var storage=document.getElementById('storageNote');if(storage)storage.textContent=loadCloud().roomId?'Records sync between connected devices. A local backup is also kept.':'Records are saved in this browser. Connect Duo Sync to share progress across devices.';
}
async function init(){
  addStyles();ensurePanel();renderPanel();updateVersion();
  try{
    await ensureAuth();
    await recoverMembership();
    var locked=false;try{locked=sessionStorage.getItem(SYNC_LOCK_KEY)==='1';sessionStorage.removeItem(SYNC_LOCK_KEY)}catch(e){}
    await fullSync(!locked);
  }catch(error){setPanel('error',friendlyError(error))}
}

document.addEventListener('DOMContentLoaded',function(){setTimeout(init,40)});
window.addEventListener('pageshow',function(){setTimeout(function(){ensurePanel();updateVersion();queueSync(true)},250)});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')queueSync(true)});
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.profile-btn'))setTimeout(function(){renderPanel();updateVersion()},0)});
setInterval(function(){if(document.visibilityState==='visible'&&loadCloud().roomId)queueSync(true)},30000);

})();

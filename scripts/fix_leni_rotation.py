from pathlib import Path

app = Path('flowz-app.js')
s = app.read_text(encoding='utf-8')
old = '''function currentLeniPrepMission(){
  var list=MISSIONS.leni.free,recent=recentLeniPhrases(2),blocked={};
  recent.forEach(function(p){blocked[p]=true});
  var start=(missionSeed('leni','free',today)+sessionCount('leni')+leniPrepMissionOffset)%list.length;
  for(var step=0;step<list.length;step++){
    var item=list[(start+step)%list.length];
    if(!blocked[item.phrase])return {theme:item.theme,phrase:item.phrase,reading:item.reading||'',meaning:item.meaning||'',guide:item.guide||''};
  }
  var fallback=list[start];
  return {theme:fallback.theme,phrase:fallback.phrase,reading:fallback.reading||'',meaning:fallback.meaning||'',guide:fallback.guide||''};
}'''
new = '''function currentLeniPrepMission(){
  var list=MISSIONS.leni.free,recent=recentLeniPhrases(2),blocked={},available=[];
  recent.forEach(function(p){blocked[p]=true});
  var base=(missionSeed('leni','free',today)+sessionCount('leni'))%list.length;
  for(var step=0;step<list.length;step++){
    var item=list[(base+step)%list.length];
    if(!blocked[item.phrase])available.push(item);
  }
  var selected=available.length?available[leniPrepMissionOffset%available.length]:list[(base+leniPrepMissionOffset)%list.length];
  return {theme:selected.theme,phrase:selected.phrase,reading:selected.reading||'',meaning:selected.meaning||'',guide:selected.guide||''};
}'''
if old not in s:
    raise SystemExit('expected currentLeniPrepMission source not found')
app.write_text(s.replace(old,new,1), encoding='utf-8')

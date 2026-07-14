const STORAGE_KEY='plateQuest.v5';
const MAP_DATA_URL='./data/north-america-admin1.geojson';
const MAP_BOUNDS={minLon:-170,maxLon:-50,minLat:14,maxLat:84,width:1200,height:700,pad:18};
let jurisdictions=[],selectedId=null,position=null,boundaries=[],locating=false;
let state=loadState();
const $=id=>document.getElementById(id);

function defaults(){return{activeTrip:null,trips:[],currentJurisdictionId:null,lastPlayer:'Family'};}
function loadState(){
  try{
    return {...defaults(),...(JSON.parse(localStorage.getItem(STORAGE_KEY))||JSON.parse(localStorage.getItem('plateQuest.v4'))||JSON.parse(localStorage.getItem('plateQuest.v3'))||JSON.parse(localStorage.getItem('plateQuest.v2'))||{})};
  }catch{return defaults();}
}
function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));render();}
function trip(){return state.trips.find(t=>t.id===state.activeTrip)||null;}
function uuid(){return crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function normalize(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function haversine(a,b){const r=3958.8,d=Math.PI/180,dlat=(b.lat-a.lat)*d,dlon=(b.lon-a.lon)*d,x=Math.sin(dlat/2)**2+Math.cos(a.lat*d)*Math.cos(b.lat*d)*Math.sin(dlon/2)**2;return 2*r*Math.asin(Math.sqrt(x));}
function points(miles){return miles<1?10:Math.round(20*Math.sqrt(miles));}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),3000);}
function anchor(){if(position)return position;const j=jurisdictions.find(x=>x.id===state.currentJurisdictionId);return j?.lat!=null?{lat:j.lat,lon:j.lon}:null;}

function project(lon,lat){
  const {minLon,maxLon,minLat,maxLat,width,height,pad}=MAP_BOUNDS;
  return {
    x:pad+((lon-minLon)/(maxLon-minLon))*(width-pad*2),
    y:pad+((maxLat-lat)/(maxLat-minLat))*(height-pad*2)
  };
}
function ringPath(ring){
  if(!ring?.length)return'';
  return ring.map(([lon,lat],index)=>{const p=project(lon,lat);return `${index?'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;}).join(' ')+' Z';
}
function geometryPath(geometry){
  if(!geometry)return'';
  if(geometry.type==='Polygon')return geometry.coordinates.map(ringPath).join(' ');
  if(geometry.type==='MultiPolygon')return geometry.coordinates.flatMap(poly=>poly.map(ringPath)).join(' ');
  return'';
}
function pointInRing(point,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1];
    if(((yi>point.lat)!=(yj>point.lat))&&(point.lon<(xj-xi)*(point.lat-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
}
function pointInGeometry(point,geometry){
  if(!geometry)return false;
  const insidePolygon=polygon=>pointInRing(point,polygon[0])&&!polygon.slice(1).some(ring=>pointInRing(point,ring));
  if(geometry.type==='Polygon')return insidePolygon(geometry.coordinates);
  if(geometry.type==='MultiPolygon')return geometry.coordinates.some(insidePolygon);
  return false;
}
function detectJurisdiction(point){
  const feature=boundaries.find(item=>pointInGeometry(point,item.geometry));
  if(!feature)return null;
  const id=feature.properties?.id?.toUpperCase();
  return jurisdictions.find(j=>j.id===id)||jurisdictions.find(j=>normalize(j.name)===normalize(feature.properties?.name));
}

function render(){
  const currentTrip=trip();
  const seen=new Set(currentTrip?.sightings.map(s=>s.jurisdictionId)||[]);
  const miles=currentTrip?.sightings.reduce((sum,s)=>sum+s.distance,0)||0;
  const score=currentTrip?.sightings.reduce((sum,s)=>sum+s.points,0)||0;
  const current=jurisdictions.find(j=>j.id===state.currentJurisdictionId);
  $('tripName').textContent=currentTrip?currentTrip.name:'No active trip';
  $('endTripButton').hidden=!currentTrip;
  $('plateCount').textContent=currentTrip?.sightings.length||0;
  $('distanceTotal').textContent=Math.round(miles).toLocaleString();
  $('pointTotal').textContent=score.toLocaleString();
  $('completionTotal').textContent=`${Math.round((seen.size/jurisdictions.length)*100)||0}%`;
  $('locationText').textContent=current?`${current.name}${position?` · GPS ±${Math.round(position.accuracy)} m`:''}`:'Set your current location to begin scoring plates.';
  $('currentJurisdiction').value=state.currentJurisdictionId||'';
  $('locationProgress').hidden=!locating;
  renderGroups(seen);
  renderCollected(currentTrip);
  renderMap(seen);
}
function renderGroups(seen){
  const query=$('plateSearch').value.trim().toLowerCase();
  const groups=['United States','Canada','Mexico','Territories','Special'];
  $('countryGroups').innerHTML=groups.map(region=>{
    const items=jurisdictions.filter(j=>j.region===region&&(!query||`${j.name} ${j.abbr}`.toLowerCase().includes(query))).sort((a,b)=>a.name.localeCompare(b.name));
    if(!items.length)return'';
    return `<section class="country-group"><h3>${region}<span>${items.filter(j=>seen.has(j.id)).length}/${items.length}</span></h3><div class="jurisdiction-grid">${items.map(j=>`<button class="jurisdiction ${seen.has(j.id)?'collected':''}" data-id="${j.id}" ${seen.has(j.id)?'disabled':''}><span class="mini-plate">${esc(j.abbr)}</span><strong>${esc(j.name)}</strong></button>`).join('')}</div></section>`;
  }).join('');
}
function renderCollected(currentTrip){
  if(!currentTrip?.sightings.length){$('collectedList').className='empty-state';$('collectedList').textContent='Start a trip and add the first plate.';return;}
  $('collectedList').className='';
  $('collectedList').innerHTML=currentTrip.sightings.slice().reverse().map(s=>`<div class="collected-item"><span><strong>${esc(s.name)}</strong><br><small>${Math.round(s.distance)} miles · ${esc(s.player)}${s.note?` · ${esc(s.note)}`:''}</small></span><strong>${s.points} pts</strong></div>`).join('');
}
function renderMap(seen){
  const svg=$('mapSvg');
  if(!svg)return;
  if(!boundaries.length){svg.innerHTML='<text class="map-message" x="600" y="350">Preparing map data…</text>';return;}
  const paths=boundaries.map(feature=>{
    const id=String(feature.properties?.id||'').toUpperCase();
    const jurisdiction=jurisdictions.find(j=>j.id===id);
    if(!jurisdiction)return'';
    const classes=['jurisdiction-shape'];
    if(seen.has(id))classes.push('collected');
    if(state.currentJurisdictionId===id)classes.push('current');
    return `<path class="${classes.join(' ')}" data-map-id="${id}" tabindex="0" role="button" aria-label="${esc(jurisdiction.name)}" d="${geometryPath(feature.geometry)}"><title>${esc(jurisdiction.name)}</title></path>`;
  }).join('');
  let marker='';
  if(position){const p=project(position.lon,position.lat);marker=`<g class="gps-group"><circle class="gps-halo" cx="${p.x}" cy="${p.y}" r="15"></circle><circle class="gps-marker" cx="${p.x}" cy="${p.y}" r="7"><title>Your GPS position</title></circle></g>`;}
  svg.innerHTML=`<rect class="map-water" width="1200" height="700"></rect>${paths}${marker}`;
  $('mapStatus').textContent=`Real administrative boundaries loaded · ${boundaries.length} jurisdictions · tap a region to add its plate.`;
}
function populateLocation(){
  const options=jurisdictions.filter(j=>j.lat!=null&&j.region!=='Special').sort((a,b)=>a.name.localeCompare(b.name));
  $('currentJurisdiction').innerHTML='<option value="">Choose state, province, or territory</option>'+options.map(j=>`<option value="${j.id}">${esc(j.name)} (${esc(j.abbr)})</option>`).join('');
}
function startTrip(name){state.trips.push({id:uuid(),name,startedAt:new Date().toISOString(),sightings:[]});state.activeTrip=state.trips.at(-1).id;persist();}
function openSighting(id){
  const currentTrip=trip();
  if(!currentTrip){$('tripDialog').showModal();toast('Start a trip first');return;}
  if(currentTrip.sightings.some(s=>s.jurisdictionId===id))return;
  const jurisdiction=jurisdictions.find(j=>j.id===id);
  if(!jurisdiction)return;
  selectedId=id;
  const currentAnchor=anchor();
  const distance=jurisdiction.fixedPoints?0:currentAnchor&&jurisdiction.lat!=null?haversine(currentAnchor,{lat:jurisdiction.lat,lon:jurisdiction.lon}):0;
  const score=jurisdiction.fixedPoints||points(distance);
  $('platePreview').textContent=jurisdiction.abbr;
  $('sightingTitle').textContent=`Add ${jurisdiction.name}`;
  $('sightingDetails').textContent=currentAnchor?`Estimated distance: ${Math.round(distance).toLocaleString()} miles · ${score} points`:'No location set · 10 points';
  $('playerInput').value=state.lastPlayer||'Family';
  $('noteInput').value='';
  $('sightingDialog').showModal();
}
function saveSighting(){
  const currentTrip=trip(),jurisdiction=jurisdictions.find(j=>j.id===selectedId);
  if(!currentTrip||!jurisdiction)return;
  const currentAnchor=anchor();
  const distance=jurisdiction.fixedPoints?0:currentAnchor&&jurisdiction.lat!=null?haversine(currentAnchor,{lat:jurisdiction.lat,lon:jurisdiction.lon}):0;
  const score=jurisdiction.fixedPoints||points(distance);
  const player=$('playerInput').value.trim()||'Family';
  state.lastPlayer=player;
  currentTrip.sightings.push({id:uuid(),jurisdictionId:jurisdiction.id,name:jurisdiction.name,distance,points:score,player,note:$('noteInput').value.trim(),lat:position?.lat??null,lon:position?.lon??null,currentJurisdictionId:state.currentJurisdictionId,sightedAt:new Date().toISOString()});
  $('sightingDialog').close();persist();toast(`${jurisdiction.name} collected`);
}
async function applyPosition(coords){
  position={lat:coords.latitude,lon:coords.longitude,accuracy:coords.accuracy};
  const found=detectJurisdiction(position);
  if(found)state.currentJurisdictionId=found.id;
  persist();
  return found;
}
function locate(){
  if(!navigator.geolocation){toast('Geolocation is unavailable in this browser');return;}
  if(locating)return;
  if(!boundaries.length){toast('Map boundaries are still loading');return;}
  locating=true;render();
  let best=null,finished=false,watchId=null;
  const finish=async message=>{
    if(finished)return;
    finished=true;clearTimeout(timer);
    if(watchId!==null)navigator.geolocation.clearWatch(watchId);
    locating=false;
    if(!best){render();toast(message||'No GPS reading received');return;}
    const found=await applyPosition(best.coords);
    toast(found?`Location confirmed: ${found.name} · ±${Math.round(best.coords.accuracy)} m`:`GPS found · ±${Math.round(best.coords.accuracy)} m. Choose the jurisdiction manually.`);
  };
  watchId=navigator.geolocation.watchPosition(reading=>{
    if(!best||reading.coords.accuracy<best.coords.accuracy)best=reading;
    $('locationText').textContent=`Improving GPS accuracy · ±${Math.round(reading.coords.accuracy)} m…`;
    if(reading.coords.accuracy<=75)finish();
  },error=>finish(`Location error: ${error.message}`),{enableHighAccuracy:true,maximumAge:0,timeout:20000});
  const timer=setTimeout(()=>finish('GPS timed out'),14000);
}
async function loadMapData(){
  const response=await fetch(MAP_DATA_URL,{cache:'no-cache'});
  if(!response.ok)throw new Error(`Map data failed to load (${response.status})`);
  const collection=await response.json();
  boundaries=collection.features||[];
}
function exportData(){
  const blob=new Blob([JSON.stringify({format:'plate-quest-backup',version:5,exportedAt:new Date().toISOString(),...state},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='plate-quest-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function updateNetwork(){$('networkStatus').textContent=navigator.onLine?'Online':'Offline · saved locally';}
async function init(){
  try{
    const jurisdictionResponse=await fetch('./data/jurisdictions.json');
    if(!jurisdictionResponse.ok)throw new Error('Game data failed to load');
    jurisdictions=await jurisdictionResponse.json();
    populateLocation();render();updateNetwork();
    await loadMapData();render();
    if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js');
  }catch(error){$('mapStatus').textContent=error.message;toast(error.message);}
}

$('newTripButton').onclick=()=>$('tripDialog').showModal();
$('tripForm').onsubmit=event=>{event.preventDefault();const name=$('tripNameInput').value.trim();if(!name)return;startTrip(name);$('tripDialog').close();event.target.reset();};
$('sightingForm').onsubmit=event=>{event.preventDefault();saveSighting();};
document.addEventListener('click',event=>{const close=event.target.closest('[data-close]');if(close)$(close.dataset.close).close();const plate=event.target.closest('[data-id]');if(plate&&!plate.disabled)openSighting(plate.dataset.id);const mapShape=event.target.closest('[data-map-id]');if(mapShape)openSighting(mapShape.dataset.mapId);});
document.addEventListener('keydown',event=>{const shape=event.target.closest?.('[data-map-id]');if(shape&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openSighting(shape.dataset.mapId);}});
$('currentJurisdiction').onchange=event=>{position=null;state.currentJurisdictionId=event.target.value||null;persist();toast(state.currentJurisdictionId?'Location corrected manually':'Location cleared');};
$('locateButton').onclick=locate;
$('fitMapButton').onclick=()=>{$('mapSvg').setAttribute('viewBox','0 0 1200 700');};
$('plateSearch').oninput=render;
$('endTripButton').onclick=()=>{const currentTrip=trip();if(currentTrip&&confirm(`End ${currentTrip.name}?`)){currentTrip.endedAt=new Date().toISOString();state.activeTrip=null;persist();}};
$('exportButton').onclick=exportData;
$('clearButton').onclick=()=>{if(confirm('Delete all Plate Quest data?')){localStorage.removeItem(STORAGE_KEY);state=defaults();position=null;persist();}};
addEventListener('online',updateNetwork);addEventListener('offline',updateNetwork);
init();

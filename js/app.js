const STORAGE_KEY='plateQuest.v8';
const MAP_DATA_URL='./data/north-america-admin1.geojson';
const MAP_BOUNDS={minLon:-170,maxLon:-50,minLat:14,maxLat:84,width:1200,height:700,pad:18};
const TAB_GROUPS=[
 {id:'United States',label:'United States',regions:['United States']},
 {id:'Canada',label:'Canada',regions:['Canada']},
 {id:'Mexico',label:'Mexico',regions:['Mexico']},
 {id:'Special',label:'Special entities',regions:['Territories','Special']}
];
let jurisdictions=[],position=null,boundaries=[],locating=false,activeTab='United States';
let state=loadState();
const $=id=>document.getElementById(id);

function defaults(){return{activeTrip:null,trips:[],currentJurisdictionId:null};}
function loadState(){try{return{...defaults(),...(JSON.parse(localStorage.getItem(STORAGE_KEY))||JSON.parse(localStorage.getItem('plateQuest.v7'))||{})};}catch{return defaults();}}
function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));render();}
function trip(){return state.trips.find(t=>t.id===state.activeTrip)||null;}
function uuid(){return crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function normalize(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function haversine(a,b){const r=3958.8,d=Math.PI/180,dlat=(b.lat-a.lat)*d,dlon=(b.lon-a.lon)*d,x=Math.sin(dlat/2)**2+Math.cos(a.lat*d)*Math.cos(b.lat*d)*Math.sin(dlon/2)**2;return 2*r*Math.asin(Math.sqrt(x));}
function points(miles){return miles<1?10:Math.round(20*Math.sqrt(miles));}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),2200);}
function anchor(){if(position)return position;const j=jurisdictions.find(x=>x.id===state.currentJurisdictionId);return j?.lat!=null?{lat:j.lat,lon:j.lon}:null;}
function project(lon,lat){const b=MAP_BOUNDS;return{x:b.pad+((lon-b.minLon)/(b.maxLon-b.minLon))*(b.width-b.pad*2),y:b.pad+((b.maxLat-lat)/(b.maxLat-b.minLat))*(b.height-b.pad*2)};}
function ringPath(ring){return ring?.length?ring.map(([lon,lat],i)=>{const p=project(lon,lat);return`${i?'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;}).join(' ')+' Z':'';}
function geometryPath(g){if(!g)return'';if(g.type==='Polygon')return g.coordinates.map(ringPath).join(' ');if(g.type==='MultiPolygon')return g.coordinates.flatMap(p=>p.map(ringPath)).join(' ');return'';}
function pointInRing(point,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1];if(((yi>point.lat)!=(yj>point.lat))&&(point.lon<(xj-xi)*(point.lat-yi)/(yj-yi)+xi))inside=!inside;}return inside;}
function pointInGeometry(point,g){if(!g)return false;const inside=p=>pointInRing(point,p[0])&&!p.slice(1).some(r=>pointInRing(point,r));return g.type==='Polygon'?inside(g.coordinates):g.type==='MultiPolygon'?g.coordinates.some(inside):false;}
function detectJurisdiction(point){const feature=boundaries.find(f=>pointInGeometry(point,f.geometry));if(!feature)return null;const id=feature.properties?.id?.toUpperCase();return jurisdictions.find(j=>j.id===id)||jurisdictions.find(j=>normalize(j.name)===normalize(feature.properties?.name));}
function dateTripName(){return `Road Trip · ${new Date().toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}`;}
function ensureTrip(){let current=trip();if(current)return current;current={id:uuid(),name:dateTripName(),mode:'co-op',startedAt:new Date().toISOString(),sightings:[]};state.trips.push(current);state.activeTrip=current.id;localStorage.setItem(STORAGE_KEY,JSON.stringify(state));locate(true);return current;}

function render(){
 const currentTrip=trip(),seen=new Set(currentTrip?.sightings.map(s=>s.jurisdictionId)||[]),miles=currentTrip?.sightings.reduce((n,s)=>n+s.distance,0)||0,score=currentTrip?.sightings.reduce((n,s)=>n+s.points,0)||0,current=jurisdictions.find(j=>j.id===state.currentJurisdictionId);
 $('tripName').textContent=currentTrip?currentTrip.name:'Ready to play';$('newTripButton').hidden=!!currentTrip;$('endTripButton').hidden=!currentTrip;
 $('plateCount').textContent=currentTrip?.sightings.length||0;$('distanceTotal').textContent=Math.round(miles).toLocaleString();$('pointTotal').textContent=score.toLocaleString();$('completionTotal').textContent=`${Math.round((seen.size/jurisdictions.length)*100)||0}%`;
 $('locationText').textContent=current?`${current.name}${position?` · ±${Math.round(position.accuracy)} m`:''}`:locating?'Updating location…':'Location updates automatically.';
 $('currentJurisdiction').value=state.currentJurisdictionId||'';$('locationProgress').hidden=!locating;renderTabs(seen);renderGroup(seen);renderCollected(currentTrip);renderMap(seen);
}
function renderTabs(seen){
 $('plateTabs').innerHTML=TAB_GROUPS.map(group=>{const items=jurisdictions.filter(j=>group.regions.includes(j.region)),count=items.filter(j=>seen.has(j.id)).length;return `<button class="tab ${activeTab===group.id?'active':''}" data-tab="${group.id}" role="tab" aria-selected="${activeTab===group.id}">${group.label}<span class="tab-count">${count}/${items.length}</span></button>`;}).join('');
}
function renderGroup(seen){
 const group=TAB_GROUPS.find(item=>item.id===activeTab)||TAB_GROUPS[0],query=$('plateSearch').value.trim().toLowerCase();
 const items=jurisdictions.filter(j=>group.regions.includes(j.region)&&(!query||`${j.name} ${j.abbr}`.toLowerCase().includes(query))).sort((a,b)=>a.name.localeCompare(b.name));
 $('countryGroups').innerHTML=items.length?`<div class="jurisdiction-grid">${items.map(j=>`<button class="jurisdiction ${seen.has(j.id)?'collected':''}" data-id="${j.id}" ${seen.has(j.id)?'disabled':''}><span class="mini-plate">${esc(j.abbr)}</span><strong>${esc(j.name)}</strong></button>`).join('')}</div>`:'<div class="empty-state">No matching plates.</div>';
}
function renderCollected(currentTrip){if(!currentTrip?.sightings.length){$('collectedList').className='empty-state';$('collectedList').textContent='Tap a plate or map region to collect it.';return;}$('collectedList').className='';$('collectedList').innerHTML=currentTrip.sightings.slice().reverse().map(s=>`<div class="collected-item"><span><strong>${esc(s.name)}</strong><br><small>${Math.round(s.distance)} miles</small></span><strong>${s.points} pts</strong></div>`).join('');}
function renderMap(seen){const svg=$('mapSvg');if(!svg)return;if(!boundaries.length){svg.innerHTML='<text class="map-message" x="600" y="350">Preparing map data…</text>';return;}const paths=boundaries.map(f=>{const id=String(f.properties?.id||'').toUpperCase(),j=jurisdictions.find(x=>x.id===id);if(!j)return'';const classes=['jurisdiction-shape'];if(seen.has(id))classes.push('collected');if(state.currentJurisdictionId===id)classes.push('current');return`<path class="${classes.join(' ')}" data-map-id="${id}" tabindex="0" role="button" aria-label="${esc(j.name)}" d="${geometryPath(f.geometry)}"><title>${esc(j.name)}</title></path>`;}).join('');let marker='';if(position){const p=project(position.lon,position.lat);marker=`<g class="gps-group"><circle class="gps-halo" cx="${p.x}" cy="${p.y}" r="15"></circle><circle class="gps-marker" cx="${p.x}" cy="${p.y}" r="7"></circle></g>`;}svg.innerHTML=`<rect class="map-water" width="1200" height="700"></rect>${paths}${marker}`;$('mapStatus').textContent='Tap a region to collect it.';}
function populateLocation(){const options=jurisdictions.filter(j=>j.lat!=null&&j.region!=='Special').sort((a,b)=>a.name.localeCompare(b.name));$('currentJurisdiction').innerHTML='<option value="">Choose state, province, or territory</option>'+options.map(j=>`<option value="${j.id}">${esc(j.name)} (${esc(j.abbr)})</option>`).join('');}
function startTrip(){ensureTrip();persist();toast('Co-op trip started');}
function recordSighting(id){const currentTrip=ensureTrip();if(currentTrip.sightings.some(s=>s.jurisdictionId===id)){toast('Already collected');return;}const j=jurisdictions.find(x=>x.id===id);if(!j)return;const a=anchor(),distance=j.fixedPoints?0:a&&j.lat!=null?haversine(a,{lat:j.lat,lon:j.lon}):0,score=j.fixedPoints||points(distance);currentTrip.sightings.push({id:uuid(),jurisdictionId:j.id,name:j.name,distance,points:score,mode:'co-op',lat:position?.lat??null,lon:position?.lon??null,currentJurisdictionId:state.currentJurisdictionId,sightedAt:new Date().toISOString()});persist();toast(`${j.name} collected · ${score} pts`);}
async function applyPosition(coords){position={lat:coords.latitude,lon:coords.longitude,accuracy:coords.accuracy};const found=detectJurisdiction(position);if(found)state.currentJurisdictionId=found.id;persist();return found;}
function locate(silent=false){if(!navigator.geolocation||locating||!boundaries.length)return;locating=true;render();let best=null,done=false,watchId=null;const finish=async()=>{if(done)return;done=true;clearTimeout(timer);if(watchId!==null)navigator.geolocation.clearWatch(watchId);locating=false;if(!best){render();if(!silent)toast('Location unavailable');return;}const found=await applyPosition(best.coords);if(!silent)toast(found?`Location updated: ${found.name}`:'Location updated; use settings to correct it');};watchId=navigator.geolocation.watchPosition(r=>{if(!best||r.coords.accuracy<best.coords.accuracy)best=r;if(r.coords.accuracy<=100)finish();},()=>finish(),{enableHighAccuracy:true,maximumAge:30000,timeout:12000});const timer=setTimeout(finish,8000);}
async function loadMapData(){const response=await fetch(MAP_DATA_URL,{cache:'no-cache'});if(!response.ok)throw new Error(`Map data failed to load (${response.status})`);boundaries=(await response.json()).features||[];}
function exportData(){const blob=new Blob([JSON.stringify({format:'plate-quest-backup',version:8,exportedAt:new Date().toISOString(),...state},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='plate-quest-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function updateNetwork(){$('networkStatus').textContent=navigator.onLine?'Online':'Offline';}
async function init(){try{const r=await fetch('./data/jurisdictions.json');if(!r.ok)throw new Error('Game data failed to load');jurisdictions=await r.json();populateLocation();render();updateNetwork();await loadMapData();render();if(trip()&&!position)locate(true);if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js');}catch(error){$('mapStatus').textContent=error.message;toast(error.message);}}

$('newTripButton').onclick=startTrip;
document.addEventListener('click',e=>{const tab=e.target.closest('[data-tab]');if(tab){activeTab=tab.dataset.tab;render();return;}const plate=e.target.closest('[data-id]');if(plate&&!plate.disabled)recordSighting(plate.dataset.id);const shape=e.target.closest('[data-map-id]');if(shape)recordSighting(shape.dataset.mapId);});
document.addEventListener('keydown',e=>{const shape=e.target.closest?.('[data-map-id]');if(shape&&(e.key==='Enter'||e.key===' ')){e.preventDefault();recordSighting(shape.dataset.mapId);}});
$('currentJurisdiction').onchange=e=>{position=null;state.currentJurisdictionId=e.target.value||null;persist();toast(state.currentJurisdictionId?'Location corrected':'Location cleared');};
$('locateButton').onclick=()=>locate(false);$('fitMapButton').onclick=()=>$('mapSvg').setAttribute('viewBox','0 0 1200 700');$('plateSearch').oninput=render;
$('endTripButton').onclick=()=>{const currentTrip=trip();if(currentTrip&&confirm('End this trip?')){currentTrip.endedAt=new Date().toISOString();state.activeTrip=null;persist();}};
$('exportButton').onclick=exportData;$('clearButton').onclick=()=>{if(confirm('Delete all Plate Quest data?')){localStorage.removeItem(STORAGE_KEY);state=defaults();position=null;persist();}};
addEventListener('online',updateNetwork);addEventListener('offline',updateNetwork);init();
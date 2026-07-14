const STORAGE_KEY='plateQuest.v2';
const REGIONS=['United States','Canada','Mexico','Territories','Special'];
let jurisdictions=[],selectedId=null,activeRegion='United States',position=null;
let state=loadState();
const $=id=>document.getElementById(id);
function defaultState(){return{activeTrip:null,trips:[],currentJurisdictionId:null,lastPlayer:'Family'};}
function loadState(){try{return{...defaultState(),...(JSON.parse(localStorage.getItem(STORAGE_KEY))||{})};}catch{return defaultState();}}
function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));render();}
function activeTrip(){return state.trips.find(t=>t.id===state.activeTrip)||null;}
function uuid(){return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;}
function haversine(a,b){const r=3958.8,toRad=n=>n*Math.PI/180,dLat=toRad(b.lat-a.lat),dLon=toRad(b.lon-a.lon);const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;return 2*r*Math.asin(Math.sqrt(x));}
function scoreDistance(miles){return miles<1?10:Math.round(20*Math.sqrt(miles));}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function currentAnchor(){if(position)return position;const j=jurisdictions.find(x=>x.id===state.currentJurisdictionId);return j&&j.lat!=null?{lat:j.lat,lon:j.lon}:null;}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),2400);}
function render(){
 const trip=activeTrip(),seen=new Set(trip?.sightings.map(s=>s.jurisdictionId)||[]);
 $('tripName').textContent=trip?trip.name:'No active trip';$('endTripButton').hidden=!trip;
 const miles=trip?.sightings.reduce((n,s)=>n+s.distance,0)||0,points=trip?.sightings.reduce((n,s)=>n+s.points,0)||0;
 $('plateCount').textContent=trip?.sightings.length||0;$('distanceTotal').textContent=Math.round(miles).toLocaleString();$('pointTotal').textContent=points.toLocaleString();$('completionTotal').textContent=`${Math.round((seen.size/jurisdictions.length)*100)||0}%`;
 const current=jurisdictions.find(j=>j.id===state.currentJurisdictionId);
 $('locationText').textContent=position?`Device location saved · accuracy ±${Math.round(position.accuracy)} m`:current?`Current area: ${current.name}`:'Set your current location to begin scoring plates.';
 $('currentJurisdiction').value=state.currentJurisdictionId||'';
 renderTabs();renderMap(seen);renderPicker(seen,$('plateSearch').value);renderCollected(trip);
}
function renderTabs(){$('regionTabs').innerHTML=REGIONS.map(r=>`<button class="tab ${r===activeRegion?'active':''}" data-region="${r}">${r}</button>`).join('');}
function renderMap(seen){$('mapGrid').innerHTML=jurisdictions.filter(j=>j.region===activeRegion).map(j=>`<button class="map-cell ${seen.has(j.id)?'collected':''} ${state.currentJurisdictionId===j.id?'current':''}" data-id="${j.id}" title="${esc(j.name)}"><span class="abbr">${esc(j.abbr)}</span><small>${esc(j.name)}</small></button>`).join('');}
function renderPicker(seen,filter=''){const q=filter.trim().toLowerCase();$('jurisdictionGrid').innerHTML=jurisdictions.filter(j=>!q||`${j.name} ${j.abbr} ${j.country}`.toLowerCase().includes(q)).map(j=>`<button class="jurisdiction ${seen.has(j.id)?'collected':''}" data-id="${j.id}" ${seen.has(j.id)?'disabled':''}><strong>${esc(j.name)}</strong><span>${esc(j.country)} · ${esc(j.abbr)}</span></button>`).join('');}
function renderCollected(trip){if(!trip?.sightings.length){$('collectedList').className='empty-state';$('collectedList').textContent='Start a trip and add the first plate.';return;}$('collectedList').className='';$('collectedList').innerHTML=trip.sightings.slice().reverse().map(s=>`<div class="collected-item"><span><strong>${esc(s.name)}</strong><br><small>${Math.round(s.distance).toLocaleString()} miles · ${new Date(s.sightedAt).toLocaleString()}${s.player?` · ${esc(s.player)}`:''}${s.note?` · ${esc(s.note)}`:''}</small></span><strong>${s.points} pts</strong></div>`).join('');}
function populateLocation(){const opts=jurisdictions.filter(j=>j.lat!=null&&j.region!=='Special').sort((a,b)=>a.name.localeCompare(b.name));$('currentJurisdiction').innerHTML='<option value="">Choose state, province, or territory</option>'+opts.map(j=>`<option value="${j.id}">${esc(j.name)} (${esc(j.abbr)})</option>`).join('');}
function startTrip(name){const trip={id:uuid(),name,startedAt:new Date().toISOString(),endedAt:null,sightings:[]};state.trips.push(trip);state.activeTrip=trip.id;persist();toast('Trip started');}
function openSighting(id){const trip=activeTrip();if(!trip){$('tripDialog').showModal();toast('Start a trip first');return;}if(trip.sightings.some(s=>s.jurisdictionId===id))return;const j=jurisdictions.find(x=>x.id===id);if(!j)return;selectedId=id;const anchor=currentAnchor();const distance=j.fixedPoints?0:anchor&&j.lat!=null?haversine(anchor,{lat:j.lat,lon:j.lon}):0;const points=j.fixedPoints||scoreDistance(distance);$('platePreview').textContent=j.abbr;$('sightingTitle').textContent=`Add ${j.name}`;$('sightingDetails').textContent=anchor?`Estimated distance: ${Math.round(distance).toLocaleString()} miles · ${points} points`:`No location set. This plate will receive 10 local-find points.`;$('playerInput').value=state.lastPlayer||'Family';$('noteInput').value='';$('sightingDialog').showModal();}
function saveSighting(){const trip=activeTrip(),j=jurisdictions.find(x=>x.id===selectedId);if(!trip||!j)return;const anchor=currentAnchor(),distance=j.fixedPoints?0:anchor&&j.lat!=null?haversine(anchor,{lat:j.lat,lon:j.lon}):0,points=j.fixedPoints||scoreDistance(distance),player=$('playerInput').value.trim()||'Family';state.lastPlayer=player;trip.sightings.push({id:uuid(),jurisdictionId:j.id,name:j.name,abbr:j.abbr,distance,points,player,note:$('noteInput').value.trim(),lat:position?.lat??null,lon:position?.lon??null,currentJurisdictionId:state.currentJurisdictionId,sightedAt:new Date().toISOString()});$('sightingDialog').close();persist();toast(`${j.name} collected · ${points} points`);}
function locate(){if(!navigator.geolocation){toast('Geolocation is unavailable');return;}$('locationText').textContent='Locating…';navigator.geolocation.getCurrentPosition(p=>{position={lat:p.coords.latitude,lon:p.coords.longitude,accuracy:p.coords.accuracy};const nearest=jurisdictions.filter(j=>j.lat!=null&&j.region!=='Special').map(j=>({...j,d:haversine(position,{lat:j.lat,lon:j.lon})})).sort((a,b)=>a.d-b.d)[0];if(nearest)state.currentJurisdictionId=nearest.id;persist();toast(`Location updated${nearest?` near ${nearest.name}`:''}`);},e=>{render();toast(`Location unavailable: ${e.message}`);},{enableHighAccuracy:true,timeout:15000,maximumAge:30000});}
function exportData(){const blob=new Blob([JSON.stringify({format:'plate-quest-backup',version:2,exportedAt:new Date().toISOString(),...state},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='plate-quest-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function updateNetwork(){$('networkStatus').textContent=navigator.onLine?'Online':'Offline · saved locally';}
async function init(){try{const r=await fetch('./data/jurisdictions.json');if(!r.ok)throw new Error('Jurisdiction data failed to load');jurisdictions=await r.json();populateLocation();render();updateNetwork();if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js');}catch(e){$('jurisdictionGrid').innerHTML=`<div class="empty-state">Game data could not load. Refresh once while online so it can be cached.<br><small>${esc(e.message)}</small></div>`;}}
$('newTripButton').addEventListener('click',()=>$('tripDialog').showModal());
$('tripForm').addEventListener('submit',e=>{e.preventDefault();const name=$('tripNameInput').value.trim();if(name){startTrip(name);$('tripDialog').close();e.target.reset();}});
$('sightingForm').addEventListener('submit',e=>{e.preventDefault();saveSighting();});
document.addEventListener('click',e=>{const close=e.target.closest('[data-close]');if(close)$(close.dataset.close).close();const plate=e.target.closest('[data-id]');if(plate&&!plate.disabled)openSighting(plate.dataset.id);const tab=e.target.closest('[data-region]');if(tab){activeRegion=tab.dataset.region;render();}});
$('endTripButton').addEventListener('click',()=>{const trip=activeTrip();if(trip&&confirm(`End ${trip.name}?`)){trip.endedAt=new Date().toISOString();state.activeTrip=null;persist();}});
$('currentJurisdiction').addEventListener('change',e=>{position=null;state.currentJurisdictionId=e.target.value||null;persist();});
$('locateButton').addEventListener('click',locate);$('plateSearch').addEventListener('input',()=>render());$('exportButton').addEventListener('click',exportData);
$('clearButton').addEventListener('click',()=>{if(confirm('Delete all Plate Quest trips and settings from this device?')){localStorage.removeItem(STORAGE_KEY);state=defaultState();position=null;persist();}});
addEventListener('online',updateNetwork);addEventListener('offline',updateNetwork);init();

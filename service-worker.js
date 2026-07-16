const CACHE='plate-quest-v9.3';
const CORE=['./','./index.html','./css/app.css','./js/app.js','./data/jurisdictions.json','./data/north-america-admin1.geojson','./assets/plates/manifest.json','./manifest.webmanifest'];

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(CORE);
  try{
    const response=await fetch('./assets/plates/manifest.json',{cache:'no-cache'});
    if(response.ok){
      const manifest=await response.json();
      const assets=Object.values(manifest.plates||{}).map(path=>`./${path}`);
      if(assets.length)await cache.addAll(assets);
    }
  }catch(error){console.warn('Plate artwork precache skipped',error);}
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>event.request.mode==='navigate'?caches.match('./index.html'):Response.error())));
});
// Ночная стража — офлайн-кэш ТОЛЬКО для папки games/strazha/ (корень сайта не трогает).
// При обновлении игры меняй VERSION.
const VERSION='strazha-v26';
const FILES=['./','./index.html','./manifest.webmanifest','./cover.png','./icon-192.png','./icon-512.png','./art/act1.jpg','./art/act2.jpg','./art/act3.jpg','./art/map.jpg','./art/atlas.png','./art/city.png','./art/sky_far.png','./art/city_mid.png','./art/city_mid_warm.png','./art/city_back.png','./art/city_near.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('strazha-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;const url=new URL(r.url);
  if(url.origin===location.origin){
    if(!url.pathname.startsWith(new URL('./',self.registration.scope).pathname))return; // чужие адреса — мимо
    // всегда спрашиваем сервер (no-cache), кэш — только без интернета
    e.respondWith(fetch(r,{cache:'no-cache'}).then(res=>{if(res.ok){const cp=res.clone();caches.open(VERSION).then(c=>c.put(r,cp));}return res;})
      .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('./index.html'))));
  }else if(url.hostname.endsWith('googleapis.com')||url.hostname.endsWith('gstatic.com')){
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{const cp=res.clone();caches.open(VERSION).then(c=>c.put(r,cp));return res;})));
  }
});

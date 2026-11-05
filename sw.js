// Rejar Box — офлайн-кэш меню. Всегда сначала сеть (no-cache), кэш — только без интернета.
// Игры кэшируют себя сами своими sw.js в своих папках. При изменении меню меняй VERSION.
const VERSION='rejarbox-v16';
const FILES=['./','./index.html','./games/list.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./games/shershen/cover.png','./shared/tg.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('rejarbox-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;const url=new URL(r.url);
  if(url.origin===location.origin){
    e.respondWith(fetch(r,{cache:'no-cache'}).then(res=>{if(res.ok){const cp=res.clone();caches.open(VERSION).then(c=>c.put(r,cp));}return res;})
      .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==='navigate'?caches.match('./index.html'):undefined))));
  }else if(url.hostname.endsWith('googleapis.com')||url.hostname.endsWith('gstatic.com')){
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{const cp=res.clone();caches.open(VERSION).then(c=>c.put(r,cp));return res;})));
  }
});

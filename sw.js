// Rejar Box — офлайн-кэш витрины и всех игр. Добавляя игру, впиши её файлы в FILES и поменяй VERSION.
const VERSION='rejarbox-v2';
const FILES=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./games/list.js','./shared/engine.js',
  './games/template/','./games/template/index.html','./games/template/game.js',
  './steel-hornet/','./steel-hornet/index.html','./steel-hornet/cover.png','./steel-hornet/manifest.webmanifest','./steel-hornet/icon-192.png','./steel-hornet/icon-512.png','./steel-hornet/icon-list.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('rejarbox-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;const url=new URL(r.url);
  if(url.origin===location.origin){
    e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(VERSION).then(c=>c.put(r,cp));}return res;})
      .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match(url.pathname.endsWith('/')?url.pathname+'index.html':'./index.html'))));
  }else if(url.hostname.endsWith('googleapis.com')||url.hostname.endsWith('gstatic.com')){
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{const cp=res.clone();caches.open(VERSION).then(c=>c.put(r,cp));return res;})));
  }
});

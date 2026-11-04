// Старый адрес «Стального Шершня». Игра переехала в games/shershen/.
// Этот сервис-воркер удаляет старый кэш и отключает себя, чтобы не мешать меню.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('hornet-')) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate('../games/shershen/');
  })());
});

const VERSION = "gv-v2";

self.addEventListener("install", event => {
  console.log("Installing new version:", VERSION);
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  console.log("Activating new version:", VERSION);

  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => caches.delete(key))
      );
    })
  );

  return self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(fetch(event.request));
});
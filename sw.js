const CACHE_NAME = 'levelup-pwa-v6';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://code.jquery.com/jquery-3.7.1.min.js'
];

// Instalación: guarda los recursos (si alguno falta, no rompe los demás)
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.allSettled(ASSETS_TO_CACHE.map(function (url) { return cache.add(url); }));
    })
  );
  self.skipWaiting();
});

// Activación: borra cachés de versiones anteriores
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (claves) {
      return Promise.all(
        claves.filter(function (k) { return k !== CACHE_NAME; })
              .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: responde desde caché (offline-first) y actualiza en segundo plano
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      const red = fetch(event.request).then(function (resp) {
        if (resp && resp.status === 200) {
          const copia = resp.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(event.request, copia); });
        }
        return resp;
      }).catch(function () {
        return cached || caches.match('./index.html');
      });
      return cached || red;
    })
  );
});

// Sincronización: cuando vuelve la red, el Service Worker avisa a la página
// para que vacíe su cola (la cola vive en el array de script.js)
self.addEventListener('sync', function (event) {
  if (event.tag !== 'sync-reservas') return;
  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true }).then(function (paginas) {
      paginas.forEach(function (p) { p.postMessage({ tipo: 'red-disponible' }); });
    })
  );
});
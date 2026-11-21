const CACHE_NAME = 'levelup-pwa-v8';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './img/portada.jpg',
  './img/fondo1.jpg',
  './img/fondo2.jpg',
  './img/fondo3.jpg',
  'https://code.jquery.com/jquery-3.7.1.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js'
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

// Proxy invisible: responde desde caché (offline-first) y actualiza en segundo plano
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;
    if (new URL(event.request.url).hostname.endsWith('.supabase.co')) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      const red = fetch(event.request).then(function (resp) {
        if (resp && resp.status === 200) {
          const copia = resp.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(event.request, copia); });
        }
        return resp;
      }).catch(function () {
        // Sin red y sin copia: las páginas caen a index.html, lo demás falla limpio
        if (cached) return cached;
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
      return cached || red;
    })
  );
});

// Sincronización: al volver la red, el Service Worker avisa a la página
// para que vacíe su cola (la cola vive en el array de script.js)
self.addEventListener('sync', function (event) {
  if (event.tag !== 'sync-reservas') return;
  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true }).then(function (paginas) {
      paginas.forEach(function (p) { p.postMessage({ tipo: 'red-disponible' }); });
    })
  );
});
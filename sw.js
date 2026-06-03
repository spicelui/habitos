const CACHE_NAME = 'habitflow-v1.2'; // cambia la versión cada vez que actualices archivos
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './SF-Pro.ttf',
  './SF-Pro-Rounded-Heavy.otf',
  './icon.png'
];

// Instalación
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activación y limpieza de caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME) // elimina caches antiguos
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch con estrategia cache-first + actualización en background
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cachedRes => {
      const fetchPromise = fetch(e.request).then(networkRes => {
        // Actualiza el cache en background si hay respuesta válida
        if (networkRes && networkRes.status === 200) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, networkRes.clone());
          });
        }
        return networkRes;
      }).catch(() => null); // si falla fetch, se queda con cache

      // Devuelve cache inmediatamente, fetch actualizará en background
      return cachedRes || fetchPromise;
    })
  );
});

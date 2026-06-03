const CACHE_NAME = 'habitflow-v2.0'; // Incrementa la versión al añadir nuevos archivos

// Lista completa de recursos necesarios para el funcionamiento offline
const ASSETS = [
  './',
  './index.html',
  './habits.js',
  './icons.js',
  './style.css',
  './style-dark.css',
  './manifest.json',
  './SF-Pro.ttf',
  './SF-Pro-Rounded-Heavy.otf',
  './icon.png'
];

// Instalación: guarda todos los recursos en caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activación: elimina cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia: cache first, actualización en segundo plano
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // Si la respuesta es válida, actualiza la caché
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Si falla la red y no hay caché, se puede devolver una página de error
          // Opcional: retornar una respuesta por defecto
          return null;
        });

      // Devuelve la respuesta de caché si existe, si no, espera la red
      return cachedResponse || fetchPromise;
    })
  );
});
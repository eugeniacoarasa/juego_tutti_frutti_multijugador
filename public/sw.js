const CACHE_NAME = 'tutti-frutti-v1';
const assetsToCache = [
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './images/fondo_inicio.jpg',
    './images/fondo.jpg',
    './images/nombre.png',
    './images/icono_192.png',
    './images/icono_512.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assetsToCache);
    })
  );
});

// Activación y limpieza de cachés antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Interceptar peticiones para servir desde la caché
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
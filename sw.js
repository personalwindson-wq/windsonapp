const CACHE_NAME   = 'windson-pt-v8';
const STATIC_CACHE = [
  './manifest.json', 
  './icon.svg', 
  './dist/style.css',
  './src/assets/img/clientes.jpg',
  './src/assets/img/postural.jpg',
  './src/assets/img/treino.jpg',
  './src/assets/img/volume.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Recursos externos (CDN, fonts, Supabase): network first, fallback cache
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // HTML e JS: network first — garante que o app sempre atualiza automaticamente
  const isCode = url.pathname === '/'
    || url.pathname.endsWith('.html')
    || url.pathname.endsWith('.js');

  if (isCode) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, cloned));
          }
          return response;
        })
        .catch(() => caches.match(event.request) || caches.match('./index.html'))
    );
    return;
  }

  // CSS, imagens, ícones: cache first (raramente mudam)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, cloned));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

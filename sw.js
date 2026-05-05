const CACHE_NAME   = 'windson-pt-v9';
const STATIC_CACHE = [
  './manifest.json',
  './icon.svg',
  './dist/style.css',
  './src/assets/img/clientes.jpg',
  './src/assets/img/postural.jpg',
  './src/assets/img/treino.jpg',
  './src/assets/img/volume.jpg'
];

// Install: cache estático de forma resiliente (falha individual não quebra o SW)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(STATIC_CACHE.map(url =>
        cache.add(url).catch(err => console.warn('[SW] Falha ao cachear:', url, err))
      ))
    ).then(() => self.skipWaiting())
  );
});

// Activate: remove caches antigos e assume controle imediato
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: estratégias por tipo de recurso
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Recursos externos (CDN, fonts, Supabase): network only com fallback cache
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // HTML, JS: network first — garante que o app sempre recebe atualizações
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

  // CSS, imagens, ícones: cache first, atualiza cache em background
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, cloned));
        }
        return response;
      }).catch(() => null);

      return cached || networkFetch || caches.match('./index.html');
    })
  );
});

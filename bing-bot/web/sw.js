// Service worker do Bot de Pesquisas: guarda os arquivos da interface para abrir sem rede.
// As pesquisas no Bing (outro domínio) não passam por aqui.
const CACHE = 'bingbot-v1';
const ARQUIVOS = ['./', './index.html', './css/app.css', './js/termos.js', './js/bot.js', './js/app.js',
  './manifest.json', './icone.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(
    ks.filter((k) => k.startsWith('bingbot-') && k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

// Rede primeiro (pega atualizações); cache se estiver offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request))
  );
});

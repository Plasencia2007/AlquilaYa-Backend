/*
 * AlquilaYa — Service Worker (conservador).
 *
 * Objetivo: instalabilidad PWA + un shell offline mínimo, SIN cachear nunca
 * datos privados o autenticados.
 *
 * Estrategia:
 *   - Navegaciones (documentos HTML): network-first con fallback al shell en caché.
 *   - Estáticos inmutables de Next (/_next/static) y assets (imágenes/fuentes): cache-first.
 *   - API y cualquier petición con `Authorization`: SIEMPRE red, jamás caché.
 *   - Solo intercepta GET del mismo origen. WebSocket, backend, Cloudinary, Google, etc. pasan directo.
 *
 * Se registra solo en producción (ver components/pwa/service-worker-register.tsx),
 * así que no interfiere con el HMR del `next dev`.
 */

const CACHE = 'alquilaya-shell-v1';
const APP_SHELL = ['/', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Precarga tolerante: si un recurso falla no aborta la instalación.
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/') || url.pathname.includes('/api/v1/');
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/rooms/') ||
    /\.(?:css|js|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|ico)$/i.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo GET; nunca tocar mutaciones.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Solo mismo-origen. Backend/gateway (:8080), WS (:8086), Cloudinary, Google, etc. pasan sin tocar.
  if (url.origin !== self.location.origin) return;

  // Nunca cachear API ni peticiones autenticadas (datos privados/sensibles).
  if (isApiRequest(url) || req.headers.has('Authorization')) return;

  // Navegaciones: network-first, fallback al shell cacheado cuando no hay red.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Estáticos inmutables: cache-first.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        });
      })
    );
    return;
  }

  // Resto: red normal, sin caché.
});

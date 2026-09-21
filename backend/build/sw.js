/* eslint-disable no-restricted-globals */
/**
 * Production-safe Service Worker для «Битва экстрасенсов».
 *
 * Стратегии:
 *  • Статика (CRA-фингерпринтованные JS/CSS чанки, шрифты) — Cache First
 *  • Аплоады (/api/uploads/*) — Cache First (изображения immutable)
 *  • Публичные GET API (pages, seo, participants, reviews, settings, faq, gallery, video) — Stale-While-Revalidate
 *  • Навигация (HTML) — Network First с fallback на кэш
 *
 * Исключено из кэширования полностью:
 *  • /api/admin/*  • /api/auth/*  • POST/PUT/DELETE/PATCH запросы
 *  • Маршруты /admin/* (страницы админки)
 *  • Любые запросы с Authorization-заголовком
 *
 * Инвалидация:
 *  • CACHE_VERSION ниже бампается при изменении логики SW
 *  • При активации все кэши с другой версией удаляются
 *  • clients.claim() + skipWaiting() для быстрого обновления при деплое
 */

const CACHE_VERSION = 'v3-2026-02';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const UPLOADS_CACHE = `uploads-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const HTML_CACHE = `html-${CACHE_VERSION}`;

// Whitelist публичных API-эндпоинтов для SWR-кэша
const PUBLIC_API_PATTERNS = [
  /\/api\/pages(\/|$)/,
  /\/api\/seo(\/|$)/,
  /\/api\/participants(\/|$|\?)/,
  /\/api\/reviews(\/|$|\?)/,
  /\/api\/settings(\/|$)/,
  /\/api\/faq(\/|$|\?)/,
  /\/api\/gallery(\/|$|\?)/,
  /\/api\/video(\/|$|\?)/,
];

const isAdminPath = (url) =>
  url.pathname.startsWith('/admin') ||
  url.pathname.startsWith('/api/admin') ||
  url.pathname.startsWith('/api/auth');

const isUploadPath = (url) => /\/api\/uploads\//.test(url.pathname);

const isPublicApi = (url) =>
  url.pathname.startsWith('/api/') && PUBLIC_API_PATTERNS.some((re) => re.test(url.pathname));

const isStaticAsset = (url) =>
  url.pathname.startsWith('/static/') ||
  /\.(?:js|css|woff2?|ttf|otf|eot)$/i.test(url.pathname);

const isFontHost = (url) =>
  url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

self.addEventListener('install', (event) => {
  // Сразу активируем нового воркера, не ждём reload
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Удаляем все старые кэши других версий
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, UPLOADS_CACHE, API_CACHE, HTML_CACHE].includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Cache First: сначала кэш, иначе сеть → положить в кэш
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    if (cached) return cached;
    throw e;
  }
}

// Stale-While-Revalidate: вернуть кэш сразу, в фоне обновить
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await networkFetch) || new Response('Offline', { status: 503 });
}

// Network First: сетевой ответ, fallback на кэш
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw e;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Только GET
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  // Не вмешиваться в запросы с авторизацией (админ-токен)
  if (request.headers.get('authorization')) return;

  // Полный пропуск всех admin-маршрутов и admin API
  if (isAdminPath(url)) return;

  // index.html и навигация — Network First
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, HTML_CACHE));
    return;
  }

  // Uploads (изображения, WebP) — Cache First
  if (isUploadPath(url)) {
    event.respondWith(cacheFirst(request, UPLOADS_CACHE));
    return;
  }

  // Публичные API — Stale-While-Revalidate
  if (isPublicApi(url)) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  // Статика CRA (фингерпринтованная) + шрифты — Cache First
  if (isStaticAsset(url) || isFontHost(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Прочие запросы (HTML, неизвестные API) — обычная сеть
});

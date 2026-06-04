/**
 * Preview/Production-like static server для frontend supervisor.
 *
 * ПРОБЛЕМА: Preview-домен (Kubernetes ingress) направляет non-/api запросы
 * на frontend supervisor:3000, который по умолчанию запускает `yarn start`
 * (webpack-dev-server) — это ОГРОМНАЯ непрожатая dev-сборка (2.2 MB bundle.js
 * без минификации), что разрушает Lighthouse Performance.
 *
 * РЕШЕНИЕ: на :3000 поднимаем тонкий HTTP reverse proxy, который пересылает
 * абсолютно все запросы на backend:8001. Backend Express уже отдаёт
 * production build из /app/backend/build/ с:
 *   - gzip compression
 *   - immutable cache (1 year) для /static/*
 *   - корректные MIME для AVIF/WebP
 *   - preload injection из asset-manifest.json
 *   - SPA fallback на index.html для React Router
 *
 * Результат: preview-URL отдаёт ту же оптимизированную сборку, что и backend
 * напрямую. Никаких дополнительных npm-зависимостей — только встроенный
 * node:http.
 */
const http = require('http');

const PORT = parseInt(process.env.PORT || '3000', 10);
const TARGET_HOST = process.env.PROXY_TARGET_HOST || '127.0.0.1';
const TARGET_PORT = parseInt(process.env.PROXY_TARGET_PORT || '8001', 10);

const server = http.createServer((clientReq, clientRes) => {
  const proxyOptions = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: clientReq.url,
    method: clientReq.method,
    headers: { ...clientReq.headers, host: `${TARGET_HOST}:${TARGET_PORT}` },
  };

  const proxyReq = http.request(proxyOptions, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(clientRes);
  });

  proxyReq.on('error', (err) => {
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    clientRes.end(`Bad Gateway: ${err.message}`);
  });

  clientReq.pipe(proxyReq);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[preview-server] Listening on 0.0.0.0:${PORT} → http://${TARGET_HOST}:${TARGET_PORT}`);
});

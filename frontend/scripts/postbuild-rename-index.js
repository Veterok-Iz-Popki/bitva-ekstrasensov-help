/**
 * Постбилд-хук: переименовывает build/index.html → build/index.template.html.
 *
 * Причина: на production Caddy (reverse proxy) настроен по SPA-шаблону
 * `try_files {path}` — для URL `/` он резолвит его в `/index.html`,
 * находит файл на диске и отдаёт напрямую МИМО Express, из-за чего
 * server-side SEO injection не срабатывает.
 *
 * Решение: удалить index.html из build/. Caddy не находит файл → прокси-пассит
 * запрос в Express → срабатывает наш /{*splat} → HTML читается из
 * index.template.html и инжектится SEO-контентом.
 *
 * Побочный эффект: static-файлы (/static/*, /favicon.svg, /robots.txt,
 * /manifest.json) продолжают отдаваться напрямую — они на месте.
 * index.html убирается; sitemap.xml тоже удаляется из build, так как он должен
 * генерироваться Express (актуальный lastmod), а не отдаваться статикой.
 *
 * Идемпотентно: если index.html отсутствует, скрипт молча выходит.
 * Если index.template.html уже есть — перезаписывается свежей копией.
 */
const fs = require('fs');
const path = require('path');

// BUILD_PATH задаётся в скрипте build (см. package.json). Fallback на дефолт CRA.
const BUILD_DIR = process.env.BUILD_PATH
  ? path.resolve(process.cwd(), process.env.BUILD_PATH)
  : path.resolve(__dirname, '..', 'build');

const SRC = path.join(BUILD_DIR, 'index.html');
const DST = path.join(BUILD_DIR, 'index.template.html');
const SITEMAP = path.join(BUILD_DIR, 'sitemap.xml');

// sitemap.xml обязан отдаваться Express (динамический lastmod). Если статическая
// копия окажется в build, Caddy отдаст её мимо Express — удаляем.
if (fs.existsSync(SITEMAP)) {
  fs.unlinkSync(SITEMAP);
  console.log('[postbuild] Removed static build/sitemap.xml → served by Express instead.');
}

if (!fs.existsSync(SRC)) {
  if (fs.existsSync(DST)) {
    console.log(`[postbuild] index.html already renamed → ${DST} (nothing to do)`);
    process.exit(0);
  }
  console.error(`[postbuild] ERROR: build/index.html not found in ${BUILD_DIR}`);
  console.error('[postbuild] Was `yarn build` run successfully?');
  process.exit(1);
}

// Копируем (не переименовываем), затем удаляем оригинал — так безопаснее:
// если copy упадёт, у нас всё ещё есть оригинал.
fs.copyFileSync(SRC, DST);
fs.unlinkSync(SRC);

console.log(`[postbuild] Renamed:`);
console.log(`  from: ${SRC}`);
console.log(`  to:   ${DST}`);
console.log(`[postbuild] Caddy/Nginx no longer sees index.html on disk → SPA-fallback goes through Express.`);

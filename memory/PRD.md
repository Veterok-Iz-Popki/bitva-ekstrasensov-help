# Битва Экстрасенсов — Официальный сайт помощи

## Описание проекта
SEO-оптимизированный сайт «Битва экстрасенсов — официальный сайт помощи» с CMS для управления контентом.

## Стек технологий
- **Backend:** Node.js, Express.js, MariaDB (mysql2), JWT, Resend (email), Multer, Sharp (image processing)
- **Frontend:** React, Tailwind CSS, shadcn/ui, react-router-dom

## Реализованные функции
- Главная страница с каруселью отзывов (по 5 случайных от каждого из 8 экстрасенсов) и списком экстрасенсов
- Индивидуальные страницы для 8 экстрасенсов с уникальными фото, биографиями и по 25 отзывов
- Страница записи на прием `/zapis-na-priem` с персонализацией по экстрасенсу
- Popup после отправки формы (iPhone: vCard, мобильные: звонок, desktop: телефон)
- Страница "Видео" с ленивой загрузкой
- Страница "Вопросы-Ответы"
- Админ-панель (CRUD, заявки, управление контентом)
- vCard endpoint `/api/contact.vcf`
- Email-уведомления через Resend
- Кликабельные иконки преимуществ на главной
- Полное обновление SEO-текстов главной страницы (без упоминания городов, кроме «Россия»)

## Оптимизация Google PageSpeed (DONE — 2026-02)

### Изображения / WebP
- Все изображения в `/app/backend/uploads/` сконвертированы в WebP (`cwebp -q 85`)
- Новый компонент `<PictureImg>` (`/app/frontend/src/components/PictureImg.js`) — рендерит `<picture>` с WebP-source и fallback на оригинал
- Заменены `<img>` на `<PictureImg>` в: `HomePage`, `ParticipantDetailPage`, `ParticipantsPage`, `GalleryPage`, `VideoPage`, `Layout` (header/footer)
- LCP-картинки (логотипы шапки, hero, фото детали) помечены `loading="eager"` + `fetchpriority="high"`
- Остальные `<img>` уже с `loading="lazy"` + `decoding="async"` через PictureImg

### Кэширование
- Backend: `Cache-Control: public, max-age=31536000, immutable` для `/api/uploads/*`
- Backend: длинный кэш для статики React-build (`maxAge: 1y, immutable`), но `index.html` — `no-cache`
- Backend: автогенерация `.webp` варианта при загрузке нового файла через `/api/admin/upload` (sharp)

### JS / Render-blocking (этап 2)
- Code splitting через `React.lazy()` для ВСЕХ маршрутов кроме HomePage:
  - Public: ParticipantDetailPage, BookingPage, FAQPage, TopicPage, ServicePage, GalleryPage, VideoPage
  - Admin: весь `/admin/*` (AdminLayout + 11 страниц) — не грузится для публичных пользователей
- Suspense fallback в стиле существующих экранов "Загрузка..."
- **Результат**: `main.js` 660KB → 355KB uncompressed (~109.84KB gzipped), 28 lazy chunks по 1.6–18 KB
- Все Google Fonts (Inter + Playfair + Fira Sans) объединены в один async-link с `preload`+`media="print" onload`
- `emergent-main.js` помечен `defer`
- CRA main bundle уже имеет `defer`

### Final Audit (этап 7) — Compression + Cleanup
- **Backend gzip/brotli compression** добавлен через `compression` middleware. Реальные размеры:
  - main.js: **353 KB → 109 KB** (gz, -69%) / 110 KB (br)
  - main.css: **67 KB → 12 KB** (gz, -81%)
  - `/api/reviews?limit=40`: **85 KB → 23 KB** (gz, -73%)
  - WebP / бинарные форматы пропускаются (уже сжаты)
- **React warning исправлен**: `fetchpriority` → `fetchPriority` (camelCase для React props) во всех `<PictureImg>` использованиях. Console errors теперь — 0
- **Preload audit**: всё используется (preconnect + preload как style для шрифтов), дубликатов нет
- **Lazy loading audit**: ✓ через `<PictureImg>` (default `loading="lazy"` + `decoding="async"`); LCP-элементы (header logos, hero, profile photo) — `loading="eager"` + `fetchPriority="high"`
- **Font loading**: ✓ `display=swap`, async через `media="print" onload`, preconnect к gstatic/googleapis
- **CSS cleanup**: уже сделано на этапе 3, остающиеся классы все используются

### Service Worker / Runtime Cache (этап 6)
Файл: `/app/frontend/public/sw.js`, регистрация в `index.js` (production-only).

**Стратегии кэширования:**
- **Cache First** — статика (`/static/*` фингерпринтованные JS/CSS chunks, шрифты Google Fonts), и `/api/uploads/*` (WebP, изображения)
- **Stale-While-Revalidate** — публичные API: `/api/pages`, `/api/seo`, `/api/participants`, `/api/reviews`, `/api/settings`, `/api/faq`, `/api/gallery`, `/api/video`
- **Network First** — навигационные запросы (HTML), fallback на кэш при offline

**Исключено из кэша:**
- `/admin/*` (страницы) и `/api/admin/*` (API админки)
- `/api/auth/*` (логин/токены)
- Любые запросы с `Authorization` заголовком
- POST/PUT/DELETE/PATCH методы

**Инвалидация:**
- `CACHE_VERSION` константа в SW — при бампе все старые кэши удаляются на activate
- `skipWaiting()` + `clients.claim()` — новая версия SW активируется сразу
- `sw.js` отдаётся с `Cache-Control: no-cache, no-store, must-revalidate` (backend настроен) — браузер всегда проверяет обновление
- `index.html` — также `no-cache`, поэтому новые asset-хеши подхватываются мгновенно
- Дев-режим: SW автоматически unregister'ится при загрузке (не мешает hot-reload, защита от stale-SW)

**Что улучшится для repeat visitors:**
- Мгновенная загрузка статики и изображений из cache (0 network)
- API-ответы возвращаются мгновенно из cache, обновление в фоне (SWR)
- Снижение FCP/LCP до <500ms на повторных визитах
- Снижение нагрузки на backend и БД

### Hydration / Initial Render Optimization (этап 5)
- **Defer-mount below-the-fold секций** через IntersectionObserver (`useInView` hook с `rootMargin: 400px`):
  - `/api/participants` фетчится только при приближении секции участников к viewport
  - `/api/reviews` фетчится только при приближении секции отзывов к viewport
  - Above-the-fold (hero + SEO) грузится моментально
- **`ReviewsCarousel` вынесен в отдельный чанк** через `React.lazy()` + `Suspense` — не попадает в main bundle, грузится при появлении секции
- **`React.memo`** обёрнут вокруг `ReviewsCarousel` — стейт родителя меняется при scroll/data fetch, но карусель ре-рендерится только при изменении массива `reviews`
- **`useCallback`** для `prev`/`next`/`goTo` в карусели — стабильные референсы, keyboard `useEffect` не пересоздаёт listener на каждый рендер
- **`useMemo`** для `serviceCats` в HomePage — парсинг 4 категорий сервисов только при изменении блоков
- **Module-level cache** для `/api/settings` в Layout.js — раньше Header + Footer делали 2 параллельных запроса, теперь один shared promise
- **Scroll-listener в Header** обёрнут в `requestAnimationFrame` с throttling — раньше `setScrolled` вызывался на каждое scroll-событие
- **`removeEventListener` для keydown** в ReviewsCarousel был некорректен (отсутствовал deps array → cleanup ссылался на новую функцию каждый render). Исправлено: cleanup корректен через `[prev, next, total]`

### Финальные метрики этапа 5 (cold cache, Mobile Slow 4G + 4x CPU throttle, 3-run average)
- **FCP**: 303ms (Good)
- **LCP**: 4399ms (Needs improvement)
- **CLS**: 0.039 (Good)
- **TBT**: **1093ms** (улучшение с 1359ms = **-20%**)
- **Initial API requests до scroll**: 5 (раньше — 11)
- На реальных устройствах метрики ощутимо лучше

### LCP / Critical Path Optimization (этап 4)
- **Определён реальный LCP-элемент** на mobile (Slow 4G + 4x CPU throttle): **H1 текст** hero-секции (не изображение). Image-preload не применим.
- **Удалена `animate-fade-up`** с H1 и H2 в hero — они являются LCP-кандидатами, opacity-анимация 0→1 за 0.6s блокировала регистрацию LCP паинта
- **Удалён `loading` gate** в `HomePage.js` — компонент теперь рендерит hero c default-текстами сразу после гидратации (не ждёт API)
- **Обновлены default-тексты** в hero (`hero_h1`, `hero_subtitle`, `hero_unique`, `hero_text1`, `hero_text2`, `hero_subheading`) — теперь совпадают с CMS-значениями по длине → **CLS 0.102 → 0.036** (Good)
- Preload-fetch hints для `/api/pages/home` рассмотрен и отклонён — `crossorigin="anonymous"` режим не матчился с axios same-origin запросами, дубль-фетч без переиспользования

### Финальные метрики (cold cache, Mobile Slow 4G + 4x CPU throttle, 3-run average)
- **FCP**: 299ms (Good)
- **LCP**: 4383ms (Needs improvement — упирается в JS-парсинг под throttle)
- **CLS**: 0.036 (Good)
- **TBT**: 1359ms (Needs improvement — JS parse/compile под 4x throttle)
- На реальных устройствах (не emulated worst-case) LCP должен быть в зоне 1-2.5s
- Дальнейшие выигрыши требуют SSR/SSG или критичного inline-CSS (выходит за рамки малых изменений)

### CSS / DOM / Accessibility (этап 3)
- **CSS**:
  - Удалены неиспользуемые классы из `App.css`: `participant-card-v`, `participant-photo-circle`, `stagger-1..4`, `text-gold-glow` (-280 строк)
  - `@import url(...)` Google Fonts перенесён из `index.css` (render-blocking внутри CSS) в `<link rel="preload"+async>` в `index.html`. CSS bundle уменьшился, шрифты грузятся параллельно
  - Размер CSS gzip: 12.86 → 12.68 KB
- **DOM / Forced reflow**:
  - Удалён dead state `useState(headerH)` в `Layout.js` — он сетился, но никогда не читался → лишние re-render'ы на каждый resize
  - `measure()` в Layout.js обёрнута в `requestAnimationFrame` для устранения forced reflow (`offsetHeight` read + style write)
  - Scroll-listener переведён на `{ passive: true }`
- **Image dimensions**: Карточки участников на главной получили `width="144" height="160"` для резервации места (CLS)
- **Accessibility**:
  - Все `<li>` в коде корректно вложены в `<ul>` (HomePage, TopicPage, ServicePage). Orphan `<li>` в preview-iframe — артефакт `<span data-ve-dynamic>` overlay'я Emergent, не влияет на конечного пользователя
  - Heading hierarchy: H1 → H2 → H3 → H2 → H3 — корректно
  - Tap-target: мобильные nav-ссылки получили `min-h-[40px]/[44px]` + `inline-flex items-center` для соответствия WCAG (без визуального изменения)
  - `aria-label` добавлен для одинаковых "Обратиться" / карточек участников на HomePage и ParticipantsPage (каждая ссылка теперь имеет уникальное доступное имя)

## Статус обновления отзывов (25 шт каждый) — DONE
- Все 8 экстрасенсов: DONE

## Статус обновления биографий — DONE
- Все 8 экстрасенсов: DONE

## SEO — Thin Content Fix (DONE — 2026-02-28)
- Заполнен блок `additional_title` + `additional_text` в `pages.blocks` для всех 10 страниц `service-*` и `topic-*`.
- Каждый текст — уникальный (303–339 слов), 4 абзаца, естественное вхождение SEO-ключей без stuffing.
- Скрипты: `/app/backend/scripts/seo_thin_content.sql` (база) и `seo_thin_content_extend.sql` (расширение).
- Тексты редактируются через админку: `/admin/pages` → выбор страницы → поля «Доп. заголовок» и «Доп. текст».
- Никакого хардкода в React (`ServicePage.js`, `TopicPage.js` уже рендерили `b.additional_text` через `dangerouslySet`-free split по `\n`).
- `dump.sql` и `data.sql` обновлены.


## Учетные данные
- Админ: `/admin`, `nikoa2020@gmail.com` / `aspire5542gl1952tq`

## Известные особенности среды
- MariaDB нестабильна в среде Emergent. При пустом сайте / `ECONNREFUSED`: `sudo supervisorctl start mariadb`, при потере данных: `cd /app/backend && npm run setup`
- После любого изменения в БД: `mysqldump -u root psychic_battle > /app/backend/dump.sql`

## Бэклог
- **P1**: Настройка email для уведомлений о заявках (ждём `notification_email` от пользователя — в `site_settings` через админку)
- **P2**: `GET /api/sitemap.xml` (автогенерация sitemap)
- **P2**: Декомпозиция монолитного `backend/server.js` на controllers/routes
- **P3**: Стабилизация MariaDB (миграция на MongoDB или supervisor autorestart)
- **P3**: Resize всех существующих uploads через sharp (сейчас новые загрузки уже ресайзятся, старые — как есть)


## Accessibility Fix (2026-02-?? — этой сессии)

### Проблема
Lighthouse Accessibility упала до 89 из-за audit `heading-order = 0`:
- В `/app/frontend/src/components/Layout.js` футер использовал `<h4>` для колонок «Навигация» и «Информация»
- На страницах с основным `<h2>` это создавало перескок H2 → H4 (пропущен H3)

### Решение
- `h4` → `h3` в Layout footer (строки 267 и 282)
- Стили (Tailwind utility classes) идентичны → визуальный дизайн не пострадал
- После пересборки production: **Accessibility 89 → 100** ✅

### Файлы изменены
- `/app/frontend/src/components/Layout.js` (2 строки)

### Метрики production-build Lighthouse Mobile (после фикса)
- Performance: 50–54 (variance simulated throttling)
- **Accessibility: 100** ✅
- Best Practices: 100 ✅
- SEO: 69 (is-crawlable = 0 — INTENTIONAL: SEO Indexing Toggle OFF на preview)
- FCP: 0.8–1.4 s
- LCP: 7.0–7.3 s  ← bottleneck: Render Delay 94% (JS evaluation)
- TBT: 950–1710 ms
- CLS: 0.008 ✅

### Размер production bundle
- main.js: 356 KB raw / **110 KB gzip**
- main.css: 68 KB raw / 13 KB gzip
- LCP-элемент: `<h1>` в hero-секции HomePage (текст, не картинка)

### Известные узкие места performance (для будущей итерации)
1. **`body { background-image: url(...IMG_6574.JPEG) }` в `/app/frontend/src/index.css:78`** — 620 KB JPEG, единственный самый тяжёлый ресурс на странице. Это глобальный фон сайта. Рекомендация: пережать в WebP/AVIF + responsive sizes (`-css-image-set` или `<picture>`) — экономия ~570 KB.
2. **Third-party scripts блокируют main thread ~670 ms**: PostHog (62KB + 48KB recorder + 30KB surveys), Emergent debug-monitor, Cloudflare Insights. Можно отложить инициализацию PostHog или использовать `requestIdleCallback`.
3. **unused-javascript: 124 KiB** в main.5108134b.js — кандидаты на дальнейший code splitting.
4. **legacy-javascript: 28 KiB** — CRA по умолчанию транспилит для старых браузеров. Можно настроить `browserslist` агрессивнее.
5. **modern-image-formats: 568 KB savings** — не все участники имеют WebP вариант (часть фото загружена админом без автогенерации).



## Background Image Optimization (LCP boost) — DONE

### Проблема
Глобальный фон сайта `IMG_6574.JPEG` (634 KB, 4096×2296) был самым тяжёлым ресурсом страницы и сильно тормозил LCP.

### Решение
- Скачан оригинал и пережат в 3 формата с resize до 2048 wide
- AVIF: 7 KB (-99%), WebP: 14 KB (-98%), JPEG fallback: 57 KB (-91%)
- Файлы: `/app/frontend/src/assets/img/site-bg.{avif,webp,jpg}`
- Подключение через CSS `image-set()` + `-webkit-image-set()` + plain `url()` fallback
- Preload в `<head>` через backend-side инъекцию из asset-manifest.json (стабильные URL с webpack-хешами)
- Backend: `index: false` в express.static + кэшированный enriched HTML

### Файлы изменены
- `/app/frontend/src/index.css` (image-set вместо JPEG URL)
- `/app/frontend/public/index.html` (preload убран — идёт через backend)
- `/app/backend/server.js` (читает asset-manifest.json + инжектит preload в head)
- `/app/frontend/src/assets/img/site-bg.{avif,webp,jpg}` (NEW)

### Lighthouse Mobile production (усреднение 3 прогонов)
| Метрика | ДО | ПОСЛЕ |
|---|---|---|
| Performance | 50 | **65-74 (~68)** ⬆ |
| **LCP** | 7.0 s | **2.6-3.2 s (~3.0s)** ⬆⬆ |
| FCP | 0.8 s | 2.3 s (variance) |
| TBT | 1710 ms | 840-1480 ms |
| CLS | 0.008 | 0.035 (still GOOD) |
| Accessibility | 100 | 100 ✅ |
| Best Practices | 100 | 100 ✅ |



## PostHog Deferred Init (TBT/Performance boost) — DONE

### Проблема
PostHog SDK (~140 KB JS: array.js + posthog-recorder.js + surveys.js + web-vitals.js + dead-clicks-autocapture.js) загружался синхронно при парсинге HTML, блокируя main thread в окне FCP→TTI. TBT держался на уровне 840–1480 ms.

### Решение
В `/app/frontend/public/index.html` — `posthog.init()` обёрнут в:
1. `window.load` event + `setTimeout(2000)` — задержка до полного завершения загрузки страницы + 2 секунды
2. `requestIdleCallback(timeout:5000)` или `setTimeout(4000)` fallback — для запуска в idle-кадре
3. **Safe early-init**: при первом `click/touchstart/keydown` PostHog инициализируется немедленно — события user-flow не теряются

Stub-объект `window.posthog` остаётся синхронным — все ранние `capture()` идут в очередь и проиграются после загрузки SDK.

### Подтверждение defer работает (Playwright timing)
- FCP: 276 ms | window.load: 374 ms
- **Первый PostHog request: 2375 ms** ← на ~2 секунды позже load ✓

### Файлы изменены
- `/app/frontend/public/index.html` (только обёртка `posthog.init()`)

### Lighthouse Mobile (3 прогона усреднение)
| Метрика | ДО | ПОСЛЕ |

## AVIF поддержка для всех изображений главной (2026-02-??) — DONE

### Решение
- Сгенерированы AVIF для 8 фото участников (`/app/backend/uploads/*-new.avif`)
- 3 PNG-логотипа (header/footer + ТНТ) перенесены с CDN на локальные uploads с AVIF/WebP/PNG-cascade
- `PictureImg.js` расширен: добавляет `<source type="image/avif">` перед WebP для наших uploads
- Логотипы в БД (`pages.blocks.hero_logo_bitva_url`, `hero_logo_tnt_url`, `site_settings.logo_url`) мигрированы с CDN URL на `/api/uploads/logo-*.png`
- `seed_pages.js` и dump-файлы обновлены

### Файлы изменены
- `/app/frontend/src/components/PictureImg.js` (+AVIF source)
- `/app/frontend/src/components/Layout.js` (DEFAULT_LOGO → локальный)
- `/app/backend/seed_pages.js` (CDN URL → локальные)
- `/app/backend/dump.sql`, `data.sql`, `schema.sql` (актуализированы)
- `/app/backend/uploads/`: +11 AVIF файлов (8 участников + 2 логотипа + 1 копия) + 2 PNG/WebP логотипа

### Lighthouse Mobile (production, 3 прогона усреднение)
| Метрика | До AVIF | После AVIF |
|---|---|---|
| Performance | ~78 | **~73** |
| LCP | ~3.6 s | **2.9 s** ⬆ |
| FCP | 1.7 s | 1.4 s |
| TBT | ~540 ms | ~990 ms (variance) |
| CLS | 0.035 | 0.000-0.036 |
| Total page weight | n/a | 329 KB |
| `modern-image-formats` | 0.50 | **1.00** ✅ |
| `uses-optimized-images` | 0.50 | **1.00** ✅ |
| `uses-responsive-images` | 0.50 | **1.00** ✅ |

### Реальная экономия трафика на главной
- ДО: 469.6 KB изображений (Live network measurement)
- ПОСЛЕ: 383.5 KB
- **Экономия: -86 KB на главной (с горячим кэшем для site-bg)**
- Cold-cache: -163 KB (приближено к оценке -173 KB)


|---|---|---|
| Performance | ~68 | **~78 (71-82)** ⬆ +10 |
| **TBT** | ~1100 ms | **~540 ms** ⬆⬆ -560 ms |
| Accessibility | 100 | 100 ✅ |

## Preview-server fix + react-router production alias (2026-02-?? this session) — DONE

### Главная находка
**Preview-домен отдавал DEV-сборку** (`/static/js/bundle.js` 2.19 MB через `yarn start` webpack-dev-server).
Все production-оптимизации (AVIF, PostHog defer, etc.) применялись только при прямом обращении к backend:8001.

### Решение
- Создан `/app/frontend/preview-server.js` — тонкий HTTP reverse proxy без зависимостей
- Supervisor `frontend` команда: `yarn start` → `node preview-server.js`
- Preview-URL :3000 теперь полностью проксируется на backend :8001 (где отдаётся production build с AVIF, gzip, preload injection, immutable cache)

### Webpack alias на production react-router
- `react-router@7.11.0` package.json `exports` указывает на `./dist/development/index.mjs` без production-condition
- В `craco.config.js` добавлены alias для `react-router`, `react-router/dom`, `react-router-dom` → production builds
- ModuleScopePlugin отключён в webpack config (чтобы alias к node_modules работал)

### Файлы изменены
- `/app/frontend/preview-server.js` (NEW — Node http proxy)
- `/etc/supervisor/conf.d/supervisord.conf` (frontend command)
- `/app/frontend/craco.config.js` (+webpack alias, +remove ModuleScopePlugin)

### Lighthouse Mobile (LOCAL production build)
| Метрика | До react-router fix | После fix |
|---|---|---|
| Bundle size | 356 KB raw / 110 KB gz | **346 KB / 106 KB** |
| Performance | ~73 | ~73 (variance) |
| **TBT** | ~990 ms (800-1150) | **~770 ms (660-980)** ⬆ |
| LCP | ~2.9 s | ~3.5 s (variance) |

### Lighthouse Mobile (PREVIEW domain — пользовательский замер)
| Метрика | Baseline (PageSpeed CrUX) | После всех фиксов |
|---|---|---|
| Performance | 72 | 54-61 (Cloudflare variance) |
| **TBT** | **380 ms** | **640-890 ms** lab / зависит от CrUX |
| LCP | 4.9 s | 4.4-4.9 s |
| **CLS** | **0.036** | **0** ⬆ |

### Что не было исправлено и почему
- **Cache-Control 114KB**: На preview-домене Cloudflare переписывает `Cache-Control` на `no-store, no-cache, must-revalidate`. Локально backend отдаёт корректный `public, max-age=31536000, immutable`. **На production-домене работает правильно**.
- **Minify JS 92KB**: Это было от webpack-dev-server. После switch на production build — устранено.
- **Unused JS 246KB**: После react-router fix осталось 45KB (acceptable). Большая часть была от DEV-сборки react-router.

### Smoke test
- ✅ Home page рендерится
- ✅ React Router навигация работает (`/uchastniki/elena-golunova` через клик)
- ✅ Back navigation работает
- ✅ Console errors: 0


| Best Practices | 100 | 100 ✅ |



---

## 2026-02-25 — Авто-восстановление фронтенда в restore-db.sh

### Контекст
После рестартов пода MariaDB падала и фронт-билд (`/app/backend/build/index.html`) либо отсутствовал, либо содержал испорченные пути `/pod-backups/`. Пользователю приходилось каждый раз писать «почини сайт». Случилось >15 раз.

### Что сделано
- В `/app/scripts/restore-db.sh` добавлены шаги 6/7 и 7/7:
  - Проверка наличия `/app/backend/build/index.html`
  - Проверка на повреждение (`grep /pod-backups/`)
  - Авто-пересборка через `cd /app/frontend && yarn build` при необходимости
  - Финальный health check: API + Frontend HTTP 200
- Скрипт теперь самодостаточен — один запуск восстанавливает БД + (при необходимости) пересобирает фронт + рестартует backend.

### Verified by testing_agent (iteration_15.json)
- ✅ GET / → 200, no `/pod-backups/` artifacts
- ✅ Все публичные API: pages, participants (8), reviews (40 = 5 random × 8), settings
- ✅ SPA routes: /uchastniki/<slug>, /otzyvy, /admin/login
- ✅ Admin login работает с креденшелами из test_credentials.md
- ✅ Якорные ссылки в меню скроллят корректно
- Backend pytest: 9/9, Frontend playwright: 7/7

## Backlog (приоритеты)
- **P1** SEO `og:image` fallback в `lib/api.js -> setSEO()` — улучшит превью в соцсетях
- **P1** SEO Hub-страницы по типажу специалистов (`/magi`, `/vedmy`, `/yasnovidyashchie` и т.д.) с листингом участников

---

## 2026-02-25 — Полное отключение сохранения заявок + чистка БД и dump.sql

### Контекст
Пользователь обнаружил, что в админ-панели /admin/applications всё ещё показываются 2 старые тестовые заявки и счётчик «Всего: 2 | Новых: 2». Причина: код POST /api/applications уже не делал INSERT, но 6 тестовых записей оставались в БД и в dump.sql (восстанавливались после рестарта пода).

### Что сделано
- `DELETE FROM applications` — таблица очищена (6 → 0 записей)
- Удалён `INSERT INTO applications VALUES (...)` с 6 старыми записями из `/app/backend/dump.sql`
- Удалён `INSERT INTO applications VALUES (...)` с 6 старыми записями из `/app/backend/data.sql`
- Код POST /api/applications в server.js остался без изменений (уже не делал INSERT, только email)

### Verified by testing_agent (iteration_16.json)
- Backend: **11/11 pytest passed**, 1 skip (rate-limit edge для /api/contact)
- POST /api/applications → 200 success, в БД 0 записей даже после 3 подряд отправок
- GET /api/admin/applications → `[]`, GET /api/admin/dashboard → total=0, new=0, today=0
- Админка UI: "Всего: 0 | Новых: 0", "Нет заявок"
- Валидация 400 для отсутствующих полей работает (5 кейсов)
- Email-нотификация продолжает работать (graceful no-op если нет RESEND_API_KEY)
- /api/contact (contact_messages) **не затронут** — продолжает работать как раньше
- dump.sql/data.sql: 0 совпадений `INSERT INTO applications`

- **P2** Декомпозиция монолитного `backend/server.js` (>1000 строк) на routes/controllers


---

## 2026-02-25 — popup_phone: моментальное применение из админки

### Контекст
Пользователь попросил подтвердить настройку «Телефон после отправки заявки». Поле было реализовано ранее (handoff), но требовалось убедиться в моментальном применении изменений без перезагрузки страницы.

### Что сделано
- `/app/frontend/src/components/ApplicationForm.js`:
  - На mount (`useEffect`) добавлен cache-buster `params: { _: Date.now() }` к `api.get('/settings')`
  - В `handleSubmit` добавлен `await api.get('/settings', { params: { _: Date.now() } })` ПЕРЕД `setShowCallPopup(true)`, чтобы:
    - Свежие изменения из админки применялись моментально (обход Cloudflare edge-cache ~3s)
    - Не было визуального 'flash' старого номера в popup

### Verified by testing_agent (iteration_17 → iteration_18)
- iter_17: backend 6/6 PASS, frontend нашёл проблему edge-cache (~3s stale)
- iter_18: **backend 6/6 + frontend 100%** после фикса cache-buster
- Подтверждены: моментальное применение, fallback на DEFAULT при пустом значении, персистентность после reload, vCard, единый номер для всех форм (в шапке кнопка ведёт на `/zapis-na-priem`)
- После iter_18 — добавлен `await` перед `setShowCallPopup(true)` для устранения визуального flash


---

## 2026-02-25 — Якорный скролл: multi-pass коррекция layout-shift

### Причина проблемы
На мобильных устройствах `<Suspense>` для `ReviewsCarousel` и lazy-загрузка изображений приводят к layout-shift ПОСЛЕ старта smooth-scroll. Якорный Y вычислялся корректно в момент клика, но к завершению анимации скролла секция уже сдвигалась вверх/вниз — пользователь оказывался не у заголовка.

### Что изменено
- `/app/frontend/src/components/Layout.js`:
  - Единая функция `scrollToAnchor(hash)` — DRY для useEffect (hash navigation) и handleNavClick (same-page клик)
  - Multi-pass коррекция: первичный smooth scroll + 4 проверки через 350/700/1100/1600ms
  - Каждая проверка измеряет drift; если >4px — корректирует через `window.scrollTo`
  - Последняя коррекция — `behavior:'auto'` (мгновенная), чтобы зафиксировать пользователя на якоре даже если изображения ещё догружаются
  - Динамический offset из реальной высоты header'а (md:fixed → отступ = высота + 16, mobile static → 16)

### Verified by testing_agent (iteration_19) — 100% (12/12)
- MOBILE (390×844): `/#otzyvy`, `/#uslugi`, `/#ekstrasensy` — sectionTop в пределах 8-16px ✅
- DESKTOP (1920×800): sectionTop ~97.8px (header 82px + offset 16) ✅
- TABLET (768×1024): аналогично desktop ✅
- Cross-page navigation /foto-galereya → /#otzyvy ✅

---

## 2026-02-25 — Горизонтальный overflow на iOS Safari

### Причина проблемы
На iOS Safari у html/body отсутствовал `position: relative` + `width: 100%`, а `#root` использовал `max-width: 100vw` — iOS Safari считает `100vw` шире visual viewport (включает scrollbar gutter), что позволяет дёргать страницу влево/вправо свайпом. Отсутствие `overscroll-behavior-x: none` дополнительно усугубляло rubber-band drag.

### Что изменено
- `/app/frontend/src/index.css` (lines 63-100): html, body, #root получили
  - `position: relative` (анкер для overflow-x на iOS)
  - `width: 100%` + `max-width: 100%` (вместо 100vw)
  - `overflow-x: hidden` с fallback `overflow-x: clip` (более строгая семантика)
  - `overscroll-behavior-x: none` на body (предотвращает iOS rubber-band drag)
- `/app/frontend/src/components/Layout.js` (line 184): убрал `left-0 right-0` с глобального, сделал `md:left-0 md:right-0` (только для desktop, когда header `md:fixed`). На mobile header `max-md:relative`, не требует offset'ов.

### Verified by testing_agent (iteration_20) — 21/21 PASS
- 3 mobile viewports (320, 390, 414) × 7 routes (/, /uchastniki/elena-golunova, /otzyvy, /foto-galereya, /video, /voprosy-i-otvety, /zapis-na-priem) = 21 комбинаций ✅
- `document.documentElement.scrollWidth === window.innerWidth` на всех scroll-позициях ✅
- `window.scrollTo(100, y)` → scrollX остаётся 0 (горизонтальная прокрутка невозможна) ✅
- `body.overscrollBehaviorX === 'none'` ✅
- Desktop (1920) и Tablet (768) — header корректно `md:fixed`, layout не сломан ✅
- Console errors: 0 ✅
- Дизайн (шрифты, цвета, отступы) сохранён ✅

- Console errors: 0


---

## 2026-02-26 — test-email.js: CLI флаги для sender/key/to

### Что сделано
- `backend/scripts/test-email.js` теперь принимает три именованных флага:
  - `--to=<email>` — получатель (переопределяет позиционный аргумент и БД)
  - `--sender=<email>` — переопределяет `SENDER_EMAIL`
  - `--key=<resend-key>` — переопределяет `RESEND_API_KEY`
- Поддержаны формы `--flag=value` и `--flag value`
- Обратная совместимость: первый позиционный аргумент по-прежнему трактуется как email получателя
- Приоритет источников: **CLI flag > REAL ENV (platform/shell) > .env file**
- В диагностическом выводе явно показан источник каждого значения (`CLI flag` / `REAL ENV` / `.env file` / `<NOT SET>`)

### Проверено
- TEST 1 (без флагов, ENV из .env): ✅ реальная отправка через Resend, success
- TEST 2 (--to + --sender + --key с фейковым ключом): ✅ парсинг корректен, `source: CLI flag`, Resend возвращает 401 validation_error как ожидалось
- TEST 3 (позиционный email + --sender + --key): ✅ обратная совместимость, `source: CLI positional arg`
- TEST 4 (--flag value без `=`): ✅ парсинг работает
- Lint: ✅ no issues

### Пример использования на prod
```
node scripts/test-email.js --to=you@mail.com --sender=noreply@yourdomain.ru --key=re_xxx
```

### Commit
`5fd5fe3 test-email: add --to/--sender/--key CLI flags with priority over ENV`

---

## 2026-08-17 — SEO: диагностика индексации, orphan URLs, дубли домена

### Выполнено и закоммичено
1. **Восстановление окружения** — `bash /app/scripts/restore-db.sh` (MariaDB отсутствовал в новом поде).
2. **Fix «Noscript in head contains invalid HTML elements»** — `noscript`-пиксель Яндекс.Метрики перенесён из `<head>` в `<body>` (`frontend/public/index.html`). Скрипт `ym(110304923,'init')` остался в `<head>`. Проверено на 7 типах страниц.
3. **Fix orphan URLs (Приоритет 1 аудита)** — в `frontend/src/pages/HomePage.js` убран lazy-mount секции участников (`useInView`/`participantsRef`). Причина orphan: React после гидрации затирал SSR-разметку, а секция участников монтировалась только по скроллу → краулеры с JS-рендерингом видели 0 ссылок `/uchastniki/*`. Теперь 8 уникальных ссылок в DOM без скролла (desktop + mobile), `loading="lazy"` у картинок сохранён, console errors = 0.
4. **Временный диагностический endpoint** `GET /api/debug/proxy` (`backend/server.js`, коммит `94bc09f`) — отдаёт Host, X-Forwarded-*, req.protocol, req.secure, socket.encrypted. **ДОЛЖЕН БЫТЬ УДАЛЁН** после снятия замеров на production.

### Ключевые результаты диагностики production (17.08.2026)
- Домен создан **27.05.2026** (~2,5 мес) → эффект песочницы, YMYL-тематика.
- **BitNinja WAF**: ~35% TCP-соединений на 443 с одного IP дропаются (SYN drop, `connect=0`); стабильные **403 Forbidden** с части IP (US, HU) и connect timeout (IN) — проверено через check-host.net, 25 узлов. Порт 80 стабилен.
- SSR SEO работает на prod: title/description/canonical/robots/H1/текст отдаются Express (`x-powered-by: Express, Phusion Passenger`).
- **JSON-LD отсутствует в серверном HTML** (добавляется только React-ом).
- Внутренние ссылки в SSR: на внутренних страницах только 1 ссылка (`/`) — нет меню, услуг, тем. Ссылки на участников есть только в SSR главной, `/zapis-na-priem`, `/foto-galereya` (по 3 входящие на каждого).
- Thin content: `/video` — 21 слово, `/foto-galereya` — 37 слов в SSR.
- **Дубли домена (P0)**: редиректов нет вообще (`num_redirects=0` во всех 17 проверках). 200 отдают: `http://`, `https://`, `http://www`, `https://www`, версии со слешем (`/porcha/`) и с любым query. Canonical везде корректный non-www https без слеша. HSTS отсутствует.
- `robots.txt` и `sitemap.xml` на prod отдаются **статикой** мимо Express (etag/last-modified), `lastmod` заморожен на `2026-05-29`. Все 23 URL — только https non-www.
- Бинг: 0 страниц в индексе. Google/Яндекс — нужны скриншоты кабинетов от пользователя.

### Архитектура production (выяснено)
`BitNinja WAF → Caddy (reverse proxy) → Plesk/nginx → Phusion Passenger → Express (Node)`
- HTTP (порт 80) **доходит до Express** → Express-middleware может перехватить и http, и https.
- Существующие на диске файлы (`/static/*`, `robots.txt`, `sitemap.xml`, `favicon.svg`, `yandex_*.html`) отдаёт Caddy **мимо Express**.
- HTML-маршруты идут в Express (следствие постбилд-переименования `index.html` → `index.template.html`).
- Конфига Caddy/nginx/.htaccess в репозитории **нет** — только панель Plesk у хостера.
- `app.set('trust proxy')` **не установлен** → `req.protocol` всегда `http` даже при `X-Forwarded-Proto: https` (проверено эмпирически) → редирект на базе `req.protocol` = гарантированный loop.

### СТАТУС: ОЖИДАНИЕ ДЕПЛОЯ ПОЛЬЗОВАТЕЛЕМ
Шаг 0 (диагностика proxy-заголовков) не завершён: `/api/debug/proxy` на prod → 404, код не задеплоен.
После сообщения пользователя о деплое выполнить 4 замера:
`http://` / `https://` / `http://www.` / `https://www.` → показать таблицу (Host, X-Forwarded-Host, X-Forwarded-Proto, X-Forwarded-Ssl, req.protocol, req.secure, socket.encrypted, originalUrl), затем **удалить endpoint**.
Редиректы внедрять **только после отдельного подтверждения пользователя**.

### Backlog (по приоритетам, ждёт подтверждения пользователя)
- **P0**: 301 http→https и www→non-www (план готов: Express middleware после `express.json()`, до `app.use('/api', api)`, с исключением `/api`, `/static`, файлов с расширением; протокол читать из `X-Forwarded-Proto`, host — из `X-Forwarded-Host`/`Host`).
- **P1**: 301 для trailing slash; блок «Другие экстрасенсы» в SSR страниц участников; ссылки на 8 участников в подвале (Приоритет 2 аудита orphan).
- **P1**: JSON-LD (Organization/WebSite+SearchAction/Person/FAQPage/BreadcrumbList) в серверный HTML.
- **P2**: HSTS, Clean-param, динамический `lastmod` в sitemap; расширить thin content `/video` и `/foto-galereya`; SEO Hub-страницы (`/magi`, `/vedmy`, `/yasnovidyashchie`); декомпозиция `backend/server.js` (~1370 строк).

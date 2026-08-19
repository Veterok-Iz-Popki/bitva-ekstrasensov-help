# PRD — Битва экстрасенсов (bitva-ekstrasensov-help.com)

## Продукт
Сайт помощи участников проекта «Битва экстрасенсов». React SPA + Express (SSR SEO-инъекция) + MariaDB.
Контент управляется через CMS/БД. Тексты в React только как fallback.

## Требования пользователя (постоянные)
- Контент из БД, не хардкодить тексты; SSR обязан использовать те же источники данных, что React.
- Не менять дизайн, адаптивность, URL, canonical, robots, sitemap, отзывы, формы, API без отдельного запроса.
- При изменениях БД синхронизировать `backend/dump.sql` и `backend/data.sql`.
- `git status` до/после, frontend-изменения проверять `yarn build`, завершать при clean tree.
- Проверка через curl/Playwright. Язык общения — русский.

## Архитектура
- `frontend/` — React SPA (Craco, Tailwind). Сборка идёт в `backend/build`; постбилд удаляет `index.html` (остаётся `index.template.html`) и `sitemap.xml`.
- `backend/server.js` — Express: API `/api/*`, динамические `/robots.txt` и `/sitemap.xml`, catch-all SSR.
- `backend/seo/renderer.js` + `shared.js` — серверный рендер SEO-контента внутри `#root`.
- Восстановление окружения (новый pod без MariaDB): `bash /app/scripts/restore-db.sh`.
- Деплой: `git pull` → (при необходимости `yarn build`) → удалить с диска `backend/build/index.html` и `sitemap.xml` → **рестарт Node** (Passenger кеширует процесс).

## Реализовано
- SMTP (Nodemailer), Яндекс.Метрика + SPA-хиты, noscript-пиксель в `<body>`.
- Server-side SEO injection для всех 23 публичных URL.
- Устранён orphan-статус страниц участников.
- Достоверный sitemap lastmod (baseline + timestamps БД); статические sitemap удалены.
- Временный `GET /api/debug/proxy` (коммит `94bc09f`) для замера proxy-заголовков — удалить после диагностики.
- SSR-паритет: `71d2e01` (базовый), `6f629e9` (главная 100%).
- Дампы приведены к чистому виду без преамбулы mysqldump (`56f4c82`), схема БД не менялась.
- **2026-06-19 (`d817dba`)**: устранены реальные SSR↔DOM расхождения:
  - `seo.description` больше не выводится как видимый `<p>` (`renderer.js`: booking/faq/gallery/video) — 0 из 23 страниц;
  - `/voprosy-i-otvety`: подзаголовок из `pages.blocks['faq'].page_subtitle` (тот же fallback, что в `FAQPage.js`) + CTA «Не нашли ответ на свой вопрос?» / «Связаться с нами»; 8 ответов FAQ в SSR сохранены;
  - `/video`: `loadVideos()` в `server.js` теперь читает тот же источник, что React API (`gallery_videos WHERE is_published = TRUE ORDER BY order`), с `description`; SSR отдаёт 3 названия + описания;
  - результат: DOM-only контент на этих страницах = 0, заголовки идентичны.

## Известные расхождения, НЕ исправленные по указанию пользователя
- `/zapis-na-priem`: SSR-only `page_subtitle`, `h2` «Выберите экстрасенса», 8 статусов и 8 ссылок `/uchastniki/*` (React использует `<select>`).
- `/foto-galereya`: SSR-only 6 имён участников + 8 ссылок `/uchastniki/*`.
- 8 страниц участников: SSR-only абзац `participants.description`; `h2` «Статус»/«Специализация»/«Отзывы» против `div` в React.
- 4 услуги: SEO-заголовок `h2` в SSR vs `h3` в DOM; на 10 услугах/темах различается порядок CTA и SEO-блока.
- Отзывы в React отрендерены дважды (desktop + mobile, один скрыт CSS).
- Футер: «2024 Битва экстрасенсов. Все права защищены. © 2026» + «Все права защищены» (данные `site_settings`).
- JSON-LD только в клиентском DOM (в SSR 0 блоков).

## Инфраструктурные факты
- WAF BitNinja блокирует IP по объёму запросов: наш egress `104.198.214.223` отрезан (TCP timeout на 80/443) с ~15:00 19.08.2026 после аудиторской серии. Для production-проверок нужен whitelist.
- Production на момент последнего доступного замера работал на сборке `main.0f8010b0.js`, которой нет в истории репозитория; SSR соответствовал состоянию до `bb7d984`/`71d2e01`.

## Бэклог
- P0: production deploy `94bc09f`, `bb7d984`, `71d2e01`, `6f629e9`, `56f4c82`, `d817dba` + рестарт Node; затем 4 проверки `/api/debug/proxy` и отдельное согласование 301-редиректов.
- P1: HSTS; JSON-LD в SSR; whitelist наших/ботовых IP в BitNinja.
- P1 (не согласовано): миграция `updated_at` для `seo_settings`, `participants`, `faq`.
- P2: остальные расхождения из списка выше; чистка тонкого контента `/video`, `/foto-galereya`; `/api/*` в robots.txt.
- P2: JSON-LD `WebSite`+`SearchAction`, `ContactPage`; SEO-хабы `/magi`, `/vedmy`, `/yasnovidyashchie`.
- P2: сохранение заявок в БД до отправки SMTP; декомпозиция `backend/server.js`.

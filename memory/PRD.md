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

- **2026-06-19 (`7b9e055`)**: финальная очистка SSR↔DOM паритета:
  - `/zapis-na-priem`: убраны SSR-only `h2` «Выберите экстрасенса», список 8 участников со статусами, 8 ссылок `/uchastniki/*` и `page_subtitle` (React выводит только `page_title` + форму);
  - `/foto-galereya`: убран SSR-only список участников и 8 ссылок; подписи фото теперь `<p>` (как в `GalleryPage.js`), источник тот же (`gallery_photos WHERE is_published`);
  - 8 участников: убран SSR-only абзац `participants.description`; «Статус», «Специализация», «Отзывы» → `<div>`, «Не упустите свой шанс» → `<p>` (как в `ParticipantDetailPage.js`); `full_description` и 25 отзывов сохранены;
  - 4 услуги: заголовок доп. блока `h2` → `h3` (как в `ServicePage.js`); на 10 услугах/темах порядок изменён на «доп. блок → CTA → похожие», как в React;
  - результат: SSR-only 9 (8 ответов FAQ в accordion + 0 прочего), DOM-only 2 (тексты формы записи), 21/23 страницы с полным паритетом.

## Известные расхождения, НЕ исправленные (допустимые/по указанию пользователя)
- `/voprosy-i-otvety`: 8 ответов FAQ есть в SSR, в DOM появляются после раскрытия accordion — допустимо по решению пользователя.
- `/zapis-na-priem`: 2 текста формы («Данные не будут передаваться третьим лицам») есть только в DOM — потребовало бы дублирования формы в SSR.
- **2026-06-19 (`5e66488`)**: устранён двойной рендер отзывов. Было: `ReviewsBlock` вызывался дважды (`hidden md:block` в левой колонке + `md:hidden` после layout) → 50 карточек в DOM, каждый отзыв 2 раза в HTML. Стало: один экземпляр с классом `profile-reviews`; на мобиле `.profile-left { display: contents }` + `order` в `App.css` переносят блок в прежнее визуальное место. DOM: 25 карточек, 1 копия каждого отзыва; SSR не менялся (25 отзывов). Верстка desktop/mobile идентична прежней (координаты блоков совпали).
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

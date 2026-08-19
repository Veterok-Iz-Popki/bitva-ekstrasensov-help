# PRD — Битва экстрасенсов (bitva-ekstrasensov-help.com)

## Продукт
Сайт помощи участников проекта «Битва экстрасенсов». React SPA + Express (SSR SEO-инъекция) + MariaDB.
Контент управляется через CMS/БД. Тексты не хардкодятся в React без необходимости (только fallback-значения).

## Требования пользователя (постоянные)
- Контент из БД, не хардкодить тексты.
- Не менять дизайн, адаптивность, URL, canonical, robots, sitemap без отдельного запроса.
- При изменениях БД синхронизировать `backend/dump.sql` и `backend/data.sql`.
- `git status` до/после, frontend-изменения проверять `yarn build`, завершать при clean tree.
- Проверка через curl/Playwright. Язык общения — русский.

## Архитектура
- `frontend/` — React SPA (Craco, Tailwind). Сборка попадает в `backend/build`, `index.html` переименовывается в `index.template.html` (иначе Caddy отдаёт статику вместо SSR).
- `backend/server.js` — монолитный Express: API `/api/*`, динамический sitemap, catch-all SSR.
- `backend/seo/renderer.js` + `backend/seo/shared.js` — server-side SEO рендер (title/description/canonical/robots/OG + контент внутри `#root`).
- `backend/seo/lastmod.json` — baseline lastmod для sitemap.
- Восстановление окружения (новый pod, нет MariaDB): `bash /app/scripts/restore-db.sh`.

## Реализовано
- SMTP (Nodemailer) вместо Resend; `POST /api/admin/email-probe`.
- Яндекс.Метрика + SPA-хиты; noscript-пиксель перенесён в `<body>`.
- Server-side SEO injection для всех публичных страниц (не клоакинг).
- Устранён orphan-статус страниц участников (секция участников рендерится без скролла).
- Достоверный sitemap lastmod (baseline + timestamps БД), статические sitemap.xml удалены.
- Аудит доменов: выявлены дубли http/www/slash; добавлен временный `GET /api/debug/proxy` (коммит `94bc09f`) — ждём production deploy.
- SSR-паритет с React DOM для 23 URL (коммит `71d2e01`).
- **2026-06 (коммит `6f629e9`)**: главная 100% паритет. Причина расхождения была не в отсутствии `hero_intro` в БД, а в рендерере: он рендерил несуществующие ключи `hero_intro`/`hero_main` и игнорировал реально используемый React ключ `about_text`. Исправлено:
  - SSR рендерит `pages.blocks['home'].about_text` с тем же fallback, что в `HomePage.js`;
  - уровни заголовков выровнены (`hero_subtitle` → h2, `hero_subheading` → h3);
  - карточки услуг: первое слово h3 + остаток подзаголовком, как в React;
  - `loadParticipantsList` теперь выбирает `specializations`, SSR печатает первые 2 бейджа, как React.
  - БД НЕ менялась, dump/data.sql не требовали правок.
  - Результат: SSR 619 слов vs DOM 639 (разница — 20 декоративных «•»), SSR-only контента 0, H1/H2/H3 идентичны, ссылок 25 = 25, console errors 0, hydration warnings 0. Остальные 22 URL: 200, H1 и canonical на месте.

## Бэклог
- P0: production deploy коммитов `94bc09f`, `bb7d984`, `71d2e01`, `6f629e9`; после deploy — 4 проверки `/api/debug/proxy` (http/https × www/non-www), затем отдельное согласование редиректов (HTTP→HTTPS, WWW→non-WWW, slash).
- P1: HSTS.
- P1 (не согласовано): миграция `updated_at` для `seo_settings`, `participants`, `faq`.
- P2 (не согласовано): чистка тестового мусора в галерее/видео (`asdasd`, `dfsdf`…).
- P2: JSON-LD `WebSite`+`SearchAction` на главной, `ContactPage` на `/zapis-na-priem`.
- P2: SEO-хабы `/magi`, `/vedmy`, `/yasnovidyashchie`.
- P2: сохранение заявок в БД до отправки SMTP; декомпозиция `backend/server.js`.

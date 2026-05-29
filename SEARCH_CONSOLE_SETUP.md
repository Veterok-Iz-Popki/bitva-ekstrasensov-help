# Search Console Setup — пошаговая инструкция

Сайт **полностью готов** к подключению к Google Search Console, Yandex Webmaster и Bing Webmaster Tools. Инфраструктура для всех трёх методов верификации (meta-тег, HTML-файл, DNS) подготовлена. Эта инструкция — для пользователя, чтобы подключить реальные токены.

## Production domain
`https://bitva-ekstrasensov-help.com`

## Sitemap (отправлять во все вебмастеры)
`https://bitva-ekstrasensov-help.com/sitemap.xml`

---

## 🔵 Google Search Console

### Шаг 1. Добавить ресурс
Открыть https://search.google.com/search-console → **Add property** → URL prefix → ввести `https://bitva-ekstrasensov-help.com/`.

### Шаг 2. Выбрать метод верификации

#### Вариант A — Meta-тег (РЕКОМЕНДУЕТСЯ)
1. Google покажет токен вида `<meta name="google-site-verification" content="abc123...">`
2. Открыть `/app/frontend/public/index.html`
3. Раскомментировать строку:
   ```html
   <!-- <meta name="google-site-verification" content="REPLACE_WITH_GOOGLE_TOKEN" /> -->
   ```
   и подставить токен от Google вместо `REPLACE_WITH_GOOGLE_TOKEN`.
4. Перезапустить frontend: `sudo supervisorctl restart frontend`
5. Скопировать в build: `cp /app/frontend/public/index.html /app/backend/build/index.html`
6. Нажать **Verify** в GSC.

#### Вариант B — HTML-файл
1. Google даст файл `googleXXXXXXXXXX.html`.
2. Положить его в `/app/frontend/public/googleXXXXXXXXXX.html`.
3. Скопировать в build: `cp /app/frontend/public/googleXXXXXXXXXX.html /app/backend/build/`
4. Проверить: `curl https://bitva-ekstrasensov-help.com/googleXXXXXXXXXX.html` — должен вернуть содержимое файла, **не** SPA index.html.
5. Нажать **Verify**.

#### Вариант C — DNS (TXT-запись)
1. У регистратора домена `bitva-ekstrasensov-help.com` добавить TXT-запись со значением от Google.
2. Изменений в коде НЕ требуется.

### Шаг 3. Отправить sitemap
В GSC → **Sitemaps** → ввести `sitemap.xml` → **Submit**.

### Шаг 4. Запросить индексацию
**URL Inspection** → ввести `https://bitva-ekstrasensov-help.com/` → **Request indexing**. Повторить для 5-10 ключевых страниц.

---

## 🔴 Yandex Webmaster

### Шаг 1. Добавить сайт
Открыть https://webmaster.yandex.ru → **Добавить сайт** → ввести `https://bitva-ekstrasensov-help.com`.

### Шаг 2. Подтвердить право

#### Вариант A — Meta-тег
1. Yandex покажет токен `<meta name="yandex-verification" content="...">`.
2. В `/app/frontend/public/index.html` раскомментировать:
   ```html
   <!-- <meta name="yandex-verification" content="REPLACE_WITH_YANDEX_TOKEN" /> -->
   ```
   и вставить значение.
3. `sudo supervisorctl restart frontend` + `cp ... /app/backend/build/index.html`
4. **Проверить** в Yandex Webmaster.

#### Вариант B — HTML-файл
1. Положить файл `yandex_XXXXXXXXXX.html` в `/app/frontend/public/`.
2. `cp /app/frontend/public/yandex_*.html /app/backend/build/`
3. **Проверить**.

#### Вариант C — DNS (TXT)
Добавить TXT-запись у регистратора.

### Шаг 3. Sitemap
В Yandex Webmaster → **Индексирование** → **Файлы Sitemap** → добавить `https://bitva-ekstrasensov-help.com/sitemap.xml`.

### Шаг 4. Регион сайта
**Информация о сайте** → **Региональность** → указать «Россия».

---

## 🟠 Bing Webmaster Tools

### Шаг 1. Добавить сайт
Открыть https://www.bing.com/webmasters → **Add a Site** → ввести URL.

> **TIP:** Bing поддерживает импорт из Google Search Console. Если GSC уже настроен, можно импортировать в один клик.

### Шаг 2. Верификация

#### Вариант A — Meta-тег (`msvalidate.01`)
1. Bing покажет `<meta name="msvalidate.01" content="...">`.
2. В `/app/frontend/public/index.html` раскомментировать:
   ```html
   <!-- <meta name="msvalidate.01" content="REPLACE_WITH_BING_TOKEN" /> -->
   ```
3. Restart + copy в build.

#### Вариант B — XML-файл (`BingSiteAuth.xml`)
1. Bing даст файл `BingSiteAuth.xml`.
2. Положить в `/app/frontend/public/BingSiteAuth.xml`.
3. `cp /app/frontend/public/BingSiteAuth.xml /app/backend/build/`
4. Проверить: `curl https://bitva-ekstrasensov-help.com/BingSiteAuth.xml` — должен вернуть XML с правильным content-type `application/xml`.

#### Вариант C — DNS
TXT-запись у регистратора.

### Шаг 3. Sitemap
В Bing Webmaster → **Sitemaps** → `https://bitva-ekstrasensov-help.com/sitemap.xml`.

---

## ✅ Что уже готово (проверено в Stage 5)

| Параметр | Состояние |
|---|---|
| `/robots.txt` | HTTP 200, `text/plain`, содержит `Sitemap:` директиву |
| `/sitemap.xml` | HTTP 200, `application/xml`, 23 URL, все на prod-домене |
| Canonical на всех 23 страницах | `https://bitva-ekstrasensov-help.com/...` |
| `<html lang="ru">` | Установлен |
| 404 страница | `noindex, nofollow`, не индексируется |
| `/admin/*` | Закрыто в `robots.txt` |
| `/api/admin/*`, `/api/auth/*` | Закрыто в `robots.txt` |
| HTTPS-only | Все URL `https://` |
| Favicon (SVG) | `/favicon.svg`, ссылка в `<head>` |
| Web App Manifest | `/manifest.json`, ссылка в `<head>` |
| Mobile-friendly viewport | `<meta name="viewport" content="width=device-width, initial-scale=1" />` |
| JSON-LD на всех публичных страницах | Валиден, без syntax errors |
| BreadcrumbList | Установлен на 22/23 страницах |

---

## Известные nuances

1. **Cloudflare-managed robots.txt** на preview-домене добавляет свой блок ПЕРЕД нашим. На prod-домене `bitva-ekstrasensov-help.com` backend-route `/robots.txt` отдаёт чистый robots.txt напрямую.

2. **Hero логотипы** на главной (`Битва`, `ТНТ`) хранятся в CMS со ссылками на `https://customer-assets.emergentagent.com/...` (legacy Emergent CDN). Они работают (HTTP 200, HTTPS, no mixed content), но это внешний CDN. По желанию можно переmигрировать через админку (`/admin/pages` → home → `Логотип «Битва»` → переzагрузить картинку), тогда они будут отдаваться через `/api/uploads/`.

3. **HTML verification files** — `express.static` обслуживает любые файлы из `BUILD_DIR`. Тест-файл `googleXXXX.html` подтверждён: HTTP 200, корректное содержимое (не SPA-fallback). Файлы НЕ конфликтуют с React Router.

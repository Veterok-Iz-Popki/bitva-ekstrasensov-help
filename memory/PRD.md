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

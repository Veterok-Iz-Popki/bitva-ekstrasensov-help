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
- Все изображения в `/app/backend/uploads/` сконвертированы в WebP (`cwebp -q 85`)
- Новый компонент `<PictureImg>` (`/app/frontend/src/components/PictureImg.js`) — рендерит `<picture>` с WebP-source и fallback на оригинал
- Заменены `<img>` на `<PictureImg>` в: `HomePage`, `ParticipantDetailPage`, `ParticipantsPage`, `GalleryPage`, `VideoPage`, `Layout` (header/footer)
- LCP-картинки (логотипы шапки, hero, фото детали) помечены `loading="eager"` + `fetchpriority="high"`
- Остальные `<img>` уже с `loading="lazy"` + `decoding="async"` через PictureImg
- Backend: `Cache-Control: public, max-age=31536000, immutable` для `/api/uploads/*`
- Backend: длинный кэш для статики React-build (`maxAge: 1y, immutable`), но `index.html` — `no-cache`
- Backend: автогенерация `.webp` варианта при загрузке нового файла через `/api/admin/upload` (sharp)

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

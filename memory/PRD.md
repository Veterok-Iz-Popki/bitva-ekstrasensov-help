# PRD — Битва экстрасенсов: Официальный сайт помощи

## Проблема
SEO-оптимизированный русскоязычный сайт для привлечения заявок от людей, ищущих помощь экстрасенсов.

## Архитектура
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI + MongoDB (Motor async driver)
- **Auth:** JWT (admin panel)
- **Spam protection:** Honeypot + Rate limiting
- **Email:** Resend API
- **Image processing:** Pillow

## Реализовано

### Публичные страницы
- **Главная (/)** — Hero, участники, преимущества, услуги с ссылками, SEO-текст, ссылки на темы
- **Участники (/uchastniki)** — Карточки с фото
- **Профиль участника (/uchastniki/:slug)** — Фото, биография, форма
- **Запись (/zapis-na-priem)** — Форма + шаги
- **Отзывы (/otzyvy)** — Карточки со звёздами
- **FAQ (/voprosy-i-otvety)** — Аккордеон

### 6 тематических страниц
- /porcha, /proklyatie, /sglaz, /venets-bezbrachiya, /privorot, /zaklyatie
- Уникальный контент, SEO, CMS-управление

### 4 страницы услуг (25.02.2026)
- **/finansovaya-magiya** — Финансовая магия
- **/lyubovnaya-magiya** — Любовная магия
- **/magiya-zhizni** — Магия жизни
- **/magicheskaya-zashchita** — Магическая защита

Каждая страница услуг содержит:
- H1 (название), описание, направления, типичные ситуации, процесс консультации, результаты, CTA
- Уникальные SEO мета-теги
- Полное CMS-управление через админ-панель
- Кнопки «Подробнее» на главной ведут на соответствующие страницы

### CMS Админ-панель (/admin)
- JWT авторизация
- CRUD: Участники, Отзывы, FAQ
- Редактирование контента всех страниц (6 тем + 4 услуги)
- SEO мета-теги для всех страниц
- Заявки: просмотр, экспорт CSV
- Email-уведомления через Resend

## Учётные данные
- **Admin:** nikoa2020@gmail.com / aspire5542gl1952tq

## Тестирование
- iteration_7: 83 backend + frontend тестов — 100% passed (услуги + регрессия тем)
- iteration_6: 37 тестов — 100% passed (темы)

## Структура ключевых файлов
```
backend/seed_data.py    - Данные для всех страниц и SEO
backend/server.py       - API endpoints
frontend/src/pages/
  ServicePage.js        - Компонент страниц услуг
  TopicPage.js          - Компонент тематических страниц
  HomePage.js           - Главная с ссылками на услуги и темы
  admin/PagesAdmin.js   - CMS для всех страниц
  admin/SEOAdmin.js     - SEO управление
frontend/src/App.js     - Все роуты
```

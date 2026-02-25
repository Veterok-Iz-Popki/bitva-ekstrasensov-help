# PRD — Битва экстрасенсов: Официальный сайт помощи

## Проблема
SEO-оптимизированный русскоязычный сайт для привлечения заявок от людей, ищущих помощь экстрасенсов.

## Архитектура
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI + MongoDB (Motor async driver)
- **Auth:** JWT (admin panel)
- **Spam protection:** Honeypot + Rate limiting
- **Email:** Resend API (настроен и работает)
- **Image processing:** Pillow (оптимизация фото)

## Реализовано

### Форма заявки
- Фамилия, Имя, Отчество (обязательные)
- Телефон с маской +7 (999) 999-99-99
- Возраст, Город (необязательные)
- Описание проблемы (обязательное)
- Honeypot + Rate limiting

### Публичные страницы
- **Главная (/)** — Hero, карточки участников, преимущества, услуги, SEO-текст, ссылки на темы
- **Участники (/uchastniki)** — Карточки с фото
- **Профиль участника (/uchastniki/:slug)** — Фото, биография, форма записи
- **Запись (/zapis-na-priem)** — Форма + шаги консультации
- **Отзывы (/otzyvy)** — Карточки со звёздами
- **FAQ (/voprosy-i-otvety)** — Аккордеон

### 6 тематических страниц (25.02.2026)
- **Порча (/porcha)** — Признаки, диагностика, CTA
- **Проклятие (/proklyatie)** — Родовые проклятия, признаки, CTA
- **Сглаз (/sglaz)** — Симптомы, снятие, CTA
- **Венец безбрачия (/venets-bezbrachiya)** — Признаки, снятие блокировки, CTA
- **Приворот (/privorot)** — Диагностика, снятие, CTA
- **Заклятие (/zaklyatie)** — Признаки, снятие, CTA

Каждая страница:
- Уникальный контент из БД
- Уникальные SEO мета-теги (title, description, keywords, h1, og)
- Редактируется через CMS (админ-панель -> Страницы / SEO)
- Breadcrumb навигация
- Schema.org JSON-LD

### CMS Админ-панель (/admin)
- JWT авторизация
- Dashboard со статистикой
- CRUD: Участники (с загрузкой фото), Отзывы, FAQ
- Редактирование контента всех страниц (включая 6 тем)
- Управление SEO мета-тегами всех страниц (включая 6 тем)
- Заявки: просмотр, фильтрация, экспорт CSV
- Настройки email-уведомлений

### Интеграции
- Email-уведомления через Resend API
- Загрузка и оптимизация фото через Pillow

## API Endpoints
- `/api/pages/{slug}` — GET (public) / PUT (admin)
- `/api/seo/{slug}` — GET (public) / PUT (admin)
- `/api/participants` — GET/POST/PUT/DELETE
- `/api/reviews` — GET/POST/PUT/DELETE
- `/api/faq` — GET/POST/PUT/DELETE
- `/api/applications` — POST (public), GET/PUT/DELETE (admin)
- `/api/admin/applications/export/csv` — GET
- `/api/admin/upload` — POST
- `/api/settings` — GET/PUT
- `/api/admin/login` — POST
- `/api/admin/stats` — GET

## Учётные данные
- **Admin:** nikoa2020@gmail.com / aspire5542gl1952tq

## Тестирование
- iteration_6: 37 backend + frontend E2E тестов — 100% passed (тематические страницы)

## Структура файлов
```
/app/
├── backend/
│   ├── server.py
│   ├── seed_data.py
│   ├── uploads/
│   ├── tests/
│   │   └── test_topic_pages.py
│   └── .env
├── frontend/src/
│   ├── components/
│   ├── pages/
│   │   ├── TopicPage.js
│   │   ├── HomePage.js
│   │   └── admin/
│   │       ├── PagesAdmin.js
│   │       └── SEOAdmin.js
│   └── lib/api.js
├── memory/PRD.md
└── test_reports/
    └── iteration_6.json
```

# PRD — Битва экстрасенсов: Официальный сайт помощи

## Проблема
SEO-оптимизированный русскоязычный сайт для привлечения заявок от людей, ищущих помощь экстрасенсов.

## Архитектура
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI + MongoDB (Motor async driver)
- **Auth:** JWT (admin panel)
- **Email:** Resend API
- **Image processing:** Pillow

## Реализовано

### Публичные страницы
- Главная (/), Участники (/uchastniki), Профиль участника (/uchastniki/:slug)
- Запись (/zapis-na-priem), Отзывы (/otzyvy), FAQ (/voprosy-i-otvety)

### 6 тематических страниц
- /porcha, /proklyatie, /sglaz, /venets-bezbrachiya, /privorot, /zaklyatie

### 4 страницы услуг
- /finansovaya-magiya, /lyubovnaya-magiya, /magiya-zhizni, /magicheskaya-zashchita

### Отзывы участников (25.02.2026)
- **96 отзывов** в БД (12 на каждого из 8 участников)
- Привязка к участнику через `participant_slug`
- На странице участника: первые 5 видны, остальные через «Показать ещё»
- Все отзывы в DOM (SEO-индексируемые)
- CMS: добавление, редактирование, удаление, привязка к участнику, статус
- Фильтрация по участнику в админ-панели

### CMS Админ-панель (/admin)
- JWT авторизация
- CRUD всех сущностей + управление контентом/SEO всех страниц
- Отзывы: привязка к участнику, фильтрация, статус публикации

## API Endpoints
- `/api/participants/{slug}/reviews` — GET (отзывы конкретного участника)
- `/api/pages/{slug}`, `/api/seo/{slug}` — GET/PUT
- `/api/participants`, `/api/reviews`, `/api/faq`
- `/api/admin/reviews` — CRUD с participant_slug

## DB Schema: reviews
```
{ id, participant_slug, author_name, author_city, text, rating, is_published, created_at }
```

## Учётные данные
- **Admin:** nikoa2020@gmail.com / aspire5542gl1952tq

## Тестирование
- iteration_8: 22 backend + full frontend — 100% (отзывы участников)
- iteration_7: 83 теста — 100% (услуги + регрессия)
- iteration_6: 37 тестов — 100% (темы)

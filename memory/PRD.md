# PRD — Битва экстрасенсов: Официальный сайт помощи

## Архитектура
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI + MongoDB (Motor)
- **Auth:** JWT | **Email:** Resend | **Images:** Pillow (сжатие, 5MB лимит)

## Реализовано

### Публичные страницы
- Главная (/), Участники (/uchastniki), Профиль (/uchastniki/:slug)
- Запись (/zapis-na-priem) — только форма, без доп. блоков
- Отзывы (/otzyvy), FAQ (/voprosy-i-otvety)
- 6 тем: /porcha, /proklyatie, /sglaz, /venets-bezbrachiya, /privorot, /zaklyatie
- 4 услуги: /finansovaya-magiya, /lyubovnaya-magiya, /magiya-zhizni, /magicheskaya-zashchita
- Фотогалерея (/foto-galereya) — Grid + Lightbox + Lazy loading
- Видео (/video) — Video cards + YouTube/Vimeo/Rutube embed

### UX
- **ScrollToTop** — глобальный компонент, прокрутка в верх при любом переходе, scrollRestoration='manual'

### Отзывы участников
- 96 отзывов (12 на каждого из 8 участников), CMS-управляемые

### CMS Админ-панель (/admin)
- Заявки, Участники, Отзывы, FAQ, Страницы, SEO, Сообщения, Настройки
- Фотогалерея, Видео

## Учётные данные
- **Admin:** nikoa2020@gmail.com / aspire5542gl1952tq

## Тестирование
- iteration_9: 21 backend + full frontend — 100% (галерея + видео)
- iteration_8: 22 теста — 100% (отзывы участников)
- iteration_7: 83 теста — 100% (услуги)
- iteration_6: 37 тестов — 100% (темы)
- Scroll + Booking fix: manual screenshot verification

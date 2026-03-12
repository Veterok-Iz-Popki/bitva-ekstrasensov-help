# Битва Экстрасенсов — Официальный сайт помощи

## Описание проекта
SEO-оптимизированный сайт «Битва экстрасенсов — официальный сайт помощи» с CMS для управления контентом.

## Стек технологий
- **Backend:** Node.js, Express.js, MariaDB (mysql2), JWT, Resend (email), Multer
- **Frontend:** React, Tailwind CSS, shadcn/ui, react-router-dom

## Реализованные функции
- Главная страница с каруселью отзывов и списком экстрасенсов
- Индивидуальные страницы для 8 экстрасенсов с унифицированным дизайном
- Страница записи на приём `/zapis-na-priem` с персонализацией по экстрасенсу
- Админ-панель (CRUD, заявки, управление контентом)
- Мобильная верстка без горизонтального скролла
- vCard endpoint `/api/contact.vcf` (inline, text/vcard, UTF-8)
- Email-уведомления через Resend

## Завершено 12 марта 2026
- Исправлен эндпоинт `/api/contact.vcf`: headers `text/vcard; charset=utf-8` + `inline`
- Удалён эндпоинт `/api/contact-download.vcf`
- Полностью удалена интеграция Google Contacts API (backend + frontend + .env)
- Попап сохранения контакта использует прямую ссылку на `/api/contact.vcf`

## Бэклог
- P1: Автоматическая генерация sitemap.xml
- P2: Рефакторинг server.js на модули (routes, controllers)

## Учётные данные
- Админ: `/admin`, `nikoa2020@gmail.com` / `aspire5542gl1952tq`

## Известные особенности среды
- MariaDB нестабильна в среде Emergent. При пустом сайте: `cd /app/backend && npm run setup`

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

## Реализовано (25.02.2026)

### ✅ Форма заявки (обновлено)
Новые поля согласно ТЗ:
- **Фамилия** (lastName) — обязательно
- **Имя** (firstName) — обязательно
- **Отчество** (patronymic) — обязательно
- **Телефон** (phone) — обязательно, маска +7 (999) 999-99-99
- **Возраст** (age) — необязательно
- **Город** (city) — необязательно
- **Проблема** (problem) — обязательно, textarea

Валидация на фронте и бэке, honeypot + rate limiting.

### ✅ Шапка сайта
- Логотип слева
- Меню по центру (Экстрасенсы, Отзывы, FAQ, Контакты)
- Кнопка "Заказать звонок" справа
- Мобильное бургер-меню

### ✅ Логотипы на главной
- Битва экстрасенсов + ТНТ — между "Сайт помощи экстрасенсов" и "Уникальная возможность!"
- Адаптивные размеры (h-10 md:h-14 lg:h-16)
- Управляемые через CMS (hero_logo_bitva, hero_logo_tnt, alt-тексты)

### ✅ Дизайн (Референс: bitva-ekstrasensov-help.ru)
- Тёмно-бирюзовый градиентный фон
- Золотые акценты (#d4a637)
- Шрифты: Playfair Display (заголовки) + Fira Sans (текст)
- Glassmorphism карточки
- Полная адаптивность (desktop/tablet/mobile)

### ✅ Публичные страницы
- **Главная (/)** — Hero, карточки участников, преимущества, отзывы, услуги, форма
- **Участники (/uchastniki)** — Горизонтальные карточки с круглыми фото
- **Профиль участника (/uchastniki/:slug)** — Фото, биография, форма записи
- **Запись (/zapis-na-priem)** — Форма + шаги консультации
- **Отзывы (/otzyvy)** — Карточки со звёздами
- **FAQ (/voprosy-i-otvety)** — Аккордеон
- **Контакты (/kontakty)** — Форма обратной связи

### ✅ CMS Админ-панель (/admin)
- JWT авторизация (admin/admin123)
- Dashboard со статистикой
- CRUD: Участники (с загрузкой фото), Отзывы, FAQ
- Редактирование контента страниц
- Управление SEO мета-тегами
- Заявки: просмотр, фильтрация по статусу, **экспорт CSV**
- **Настройки email-уведомлений** (вкл/выкл + адрес)

### ✅ Email-уведомления (Resend)
- Интеграция с Resend API работает
- Настраиваемый email получателя через CMS
- Переключатель вкл/выкл в админке
- HTML-шаблон письма с данными заявки

### ✅ Загрузка фото участников
- Кнопка загрузки в админке
- Автоматическая оптимизация (до 1200px, JPEG 85%)
- Поддержка JPEG, PNG, WebP, GIF (макс. 5MB)
- Хранение в /backend/uploads/

### ✅ Экспорт заявок в CSV
- Кнопка экспорта на странице заявок
- UTF-8 с BOM для корректного отображения в Excel
- Колонки: Дата, Имя, Телефон, Город, Возраст, Мессенджер, Описание, Статус, Заметки

### ✅ Защита форм
- Honeypot (скрытое поле)
- Rate limiting (макс. 5 запросов/минуту)
- Без reCAPTCHA

### ✅ SEO
- Уникальные Title/Description для каждой страницы
- Один H1 на страницу
- Schema.org JSON-LD микроразметка
- ЧПУ URL с транслитерацией

### Тестирование (iteration_4)
- 39 backend API тестов — 100% passed
- Frontend E2E — 100% passed
- Email-уведомления подтверждены в логах

## API Endpoints
- `/api/participants` — GET/POST/PUT/DELETE
- `/api/reviews` — GET/POST/PUT/DELETE
- `/api/faq` — GET/POST/PUT/DELETE
- `/api/pages/{slug}` — GET/PUT
- `/api/seo/{slug}` — GET/PUT
- `/api/applications` — POST (публичный), GET/PUT/DELETE (admin)
- `/api/admin/applications/export/csv` — GET (admin)
- `/api/admin/upload` — POST (admin, multipart/form-data)
- `/api/contact` — POST
- `/api/settings` — GET/PUT
- `/api/admin/login` — POST
- `/api/admin/stats` — GET

## Учётные данные
- **Admin:** nikoa2020@gmail.com / aspire5542gl1952tq
- **Preview URL:** https://spiritual-guide-60.preview.emergentagent.com
- **Email для уведомлений:** nikoa2020@gmail.com (тестовый режим Resend)

## Бэклог

### P1 (Высокий приоритет)
- ✅ Email-уведомления через Resend — ГОТОВО
- ✅ Загрузка фото участников — ГОТОВО
- ✅ Экспорт заявок в CSV — ГОТОВО
- Верификация домена в Resend для отправки на любые email

### P2 (Средний приоритет)
- Смена пароля администратора из CMS
- Расширенная фильтрация заявок по дате

### P3 (Будущее)
- Интеграция с CRM
- Мультиязычность

## Структура файлов
```
/app/
├── backend/
│   ├── server.py
│   ├── seed_data.py
│   ├── uploads/           # Загруженные фото
│   ├── tests/
│   │   ├── test_api.py
│   │   └── test_new_features.py
│   └── .env               # MONGO_URL, RESEND_API_KEY, JWT_SECRET
├── frontend/src/
│   ├── components/
│   ├── pages/
│   │   └── admin/
│   └── lib/api.js
├── memory/PRD.md
└── test_reports/
    └── iteration_4.json   # Последний отчёт тестирования
```

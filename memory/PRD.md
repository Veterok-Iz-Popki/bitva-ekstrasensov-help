# PRD — Битва экстрасенсов: Официальный сайт помощи

## Проблема
SEO-оптимизированный русскоязычный сайт для привлечения заявок от людей, ищущих помощь экстрасенсов.

## Архитектура
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI + MongoDB (Motor async driver)
- **Auth:** JWT (admin panel)
- **Spam protection:** Honeypot + Rate limiting
- **Email:** Resend (опционально, требует API key)

## Пользователи
- **Посетители** (25-65 лет, преимущественно женщины) — ищут помощь экстрасенсов
- **Администратор** — управляет всем контентом через CMS

## Реализовано (25.02.2026)

### Дизайн (Референс: bitva-ekstrasensov-help.ru)
- Тёмно-бирюзовый градиентный фон
- Золотые акценты (#d4a637)
- Шрифты: Playfair Display (заголовки) + Fira Sans (текст)
- Glassmorphism карточки
- Полная адаптивность (desktop/tablet/mobile)

### Публичные страницы
- **Главная (/)** — Hero секция, вертикальные карточки участников (круглые фото), преимущества (6 иконок), карусель отзывов, услуги (4 категории), SEO-текст, форма заявки
- **Участники (/uchastniki)** — Горизонтальные карточки с круглыми фото (150px), специализации, кнопка "Обратиться"
- **Профиль участника (/uchastniki/:slug)** — Фото, биография, специализации, форма записи
- **Запись на приём (/zapis-na-priem)** — Форма (имя, телефон, возраст, город, описание) + шаги консультации
- **Отзывы (/otzyvy)** — Карточки отзывов со звёздами + статистика доверия
- **FAQ (/voprosy-i-otvety)** — Аккордеон вопросов-ответов
- **Контакты (/kontakty)** — Форма обратной связи + контактная информация

### CMS Админ-панель (/admin)
- JWT авторизация (admin/admin123)
- Dashboard со статистикой
- CRUD: Участники, Отзывы, FAQ
- Редактирование контента страниц
- Управление SEO мета-тегами
- Просмотр/управление заявками
- Просмотр сообщений обратной связи
- Настройки сайта

### SEO
- Уникальные Title/Description для каждой страницы
- Ключевые слова для Яндекса
- Schema.org JSON-LD микроразметка
- ЧПУ URL с транслитерацией
- Правильная структура H1-H3

### API Endpoints
- `/api/participants` — GET (публичный), CRUD (admin)
- `/api/reviews` — GET (публичный), CRUD (admin)
- `/api/faq` — GET (публичный), CRUD (admin)
- `/api/pages/{slug}` — GET (публичный), PUT (admin)
- `/api/seo/{slug}` — GET (публичный), PUT (admin)
- `/api/applications` — POST (публичный), GET/PUT/DELETE (admin)
- `/api/contact` — POST (публичный)
- `/api/settings` — GET (публичный), PUT (admin)
- `/api/admin/login` — POST
- `/api/admin/stats` — GET (admin)

### Тестирование
- 24 backend API тестов (100% passed)
- Frontend E2E тестирование пройдено
- Мобильная адаптивность проверена

## Бэклог

### P0 (Высокий приоритет)
- ✅ Полная переработка дизайна согласно референсу

### P1 (Средний приоритет)
- Настройка Resend API key для email-уведомлений
- Загрузка собственных фото участников через админку (file upload)
- Смена пароля администратора из CMS

### P2 (Низкий приоритет)
- Экспорт заявок в CSV/Excel
- Фильтрация заявок по статусу/дате
- WYSIWYG редактор для текстового контента

### P3 (Будущее)
- Мультиязычность (если нужна)
- Интеграция с CRM

## Структура файлов
```
/app/
├── backend/
│   ├── server.py           # FastAPI приложение
│   ├── seed_data.py        # Seed данные
│   ├── requirements.txt
│   ├── tests/
│   │   └── test_api.py     # API тесты
│   └── .env
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ui/         # Shadcn компоненты
│       │   ├── ApplicationForm.js
│       │   ├── Layout.js   # Header + Footer
│       │   └── AdminLayout.js
│       ├── pages/
│       │   ├── HomePage.js
│       │   ├── ParticipantsPage.js
│       │   ├── ParticipantDetailPage.js
│       │   ├── ReviewsPage.js
│       │   ├── FAQPage.js
│       │   ├── ContactsPage.js
│       │   ├── BookingPage.js
│       │   └── admin/      # Админ страницы
│       ├── lib/
│       │   └── api.js
│       ├── App.js
│       ├── App.css
│       └── index.css
├── memory/
│   └── PRD.md
└── test_reports/
    ├── iteration_1.json
    ├── iteration_2.json
    └── iteration_3.json
```

## Учётные данные
- **Admin:** admin / admin123
- **API URL:** https://ekstrasensov-help.preview.emergentagent.com

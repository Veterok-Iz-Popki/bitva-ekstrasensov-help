# bitva-ekstrasensov-help

## Структура проекта

- `frontend/` — клиентская часть на React.
- `backend/` — серверная часть на Node.js и Express с подключением к MySQL.

## Команды разработки

Команды выполняются в соответствующей папке после установки зависимостей и настройки окружения.

| Папка | Команда | Назначение |
| --- | --- | --- |
| `frontend/` | `npm start` | Запустить клиент для разработки |
| `backend/` | `npm start` | Запустить сервер |

Доступные скрипты и зависимости перечислены в `package.json` каждой части проекта.

## Локальная production-сборка и push

GitHub Actions больше не пересобирает проект. Готовые файлы в `backend/build` коммитятся локально.

1. Установите зависимости фронтенда: в папке `frontend` выполните `npx yarn@1.22.22 install --frozen-lockfile`.
2. Задайте `REACT_APP_BACKEND_URL` в `frontend/.env.production.local`. Пустое значение означает API на том же домене. При необходимости задайте `REACT_APP_SITE_URL` для canonical URL.
3. В корне репозитория включите hook: `git config core.hooksPath .githooks`. Повторите это в каждом новом checkout.
4. Выполните `npm --prefix frontend run build`. Скрипт очищает `backend/build`, создаёт свежую сборку и переименовывает `index.html` в `index.template.html` для серверной SEO-обработки.
5. Добавьте исходники и всю сборку в коммит, включая удалённые файлы: `git add -A -- backend/build`, затем `git commit` и `git push`.

Перед каждым push hook повторяет сборку. При ошибке или отличиях от закоммиченного `backend/build` отправка останавливается: закоммитьте обновлённую сборку и повторите push.

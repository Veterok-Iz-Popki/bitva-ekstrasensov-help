# bitva-ekstrasensov-help

Пошаговый процесс обновления production через Hoster.kz и Plesk описан в [DEPLOY.md](DEPLOY.md).

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

Перед каждой загрузкой на production обязательно обновляйте дамп (`npm --prefix backend run db:dump`) и затем пересобирайте фронтенд (`npm --prefix frontend run build`), даже если менялся только контент базы. Загружайте свежие `backend/dump.sql` и `backend/build` после их коммита и push. При ошибке экспорта или сборки загрузку нужно остановить.

1. Установите зависимости фронтенда: в папке `frontend` выполните `npx yarn@1.22.22 install --frozen-lockfile`.
2. Задайте `REACT_APP_BACKEND_URL` в `frontend/.env.production.local`. Пустое значение означает API на том же домене. При необходимости задайте `REACT_APP_SITE_URL` для canonical URL.
3. В корне репозитория включите hook: `git config core.hooksPath .githooks`. Повторите это в каждом новом checkout.
4. Установите зависимости backend через `npx yarn@1.22.22 install --frozen-lockfile` в папке `backend`. Настройте локальную базу в `backend/.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`). Для экспорта нужен `mysqldump` в PATH или путь в `DB_DUMP_BIN`; portable MariaDB в `.local` обнаруживается автоматически.
5. Выполните `npm --prefix backend run db:dump`: полный дамп локальной базы сохраняется в `backend/dump.sql` через временный файл. Дамп предназначен для полного пересоздания базы на сервере.
6. Выполните `npm --prefix frontend run build`. Скрипт очищает `backend/build`, создаёт свежую сборку и переименовывает `index.html` в `index.template.html` для серверной SEO-обработки.
7. Добавьте исходники, дамп и всю сборку в коммит, включая удалённые файлы: `git add -A -- backend/build backend/dump.sql`, затем `git commit` и `git push`.

Перед каждым push hook повторяет экспорт базы и сборку. При ошибке или отличиях от закоммиченных `backend/build` и `backend/dump.sql` отправка останавливается: закоммитьте обновлённые файлы и повторите push. Сам push не изменяет базу на сервере.

#!/bin/bash
# restore-db.sh — Восстановление MariaDB после потери из контейнера Emergent.
# Используется при каждом рестарте пода, который убивает mariadb пакет.

set -e

echo "[1/6] Установка mariadb-server..."
apt-get install -y mariadb-server mariadb-client > /tmp/apt.log 2>&1 || {
  tail -5 /tmp/apt.log; exit 1;
}

echo "[2/6] Создание /run/mysqld..."
mkdir -p /run/mysqld

echo "[3/6] Запуск через supervisor..."
sudo supervisorctl start mariadb
sleep 5
sudo supervisorctl status mariadb | head -1

echo "[4/6] Сброс пароля root и создание БД..."
mysql -u root <<EOF
SET PASSWORD FOR 'root'@'localhost' = PASSWORD('');
FLUSH PRIVILEGES;
CREATE DATABASE IF NOT EXISTS psychic_battle CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

echo "[5/6] Восстановление данных из dump.sql..."
mysql -u root psychic_battle < /app/backend/dump.sql
echo "  Загружено: $(mysql -u root psychic_battle -N -e 'SELECT COUNT(*) FROM participants') участников, $(mysql -u root psychic_battle -N -e 'SELECT COUNT(*) FROM pages') страниц, $(mysql -u root psychic_battle -N -e 'SELECT COUNT(*) FROM reviews') отзывов"

echo "[6/7] Проверка сборки фронтенда..."
NEED_BUILD=0
if [ ! -f /app/backend/build/index.html ]; then
  echo "  Сборка отсутствует — будет пересобрана."
  NEED_BUILD=1
elif grep -q "/pod-backups/" /app/backend/build/index.html; then
  echo "  index.html повреждён (/pod-backups/) — пересобираю."
  NEED_BUILD=1
fi
if [ "$NEED_BUILD" = "1" ]; then
  cd /app/frontend && yarn build > /tmp/yarn-build.log 2>&1 || {
    echo "  ❌ yarn build failed:"; tail -20 /tmp/yarn-build.log; exit 1;
  }
  echo "  ✓ Frontend пересобран."
else
  echo "  ✓ Сборка фронтенда в порядке."
fi

echo "[7/7] Restart backend..."
sudo supervisorctl restart backend
sleep 4
sudo supervisorctl status backend | head -1
status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/pages/topic-porcha)
echo "  API check: HTTP $status"
front=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/)
echo "  Front check: HTTP $front"

echo ""
echo "✅ Готово. SEO toggle сейчас: $(mysql -u root psychic_battle -N -e 'SELECT seo_indexing_enabled FROM site_settings;') (1=ON, 0=OFF)"

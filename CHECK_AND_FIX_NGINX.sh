#!/bin/bash
# Скрипт для проверки и исправления конфигурации Nginx

echo "=== Проверка конфигурации Nginx ==="
echo ""

# Проверяем текущий лимит
echo "1. Текущие настройки client_max_body_size:"
sudo nginx -T 2>/dev/null | grep -i "client_max_body_size" || echo "  ❌ Не найдено!"

echo ""
echo "2. Проверяем конфигурационные файлы:"
CONFIG_FILES=(
    "/etc/nginx/nginx.conf"
    "/etc/nginx/sites-available/prime-coder.ru"
    "/etc/nginx/sites-enabled/prime-coder.ru"
)

for config in "${CONFIG_FILES[@]}"; do
    if [ -f "$config" ]; then
        echo "  ✓ Найден: $config"
        grep -n "client_max_body_size" "$config" 2>/dev/null || echo "    ❌ client_max_body_size не найден"
    fi
done

echo ""
echo "3. Исправление конфигурации..."
echo ""

# Находим активный конфиг
ACTIVE_CONFIG=""
if [ -f "/etc/nginx/sites-enabled/prime-coder.ru" ]; then
    ACTIVE_CONFIG="/etc/nginx/sites-enabled/prime-coder.ru"
elif [ -f "/etc/nginx/sites-available/prime-coder.ru" ]; then
    ACTIVE_CONFIG="/etc/nginx/sites-available/prime-coder.ru"
elif [ -f "/etc/nginx/nginx.conf" ]; then
    ACTIVE_CONFIG="/etc/nginx/nginx.conf"
fi

if [ -z "$ACTIVE_CONFIG" ]; then
    echo "❌ Не найдена конфигурация Nginx"
    echo "Найдите конфигурацию вручную:"
    echo "  sudo find /etc/nginx -name '*.conf' -o -name '*prime-coder*'"
    exit 1
fi

echo "Используем конфигурацию: $ACTIVE_CONFIG"

# Создаем резервную копию
BACKUP="${ACTIVE_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$ACTIVE_CONFIG" "$BACKUP"
echo "Резервная копия: $BACKUP"

# Проверяем, есть ли уже настройка
if grep -q "client_max_body_size" "$ACTIVE_CONFIG"; then
    echo "Обновляем существующую настройку..."
    sudo sed -i 's/client_max_body_size [0-9]*[mMkK]*;/client_max_body_size 50M;/g' "$ACTIVE_CONFIG"
else
    echo "Добавляем новую настройку..."
    # Добавляем в http блок
    if grep -q "^http {" "$ACTIVE_CONFIG"; then
        sudo sed -i '/^http {/a\    client_max_body_size 50M;' "$ACTIVE_CONFIG"
    fi
    # Добавляем в server блок
    if grep -q "server {" "$ACTIVE_CONFIG"; then
        sudo sed -i '/server {/a\        client_max_body_size 50M;' "$ACTIVE_CONFIG"
    fi
fi

echo ""
echo "4. Проверяем синтаксис:"
if sudo nginx -t; then
    echo "✓ Синтаксис корректен"
    echo ""
    echo "5. Перезагружаем Nginx:"
    if sudo systemctl reload nginx; then
        echo "✓ Nginx перезагружен"
        echo ""
        echo "6. Проверяем результат:"
        sudo nginx -T 2>/dev/null | grep -i "client_max_body_size"
        echo ""
        echo "=== Готово! ==="
    else
        echo "❌ Ошибка перезагрузки. Восстанавливаем резервную копию..."
        sudo cp "$BACKUP" "$ACTIVE_CONFIG"
        exit 1
    fi
else
    echo "❌ Ошибка синтаксиса. Восстанавливаем резервную копию..."
    sudo cp "$BACKUP" "$ACTIVE_CONFIG"
    exit 1
fi

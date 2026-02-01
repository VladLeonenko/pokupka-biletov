#!/bin/bash
# Скрипт для обновления конфигурации Nginx для исправления ошибки 413

echo "=== Обновление конфигурации Nginx для исправления ошибки 413 ==="
echo ""

# Определяем путь к конфигурации
NGINX_CONFIG="/etc/nginx/sites-available/prime-coder.ru"
NGINX_MAIN_CONFIG="/etc/nginx/nginx.conf"

# Проверяем, какая конфигурация используется
if [ -f "$NGINX_CONFIG" ]; then
    CONFIG_FILE="$NGINX_CONFIG"
    echo "Используется конфигурация: $NGINX_CONFIG"
elif [ -f "$NGINX_MAIN_CONFIG" ]; then
    CONFIG_FILE="$NGINX_MAIN_CONFIG"
    echo "Используется конфигурация: $NGINX_MAIN_CONFIG"
else
    echo "Ошибка: Не найдена конфигурация Nginx"
    echo "Проверьте путь к конфигурации вручную"
    exit 1
fi

# Создаем резервную копию
BACKUP_FILE="${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo "Создаем резервную копию: $BACKUP_FILE"
sudo cp "$CONFIG_FILE" "$BACKUP_FILE"

echo ""
echo "Текущая конфигурация:"
sudo grep -n "client_max_body_size" "$CONFIG_FILE" || echo "  (не найдено)"

echo ""
echo "Обновляем конфигурацию..."

# Проверяем, есть ли уже client_max_body_size в http блоке
if sudo grep -q "client_max_body_size" "$CONFIG_FILE"; then
    echo "  - Обновляем существующий client_max_body_size"
    # Обновляем существующее значение
    sudo sed -i 's/client_max_body_size [0-9]*[mM];/client_max_body_size 50M;/g' "$CONFIG_FILE"
    sudo sed -i 's/client_max_body_size [0-9]*[mM];/client_max_body_size 50M;/g' "$CONFIG_FILE"
else
    echo "  - Добавляем client_max_body_size в http блок"
    # Добавляем в http блок, если его нет
    if sudo grep -q "^http {" "$CONFIG_FILE"; then
        sudo sed -i '/^http {/a\    client_max_body_size 50M;' "$CONFIG_FILE"
    elif sudo grep -q "^http {" "$CONFIG_FILE"; then
        sudo sed -i '/^http {/a\    client_max_body_size 50M;' "$CONFIG_FILE"
    else
        echo "  - Добавляем в начало файла (если нет http блока)"
        sudo sed -i '1i\client_max_body_size 50M;' "$CONFIG_FILE"
    fi
fi

# Добавляем в server блок, если его нет
if sudo grep -q "server {" "$CONFIG_FILE"; then
    if ! sudo grep -q "location /api/images" "$CONFIG_FILE"; then
        echo "  - Добавляем специальную конфигурацию для /api/images"
        # Находим закрывающую скобку server блока и добавляем перед ней
        sudo sed -i '/^[[:space:]]*}/i\        location /api/images {\n            client_max_body_size 50M;\n            client_body_timeout 300s;\n            proxy_pass http://localhost:3000;\n            proxy_set_header Host $host;\n            proxy_set_header X-Real-IP $remote_addr;\n            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n            proxy_set_header X-Forwarded-Proto $scheme;\n            proxy_connect_timeout 300s;\n            proxy_send_timeout 300s;\n            proxy_read_timeout 300s;\n        }' "$CONFIG_FILE"
    fi
fi

echo ""
echo "Проверяем синтаксис конфигурации..."
if sudo nginx -t; then
    echo ""
    echo "✓ Синтаксис конфигурации корректен"
    echo ""
    echo "Перезагружаем Nginx..."
    if sudo systemctl reload nginx; then
        echo "✓ Nginx успешно перезагружен"
        echo ""
        echo "Проверяем новую конфигурацию:"
        sudo grep -n "client_max_body_size" "$CONFIG_FILE"
        echo ""
        echo "=== Готово! ==="
        echo "Попробуйте загрузить изображение снова."
    else
        echo "✗ Ошибка при перезагрузке Nginx"
        echo "Восстанавливаем резервную копию..."
        sudo cp "$BACKUP_FILE" "$CONFIG_FILE"
        exit 1
    fi
else
    echo "✗ Ошибка в синтаксисе конфигурации"
    echo "Восстанавливаем резервную копию..."
    sudo cp "$BACKUP_FILE" "$CONFIG_FILE"
    exit 1
fi

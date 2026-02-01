# Финальное исправление ошибки 413

## Проблема
Nginx блокирует загрузку файлов размером больше 1MB с ошибкой 413.

## Решение на сервере

Выполните эти команды **на сервере**:

```bash
# 1. Найти конфигурацию
sudo find /etc/nginx -name "*prime-coder*" -o -name "nginx.conf" | head -3

# 2. Обычно это один из этих файлов:
# /etc/nginx/sites-available/prime-coder.ru
# /etc/nginx/sites-enabled/prime-coder.ru
# /etc/nginx/nginx.conf

# 3. Отредактировать конфигурацию
sudo nano /etc/nginx/sites-available/prime-coder.ru
```

**В редакторе найдите блок `server {` и добавьте ПРЯМО ПОСЛЕ открывающей скобки:**

```nginx
server {
    listen 443 ssl http2;
    server_name prime-coder.ru;
    
    # ДОБАВИТЬ ЭТУ СТРОКУ:
    client_max_body_size 50M;
    
    # ... остальные настройки ...
    
    location /api/ {
        proxy_pass http://localhost:3000;
        # ... остальные настройки ...
    }
}
```

**Также найдите блок `http {` в начале файла и добавьте:**

```nginx
http {
    # ДОБАВИТЬ ЭТУ СТРОКУ:
    client_max_body_size 50M;
    
    # ... остальные настройки ...
}
```

**Сохраните файл (Ctrl+O, Enter, Ctrl+X) и выполните:**

```bash
# 4. Проверить синтаксис
sudo nginx -t

# 5. Если OK, перезагрузить
sudo systemctl reload nginx

# 6. Проверить результат
sudo nginx -T 2>/dev/null | grep client_max_body_size
```

Должно показать:
```
client_max_body_size 50M;
```

## Альтернатива: одной командой

Если конфигурация стандартная, можно выполнить:

```bash
# Добавить в http блок
sudo sed -i '/^http {/a\    client_max_body_size 50M;' /etc/nginx/sites-available/prime-coder.ru

# Добавить в server блок  
sudo sed -i '/server {/a\        client_max_body_size 50M;' /etc/nginx/sites-available/prime-coder.ru

# Проверить и перезагрузить
sudo nginx -t && sudo systemctl reload nginx
```

## Проверка

После исправления попробуйте загрузить изображение снова. Ошибка 413 должна исчезнуть.

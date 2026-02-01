# Ручное исправление ошибки 413 в Nginx

Если скрипт недоступен, выполните следующие шаги вручную:

## Шаг 1: Подключиться к серверу

```bash
ssh root@85.239.44.40
```

## Шаг 2: Найти конфигурацию Nginx

```bash
# Проверить, какая конфигурация используется
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/

# Обычно это:
# /etc/nginx/sites-available/prime-coder.ru
# или
# /etc/nginx/nginx.conf
```

## Шаг 3: Создать резервную копию

```bash
sudo cp /etc/nginx/sites-available/prime-coder.ru /etc/nginx/sites-available/prime-coder.ru.backup.$(date +%Y%m%d_%H%M%S)
```

## Шаг 4: Отредактировать конфигурацию

```bash
sudo nano /etc/nginx/sites-available/prime-coder.ru
```

## Шаг 5: Найти и изменить/добавить настройки

Найдите блок `http {` или `server {` и добавьте/измените:

```nginx
http {
    # Добавить эту строку в блок http
    client_max_body_size 50M;
    client_body_timeout 300s;
    
    server {
        listen 80;
        listen [::]:80;
        server_name prime-coder.ru www.prime-coder.ru;
        
        # Добавить эту строку в блок server
        client_max_body_size 50M;
        
        # Найти или добавить location для /api/images
        location /api/images {
            client_max_body_size 50M;
            client_body_timeout 300s;
            
            proxy_pass http://localhost:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
        }
        
        # ... остальные настройки ...
    }
}
```

## Шаг 6: Проверить конфигурацию

```bash
sudo nginx -t
```

Должно вывести:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

## Шаг 7: Перезагрузить Nginx

```bash
sudo systemctl reload nginx
```

## Шаг 8: Проверить, что изменения применились

```bash
sudo nginx -T 2>/dev/null | grep client_max_body_size
```

Должно показать:
```
client_max_body_size 50M;
```

## Альтернативный способ (если не работает)

Если конфигурация в `/etc/nginx/sites-available/prime-coder.ru` не применяется, проверьте:

```bash
# Проверить, какая конфигурация активна
sudo nginx -T 2>/dev/null | head -20

# Проверить символическую ссылку
ls -la /etc/nginx/sites-enabled/

# Если нужно, создать ссылку
sudo ln -s /etc/nginx/sites-available/prime-coder.ru /etc/nginx/sites-enabled/prime-coder.ru
```

## Быстрая проверка после исправления

Попробуйте загрузить изображение размером 1-2 MB. Ошибка 413 должна исчезнуть.

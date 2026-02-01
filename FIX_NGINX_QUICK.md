# Быстрое исправление 413 на сервере

Выполните эти команды на сервере:

```bash
# 1. Найти конфигурацию
sudo find /etc/nginx -name "*prime-coder*" -o -name "nginx.conf" | head -5

# 2. Создать резервную копию
sudo cp /etc/nginx/sites-available/prime-coder.ru /etc/nginx/sites-available/prime-coder.ru.backup

# 3. Проверить текущий лимит
sudo grep -n "client_max_body_size" /etc/nginx/sites-available/prime-coder.ru || echo "Не найдено"

# 4. Добавить/изменить лимит в http блоке
sudo sed -i '/^http {/a\    client_max_body_size 50M;' /etc/nginx/sites-available/prime-coder.ru

# 5. Добавить/изменить лимит в server блоке
sudo sed -i '/server {/a\        client_max_body_size 50M;' /etc/nginx/sites-available/prime-coder.ru

# 6. Проверить синтаксис
sudo nginx -t

# 7. Если OK, перезагрузить
sudo systemctl reload nginx

# 8. Проверить результат
sudo grep "client_max_body_size" /etc/nginx/sites-available/prime-coder.ru
```

Или отредактируйте вручную:

```bash
sudo nano /etc/nginx/sites-available/prime-coder.ru
```

Найдите блок `http {` и добавьте после открывающей скобки:
```nginx
http {
    client_max_body_size 50M;
    ...
}
```

Найдите блок `server {` и добавьте:
```nginx
server {
    client_max_body_size 50M;
    ...
}
```

Затем:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

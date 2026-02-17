# Настройка индексации (Яндекс.Вебмастер, GSC)

## Обязательно

### 1. Яндекс.Вебмастер
- Добавьте сайт как **https://prime-coder.ru** (не http!)
- Главное зеркало: https://prime-coder.ru
- Индексирование → Файлы Sitemap → добавить `https://prime-coder.ru/sitemap.xml`
- Индексирование → Переобход страниц → отправить главную и ключевые URL

### 2. Google Search Console
- Добавьте свойство **https://prime-coder.ru** (Property type: Domain или URL prefix)
- Sitemaps → добавить `https://prime-coder.ru/sitemap.xml`
- URL Inspection → проверить несколько страниц

### 3. После деплоя — применить nginx
```bash
# На сервере после deploy-via-git.sh
sudo cp /var/www/primecoder-gulp/configs/nginx-prime-coder.conf /etc/nginx/sites-available/prime-coder.conf
sudo nginx -t && sudo systemctl reload nginx
```

### 4. Проверка (локально после деплоя)
```bash
curl -sI https://prime-coder.ru/robots.txt    # 200 OK
curl -sI https://prime-coder.ru/sitemap.xml  # 200 OK, Content-Type: application/xml
curl -s https://prime-coder.ru/sitemap.xml | head -30
```

## Host в robots.txt
Директива `Host: https://prime-coder.ru` — **только для Яндекса**. Google и Bing её не используют.

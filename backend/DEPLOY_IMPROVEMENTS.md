# Инструкция по деплою улучшений на боевой сервер

## 1. Исправление загрузки файлов (413 ошибка)

### На сервере:
```bash
cd /var/www/primecoder-gulp
git pull origin main
cd backend
npm install  # если были новые зависимости
pm2 restart all
```

### Проверка nginx (если ошибка 413 все еще есть):
```bash
sudo nano /etc/nginx/sites-available/prime-coder.ru
```

Добавить/изменить:
```nginx
client_max_body_size 20M;  # Увеличить лимит загрузки
```

Перезапустить nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 2. Применение миграций

```bash
cd /var/www/primecoder-gulp/backend

# Применить миграции
psql -h localhost -U primeuser -d primecoder_prod -f migrations/049_add_social_proofs_table.sql
psql -h localhost -U primeuser -d primecoder_prod -f migrations/050_add_product_calculator_config.sql
psql -h localhost -U primeuser -d primecoder_prod -f migrations/051_add_slug_to_promotions.sql
```

## 3. Создание акций

```bash
cd /var/www/primecoder-gulp/backend
node scripts/create-promotions.js
```

## 4. Создание социальных доказательств

```bash
cd /var/www/primecoder-gulp/backend
node scripts/create-initial-social-proofs.js
```

## 5. Фавиконки

Фавиконки находятся в `backend/uploads/` и должны быть доступны через `/uploads/favicon.ico`.

Если не работают, проверить:
- Права доступа: `chmod 644 backend/uploads/favicon*`
- Nginx конфигурацию для `/uploads/`

## 6. Перезапуск

```bash
cd /var/www/primecoder-gulp
cd frontend
npm run build
pm2 restart all
```

## Проверка

1. Проверить загрузку обложки товара (должна работать без 413)
2. Проверить доступность фавиконок: `https://prime-coder.ru/uploads/favicon.ico`
3. Проверить акции: `https://prime-coder.ru/api/public/promotions`
4. Проверить социальные доказательства: `https://prime-coder.ru/api/public/social-proofs`

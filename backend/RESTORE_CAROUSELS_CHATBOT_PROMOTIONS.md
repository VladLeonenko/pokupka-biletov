# Восстановление каруселей, настроек чат-бота и акций

## Проблемы

1. **Карусели не восстановлены:**
   - Вертикальная карусель на главной странице (`vertical-carousel-home`)
   - Карусель команды (`team`)

2. **Настройки чат-бота улетели** - таблица `chatbot_rules` пуста

3. **Акции не появились** - промо-акции не отображаются на странице `/promotion`

## Решение

### 1. Восстановление каруселей

Создан скрипт `backend/scripts/create-initial-carousels.js` для создания начальных каруселей.

**На сервере выполнить:**

```bash
cd /var/www/primecoder-gulp/backend
node scripts/create-initial-carousels.js
```

Скрипт создаст/обновит:
- Карусель `vertical-carousel-home` с элементами: Веб-дизайн, Маркетинг, Реклама, Сайт под ключ, Тестирование, Продвижение
- Карусель `team` с данными команды (6 сотрудников)

### 2. Восстановление настроек чат-бота

**На сервере выполнить:**

```bash
cd /var/www/primecoder-gulp/backend
node scripts/init-chatbot-scenarios.js
```

Этот скрипт создаст базовые правила для чат-бота.

**Или вручную через админ-панель:**
1. Перейти в `/admin/chatbot`
2. Добавить правила вручную

### 3. Восстановление акций

**На сервере выполнить:**

```bash
cd /var/www/primecoder-gulp/backend
node scripts/create-promotions.js
```

Скрипт создаст акции:
- PrimeCombo (10% скидка)
- Три сразу (3% скидка)
- И другие акции из скрипта

**Проверка акций:**

```bash
# Проверить что акции созданы
psql -U primeuser -d primecoder_prod -c "SELECT id, title, is_active FROM promotions ORDER BY sort_order;"
```

## Проверка после восстановления

### Карусели

1. **Главная страница** (`/`):
   - Должна отображаться вертикальная карусель справа от заголовка
   - Элементы: Веб-дизайн, Маркетинг, Реклама, Сайт под ключ, Тестирование, Продвижение

2. **Страница "О нас"** (`/about`):
   - Должна отображаться карусель команды
   - 6 сотрудников с фото и должностями

### Чат-бот

1. Перейти в `/admin/chatbot`
2. Проверить что есть правила (rules)
3. Протестировать работу чат-бота на сайте

### Акции

1. Перейти на `/promotion`
2. Проверить что отображаются акции
3. Проверить что кнопки "Получить скидку" работают

## Если что-то не работает

### Карусели не отображаются

1. Проверить что карусели созданы:
```bash
psql -U primeuser -d primecoder_prod -c "SELECT slug, title FROM carousels WHERE slug IN ('vertical-carousel-home', 'team');"
```

2. Проверить что есть слайды:
```bash
psql -U primeuser -d primecoder_prod -c "SELECT c.slug, COUNT(cs.id) as slides_count FROM carousels c LEFT JOIN carousel_slides cs ON c.id = cs.carousel_id WHERE c.slug IN ('vertical-carousel-home', 'team') GROUP BY c.slug;"
```

3. Проверить логи фронтенда в браузере (DevTools → Console)
4. Проверить что API возвращает данные:
```bash
curl http://localhost:3000/api/public/carousels/vertical-carousel-home
curl http://localhost:3000/api/public/carousels/team
```

### Акции не отображаются

1. Проверить что акции созданы и активны:
```bash
psql -U primeuser -d primecoder_prod -c "SELECT id, title, is_active, discount_percent FROM promotions WHERE is_active = TRUE ORDER BY sort_order;"
```

2. Проверить API:
```bash
curl http://localhost:3000/api/public/promotions
```

3. Проверить логи фронтенда

### Чат-бот не работает

1. Проверить что правила созданы:
```bash
psql -U primeuser -d primecoder_prod -c "SELECT id, name, keywords, is_active FROM chatbot_rules ORDER BY priority DESC;"
```

2. Проверить что таблица существует:
```bash
psql -U primeuser -d primecoder_prod -c "\d chatbot_rules"
```

3. Если таблицы нет, применить миграцию:
```bash
psql -U primeuser -d primecoder_prod -f migrations/020_chatbot.sql
```

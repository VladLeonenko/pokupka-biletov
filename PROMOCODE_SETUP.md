# Настройка промокодов для quiz

## Что было сделано:

1. **Миграция БД** (`backend/migrations/037_add_promo_code_to_promotions.sql`):
   - Добавлены поля: `promo_code`, `hidden_location`, `discount_percent`, `discount_amount`

2. **API** (`backend/routes/promotions.js`):
   - Обновлен `rowToPromotion` для включения новых полей
   - Обновлены CREATE и UPDATE endpoints
   - Добавлен публичный endpoint `/api/promotions/validate-promo` для проверки промокода

3. **Админ-панель** (`frontend/src/pages/promotions/PromotionEditorPage.tsx`):
   - Добавлены поля для управления промокодом:
     - Промокод
     - Место скрытия промокода
     - Скидка в процентах
     - Скидка в рублях

4. **Скрытие промокода на сайте** (`frontend/src/components/public/HiddenPromoCodeInjector.tsx`):
   - Компонент автоматически скрывает промокоды в указанных местах:
     - `footer` - в footer
     - `header` - в header
     - `comment` - в HTML комментарии
     - CSS селектор - в указанном элементе

5. **Валидация в quiz форме** (`frontend/public/legacy/js/quiz-optimized.js`):
   - Проверка промокода в реальном времени при вводе (debounce 500ms)
   - Проверка при потере фокуса
   - Валидация при отправке формы
   - Показ сообщений о валидности/невалидности промокода

## Как использовать:

1. **Создать промокод в админ-панели**:
   - Перейти в `/admin/promotions`
   - Создать новую акцию или отредактировать существующую
   - Заполнить поля:
     - **Промокод**: например, `PRIME2024`
     - **Место скрытия**: `footer`, `header`, `comment` или CSS селектор
     - **Скидка**: указать процент или сумму

2. **Промокод автоматически скрывается на сайте** в указанном месте

3. **Клиент ищет промокод на сайте** и вводит его в 4-м вопросе quiz

4. **Система проверяет промокод**:
   - В реальном времени при вводе
   - При отправке формы
   - Показывает результат (валидный/невалидный)

## Запуск миграции:

```bash
cd backend
node -e "import('./db.js').then(m => m.default.query('ALTER TABLE promotions ADD COLUMN IF NOT EXISTS promo_code VARCHAR(100), ADD COLUMN IF NOT EXISTS hidden_location VARCHAR(255), ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0; CREATE INDEX IF NOT EXISTS idx_promotions_promo_code ON promotions(promo_code) WHERE promo_code IS NOT NULL;').then(() => console.log('Migration OK')).catch(e => console.error('Error:', e.message)));"
```

Или выполнить SQL из файла `backend/migrations/037_add_promo_code_to_promotions.sql` вручную.








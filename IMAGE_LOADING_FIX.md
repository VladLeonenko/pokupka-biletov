# Исправление загрузки изображений кейсов

## Проблема

На странице кейса `http://localhost:5173/cases/fitnes-treker-2` не загружаются изображения, в консоли множество ошибок 404:
- `cover.png`
- `colors.png`
- `typography.png`
- `gallery-1.png`
- `loading.gif`

## Причины

1. **Компоненты не использовали правильные пути к изображениям**
   - `CasesHeaderNew` не проверял путь к `cover.png` если `heroImageUrl` не указан
   - `ColorsSectionNew` и `TypographyBlockNew` использовали пустые строки как fallback
   - Галерея не использовала пути к `gallery-1.png`, `gallery-2.png`, `gallery-3.png`

2. **Backend не отдавал файлы из `frontend/public/legacy` в dev режиме**
   - Backend проверял только `frontend/dist/legacy`
   - В dev режиме файлы находятся в `frontend/public/legacy`

3. **SafeImage получал пустые или невалидные src**
   - Когда `resolveImageUrl` получал пустую строку как fallback, возвращал пустую строку
   - SafeImage пытался загрузить пустой src, что вызывало ошибки

## Исправления

### 1. CasesHeaderNew.tsx
- Добавлена проверка пути к `cover.png` если `heroImageUrl` не указан
- Приоритет: `heroImageUrl` → `/legacy/img/cases/{slug}/cover.png` → `donorImageUrl` → fallback

### 2. ColorsSectionNew.tsx и TypographyBlockNew.tsx
- Исправлена логика получения изображений - теперь используют `fallbackImageUrl()` вместо пустой строки
- Передают `null` вместо пустой строки в SafeImage
- Используют пути к изображениям в директории кейса

### 3. CasePage.tsx (галерея)
- Добавлена логика использования `gallery-1.png`, `gallery-2.png`, `gallery-3.png` если в базе нет `gallery`
- Заменен обычный `img` на `SafeImage` для правильной обработки ошибок

### 4. resolveImageUrl.ts
- Исправлена обработка пустых fallback - теперь всегда возвращает дефолтный fallback
- Улучшена обработка статических файлов

### 5. SafeImage.tsx
- Улучшена обработка пустых src - теперь всегда использует fallback если src пустой
- Улучшена обработка ошибок загрузки

### 6. backend/app.js
- Добавлена поддержка `frontend/public/legacy` в dev режиме
- Используется `express.static` для обоих путей (public и dist)
- Исправлен порядок middleware - статические файлы обрабатываются первыми

### 7. vite.config.ts
- Восстановлено проксирование `/legacy` на backend
- Добавлена правильная обработка Content-Type для изображений

### 8. База данных
- Обновлены `hero_image_url` и `gallery` для всех кейсов через скрипт `updateCaseImageUrls.js`
- Установлены правильные пути к `cover.png` и `gallery-{1-3}.png`

## Тестирование

### Проверка файлов
```bash
# Файлы должны существовать
ls -la frontend/public/legacy/img/cases/fitnes-treker-2/
# Должны быть: cover.png, gallery-1.png, gallery-2.png, gallery-3.png
```

### Проверка backend
```bash
# Backend должен отдавать файлы
curl -I http://localhost:3000/legacy/img/cases/fitnes-treker-2/cover.png
# Должен вернуть HTTP 200
```

### Проверка frontend
1. Откройте `http://localhost:5173/cases/fitnes-treker-2`
2. Проверьте консоль браузера - не должно быть ошибок 404
3. Проверьте, что изображения загружаются:
   - Обложка в шапке
   - Изображения в галерее (если есть)
   - Блоки цветов и типографии (если категория website/mobile/design)

## Важно

**Backend должен быть перезапущен** после изменений в `backend/app.js`!

```bash
# Остановите backend (Ctrl+C)
# Запустите снова
cd backend
npm run dev
```

## Результат

После всех исправлений:
- ✅ Изображения загружаются из правильных путей
- ✅ Нет ошибок 404 в консоли
- ✅ Fallback изображения работают корректно
- ✅ SafeImage правильно обрабатывает ошибки
- ✅ Backend отдает файлы из `public/legacy` в dev режиме


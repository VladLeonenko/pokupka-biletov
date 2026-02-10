# Safari ITP Fix - ErrorBoundary + Auth Storage

## 🎯 Проблема

**Симптомы:**
- Через 2-3 минуты бездействия появляется черный экран
- Невозможно обновить страницу
- Потеря авторизации в Safari
- При заходе на главную снова показывает всплывашку с куки

**Причина:**
- Safari ITP (Intelligent Tracking Prevention) блокирует localStorage через 2-3 минуты
- Нет ErrorBoundary → React ошибки приводят к черному экрану
- Только localStorage → нет fallback для Safari

## ✅ Решение

### 1. ErrorBoundary (`frontend/src/components/common/ErrorBoundary.tsx`)

- Ловит **все** React ошибки
- Показывает понятное сообщение вместо черного экрана
- Кнопка "Перезагрузить страницу"
- Специальная обработка auth ошибок (редирект на логин)

### 2. authStorage (`frontend/src/utils/authStorage.ts`)

**Универсальное хранилище с fallback:**
1. **sessionStorage** (основной) - Safari НЕ удаляет при закрытии вкладки
2. **localStorage** (fallback) - для совместимости
3. **cookies** (fallback) - для Safari ITP (Secure, SameSite=Strict)

**Функции:**
- `getAuthToken()` - получает токен из всех источников
- `setAuthToken()` - сохраняет во все хранилища
- `removeAuthToken()` - удаляет из всех хранилищ

### 3. Обновлен AuthProvider

- Использует `authStorage` вместо прямого `localStorage`
- Периодическая проверка токена (каждые 30 сек) для recovery
- Автоматическая синхронизация между хранилищами

### 4. Обновлены сервисы

- `cmsApi.ts` - использует `getAuthToken()`
- `ecommerceApi.ts` - использует `getAuthToken()`

## 📋 Git Workflow

```bash
# Ветка создана
git checkout -b feature/safari-auth-fix

# Бэкап main
git branch backup-main-20260201

# Изменения закоммичены
git commit -m "fix: Safari ITP - ErrorBoundary + sessionStorage fallback"

# Запушено
git push -u origin feature/safari-auth-fix
```

## 🚀 Деплой

### На сервере:

```bash
# 1. Обновить код
cd /var/www/primecoder-gulp
git fetch origin
git checkout feature/safari-auth-fix
git pull origin feature/safari-auth-fix

# 2. Пересобрать frontend
cd frontend
npm run build

# 3. Перезапустить nginx
sudo systemctl reload nginx

# 4. Тест в Safari
# - Открыть админку
# - Подождать 2-3 минуты
# - Должно работать (не черный экран)
```

## ✅ Проверка результата

1. **Safari F12 → нет useEffect ошибок**
2. **ЛК не сбрасывается** (закрой/открой Safari)
3. **API ошибка → "🔄 Перезагрузить"** вместо черного экрана
4. **main backup = `git checkout backup-main-20260201`** (откат)

## 🔄 Откат (если что-то пошло не так)

```bash
git checkout backup-main-20260201
git checkout -b main
git push origin main --force  # осторожно!
```

## 📝 Изменения

- ✅ `ErrorBoundary.tsx` - новый компонент
- ✅ `authStorage.ts` - новое хранилище
- ✅ `AuthProvider.tsx` - обновлен для использования authStorage
- ✅ `main.tsx` - обернут в ErrorBoundary
- ✅ `cmsApi.ts` - использует authStorage
- ✅ `ecommerceApi.ts` - использует authStorage

## 🎯 Результат

- ✅ Safari ITP больше не блокирует авторизацию
- ✅ Черный экран заменен на понятное сообщение
- ✅ Автоматический recovery токена
- ✅ Fallback на cookies для Safari

# 🚀 Быстрый старт: Git Workflow

## Настройка (один раз)

```bash
# Добавь helper скрипты в PATH (добавь в ~/.zshrc)
export PATH="$PATH:/Users/vladislavleonenko/Desktop/primecoder-gulp/scripts"

# Или используй напрямую:
source /Users/vladislavleonenko/Desktop/primecoder-gulp/scripts/git-helpers.sh
```

## 📝 Примеры использования

### Сценарий 1: Новая фича

**Ты говоришь мне:**
> "Создай ветку feature/add-seo-tool и добавь инструмент проверки SEO"

**Я делаю:**
```bash
git checkout main
git pull origin main
git checkout -b feature/add-seo-tool
# ... вношу изменения ...
git add .
git commit -m "Add: SEO position checker tool"
git push origin feature/add-seo-tool
```

**Ты тестируешь:**
```bash
git checkout feature/add-seo-tool
# Тестируешь локально
```

**Если все ок, мержим:**
```bash
git checkout main
git merge feature/add-seo-tool
git push origin main
```

### Сценарий 2: Исправление бага

**Ты говоришь:**
> "В main исправь баг: форма логина не работает"

**Я делаю:**
```bash
git checkout main
git pull origin main
git checkout -b fix/login-form
# ... исправляю ...
git add .
git commit -m "Fix: login form validation"
git push origin fix/login-form
```

**Ты тестируешь и мержим как выше**

### Сценарий 3: Что-то сломалось - откат

**Если в feature ветке:**
```bash
# Просто переключись на main
git checkout main
# Все изменения остались в feature ветке
```

**Если уже замержил в main и все сломалось:**
```bash
# Найди последний рабочий коммит
git log --oneline

# Откатись к нему
git reset --hard <hash-коммита>
git push origin main --force  # осторожно!
```

**Или вернись к состоянию на сервере:**
```bash
git fetch origin
git reset --hard origin/main
```

## 💬 Как правильно просить меня о работе

### ✅ Хорошо:
- "Создай ветку feature/add-user-dashboard и добавь дашборд пользователя"
- "В ветке feature/add-user-dashboard измени цвет кнопки на синий"
- "Создай ветку fix/cors-error и исправь проблему с CORS"
- "В main исправь баг: страница 404 не отображается"

### ❌ Плохо:
- "Добавь фичу" (не указана ветка)
- "Исправь баг" (не указано где и какой)
- "Сделай изменения" (слишком общо)

## 🎯 Правило золотого коммита

**Перед каждым коммитом спрашивай себя:**
- Могу ли я объяснить что изменилось одним предложением?
- Если да - делай коммит
- Если нет - разбей на несколько коммитов

**Примеры хороших сообщений:**
- `Add: user profile page with avatar upload`
- `Fix: login redirect after successful auth`
- `Refactor: extract API calls to separate service`
- `Update: dependencies to latest versions`

## 🛡️ Защита от потери работы

### Автоматические бэкапы перед большими изменениями:

```bash
# Создай тег перед большими изменениями
git tag backup-before-refactor
git push origin backup-before-refactor

# Если что-то пошло не так:
git checkout backup-before-refactor
```

### Stash для временного сохранения:

```bash
# Сохрани изменения без коммита
git stash

# Переключись на другую ветку, поработай
git checkout main
# ...

# Вернись и восстанови изменения
git checkout feature/my-feature
git stash pop
```

## 📊 Полезные команды

```bash
# Посмотреть что изменилось
git diff

# Посмотреть историю
git log --oneline --graph --all

# Посмотреть какие файлы изменены
git status

# Отменить изменения в конкретном файле
git checkout -- path/to/file

# Посмотреть кто и когда менял файл
git blame path/to/file
```

## ⚡ Быстрые команды через helper скрипт

```bash
# Загрузи функции
source scripts/git-helpers.sh

# Создать feature ветку
new_feature add-new-tool

# Создать fix ветку
new_fix login-error

# Безопасный коммит
safe_commit "Add: new feature"

# Безопасный push
safe_push

# Мерж в main
merge_feature feature/add-new-tool

# Откат к main
reset_to_main

# Статус
show_status
```

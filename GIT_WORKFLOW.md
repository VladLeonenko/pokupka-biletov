# Git Workflow для безопасной разработки

## 🎯 Основная идея

**Никогда не работаем напрямую в `main`!** Все изменения делаем в отдельных ветках.

## 📋 Базовый процесс

### 1. Перед началом новой фичи

```bash
# Убедись что main актуален
git checkout main
git pull origin main

# Создай новую ветку для фичи
git checkout -b feature/название-фичи
# Например: feature/add-seo-tool, feature/fix-login-bug
```

### 2. Во время разработки

- Делай коммиты часто (каждые 10-30 минут работы)
- Пиши понятные сообщения коммитов
- Если что-то сломалось - можно откатиться к предыдущему коммиту

```bash
# Посмотреть историю
git log --oneline

# Откатиться к предыдущему коммиту (без потери изменений)
git reset --soft HEAD~1

# Откатиться и потерять изменения (осторожно!)
git reset --hard HEAD~1
```

### 3. Когда фича готова

```bash
# Убедись что все работает локально
# Затем отправь ветку на сервер
git push origin feature/название-фичи

# Если нужно обновить main перед мержем
git checkout main
git pull origin main
git checkout feature/название-фичи
git merge main  # или git rebase main
```

### 4. После тестирования - мерж в main

```bash
git checkout main
git merge feature/название-фичи
git push origin main

# Удали ветку после мержа
git branch -d feature/название-фичи
git push origin --delete feature/название-фичи
```

## 🚨 Если что-то пошло не так

### Откатить изменения в рабочей директории
```bash
git checkout -- .
```

### Откатить последний коммит (сохранить изменения)
```bash
git reset --soft HEAD~1
```

### Откатить последний коммит (удалить изменения)
```bash
git reset --hard HEAD~1
```

### Откатить main к предыдущему состоянию
```bash
git checkout main
git reset --hard origin/main  # Вернет к последнему состоянию на сервере
```

### Найти "хороший" коммит и вернуться к нему
```bash
git log --oneline  # Найди нужный коммит
git checkout <hash-коммита>  # Посмотреть как было
git checkout main
git reset --hard <hash-коммита>  # Вернуться к этому коммиту
```

## 💬 Как коммуницировать со мной (AI)

### Формат запроса новой фичи:

```
"Создай ветку feature/add-new-tool и добавь функционал X"
```

Я:
1. Создам ветку
2. Внесу изменения
3. Сделаю коммит
4. Скажу тебе протестировать

### Формат запроса изменения:

```
"В ветке feature/add-new-tool измени Y на Z"
```

Я:
1. Переключусь на нужную ветку
2. Внесу изменения
3. Сделаю коммит

### Формат запроса исправления бага:

```
"В main исправь баг: описание проблемы"
```

Я:
1. Создам ветку fix/описание-бага
2. Исправлю
3. Сделаю коммит
4. Предложу мерж

## 📝 Правила именования веток

- `feature/` - новая функциональность
- `fix/` - исправление бага
- `refactor/` - рефакторинг без изменения функциональности
- `hotfix/` - срочное исправление в production

Примеры:
- `feature/add-user-profile`
- `fix/login-error`
- `refactor/api-structure`
- `hotfix/critical-security-patch`

## ✅ Чеклист перед мержем в main

- [ ] Код работает локально
- [ ] Нет очевидных ошибок
- [ ] Изменения протестированы
- [ ] main обновлен (`git pull origin main`)
- [ ] Конфликтов нет

## 🔄 Типичный сценарий работы

1. **Начало дня:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Новая фича:**
   ```bash
   git checkout -b feature/my-feature
   # Работаем...
   git add .
   git commit -m "Add: описание изменений"
   git push origin feature/my-feature
   ```

3. **Если нужно вернуться к main:**
   ```bash
   git checkout main  # Все изменения в feature ветке сохранены
   ```

4. **Когда фича готова:**
   ```bash
   git checkout main
   git merge feature/my-feature
   git push origin main
   ```

## 🛡️ Защита main ветки

Рекомендую настроить защиту main ветки на GitHub/GitLab:
- Запретить прямой push в main
- Требовать Pull Request для мержа
- Требовать ревью (опционально)

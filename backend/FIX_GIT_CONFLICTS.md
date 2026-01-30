# Решение проблемы с git pull на сервере

## Проблема
```
error: Pulling is not possible because you have unmerged files.
hint: Fix them up in the work tree, and then use 'git add/rm <file>'
hint: as appropriate to mark resolution and make a commit.
fatal: Exiting because of an unresolved conflict.
```

## Решение

### Шаг 1: Проверить статус
```bash
cd /var/www/primecoder-gulp
git status
```

### Шаг 2: Посмотреть конфликтующие файлы
```bash
git diff --name-only --diff-filter=U
```

### Шаг 3: Разрешить конфликты

**Вариант A: Принять версию с сервера (локальную)**
```bash
# Если хотите оставить локальные изменения
git add .
git commit -m "Resolve: разрешены конфликты, оставлена локальная версия"
```

**Вариант B: Принять версию из GitHub (удаленную)**
```bash
# Если хотите взять версию из GitHub
git checkout --theirs .
git add .
git commit -m "Resolve: разрешены конфликты в пользу удаленной версии"
```

**Вариант C: Сбросить все локальные изменения и взять версию из GitHub**
```bash
# ОСТОРОЖНО: это удалит все локальные изменения!
git reset --hard HEAD
git clean -fd
git pull origin main
```

### Шаг 4: После разрешения конфликтов
```bash
git pull origin main
```

### Шаг 5: Если все еще проблемы
```bash
# Полностью сбросить и пересоздать
git fetch origin
git reset --hard origin/main
```

## Рекомендуемый подход для сервера

На сервере обычно лучше брать версию из GitHub:

```bash
cd /var/www/primecoder-gulp
git status
git checkout --theirs .
git add .
git commit -m "Resolve: конфликты разрешены в пользу удаленной версии"
git pull origin main
```

Если это не помогает:
```bash
git fetch origin
git reset --hard origin/main
```

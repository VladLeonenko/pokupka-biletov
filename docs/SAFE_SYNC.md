# Безопасная синхронизация: сервер → локалка

## Текущая ситуация (на 10.02.2026)

- **Локальная ветка:** `feature/safari-auth-fix` (6 коммитов поверх старого main)
- **`origin/main`:** ушёл на 16 коммитов вперёд (продукты, калькулятор, кейсы, категории и т.д.)
- **Локальный `main`:** отстаёт от `origin/main` на 16 коммитов
- **Незакоммиченные изменения:** docs/, CI/CD, тесты, исправление ReviewsPage, package.json — всё это ещё НЕ закоммичено

## Шаг 1: Сохранить незакоммиченные изменения

```bash
# Сначала — stash текущих незакоммиченных изменений (безопасно)
git stash push -u -m "cursor-session-2026-02-10: docs, ci, reviews fix, tests"
```

Это сохранит ВСЕ текущие незакоммиченные изменения (и новые файлы) в stash. Их всегда можно вернуть через `git stash pop`.

## Шаг 2: Обновить локальный main

```bash
git checkout main
git pull origin main
```

Теперь локальный `main` = `origin/main` (актуальная версия с сервера).

## Шаг 3: Решить судьбу feature/safari-auth-fix

Эта ветка содержит Safari-фиксы (ErrorBoundary, sessionStorage fallback, authStorage, FileSyncService). Варианты:

### Вариант A: Мерж в main (если фиксы нужны)
```bash
git checkout main
git merge feature/safari-auth-fix
# Разрешить конфликты если есть
git push origin main
```

### Вариант B: Перебазировать на свежий main (чище история)
```bash
git checkout feature/safari-auth-fix
git rebase main
# Разрешить конфликты если есть
git checkout main
git merge feature/safari-auth-fix
git push origin main
```

### Вариант C: Оставить как есть (если Safari фиксы уже не нужны или войдут позже)
```bash
# Ничего не делать, просто работать от main
```

## Шаг 4: Создать рабочую ветку для новых изменений

```bash
git checkout main
git checkout -b feature/consolidation-and-fixes
```

## Шаг 5: Вернуть stash с изменениями из Cursor-сессии

```bash
git stash pop
```

Теперь docs/, CI/CD, тесты, ReviewsPage fix — всё снова в рабочей директории, но уже поверх актуального main.

## Шаг 6: Закоммитить и запушить

```bash
git add docs/ .github/ .cursor/rules/git-sync.mdc scripts/deploy.sh package.json
git add frontend/src/pages/public/ReviewsPage.tsx
git add frontend/src/utils/apiBase.test.ts
git add frontend/package.json
# НЕ добавлять: .DS_Store, import.csv, products_export.sql, cmsApi.ts, catalog-description-import.txt
git commit -m "feat: docs consolidation, CI/CD, deploy script, reviews error handling, vitest"
git push -u origin feature/consolidation-and-fixes
```

## Шаг 7: БД

Если на сервере БД новее (а она новее — добавились продукты, категории и т.д.):

```bash
# На сервере:
pg_dump -U primecoder_user -h localhost primecoder_db > ~/primecoder_db_dump_2026-02-10.sql

# Скопировать на локалку:
scp root@85.239.44.40:~/primecoder_db_dump_2026-02-10.sql ./

# Локально:
psql -U postgres -c "DROP DATABASE IF EXISTS primecoder_db;"
psql -U postgres -c "CREATE DATABASE primecoder_db;"
psql -U postgres -d primecoder_db < primecoder_db_dump_2026-02-10.sql
```

---

## Видеть изменения с сервера в Cursor

В `.cursor/rules/git-sync.mdc` добавлено правило: агент при старте делает `git fetch origin --prune`. Это:
- **Безопасно** — не меняет локальные файлы, только обновляет информацию о remote
- **Быстро** — занимает 1-2 секунды
- **Полезно** — после fetch видны все новые ветки и коммиты с сервера

Для ручной проверки:
```bash
# Что нового на сервере?
git fetch origin --prune && git log --oneline HEAD..origin/main

# Какие ветки на сервере?
git branch -r --sort=-committerdate
```

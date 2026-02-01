# Исправление команды для zsh

## Проблема
В zsh команда `scp -r dist/*` не работает из-за glob-паттернов.

## Решение

### Вариант 1: Использовать кавычки
```bash
scp -r "dist/"* root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/
```

### Вариант 2: Использовать dist/. (точка)
```bash
scp -r dist/. root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/
```

### Вариант 3: Использовать tar (самый надежный)
```bash
cd /Users/vladislavleonenko/Desktop/primecoder-gulp/frontend
tar czf - -C dist . | ssh root@85.239.44.40 "cd /var/www/primecoder-gulp/frontend/dist && tar xzf -"
```

### Вариант 4: Использовать rsync (лучший вариант)
```bash
cd /Users/vladislavleonenko/Desktop/primecoder-gulp/frontend
rsync -avz --delete dist/ root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/
```

## Рекомендуемый вариант (rsync)

```bash
cd /Users/vladislavleonenko/Desktop/primecoder-gulp/frontend

# Собрать фронтенд (если еще не собрано)
npm run build

# Загрузить на сервер
rsync -avz --delete dist/ root@85.239.44.40:/var/www/primecoder-gulp/frontend/dist/
```

`rsync`:
- Работает в zsh
- Синхронизирует только измененные файлы
- Удаляет старые файлы (`--delete`)
- Показывает прогресс

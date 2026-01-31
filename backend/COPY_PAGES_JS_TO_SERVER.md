# Копирование pages.js на сервер

## Проблема
Heredoc обрывается при создании файла через `cat << EOF`. Нужно использовать другой метод.

## Решение 1: Через base64 (рекомендуется)

### На локальной машине:
```bash
cd /Users/vladislavleonenko/Desktop/primecoder-gulp
base64 backend/routes/pages.js > /tmp/pages_base64.txt
```

Затем скопируйте содержимое `/tmp/pages_base64.txt` и на сервере выполните:

```bash
cd /var/www/primecoder-gulp/backend
base64 -d > routes/pages.js << 'BASE64EOF'
# Вставьте сюда содержимое base64
BASE64EOF
```

## Решение 2: Через nano (проще всего)

На сервере:

```bash
cd /var/www/primecoder-gulp/backend
nano routes/pages.js
```

Затем скопируйте весь код из локального файла `backend/routes/pages.js` и вставьте в nano:
- Ctrl+Shift+V для вставки
- Ctrl+O для сохранения
- Enter для подтверждения
- Ctrl+X для выхода

## Решение 3: Через wget/curl (если файл в репозитории)

```bash
cd /var/www/primecoder-gulp/backend
# Если файл есть в GitHub (raw URL)
wget https://raw.githubusercontent.com/VladLeonenko/primecoder-gulp/main/backend/routes/pages.js -O routes/pages.js
```

## Решение 4: Через Python скрипт

На сервере создайте временный скрипт:

```bash
cd /var/www/primecoder-gulp/backend
python3 << 'PYEOF'
import base64

# Вставьте сюда base64 содержимое файла
base64_content = """
# Сюда вставить base64
"""

with open('routes/pages.js', 'wb') as f:
    f.write(base64.b64decode(base64_content))
    
print("✅ Файл создан")
PYEOF
```

## Быстрое решение: Использовать полный код из локального файла

Скопируйте весь код из `backend/routes/pages.js` (558 строк) и вставьте в nano на сервере.

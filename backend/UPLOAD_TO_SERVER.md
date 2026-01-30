# Загрузка данных на боевой сервер

## Вариант 1: Через scp (с локальной машины)

```bash
cd /Users/vladislavleonenko/Desktop/primecoder-gulp/backend
scp primecoder-data-export.json root@85.239.44.40:/var/www/primecoder-gulp/backend/
```

Введите пароль, когда попросит.

## Вариант 2: Через Git (если файл небольшой)

```bash
# На локальной машине
cd /Users/vladislavleonenko/Desktop/primecoder-gulp
git add backend/primecoder-data-export.json
git commit -m "Add: экспорт данных primecoder"
git push origin main

# На сервере
cd /var/www/primecoder-gulp
git pull origin main
```

⚠️ **Внимание:** Файл 252KB, это нормально для Git, но лучше использовать scp.

## Вариант 3: Через cat + base64 (если scp не работает)

### На локальной машине:
```bash
cd /Users/vladislavleonenko/Desktop/primecoder-gulp/backend
base64 primecoder-data-export.json > primecoder-data-export.b64
cat primecoder-data-export.b64
```

Скопируйте весь вывод и выполните на сервере:

### На сервере:
```bash
cd /var/www/primecoder-gulp/backend
# Вставьте скопированный base64 и выполните:
cat > primecoder-data-export.b64 << 'EOF'
[вставьте сюда base64 содержимое]
EOF

# Декодируйте:
base64 -d primecoder-data-export.b64 > primecoder-data-export.json
rm primecoder-data-export.b64
```

## После загрузки файла на сервер

```bash
cd /var/www/primecoder-gulp/backend

# Проверьте, что файл на месте
ls -lh primecoder-data-export.json

# Импортируйте данные
node scripts/import-database.js primecoder-data-export.json

# Перезапустите backend
pm2 restart all
```

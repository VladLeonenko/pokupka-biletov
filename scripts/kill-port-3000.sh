#!/bin/bash

# Скрипт для освобождения порта 3000

echo "🔍 Ищу процессы на порту 3000..."

PID=$(lsof -ti:3000)

if [ -z "$PID" ]; then
  echo "✅ Порт 3000 свободен"
  exit 0
fi

echo "📌 Найден процесс: $PID"
ps -p $PID -o pid,command

read -p "Остановить процесс? (y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  kill -9 $PID
  sleep 1
  
  if lsof -ti:3000 > /dev/null 2>&1; then
    echo "❌ Не удалось остановить процесс"
    exit 1
  else
    echo "✅ Порт 3000 освобожден"
  fi
else
  echo "Отменено"
fi

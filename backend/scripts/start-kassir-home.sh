#!/bin/bash
# Вне Desktop — иначе launchd: Operation not permitted (TCC).
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
export KASSIR_MAX_TICKETS="${KASSIR_MAX_TICKETS:-10}"
export KASSIR_AUTO_BOOK="${KASSIR_AUTO_BOOK:-1}"
export KASSIR_EVENT_ID="${KASSIR_EVENT_ID:-7170999}"
export KASSIR_EVENT_LABEL="${KASSIR_EVENT_LABEL:-Дон Жуан 19.12 19:00 КЗ Москва}"
export KASSIR_EVENT_URL="${KASSIR_EVENT_URL:-https://msk.kassir.ru/teatr/don-juan-13#7170999}"
export KASSIR_INTERVAL_MS="${KASSIR_INTERVAL_MS:-15000}"
# 400мс через Chrome раздувал процессы. Опрос 8с, вспышка мест ловится на том же тике.
export KASSIR_HOT_INTERVAL_MS=8000
export KASSIR_DATA_DIR="${KASSIR_DATA_DIR:-$HOME/Library/Application Support/biletvsem/kassir-data}"

ROOT="/Users/vladislavleonenko/Desktop/pokupka-biletov/backend"
# Не пишем логи на Desktop — launchd/TCC → Operation not permitted
LOG_DIR="$HOME/Library/Logs"
DATA_DIR="${KASSIR_DATA_DIR:-$HOME/Library/Application Support/biletvsem/kassir-data}"
mkdir -p "$LOG_DIR" "$DATA_DIR"
export KASSIR_DATA_DIR="$DATA_DIR"

cd "$ROOT" || exit 1

NODE="/usr/local/bin/node"
[ -x "$NODE" ] || NODE="$(command -v node)"
[ -n "$NODE" ] && [ -x "$NODE" ] || exit 1

echo "$(date '+%F %T') launchd start kassir-monitor event=$KASSIR_EVENT_ID" >> "$LOG_DIR/biletvsem-kassir-launchd.log"
exec "$NODE" "$ROOT/kassir-monitor.mjs" >> "$LOG_DIR/biletvsem-kassir-monitor.log" 2>&1

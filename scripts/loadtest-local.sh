#!/usr/bin/env bash
# Нагрузочный тест: нужен ответающий backend на $BASE (по умолчанию http://127.0.0.1:3000)
#   ./scripts/loadtest-local.sh
#   BASE=https://biletvsem.com ./scripts/loadtest-local.sh
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:3000}"
echo "autocannon → $BASE/ (20 conn, 15s) ..."
exec npx --yes autocannon@7 -c 20 -d 15 "$BASE/"

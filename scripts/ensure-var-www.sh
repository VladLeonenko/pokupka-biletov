#!/usr/bin/env bash
# Создать /var/www на «голом» VPS (каталога нет в минимальном образе).
# Второй шаг: клон репо в /var/www/pokupka-biletov (или свой путь).
#
#   sudo bash scripts/ensure-var-www.sh
#   # или владелец — другой пользователь:
#   sudo bash scripts/ensure-var-www.sh deploy
set -euo pipefail
if [[ "${EUID}" -ne 0 ]]; then
  echo "Нужен root: sudo bash $0 [user_for_chown]"
  exit 1
fi

mkdir -p /var/www
chmod 0755 /var/www

OWNER="${1:-${SUDO_USER:-root}}"
if id "$OWNER" &>/dev/null; then
  chown "$OWNER:$OWNER" /var/www
  echo "Готово: /var/www существует, владелец $OWNER (можно клонировать git сюда без sudo)."
else
  chown root:root /var/www
  echo "Готово: /var/www существует (user $OWNER не найден, оставлен root:root)."
fi

ls -ld /var/www

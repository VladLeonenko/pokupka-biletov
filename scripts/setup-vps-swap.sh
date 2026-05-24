#!/usr/bin/env bash
# Swap 2G на VPS — без него vite build часто падает по OOM.
# Запуск на сервере: sudo bash scripts/setup-vps-swap.sh

set -euo pipefail

SWAPFILE="${SWAPFILE:-/swapfile}"
SIZE="${SWAP_SIZE:-2G}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Запустите с sudo"
  exit 1
fi

if swapon --show | grep -q "$SWAPFILE"; then
  echo "✅ Swap уже включён: $SWAPFILE"
  free -h
  exit 0
fi

if [ ! -f "$SWAPFILE" ]; then
  echo "Создаём $SWAPFILE ($SIZE)..."
  fallocate -l "$SIZE" "$SWAPFILE" || dd if=/dev/zero of="$SWAPFILE" bs=1M count=2048 status=progress
  chmod 600 "$SWAPFILE"
  mkswap "$SWAPFILE"
fi

swapon "$SWAPFILE"

if ! grep -q "$SWAPFILE" /etc/fstab 2>/dev/null; then
  echo "$SWAPFILE none swap sw 0 0" >> /etc/fstab
  echo "✅ Добавлено в /etc/fstab"
fi

echo "✅ Swap включён"
free -h

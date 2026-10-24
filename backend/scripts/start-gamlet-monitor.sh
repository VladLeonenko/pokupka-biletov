#!/bin/bash
# Монитор старта продаж Гамлет (МХТ), 5 ноября 2026.
cd /var/pokupka-biletov/backend || exit 1
pm2 delete sniper-monitor-gamlet 2>/dev/null
pm2 start sniper-monitor.mjs --name sniper-monitor-gamlet -- \
  --url https://mxat.ru/repertuar/show/gamlet/ \
  --exclude-month сентябр,октябр,декабр,январ,феврал,март,апрел,май,июн,июл,август \
  --pairs 200 \
  --contacts-file sniper-contacts.json \
  --results-file data/sniper-results-gamlet.json \
  --notify-email vladislav.leonenko@bk.ru,leonenkovlad2018@yandex.ru,gyrodin@mail.ru,iosif131999@gmail.com \
  --bcc yaguda_io@mail.ru \
  --interval 1000 --concurrency 5 --max-tries 3
pm2 save

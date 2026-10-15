#!/bin/bash
# Второй цикл бронирования Кабалы на старт продаж.
cd /var/pokupka-biletov/backend || exit 1
pm2 delete sniper-monitor-cycle2 2>/dev/null
pm2 start sniper-monitor.mjs --name sniper-monitor-cycle2 -- \
  --url https://mxat.ru/repertuar/show/kabala_svyatosh/ \
  --exclude-month сентябр,январ,феврал,март,апрел,май,июн,июл,август,октябр,ноябр \
  --exclude-dates 21 \
  --pairs 200 \
  --contacts-file sniper-contacts.json \
  --results-file data/sniper-results-cycle2.json \
  --notify-email vladislav.leonenko@bk.ru,leonenkovlad2018@yandex.ru,info@prime-coder.ru,gyrodin@mail.ru,iosif131999@gmail.com \
  --bcc yaguda_io@mail.ru \
  --interval 1000 --concurrency 5 --max-tries 3
pm2 save

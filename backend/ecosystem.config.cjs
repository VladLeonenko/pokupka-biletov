/**
 * PM2-конфиг снайпера. Запуск (на сервере, один раз):
 *   pm2 start ecosystem.config.cjs
 *   pm2 save                 # переживает перезагрузку сервера
 *   pm2 startup              # автозапуск при старте системы
 *
 * Монитор работает 24/7: поллит сессии, при открытии продаж бронирует сам,
 * шлёт письмо и пишет в data/sniper-results.json. Переживает рестарты (идемпотентен).
 */
module.exports = {
  apps: [
    {
      name: 'sniper-monitor',
      script: 'sniper-monitor.mjs',
      args: [
        '--url', 'https://mxat.ru/repertuar/show/kabala_svyatosh/',
        '--exclude-month', 'сентябр,январ,феврал,март,апрел,май,июн,июл,август,октябр,ноябр',
        '--exclude-dates', '21',
        '--pairs', '200',
        '--contacts-file', 'sniper-contacts.json',
        '--notify-email', 'vladislav.leonenko@bk.ru,leonenkovlad2018@yandex.ru,info@prime-coder.ru,gyrodin@mail.ru,iosif131999@gmail.com',
        '--bcc', 'yaguda_io@mail.ru',
        '--interval', '1000',
        '--concurrency', '5',
        '--max-tries', '3',
      ].join(' '),
      autorestart: true,
      max_restarts: 100,
      restart_delay: 3000,
      env: { NODE_ENV: 'production' },
      out_file: './data/sniper-monitor.log',
      error_file: './data/sniper-monitor-error.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'intickets-monitor',
      script: 'intickets-monitor.mjs',
      args: '',
      autorestart: true,
      max_restarts: 100,
      restart_delay: 3000,
      env: { NODE_ENV: 'production' },
      out_file: './data/intickets-monitor.log',
      error_file: './data/intickets-monitor-error.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'profticket-monitor',
      script: 'profticket-monitor.mjs',
      args: '',
      autorestart: true,
      max_restarts: 100,
      restart_delay: 3000,
      env: { NODE_ENV: 'production' },
      out_file: './data/profticket-monitor.log',
      error_file: './data/profticket-monitor-error.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'mos-monitor',
      script: 'mos-monitor.mjs',
      args: '',
      autorestart: true,
      max_restarts: 100,
      restart_delay: 3000,
      env: { NODE_ENV: 'production' },
      out_file: './data/mos-monitor.log',
      error_file: './data/mos-monitor-error.log',
      merge_logs: true,
      time: true,
    },
  ],
};

# GSC: позиции / CTR (biletvsem.com)

Как в playbook §9 — смотрим **реальные** показы/клики/CTR/позицию, а не «ещё meta всем».

## 1. Подключить свойство

1. [Google Search Console](https://search.google.com/search-console) → свойство `https://biletvsem.com` (Domain или URL-prefix).
2. Sitemaps → `https://biletvsem.com/sitemap.xml`
3. Дождаться данных (обычно 2–3 дня после индексации; окно отчётов — до 16 мес., для разбора удобно **3 месяца**).

Параллельно: Яндекс.Вебмастер → тот же sitemap + IndexNow key file.

## 2. Экспорт для разбора (раз в 1–2 недели)

В GSC → Эффективность → период **3 месяца** → экспорт:

| Файл | Куда |
|------|------|
| Страницы.csv | `data/gsc/Страницы.csv` |
| Запросы.csv | `data/gsc/Запросы.csv` |
| Устройства.csv | опционально |
| Вид в поиске.csv | опционально |

Потом:

```bash
node backend/scripts/analyze-gsc-export.js data/gsc
```

Скрипт покажет money URL с показами и нулевым/низким CTR и кластеры запросов.

## 3. Как читать (как §9)

| Сигнал | Действие |
|--------|----------|
| Показы есть, позиция **>20**, CTR ≈0 | Тянуть позиции (контент, перелинковка, ПФ) — не трогать title ради CTR |
| Позиция **<20**, CTR слабый | Дожимать title/description под «билеты / цена / места» |
| Query-мусор в индексе (`utm_`, странные params) | Уже: SSR `noindex` на query + robots Clean-param |
| Событие вышло / снято с продажи | 410 или снять из sitemap + IndexNow |

Money URL у нас: `/ticket/*`, `/events`, `/events/city|genre|venue/*`.

## 4. Без экспорта сейчас

API GSC в репо не подключён — **цифр из GSC нет**, пока не зальёшь CSV или не дашь доступ к property.

Локальный мониторинг ключей (не GSC field): `/api/seo-monitoring` + админка позиций — ориентир lab, не замена GSC.

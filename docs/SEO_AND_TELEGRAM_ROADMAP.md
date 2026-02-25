# Оценка и план: SEO + Telegram-уведомления

## 1. Уведомления в Telegram

### Текущее состояние
- Уведомления создаются в БД (`notifications`), показываются в админке (колокольчик)
- События: новая форма, новый отзыв, новый чат — вызывают `createNotification()`
- **Нет интеграции с Telegram** — только внутренние уведомления

### Реализовано ✅
- `backend/services/telegram.js` — отправка через Bot API
- В `createNotification()` вызывается `notifyTelegram()` после сохранения в БД
- **Настройка:** добавить в `backend/.env`:
  ```
  TELEGRAM_BOT_TOKEN=123456:ABCdef...
  TELEGRAM_CHAT_ID=123456789
  # или несколько через запятую:
  TELEGRAM_CHAT_IDS=123456789,987654321
  ```
- **Как получить:** 1) @BotFather → /newbot → токен 2) Написать боту /start 3) Открыть `https://api.telegram.org/bot<TOKEN>/getUpdates` — chat.id в ответе

---

## 2. Улучшение сниппетов в поиске

### Общие рекомендации
- **Title:** 50–60 символов, ключевые слова в начале
- **Description:** 150–160 символов, призыв к действию
- **Структурированные данные:** Schema.org для rich snippets

---

## 3. Schema.org — что есть и что добавить

### ✅ Organization + LocalBusiness на главной — **ГОТОВО**
- `index.html`: **WebSite** + **ProfessionalService** (подтип LocalBusiness)
- ProfessionalService уже содержит: name, url, logo, contactPoint, address, geo, aggregateRating
- **Организация** присутствует в SeoMetaTags по умолчанию

**Рекомендация:** Добавить явный `@type: "Organization"` рядом с ProfessionalService — Google иногда хочет оба. Сейчас есть ProfessionalService (достаточно для LocalBusiness), Organization вложена в provider/contactPoint.

### ⚠️ CaseStudy на кейсах — **НЕТ**
- **Сейчас:** CasePage использует `SeoMetaTags` → выдаёт **Organization** или **Article** (если articleSchema)
- **Нужно:** Schema.org **CaseStudy** — специфичен для кейсов, улучшает rich results

**Структура CaseStudy:**
```json
{
  "@context": "https://schema.org",
  "@type": "CaseStudy",
  "name": "Название кейса",
  "description": "Краткое описание",
  "url": "https://prime-coder.ru/cases/slug",
  "image": "URL картинки",
  "author": { "@type": "Organization", "name": "PrimeCoder" },
  "mainEntity": { "@type": "WebPage", "@id": "URL" },
  "about": { "@type": "Thing", "name": "Тема кейса" }
}
```

**Оценка:** 1–2 часа (компонент CaseStudyJsonLd + интеграция в CasePage)

### ⚠️ FAQPage на /catalog — **ЧАСТИЧНО**
- **Сейчас:** FAQPage есть на **страницах услуг** `/catalog/:slug` (ProductPage) — через FaqJsonLd, если у продукта есть FAQ в contentJson
- **Страница /catalog** (список услуг) — FaqJsonLd **нет**

**Варианты:**
1. Добавить общий FAQ на CatalogPage (вопросы типа «Сколько стоит разработка?», «Как заказать?») — статичный набор
2. FAQ из API (если есть endpoint для FAQ каталога)
3. FAQ из первой категории/продукта

**Оценка:** 1–2 часа (статичный FAQ на CatalogPage + FaqJsonLd)

---

## Итоговая таблица

| Задача | Статус | Действие |
|--------|--------|----------|
| **Organization + LocalBusiness на главной** | ✅ Готово | ProfessionalService в index.html, можно добавить явный Organization блок |
| **CaseStudy на кейсах** | ❌ Нет | Создать CaseStudyJsonLd, использовать в CasePage |
| **FAQPage на /catalog** | ⚠️ Частично | FAQ есть на /catalog/:slug, добавить на /catalog |
| **Уведомления в Telegram** | ❌ Нет | Сделать сервис + env |

---

## Приоритет внедрения
1. **CaseStudy** — быстрый выигрыш для кейсов
2. **FAQPage на /catalog** — улучшение сниппета главной страницы каталога
3. **Telegram** — удобство операционной работы
4. **Organization** — при желании можно добавить отдельный блок, сейчас ProfessionalService покрывает сценарий

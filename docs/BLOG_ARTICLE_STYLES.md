# Статьи в стилистике сайта

Пиши статьи **без** inline `<style>`. Используй классы ниже — они уже подключены в `BlogPostStyles`.

## Классы для блоков

| Класс | Назначение |
|-------|------------|
| `article-intro` | Hero/CTA блок в начале (градиент, кнопка) |
| `article-callout` | Выделенный блок информации |
| `article-tip` | Подсказка / важная мысль |
| `article-faq` | Блок FAQ (вопрос + ответ) |
| `article-cta` | Финальный призыв к действию (центр, кнопки) |
| `article-table` | Таблица с заголовком |
| `article-checklist` | Чек-лист |
| `checklist-item--excluded` | Пункт «не входит» (✗, приглушённо) |
| `article-poll` | Опрос |
| `grid` + `grid-item` | Сетка карточек (статистика, преимущества) |
| `stat-number` (в grid-item) | Крупная цифра/процент |

## Изображения и код

- **Картинки**: `<img src="/uploads/images/имя.jpg" alt="Описание">` — загружай через админку (медиа/загрузки), путь будет `/uploads/images/...`
- **Figure с подписью**: `<figure><img src="..." alt="..."><figcaption>Подпись</figcaption></figure>`
- **Код** (подсветка как в Cursor): `<pre><code class="language-javascript">const x = 1;</code></pre>`. Классы: `language-javascript`, `language-typescript`, `language-jsx`, `language-json`, `language-bash`, `language-css`, `language-html`

## Базовые теги

- `h2`, `h3`, `h4` — стилизуются автоматически
- `p`, `ul`, `ol`, `li` — автоматически
- `table`, `th`, `td` — тёмная таблица в стиле сайта
- `blockquote` — цитата с градиентной полоской
- `pre`, `code` — подсветка кода

## Пример структуры статьи

```html
<div class="article-intro">
  <h2>Полный запуск за 6 недель</h2>
  <p><strong>300 000 ₽ → 100+ лидов/мес</strong></p>
  <p>Сайт + SEO + реклама. Гарантия или возврат.</p>
  <a href="/contacts">Получить аудит</a>
</div>

<p>Обычный текст статьи...</p>

<div class="grid">
  <div class="grid-item"><div class="stat-number">47%</div><p style="text-align:center;margin:0">Рост трафика за 3 месяца</p></div>
  <div class="grid-item">...</div>
</div>

<div class="article-table">
  <h3>Что входит в пакет</h3>
  <table>
    <thead><tr><th>Услуга</th><th>Цена</th></tr></thead>
    <tbody>...</tbody>
  </table>
</div>

<div class="article-faq">
  <h3>Сколько времени?</h3>
  <p>6 недель: 3 нед — сайт, 2 нед — SEO, 1 нед — реклама.</p>
</div>

<div class="article-cta">
  <h2>Готовы запустить?</h2>
  <p>Бесплатный аудит — 5 000 ₽</p>
  <a href="/audit">Заказать</a>
  <a href="https://t.me/primecoder">Telegram</a>
</div>
```

## В админке

1. Не вставляй `<style>` — только HTML с классами выше
2. Редактор: переключись в режим HTML/исходника, вставь разметку
3. Slug, title, SEO description — как обычно

## Конвертация существующей статьи

Если есть статья с inline-стилями:
- `.intro` → `article-intro`
- `.stats` + `.stat-card` → `grid` + `grid-item`
- `.faq` → `article-faq`
- CTA секция в конце → `article-cta`
- Удали весь блок `<style>...</style>`

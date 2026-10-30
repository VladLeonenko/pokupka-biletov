# CWV / SSR — эталон с PrimeCoder → задание для pokupka-biletov

**Источник эталона:** репо `primecoder-gulp`, ветка/мерж `feature/money-seo-batch` → `main`  
**Донор-страница:** `/products/seo-audit` (React SSR + CWV)  
**Цель здесь:** те же рычаги на стеке Vite/React/Emotion + Node `seoRenderer`, но под **билеты** (не agency products).

Не копировать код слепо: у нас уже есть string-SSR в `backend/lib/ticket-ssr-html.js`. Нужен **тот же эффект для CWV/SEO**, а не 1:1 структура agency.

---

## 1. Что сработало на PrimeCoder (эталон)

### Метрики (Lighthouse mobile, lab)

| | До | После |
|---|-----|--------|
| Performance | ~12 | ~87 |
| CLS | ~1.04 | ~0.01 |
| LCP / FCP | красные | зелёные/жёлтые |

CrUX (поле) ≠ lab: lab чинит фундамент; позиции Google/Яндекс **не гарантируются**, но индексируемость + UX + Core Web Vitals — да.

### Стек-решение (суть)

1. **React SSR money-страниц** — `renderToString` + Emotion critical CSS + `hydrateRoot` на клиенте.  
   Маркер в HTML: `data-react-ssr-product` (или аналог).  
   Взаимное исключение со string-SSR shell’ом: один путь, без двойной разметки.

2. **Consent до аналитики** — Metrika/GTM/`loadSiteAnalytics` только после cookie consent. Shell SSR тоже должен содержать consent UI, иначе гидрация/CLS и legal-риск.

3. **Anti-CLS**  
   - `aspect-ratio` / фиксированные размеры LCP-картинок  
   - related/карточки без тяжёлого client-only layout shift  
   - не тащить FAQ/related целиком в критический HTML, если раздувает TBT

4. **Картинки** — LCP/related в **webp** (или avif где уже есть пайплайн), не сырой PNG/JPEG с огромным весом.

5. **Курсор без GSAP CDN** — брендовый cursor на `rAF` + CSS transform.  
   `gsap` с jsDelivr в `useCursor` **убивает TBT/unused JS**.  
   GSAP из `npm` для page animations — только где нужно; на money-страницах page animations **выкл**.

6. **Vendor** — не грузить admin/chart/three/fabric на публичный first paint. Code-split + lazy routes.

### Чего эталон *не* делает

- Не обещает топ в выдаче.  
- Не лечит весь unused JS (~сотни KB) одним PR.  
- Не включает AI-обложки / social — это другой контур.

---

## 2. Состояние pokupka-biletov (as-is)

| Есть | Нет / дыра |
|------|------------|
| `seoRenderer` + string HTML SSR (`ticket-ssr-html`: home, event, events index, landings) | React `renderToString` / `hydrateRoot` |
| CookieConsent в SPA (`CookieConsentProvider`) | Consent **в SSR HTML** + гейт аналитики до accept (проверить!) |
| `useCursor` | Сейчас тянет **GSAP с CDN** (`cdn.jsdelivr.net/.../gsap.min.js`) — как было на PC до фикса |
| Vite + React 18 + Emotion/MUI + RQ | Публичный first paint всё ещё SPA-bootstrap поверх SSR shell → риск CLS/гидрации |
| GONE на `/products`, `/blog`, … | Money-URL = **тикеты / афиша / событие**, не agency product |

Итого: string-SSR для ботов уже лучше agency «пустого index». Слабое место — **клиентский слой** (GSAP, consent timing, LCP images, hydrate mismatch).

---

## 3. Задание агенту (делать по порядку)

### Batch A — быстрые CWV-wins (1–2 сессии)

**A1. Курсор без GSAP CDN**  
Файл: `frontend/src/hooks/useCursor.ts`  
- Убрать dynamic script на jsDelivr.  
- Follow cursor через `requestAnimationFrame` + CSS (`transform`), без `window.gsap`.  
- Сохранить брендовый вид (круг/«деньги»), выкл. на touch / `prefers-reduced-motion` / ticket chrome если мешает кликам.  
Эталон логики: primecoder `frontend/src/hooks/useCursor.ts` после фикса CWV.

**A2. Consent → analytics**  
- Найти где грузятся Метрика/GTM/pixels.  
- Грузить **только** после `acceptAll` (или already consented).  
- Если SSR shell отдаёт страницу без баннера, а SPA рисует его позже → CLS: либо баннер в SSR HTML, либо резерв высоты.

**A3. LCP на ключевых URL**  
Приоритет: `/`, карточка события `/ticket/...` или актуальный public path события, листинг афиши.  
- Hero/poster: явные width/height или aspect-ratio, `fetchpriority="high"` на LCP, webp.  
- Не lazy LCP.  
Измерить: PageSpeed Insights mobile + локальный Lighthouse до/после.

**A4. Page animations**  
Если есть `usePageAnimations` / framer/gsap на public routes — **выкл** на event/home first paint (как на PC `/products/*`).

### Batch B — React SSR / hydrate (если lab CLS всё ещё > 0.1 или «белый» flash)

**B1. Выбрать 1–2 money-шаблона** (не весь сайт):  
например Home + Event detail.

**B2. Портировать паттерн PrimeCoder** (смотреть, не копировать agency naming):  
- Entry SSR bundle (`dist-ssr` или аналог)  
- `renderToString` + Emotion cache/critical  
- Клиент: `hydrateRoot` в тот же DOM-root  
- QueryClient seed из SSR props (чтобы RQ не дёргал и не сдвигал UI)  
- Флаг в HTML: `data-react-ssr-ticket` / `data-react-ssr-home`  
- **Мутуальное исключение** с текущим string shell: либо React SSR отдаёт полный body markup, либо string shell остаётся для остальных URL.

**B3. Не ломать ticket-ssr-html** для остальных путей — поэтапно.

### Batch C — измерение и выкладка

1. До: скрин/цифры LH mobile на `/` и 1 event URL.  
2. После Batch A: те же URL.  
3. Деплой через git (`deploy-via-git` / ваш VPS-скрипт) — **только после локальной проверки**.  
4. Короткий отчёт в `docs/seo/` (таблица до/после). Не обещать позиции.

---

## 4. Definition of Done

- [ ] GSAP CDN не грузится на публичных страницах  
- [ ] Analytics не стартует до consent  
- [ ] LH mobile на `/` и event: CLS ≤ 0.1, Perf заметно выше baseline  
- [ ] LCP-картинка webp + размеры, без layout jump  
- [ ] Если делали React SSR — в HTML есть `data-react-ssr-*`, hydrate без ошибок в консоли  
- [ ] Деплой на прод, smoke: view-source ключевого URL содержит контент события (не пустой `#root`)

---

## 5. Где смотреть в PrimeCoder (карта файлов)

Имеет смысл открыть **соседним окном** `~/Desktop/primecoder-gulp`:

| Тема | Путь (primecoder) |
|------|-------------------|
| Cursor без GSAP | `frontend/src/hooks/useCursor.ts` |
| Product SSR shell + consent | `frontend/src/.../PublicProductShell*` (искать `CookieConsent`) |
| Hydrate entry | `hydrateProductApp` / `product-react-ssr` (frontend) |
| Server render | `backend` + seoRenderer ветка product React SSR |
| Related slim / CLS | ProductPage related Cards + `aspectRatio`; seoRenderer `fetchRelatedProducts` slim |
| Cover webp | `resolveProductCoverUrl` / webp map |

У нас аналоги:  
`frontend/src/hooks/useCursor.ts`, `frontend/src/App.tsx`, `backend/middleware/seoRenderer.js`, `backend/lib/ticket-ssr-html.js`.

---

## 6. Чего не делать

- Не тащить agency `/products/*` SSR и тарифы RU сюда.  
- Не коммитить `dist/`, `.env`, секреты.  
- Не включать `--allow-dup` / AI covers (если есть social-пайплайн — отдельные правила).  
- Не «чинить SEO» копирайтингом вместо CWV в этом таске.  
- Не force-push main.

---

## 7. Промпт для нового чата (копипаст)

```
Проект: pokupka-biletov. Стек как у PrimeCoder (Vite/React/Emotion + seoRenderer).

Прочитай docs/seo/CWV-SSR-ETALON-FROM-PRIMECODER.md и сделай Batch A (A1–A4).
Эталон кода — соседний репо ~/Desktop/primecoder-gulp (cursor без GSAP, consent до analytics).
Локально измерь LH mobile до/после на / и одной странице события.
В БД/прод не лезь без проверки. Коммит только по просьбе; деплой — после DoD Batch A.
```

После Batch A — отдельным чатом Batch B, если CLS/LCP всё ещё красные.

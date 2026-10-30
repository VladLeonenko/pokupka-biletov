# CWV Batch A — Lighthouse mobile до/после

**Дата:** 2026-10-30  
**Стек:** Vite/React + `seoRenderer` / `ticket-ssr-html`  
**Инструмент:** Lighthouse 12.2.1, mobile form-factor, headless Chrome  
**Baseline (до):** прод `https://biletvsem.com` до выкладки Batch A  
**После (финал):** тот же прод после дожима плана (LCP cover props, gsap dynamic import, LCP preload, home SSR cover) + rebuild

Lab ≠ CrUX. Цифры ниже — лабораторные. **Позиции в Google/Яндекс не обещаются.**

## Таблица (канон)

| URL | | Perf | LCP | CLS | FCP | TBT |
|-----|--|------|-----|-----|-----|-----|
| `/` | до | 53 | 11.9 s | 0.147 | 3.4 s | 190 ms |
| `/` | после | **60** | **8.3 s** | **0** | 4.9 s | 178 ms |
| `/ticket/kabala-svyatosh` | до | 12 | 6.4 s | 0.446 | 3.3 s | 3850 ms |
| `/ticket/kabala-svyatosh` | после | **37** | **6.2 s** | **0.087** | 3.1 s | 3646 ms |

Пиковый промежуточный прогон home (до дожима): Perf 66 / LCP 5.6 s — lab noise; в таблицу выше — повтор после полного дожима плана.

## Smoke

- Initial HTML: нет `mc.yandex` / GSAP CDN
- `/api/images/optimize?f=avif|webp` → 200
- Ticket head: `rel=preload` AVIF/WebP LCP
- Hero checkout: `role=cover` + `fetchpriority=high`

## Что вошло (план A1–A6)

- A1 курсор rAF, без GSAP CDN
- A2 Metrika/GA/Top.Mail только после consent; counter `109119282`
- A3 LCP sizes / fetchpriority / SSR picture; preload в `seoRenderer`
- A4 page animations skip на money + **dynamic import gsap** (не в main critical path)
- A6 sharp WebP/AVIF `/uploads` + `OptimizedImage` / `TicketEventPosterImg`

## Batch B (сделано)

React `renderToString` + Emotion critical + `hydrateRoot` для `/` и `/ticket/*` (`data-react-ssr-home` / `data-react-ssr-ticket`). Mutual exclusion со string shell в `#root`.

Hall: IO-defer mount + reserved height — **визуал схемы тот же** после mount (тот же `TicketHallInteractiveBlock`).

### LH после Batch B (mobile)

| URL | Perf | LCP | CLS | TBT |
|-----|------|-----|-----|-----|
| `/` | **69** | 6.3 s | **0.001** | 132 ms |
| `/ticket/kabala-svyatosh` | **67** | **5.3 s** | **0** | **236 ms** |

Vs baseline event: Perf 12→67, CLS 0.446→0, TBT ~3.6s→236ms.

### LH после WebP sized + no AVIF LCP + hero CSS fix (mobile)

**Дата:** 2026-10-30 ~22:30 MSK  
**Метод:** Lighthouse 12.2.1 mobile, simulate throttling, 2 прогона → среднее  
**Прод:** `https://biletvsem.com` (`0ee2067e`)

| URL | | Perf | LCP | CLS | FCP | TBT |
|-----|--|------|-----|-----|-----|-----|
| `/` | r1 | 61 | 5.4 s | 0.001 | 3.3 s | 334 ms |
| `/` | r2 | 65 | 5.1 s | 0 | 3.3 s | 350 ms |
| `/` | **avg** | **63** | **5.2 s** | **0** | **3.3 s** | **342 ms** |
| `/ticket/kabala-svyatosh` (схема МХТ) | r1 | 69 | 4.7 s | 0 | 3.3 s | 288 ms |
| `/ticket/kabala-svyatosh` | r2 | 78 | 4.0 s | 0 | 3.3 s | 157 ms |
| `/ticket/kabala-svyatosh` | **avg** | **74** | **4.3 s** | **0** | **3.3 s** | **222 ms** |

Vs Batch B: home LCP 6.3→**5.2 s**; ticket Perf 67→**74**, LCP 5.3→**4.3 s**. CLS держится ~0. Top opp: unused JS (~600–750 ms).

> **Как читать таблицу:** «avg» = среднее 2 lab-прогонов (r1/r2 выше). Не путать с одиночным прогоном Batch B (home Perf 69) — lab noise ±5–10 Perf.  
> **Vs эталон PC** (`prime-coder.ru/products/seo-audit`: mobile Perf 87 / LCP 2.0s): у нас FCP залипал ~3.3s из‑за `main`→static `App` (~280KB gz, gsap/agency в graph) на money hydrate + home тянул `TicketCheckout` sync. Это не «другие цифры вранья» — просто другой потолок, пока entry не разрезан.

## Git

Hot-rsync на VPS. **Коммит / `deploy-via-git` — по просьбе.**

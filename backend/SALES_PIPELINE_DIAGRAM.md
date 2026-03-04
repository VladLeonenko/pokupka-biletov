# Визуализация пайплайна холодных лидов

Ниже — схема того, как работает система (аналог твоего n8n-воркфлоу внутри платформы).

---

## Общая схема

```mermaid
flowchart TB
    subgraph CRON["⏰ Cron (ежедневно)"]
        T1[Daily Lead Processing\nGET /process-daily]
    end

    subgraph SOURCE["Источник лидов"]
        CSV[CSV / Импорт API]
        DB[(clients\npipeline_stage = new)]
    end

    subgraph OUTBOUND["Поток 1: Исходящая обработка"]
        T1 --> DB
        DB --> CHECK{Есть лид\nс stage=new?}
        CHECK -->|Да, до N штук| LOOP[Для каждого лида]
        LOOP --> WEBSITE{Есть website\nили корп. email?}
        WEBSITE -->|Корп. email| DERIVE[Сайт = https://домен]
        WEBSITE -->|Личная почта| BASIC[Базовый шаблон\nбез аудита]
        DERIVE --> FETCH[Загрузка сайта]
        FETCH --> EXTRACT[Парсинг HTML:\ntitle, meta, h1/h2]
        EXTRACT --> AUDIT[AI-аудит сайта\nOpenAI: score, potential, summary]
        AUDIT --> PHONE[Извлечение телефона\nс сайта через AI]
        PHONE --> UPDATE[Обновление клиента:\naudit_score, business_potential,\nphone, stage=audited]
        UPDATE --> TEMPLATE{Выбор шаблона\nпо business_potential}
        TEMPLATE -->|high| TH[Шаблон High]
        TEMPLATE -->|medium| TM[Шаблон Medium]
        TEMPLATE -->|low| TL[Шаблон Low]
        TH --> SEND
        TM --> SEND
        TL --> SEND
        BASIC --> SEND
        SEND{Телефон найден\nи UniSender Telegram?}
        SEND -->|Да| TG[UniSender Telegram]
        SEND -->|Нет| EM[UniSender Email]
        TG -->|Ошибка| EM
        EM --> LOG[client_outreach_log]
        LOG --> STAGE[stage = email_sent\nlast_outreach_at]
    end

    subgraph INBOUND["Поток 2: Входящие ответы"]
        REPLY[POST /process-reply\nили будущий webhook]
        REPLY --> FIND[Поиск клиента по email]
        FIND --> SAVE[client_correspondence]
        SAVE --> AI2[AI: анализ ответа\nready_to_meet / no_interest / follow_up]
        AI2 --> ROUTE{Тип ответа}
        ROUTE -->|ready_to_meet| QUAL[stage = qualified]
        ROUTE -->|no_interest| LOST[stage = lost]
        ROUTE -->|follow_up| REP[stage = replied]
        QUAL --> ZOOM[Zoom + Calendar\nпозже]
    end

    CSV --> DB
```

---

## Поток 1: Исходящая обработка (по шагам)

```mermaid
sequenceDiagram
    participant Cron
    participant API as process-daily
    participant DB as clients
    participant Web as Сайт клиента
    participant OpenAI
    participant UniSender

    Cron->>API: GET /process-daily?secret=...
    API->>DB: SELECT ... WHERE pipeline_stage='new' LIMIT N
    loop Для каждого лида
        alt Нет сайта (личная почта)
            API->>UniSender: Базовый шаблон (email)
        else Есть сайт (корп. email)
            API->>Web: fetch HTML
            Web-->>API: HTML
            API->>OpenAI: Аудит сайта + извлечение телефона
            OpenAI-->>API: audit_score, potential, summary, phone
            API->>DB: UPDATE audit_*, phone, stage=audited
            alt Телефон найден
                API->>UniSender: Telegram
            end
            alt Telegram не удался или нет телефона
                API->>UniSender: Email
            end
        end
        API->>DB: INSERT client_outreach_log, stage=email_sent
    end
    API-->>Cron: { processed, errors }
```

---

## Поток 2: Обработка ответа клиента

```mermaid
sequenceDiagram
    participant User
    participant API as process-reply
    participant DB as clients
    participant OpenAI

    User->>API: POST /process-reply { fromEmail, text }
    API->>DB: Найти клиента по email
    API->>DB: INSERT client_correspondence
    API->>OpenAI: Классификация: ready_to_meet / no_interest / follow_up_later
    OpenAI-->>API: next_action, suggested_response
    API->>DB: UPDATE pipeline_stage (qualified / lost / replied)
    API-->>User: { stage, analysis }
```

---

## Где что настраивается

| Что | Где |
|-----|-----|
| Частота запуска | Cron на сервере (например, раз в день в 9:00). |
| Сколько лидов за раз | Переменная `SALES_PIPELINE_BATCH_SIZE` в `.env` (по умолчанию 10). |
| Лимит писем за один запуск | Переменная `SALES_PIPELINE_MAX_EMAILS_PER_RUN` в `.env` (опционально). |
| Шаблоны писем | UniSender: создаёшь шаблоны, подставляешь переменные. Тексты сценариев — в `SALES_PIPELINE_EMAIL_TEMPLATES.md`. |

Диаграммы можно смотреть в VS Code (плагин Mermaid), на GitHub или в любом редакторе Mermaid.

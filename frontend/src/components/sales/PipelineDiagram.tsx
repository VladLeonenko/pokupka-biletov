import { useEffect, useRef, useState } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress } from '@mui/material';

const MERMAID_SOURCE = `
flowchart TB
  subgraph SOURCES["Источники лидов"]
    CSV[Импорт CSV]
    MANUAL[Добавление вручную]
    DB[("clients stage=new")]
  end

  subgraph TRIGGER["Запуск"]
    CRON[Cron ежедневно]
    API[GET /process-daily?secret=CRON_SECRET]
    CRON --> API
  end

  subgraph OUTBOUND["Исходящий поток"]
    API --> LOAD[Загрузка лидов из БД]
    LOAD --> CHECK{Есть лиды?}
    CHECK -->|Нет| STOP[Конец]
    CHECK -->|Да| LOOP[Для каждого лида]
    LOOP --> EMAIL_TYPE{Тип email}
    EMAIL_TYPE -->|Личная почта| BASIC[Шаблон basic без аудита]
    EMAIL_TYPE -->|Корпоративный| SITE[Сайт = домен из email]
    SITE --> FETCH[Загрузка HTML сайта]
    FETCH --> PARSE[Парсинг: title, meta, h1/h2]
    PARSE --> AUDIT[AI-аудит сайта]
  end

  subgraph AUDIT_CRITERIA["Критерии аудита 0-100"]
    C1[Дизайн 0-25: низко = редизайн]
    C2[SEO 0-25: низко = SEO]
    C3[ИИ-готовность 0-25: низко = ИИ-продвижение]
    C4[Конверсия и тех 0-25]
    SCORE[audit_score + recommendations]
  end

  subgraph AFTER_AUDIT["После аудита"]
    PHONE[Извлечение телефона из HTML]
    TPL{Потенциал}
    TH[Шаблон High]
    TM[Шаблон Medium]
    TL[Шаблон Low]
  end

  subgraph SEND_CHANNEL["Отправка"]
    TRY_TG{Телефон + TG?}
    TG[UniSender Telegram]
    EMAIL[UniSender Email]
    FALLBACK[При ошибке TG -> Email]
    LOG[client_outreach_log]
    STAGE[stage = email_sent]
  end

  subgraph INBOUND["Входящие ответы"]
    REPLY[POST process-reply]
    FIND[Поиск клиента по email]
    CORR[correspondence]
    AI_CLASS[AI: тип ответа]
    ROUTE{Класс}
    QUAL[qualified]
    LOST[lost]
    REP[replied]
    MEET[meetings + уведомление]
  end

  CSV --> DB
  MANUAL --> DB
  AUDIT --> C1
  AUDIT --> C2
  AUDIT --> C3
  AUDIT --> C4
  C1 --> SCORE
  C2 --> SCORE
  C3 --> SCORE
  C4 --> SCORE
  SCORE --> PHONE
  PHONE --> TPL
  TPL --> TH
  TPL --> TM
  TPL --> TL
  BASIC --> TRY_TG
  TH --> TRY_TG
  TM --> TRY_TG
  TL --> TRY_TG
  TRY_TG -->|Да| TG
  TRY_TG -->|Нет| EMAIL
  TG --> FALLBACK
  FALLBACK --> EMAIL
  EMAIL --> LOG
  LOG --> STAGE
  REPLY --> FIND
  FIND --> CORR
  CORR --> AI_CLASS
  AI_CLASS --> ROUTE
  ROUTE -->|ready_to_meet| QUAL
  ROUTE -->|no_interest| LOST
  ROUTE -->|follow_up| REP
  QUAL --> MEET
`;

const CDN = 'https://cdn.jsdelivr.net/npm/mermaid@9/dist/mermaid.min.js';

export default function PipelineDiagram() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const run = async () => {
      type MermaidAPI = {
        init: (c: object) => void;
        render: (id: string, code: string) => Promise<{ svg: string }>;
      };
      const win = window as Window & { mermaid?: MermaidAPI };
      if (!win.mermaid) {
        try {
          const script = document.createElement('script');
          script.src = CDN;
          script.async = true;
          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Не удалось загрузить Mermaid'));
            document.head.appendChild(script);
          });
        } catch (e) {
          if (!cancelled) setError('Не удалось загрузить схему');
          return;
        }
      }

      if (!win.mermaid) {
        if (!cancelled) setError('Mermaid недоступен');
        return;
      }

      try {
        win.mermaid.init({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
        const id = 'pipeline-diagram-' + Date.now();
        const result = await win.mermaid.render(id, MERMAID_SOURCE);
        const svg = result?.svg ?? (typeof result === 'string' ? result : null);
        if (!cancelled && containerRef.current && svg) {
          containerRef.current.innerHTML = svg;
          setLoaded(true);
        } else if (!cancelled && !svg) {
          setError('Схема не сформирована');
        }
      } catch (e) {
        if (!cancelled) setError(String((e instanceof Error && e.message) ? e.message : e ?? 'Ошибка отрисовки схемы'));
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <Card variant="outlined" sx={{ overflow: 'hidden' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Схема пайплайна
        </Typography>
        <Box
          sx={{
            minHeight: 280,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            '& svg': { maxWidth: '100%', height: 'auto' },
          }}
        >
          {!loaded && !error && (
            <Box sx={{ position: 'absolute' }}>
              <CircularProgress size={32} />
            </Box>
          )}
          {error && (
            <Typography color="text.secondary" variant="body2">
              {error}
            </Typography>
          )}
          {/* Контейнер только для Mermaid: innerHTML мутирует DOM, React не должен иметь здесь детей */}
          <Box ref={containerRef} sx={{ display: loaded && !error ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', width: '100%' }} />
        </Box>
      </CardContent>
    </Card>
  );
}

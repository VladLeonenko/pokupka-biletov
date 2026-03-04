import { useEffect, useRef, useState } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress } from '@mui/material';

const MERMAID_SOURCE = `
flowchart TB
  subgraph CRON["Cron ежедневно"]
    T1[GET /process-daily]
  end

  subgraph SOURCE["Источник"]
    CSV[CSV / Импорт]
    DB[(clients\nstage = new)]
  end

  subgraph OUT["Исходящий поток"]
    T1 --> DB
    DB --> CHECK{Есть лиды?}
    CHECK --> LOOP[Для каждого]
    LOOP --> WEBSITE{Сайт или\nкорп. email?}
    WEBSITE -->|Личная почта| BASIC[Базовый шаблон]
    WEBSITE -->|Корп. email| DERIVE[Сайт = https/домен]
    DERIVE --> FETCH[Загрузка сайта]
    FETCH --> EXTRACT[Парсинг HTML]
    EXTRACT --> AUDIT[AI-аудит OpenAI]
    AUDIT --> PHONE[Телефон с сайта]
    PHONE --> TEMPLATE{Шаблон по потенциалу}
    TEMPLATE --> TH[High]
    TEMPLATE --> TM[Medium]
    TEMPLATE --> TL[Low]
    TH --> SEND
    TM --> SEND
    TL --> SEND
    BASIC --> SEND
    SEND{Телефон + Telegram?}
    SEND -->|Да| TG[UniSender Telegram]
    SEND -->|Нет| EM[UniSender Email]
    TG -->|Ошибка| EM
    EM --> LOG[outreach_log]
    LOG --> STAGE[stage = email_sent]
  end

  subgraph IN["Ответы клиентов"]
    REPLY[POST /process-reply]
    REPLY --> FIND[Клиент по email]
    FIND --> SAVE[correspondence]
    SAVE --> AI2[AI: ready_to_meet / no_interest]
    AI2 --> ROUTE{Тип}
    ROUTE -->|ready_to_meet| QUAL[qualified]
    ROUTE -->|no_interest| LOST[lost]
    ROUTE -->|follow_up| REP[replied]
    QUAL --> MEET[client_meetings + уведомление]
  end

  CSV --> DB
`;

const CDN = 'https://cdn.jsdelivr.net/npm/mermaid@9/dist/mermaid.min.js';

export default function PipelineDiagram() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

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
          setError('Не удалось загрузить схему');
          return;
        }
      }

      if (!win.mermaid) {
        setError('Mermaid недоступен');
        return;
      }

      try {
        win.mermaid.init({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
        const id = 'pipeline-diagram-' + Date.now();
        const { svg } = await win.mermaid.render(id, MERMAID_SOURCE);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
        setLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка отрисовки');
      }
    };

    run();
  }, []);

  return (
    <Card variant="outlined" sx={{ overflow: 'hidden' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Схема пайплайна
        </Typography>
        <Box
          ref={containerRef}
          sx={{
            minHeight: 280,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '& svg': { maxWidth: '100%', height: 'auto' },
          }}
        >
          {!loaded && !error && <CircularProgress size={32} />}
          {error && (
            <Typography color="text.secondary" variant="body2">
              {error}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

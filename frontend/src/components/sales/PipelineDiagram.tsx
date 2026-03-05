import { useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Card, CardContent, Typography, Paper } from '@mui/material';
import {
  Schedule,
  Storage,
  Language,
  Code,
  Psychology,
  Phone,
  Send,
  Email,
  Mail,
  Reply,
  AccountTree,
  Hub,
  CheckCircle,
  Cancel,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

const NODE_STYLE = {
  background: '#2d3748',
  border: '1px solid #4a5568',
  borderRadius: 8,
  padding: '10px 14px',
  minWidth: 160,
  color: '#e2e8f0',
  fontSize: 12,
  fontFamily: 'inherit',
};

const TRIGGER_STYLE = { ...NODE_STYLE, borderColor: '#6366f1', background: '#3730a3' };
const AI_STYLE = { ...NODE_STYLE, borderColor: '#059669', background: '#064e3b' };
const DECISION_STYLE = { ...NODE_STYLE, borderColor: '#d69e2e', background: '#744210', minWidth: 140 };

const NODE_DESCRIPTIONS: Record<string, string> = {
  cron: 'Ежедневный запуск по расписанию (cron). Вызывает GET /api/sales-pipeline/process-daily с секретом из CRON_SECRET. Количество лидов за раз задаётся в настройках (например 10 или 100).',
  load: 'Загрузка из БД: выборка клиентов с pipeline_stage = \'new\', лимит = batch_size из настроек. Сортировка по created_at.',
  split: 'Разделение по типу email: корпоративный (есть домен компании) → загрузка сайта и аудит; личная почта (gmail, yandex и т.д.) → шаблон без аудита.',
  basic: 'Шаблон «Без аудита» для лидов с личной почтой или без сайта. Письмо про AI и автоматизацию, без персонального аудита.',
  fetch: 'Загрузка HTML главной страницы сайта (домен из email или поле website). Таймаут 15 с, до 100 КБ.',
  extract: 'Парсинг HTML: title, meta description, заголовки h1/h2. Данные передаются в AI-аудит.',
  audit: 'AI-аудит (OpenAI): оценка 0–100 по критериям (дизайн, SEO, ИИ-готовность, конверсия), рекомендации (редизайн, SEO, ИИ-продвижение, e-commerce). Определяется business_potential (high/medium/low).',
  phone: 'Извлечение номера телефона из текста страницы через OpenAI. Нормализация в формат +7XXXXXXXXXX для UniSender Telegram.',
  template: 'Выбор шаблона письма по business_potential: High / Medium / Low. ID шаблонов в UniSender заданы в коде.',
  send: 'Отправка: если найден телефон и настроен UNISENDER_CHANNEL_ID — сначала в Telegram, при ошибке в Email. Иначе — только Email через UniSender (subscribe + sendEmail).',
  log: 'Запись в client_outreach_log, обновление pipeline_stage на email_sent и last_outreach_at.',
  reply: 'Входящий ответ клиента. Вызов POST /api/sales-pipeline/process-reply (JWT). Тело: fromEmail, subject, text.',
  find: 'Поиск клиента в БД по email отправителя. Должен быть в пайплайне (pipeline_stage не null).',
  corr: 'Сохранение письма в client_correspondence (тип incoming).',
  analyze: 'AI-анализ ответа: классификация (ready_to_meet / no_interest / follow_up). Определяет, звать на встречу, отказ или оставить в replied.',
  route: 'Маршрутизация по результату AI: ready_to_meet → Qualified, no_interest → Lost, follow_up → Replied.',
  qualified: 'Этап «Квалифицирован». Менеджер может назначить встречу. При готовности к встрече создаётся запись в client_meetings и уведомление.',
  lost: 'Этап «Отказ». Лид помечается как не заинтересован.',
  replied: 'Этап «Ответил». Требуется дальнейшая коммуникация.',
  meet: 'Создание встречи (Zoom/календарь) и уведомление. Связь с client_meetings.',
  upd: 'Обновление pipeline_stage в таблице clients по результату маршрутизации (qualified / lost / replied).',
};

function N8nNode({ data, selected }: NodeProps<{ label: string; sublabel?: string; icon?: React.ReactNode; variant?: 'trigger' | 'ai' | 'decision' | 'default' }>) {
  const style =
    data.variant === 'trigger'
      ? TRIGGER_STYLE
      : data.variant === 'ai'
        ? AI_STYLE
        : data.variant === 'decision'
          ? DECISION_STYLE
          : NODE_STYLE;
  return (
    <Box
      sx={{
        ...style,
        boxShadow: selected ? '0 0 0 2px #6366f1' : 'none',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: data.sublabel ? 0.5 : 0 }}>
        {data.icon && <Box sx={{ color: '#a5b4fc', display: 'flex', alignItems: 'center' }}>{data.icon}</Box>}
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'inherit', fontSize: '12px' }}>
          {data.label}
        </Typography>
      </Box>
      {data.sublabel && (
        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: 10, display: 'block' }}>
          {data.sublabel}
        </Typography>
      )}
    </Box>
  );
}

const nodeTypes = { n8n: N8nNode };

const initialNodes: Node[] = [
  { id: 'cron', type: 'n8n', position: { x: 20, y: 20 }, data: { label: 'Daily Lead Processing', sublabel: 'Cron', variant: 'trigger', icon: <Schedule fontSize="small" /> } },
  { id: 'load', type: 'n8n', position: { x: 220, y: 20 }, data: { label: 'Load Client Database', sublabel: 'clients stage=new', icon: <Storage fontSize="small" /> } },
  { id: 'split', type: 'n8n', position: { x: 440, y: 20 }, data: { label: 'Split by email type', icon: <Hub fontSize="small" /> } },
  { id: 'basic', type: 'n8n', position: { x: 440, y: 160 }, data: { label: 'Basic template (no audit)', sublabel: 'personal email', icon: <Mail fontSize="small" /> } },
  { id: 'fetch', type: 'n8n', position: { x: 660, y: 20 }, data: { label: 'Fetch Website', icon: <Language fontSize="small" /> } },
  { id: 'extract', type: 'n8n', position: { x: 860, y: 20 }, data: { label: 'Extract Website Data', sublabel: 'title, meta, h1/h2', icon: <Code fontSize="small" /> } },
  { id: 'audit', type: 'n8n', position: { x: 1080, y: 20 }, data: { label: 'Website & Business Audit', sublabel: 'Design, SEO, AI, Conversion', variant: 'ai', icon: <Psychology fontSize="small" /> } },
  { id: 'phone', type: 'n8n', position: { x: 1320, y: 20 }, data: { label: 'Extract Phone', icon: <Phone fontSize="small" /> } },
  { id: 'template', type: 'n8n', position: { x: 1520, y: 20 }, data: { label: 'Template by potential', sublabel: 'High / Medium / Low', variant: 'decision', icon: <AccountTree fontSize="small" /> } },
  { id: 'send', type: 'n8n', position: { x: 1740, y: 20 }, data: { label: 'Send', sublabel: 'Telegram or Email', variant: 'decision', icon: <Send fontSize="small" /> } },
  { id: 'log', type: 'n8n', position: { x: 1960, y: 20 }, data: { label: 'outreach_log', sublabel: 'stage = email_sent', icon: <Storage fontSize="small" /> } },
  { id: 'reply', type: 'n8n', position: { x: 20, y: 320 }, data: { label: 'Client Email Responses', sublabel: 'POST /process-reply', variant: 'trigger', icon: <Reply fontSize="small" /> } },
  { id: 'find', type: 'n8n', position: { x: 260, y: 320 }, data: { label: 'Find Lead by Email', icon: <Storage fontSize="small" /> } },
  { id: 'corr', type: 'n8n', position: { x: 460, y: 320 }, data: { label: 'Log to Correspondence', icon: <Mail fontSize="small" /> } },
  { id: 'analyze', type: 'n8n', position: { x: 660, y: 320 }, data: { label: 'Response Analysis Agent', sublabel: 'AI qualification', variant: 'ai', icon: <Psychology fontSize="small" /> } },
  { id: 'route', type: 'n8n', position: { x: 900, y: 320 }, data: { label: 'Route by Response Type', variant: 'decision', icon: <Hub fontSize="small" /> } },
  { id: 'qualified', type: 'n8n', position: { x: 1120, y: 260 }, data: { label: 'Set Stage Qualified', icon: <CheckCircle fontSize="small" /> } },
  { id: 'lost', type: 'n8n', position: { x: 1120, y: 320 }, data: { label: 'Set Stage Lost', icon: <Cancel fontSize="small" /> } },
  { id: 'replied', type: 'n8n', position: { x: 1120, y: 380 }, data: { label: 'Set Stage Replied', icon: <Email fontSize="small" /> } },
  { id: 'meet', type: 'n8n', position: { x: 1320, y: 260 }, data: { label: 'Meetings + notification', sublabel: 'Zoom / Calendar', icon: <ScheduleIcon fontSize="small" /> } },
  { id: 'upd', type: 'n8n', position: { x: 900, y: 460 }, data: { label: 'Update Lead Stage', icon: <Storage fontSize="small" /> } },
];

const EDGE_OUTBOUND = { stroke: '#6366f1', strokeWidth: 2 };
const EDGE_BASIC = { stroke: '#10b981', strokeWidth: 2 };
const EDGE_INBOUND = { stroke: '#f59e0b', strokeWidth: 2 };

const initialEdges: Edge[] = [
  { id: 'e-cron-load', source: 'cron', target: 'load', style: EDGE_OUTBOUND },
  { id: 'e-load-split', source: 'load', target: 'split', style: EDGE_OUTBOUND },
  { id: 'e-split-basic', source: 'split', target: 'basic', style: EDGE_BASIC },
  { id: 'e-split-fetch', source: 'split', target: 'fetch', style: EDGE_OUTBOUND },
  { id: 'e-fetch-extract', source: 'fetch', target: 'extract', style: EDGE_OUTBOUND },
  { id: 'e-extract-audit', source: 'extract', target: 'audit', style: EDGE_OUTBOUND },
  { id: 'e-audit-phone', source: 'audit', target: 'phone', style: EDGE_OUTBOUND },
  { id: 'e-phone-template', source: 'phone', target: 'template', style: EDGE_OUTBOUND },
  { id: 'e-template-send', source: 'template', target: 'send', style: EDGE_OUTBOUND },
  { id: 'e-basic-send', source: 'basic', target: 'send', style: EDGE_BASIC },
  { id: 'e-send-log', source: 'send', target: 'log', style: EDGE_OUTBOUND },
  { id: 'e-reply-find', source: 'reply', target: 'find', style: EDGE_INBOUND },
  { id: 'e-find-corr', source: 'find', target: 'corr', style: EDGE_INBOUND },
  { id: 'e-corr-analyze', source: 'corr', target: 'analyze', style: EDGE_INBOUND },
  { id: 'e-analyze-route', source: 'analyze', target: 'route', style: EDGE_INBOUND },
  { id: 'e-route-qualified', source: 'route', target: 'qualified', style: EDGE_INBOUND },
  { id: 'e-route-lost', source: 'route', target: 'lost', style: EDGE_INBOUND },
  { id: 'e-route-replied', source: 'route', target: 'replied', style: EDGE_INBOUND },
  { id: 'e-qualified-meet', source: 'qualified', target: 'meet', style: EDGE_INBOUND },
  { id: 'e-qualified-upd', source: 'qualified', target: 'upd', style: EDGE_INBOUND },
  { id: 'e-lost-upd', source: 'lost', target: 'upd', style: EDGE_INBOUND },
  { id: 'e-replied-upd', source: 'replied', target: 'upd', style: EDGE_INBOUND },
];

export default function PipelineDiagram() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const description = selectedNodeId ? NODE_DESCRIPTIONS[selectedNodeId] : null;

  return (
    <Card variant="outlined" sx={{ overflow: 'hidden' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Схема пайплайна (n8n-style)
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Фиолетовые стрелки — исходящие лиды, зелёные — ветка без аудита, оранжевые — ответы клиентов. Клик по узлу — описание.
        </Typography>
        <Box sx={{ height: 520, width: '100%', bgcolor: '#1a1d24', borderRadius: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_e, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={1.5}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            proOptions={{ hideAttribution: true }}
            style={{ background: '#1a1d24' }}
          >
            <Background color="#2d3748" gap={16} size={0.5} />
            <Controls showInteractive={false} className="bg-gray-800 rounded" />
            <MiniMap
              nodeColor="#4a5568"
              maskColor="rgba(0,0,0,0.7)"
              className="!bg-gray-900"
            />
          </ReactFlow>
        </Box>
        {description && (
          <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: 'grey.900' }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              {selectedNode?.data?.label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Нажмите на другой узел для описания или кликните вне узла, чтобы сбросить.
            </Typography>
          </Paper>
        )}
      </CardContent>
    </Card>
  );
}

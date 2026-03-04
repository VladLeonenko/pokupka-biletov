import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Pagination,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Card,
  CardContent,
} from '@mui/material';
import { Upload, Campaign, AccountTree, Terminal } from '@mui/icons-material';
import PipelineDiagram from '@/components/sales/PipelineDiagram';
import { listPipelineLeads, importPipelineLeads, PipelineLead } from '@/services/salesPipelineApi';
import { useToast } from '@/components/common/ToastProvider';

const STAGE_LABELS: Record<string, string> = {
  new: 'Новый',
  audited: 'Аудит',
  email_sent: 'Письмо отправлено',
  replied: 'Ответил',
  qualified: 'Квалифицирован',
  lost: 'Отказ',
  meeting_scheduled: 'Встреча назначена',
};

const TAB_LIST = 0;
const TAB_SCHEMA = 1;

export default function SalesPipelinePage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [stageFilter, setStageFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ['sales-pipeline-leads', page, limit, stageFilter, search],
    queryFn: () =>
      listPipelineLeads({
        page,
        limit,
        stage: stageFilter || undefined,
        search: search || undefined,
      }),
  });

  const importMutation = useMutation({
    mutationFn: importPipelineLeads,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline-leads'] });
      setImportOpen(false);
      setImportFile(null);
      showToast(`Импортировано: ${result.imported} из ${result.total}`, 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const handleImport = () => {
    if (!importFile) return;
    importMutation.mutate(importFile);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Campaign /> Пайплайн холодных лидов
        </Typography>
        <Button
          variant="contained"
          startIcon={<Upload />}
          onClick={() => setImportOpen(true)}
        >
          Импорт CSV
        </Button>
      </Box>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<Campaign />} iconPosition="start" label="Лиды" value={TAB_LIST} />
        <Tab icon={<AccountTree />} iconPosition="start" label="Схема и команды" value={TAB_SCHEMA} />
      </Tabs>

      {activeTab === TAB_SCHEMA && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
          <PipelineDiagram />
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Terminal /> Команды для настройки
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Cron (ежедневный запуск обработки). Подставь свой домен и CRON_SECRET из .env:
              </Typography>
              <Box
                component="pre"
                sx={{
                  p: 1.5,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  overflow: 'auto',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                }}
              >
                {`0 9 * * * curl -s "https://prime-coder.ru/api/sales-pipeline/process-daily?secret=ТВОЙ_CRON_SECRET"`}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 0.5 }}>
                Обработка ответа клиента (JWT — токен админа/менеджера):
              </Typography>
              <Box
                component="pre"
                sx={{
                  p: 1.5,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  overflow: 'auto',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {`curl -X POST "https://prime-coder.ru/api/sales-pipeline/process-reply" \\
  -H "Authorization: Bearer <JWT>" \\
  -H "Content-Type: application/json" \\
  -d '{"fromEmail":"email@клиента","subject":"Re: ...","text":"Готов обсудить, запишите на встречу"}'`}
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {activeTab === TAB_LIST && (
        <>
      <Alert severity="info" sx={{ mb: 2 }}>
        Лиды из пайплайна — это клиенты с заполненным этапом (new → audited → email_sent → …). Импорт добавляет строки в базу клиентов и помечает их для ежедневной обработки (аудит сайта, отправка через UniSender). Запуск по расписанию — cron на сервере вызывает <code>GET /api/sales-pipeline/process-daily</code>.
      </Alert>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Этап</InputLabel>
          <Select
            value={stageFilter}
            label="Этап"
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <MenuItem value="">Все</MenuItem>
            {Object.entries(STAGE_LABELS).map(([v, l]) => (
              <MenuItem key={v} value={v}>{l}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Ошибка загрузки'}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Компания / Имя</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Телефон</TableCell>
                  <TableCell>Этап</TableCell>
                  <TableCell>Оценка</TableCell>
                  <TableCell>Последнее касание</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      Нет лидов в пайплайне. Загрузите CSV (колонки: ФИО, email, company_name, tel).
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.items ?? []).map((lead: PipelineLead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{lead.company || lead.name}</Typography>
                        {lead.company && lead.name !== lead.company && (
                          <Typography variant="caption" color="text.secondary">{lead.name}</Typography>
                        )}
                      </TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{lead.phone || '—'}</TableCell>
                      <TableCell>
                        <Chip label={STAGE_LABELS[lead.stage] || lead.stage} size="small" />
                      </TableCell>
                      <TableCell>
                        {lead.audit_score != null ? `${lead.audit_score}` : '—'}
                      </TableCell>
                      <TableCell>
                        {lead.last_outreach_at
                          ? new Date(lead.last_outreach_at).toLocaleDateString('ru-RU')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {data && data.total > limit && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={Math.ceil(data.total / limit)}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
        </>
      )}

      <Dialog open={importOpen} onClose={() => !importMutation.isPending && setImportOpen(false)}>
        <DialogTitle>Импорт лидов (CSV)</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Колонки: ФИО, tel, email, company_name (опционально website). Разделитель — запятая или точка с запятой.
          </Typography>
          <Button
            variant="outlined"
            component="label"
            startIcon={<Upload />}
            fullWidth
          >
            {importFile ? importFile.name : 'Выбрать файл'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              hidden
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)} disabled={importMutation.isPending}>
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={!importFile || importMutation.isPending}
          >
            {importMutation.isPending ? <CircularProgress size={24} /> : 'Импортировать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

import { useState, useRef, useEffect } from 'react';
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
  Checkbox,
  IconButton,
  TextField,
} from '@mui/material';
import { Upload, Campaign, AccountTree, Terminal, Edit, Delete, Send, PersonAdd, Email } from '@mui/icons-material';
import PipelineDiagram from '@/components/sales/PipelineDiagram';
import {
  listPipelineLeads,
  importPipelineLeads,
  updatePipelineLead,
  createPipelineLead,
  deletePipelineLead,
  massDeletePipelineLeads,
  sendNowPipelineLead,
  getPipelineSettings,
  updatePipelineSettings,
  getPipelineTemplates,
  getPipelineTemplatePreview,
  PipelineLead,
} from '@/services/salesPipelineApi';
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
const TAB_TEMPLATES = 2;

export default function SalesPipelinePage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [stageFilter, setStageFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editLead, setEditLead] = useState<PipelineLead | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', company: '', email: '', phone: '', website: '' });
  const [templatePreviewKey, setTemplatePreviewKey] = useState<string>('high');
  const [settingsForm, setSettingsForm] = useState({ batchSize: 10, maxEmailsPerRun: '' as string | number, preferredCronExpression: '0 9 * * *' });
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updatePipelineLead>[1] }) =>
      updatePipelineLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline-leads'] });
      setEditOpen(false);
      setEditLead(null);
      showToast('Лид обновлён', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const createMutation = useMutation({
    mutationFn: createPipelineLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline-leads'] });
      setAddOpen(false);
      setAddForm({ name: '', company: '', email: '', phone: '', website: '' });
      showToast('Лид добавлен', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePipelineLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline-leads'] });
      showToast('Лид убран из пайплайна', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const massDeleteMutation = useMutation({
    mutationFn: massDeletePipelineLeads,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline-leads'] });
      setSelectedIds([]);
      showToast(`Удалено из пайплайна: ${result.deleted}`, 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const sendNowMutation = useMutation({
    mutationFn: sendNowPipelineLead,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline-leads'] });
      showToast(
        result.sent
          ? `Отправлено: ${result.sent}`
          : result.sendErrors?.length
            ? `Ошибки: ${result.sendErrors.map((e) => e.reason).join('; ')}`
            : 'Запущено',
        result.sent ? 'success' : 'info'
      );
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const { data: settings } = useQuery({
    queryKey: ['sales-pipeline-settings'],
    queryFn: getPipelineSettings,
    enabled: activeTab === TAB_SCHEMA,
  });

  // Синхронизировать форму настроек при загрузке
  useEffect(() => {
    if (settings) {
      setSettingsForm({
        batchSize: settings.batchSize,
        maxEmailsPerRun: settings.maxEmailsPerRun ?? '',
        preferredCronExpression: settings.preferredCronExpression ?? '0 9 * * *',
      });
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: updatePipelineSettings,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline-settings'] });
      setSettingsForm({
        batchSize: data.batchSize,
        maxEmailsPerRun: data.maxEmailsPerRun ?? '',
        preferredCronExpression: data.preferredCronExpression ?? '0 9 * * *',
      });
      showToast('Настройки сохранены', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const { data: templates } = useQuery({
    queryKey: ['sales-pipeline-templates'],
    queryFn: getPipelineTemplates,
    enabled: activeTab === TAB_TEMPLATES,
  });

  const { data: templatePreview, isLoading: templatePreviewLoading } = useQuery({
    queryKey: ['sales-pipeline-template-preview', templatePreviewKey],
    queryFn: () => getPipelineTemplatePreview(templatePreviewKey),
    enabled: activeTab === TAB_TEMPLATES && !!templatePreviewKey,
  });

  const handleImport = () => {
    if (!importFile) return;
    importMutation.mutate(importFile);
  };

  const handleEdit = (lead: PipelineLead) => {
    setEditLead(lead);
    setEditOpen(true);
  };

  const handleEditSave = () => {
    if (!editLead) return;
    updateMutation.mutate({
      id: editLead.id,
      data: {
        stage: editLead.stage,
        website: editLead.website ?? '',
        name: editLead.name,
        company: editLead.company ?? '',
        phone: editLead.phone ?? '',
      },
    });
  };

  const handleAdd = () => {
    if (!addForm.email.trim()) {
      showToast('Укажите email', 'error');
      return;
    }
    createMutation.mutate({
      email: addForm.email.trim(),
      name: addForm.name.trim() || undefined,
      company: addForm.company.trim() || undefined,
      phone: addForm.phone.trim() || undefined,
      website: addForm.website.trim() || undefined,
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    const items = data?.items ?? [];
    if (selectedIds.length >= items.length) setSelectedIds([]);
    else setSelectedIds(items.map((l) => l.id));
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Campaign /> Пайплайн холодных лидов
        </Typography>
        <Button variant="contained" startIcon={<Upload />} onClick={() => setImportOpen(true)}>
          Импорт CSV
        </Button>
        <Button variant="outlined" startIcon={<PersonAdd />} onClick={() => setAddOpen(true)}>
          Добавить лида
        </Button>
        {selectedIds.length > 0 && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={() => massDeleteMutation.mutate(selectedIds)}
            disabled={massDeleteMutation.isPending}
          >
            Удалить из пайплайна ({selectedIds.length})
          </Button>
        )}
      </Box>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<Campaign />} iconPosition="start" label="Лиды" value={TAB_LIST} />
        <Tab icon={<AccountTree />} iconPosition="start" label="Схема и команды" value={TAB_SCHEMA} />
        <Tab icon={<Email />} iconPosition="start" label="Шаблоны писем" value={TAB_TEMPLATES} />
      </Tabs>

      {activeTab === TAB_SCHEMA && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
          <PipelineDiagram />
          {settings && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Настройки рассылки
                </Typography>
                <Box component="form" sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end', mt: 1 }}>
                  <TextField
                    label="Лидов за запуск"
                    type="number"
                    size="small"
                    value={settingsForm.batchSize}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, batchSize: Math.min(500, Math.max(1, parseInt(e.target.value, 10) || 10)) }))}
                    inputProps={{ min: 1, max: 500 }}
                    sx={{ width: 140 }}
                  />
                  <TextField
                    label="Макс. писем за запуск"
                    type="number"
                    size="small"
                    placeholder="Не ограничено"
                    value={settingsForm.maxEmailsPerRun === '' ? '' : settingsForm.maxEmailsPerRun}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, maxEmailsPerRun: e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 0) }))}
                    inputProps={{ min: 1 }}
                    sx={{ width: 180 }}
                  />
                  <TextField
                    label="Cron (время запуска)"
                    size="small"
                    placeholder="0 9 * * *"
                    value={settingsForm.preferredCronExpression}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, preferredCronExpression: e.target.value }))}
                    helperText="Рекомендуемое время. Реальный запуск — в crontab на сервере."
                    sx={{ minWidth: 160 }}
                  />
                  <Button
                    variant="contained"
                    onClick={() =>
                      updateSettingsMutation.mutate({
                        batchSize: settingsForm.batchSize,
                        maxEmailsPerRun: settingsForm.maxEmailsPerRun === '' ? null : Number(settingsForm.maxEmailsPerRun),
                        preferredCronExpression: settingsForm.preferredCronExpression || undefined,
                      })
                    }
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? <CircularProgress size={20} /> : 'Сохранить'}
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Сейчас за запуск: до {settings.batchSize} лидов
                  {settings.maxEmailsPerRun != null && `, макс. писем: ${settings.maxEmailsPerRun}`}.
                  Cron-секрет: {settings.cronSecretSet ? 'задан' : 'не задан'}.
                </Typography>
              </CardContent>
            </Card>
          )}
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
                {`${(settings && settings.preferredCronExpression) || '0 9 * * *'} curl -s "https://prime-coder.ru/api/sales-pipeline/process-daily?secret=ТВОЙ_CRON_SECRET"`}
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

      {activeTab === TAB_TEMPLATES && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Превью шаблонов с подставленными демо-данными (как увидит получатель). Источник — локальные HTML в backend/email-templates/sales/.
          </Typography>
          <FormControl size="small" sx={{ minWidth: 280 }}>
            <InputLabel>Шаблон</InputLabel>
            <Select
              value={templatePreviewKey}
              label="Шаблон"
              onChange={(e) => setTemplatePreviewKey(e.target.value)}
            >
              {(templates ?? []).map((t) => (
                <MenuItem key={t.key} value={t.key}>
                  {t.name} (ID: {t.templateId})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {templatePreview && (
            <>
              <Typography variant="caption" color="text.secondary" display="block">
                Тема: {templatePreview.subject}
              </Typography>
              <Paper variant="outlined" sx={{ overflow: 'hidden', minHeight: 400 }}>
                {templatePreviewLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <iframe
                    title={`Превью ${templatePreviewKey}`}
                    srcDoc={templatePreview.html}
                    style={{
                      width: '100%',
                      minHeight: 500,
                      border: 'none',
                      display: 'block',
                    }}
                    sandbox="allow-same-origin"
                  />
                )}
              </Paper>
            </>
          )}
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
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedIds.length > 0 && selectedIds.length < (data?.items?.length ?? 0)}
                      checked={(data?.items?.length ?? 0) > 0 && selectedIds.length === (data?.items?.length ?? 0)}
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Компания / Имя</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Сайт</TableCell>
                  <TableCell>Телефон</TableCell>
                  <TableCell>Этап</TableCell>
                  <TableCell>Оценка</TableCell>
                  <TableCell>Последнее касание</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      Нет лидов в пайплайне. Загрузите CSV или добавьте вручную.
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.items ?? []).map((lead: PipelineLead) => (
                    <TableRow key={lead.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.includes(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{lead.company || lead.name}</Typography>
                        {lead.company && lead.name !== lead.company && (
                          <Typography variant="caption" color="text.secondary">{lead.name}</Typography>
                        )}
                      </TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>
                        {lead.website ? (
                          <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem' }}>
                            {lead.website.replace(/^https?:\/\//, '').slice(0, 30)}{lead.website.length > 30 ? '…' : ''}
                          </a>
                        ) : '—'}
                      </TableCell>
                      <TableCell>{lead.phone || '—'}</TableCell>
                      <TableCell>
                        <Chip label={STAGE_LABELS[lead.stage] ?? lead.stage ?? '—'} size="small" />
                      </TableCell>
                      <TableCell>{lead.audit_score != null ? `${lead.audit_score}` : '—'}</TableCell>
                      <TableCell>
                        {lead.last_outreach_at
                          ? new Date(lead.last_outreach_at).toLocaleDateString('ru-RU')
                          : '—'}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" title="Изменить" onClick={() => handleEdit(lead)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" title="Отправить сейчас" onClick={() => sendNowMutation.mutate(lead.id)} disabled={sendNowMutation.isPending}>
                          <Send fontSize="small" />
                        </IconButton>
                        <IconButton size="small" title="Убрать из пайплайна" onClick={() => deleteMutation.mutate(lead.id)} disabled={deleteMutation.isPending}>
                          <Delete fontSize="small" />
                        </IconButton>
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

      <Dialog open={editOpen} onClose={() => !updateMutation.isPending && (setEditOpen(false), setEditLead(null))} maxWidth="sm" fullWidth>
        <DialogTitle>Редактировать лида</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {editLead && (
            <>
              <TextField label="Имя" value={editLead.name} onChange={(e) => setEditLead({ ...editLead, name: e.target.value })} fullWidth size="small" />
              <TextField label="Компания" value={editLead.company ?? ''} onChange={(e) => setEditLead({ ...editLead, company: e.target.value })} fullWidth size="small" />
              <TextField label="Сайт" value={editLead.website ?? ''} onChange={(e) => setEditLead({ ...editLead, website: e.target.value })} fullWidth size="small" placeholder="https://..." />
              <TextField label="Телефон" value={editLead.phone ?? ''} onChange={(e) => setEditLead({ ...editLead, phone: e.target.value })} fullWidth size="small" />
              <FormControl size="small" fullWidth>
                <InputLabel>Этап</InputLabel>
                <Select
                  value={editLead.stage}
                  label="Этап"
                  onChange={(e) => setEditLead({ ...editLead, stage: e.target.value })}
                >
                  {Object.entries(STAGE_LABELS).map(([v, l]) => (
                    <MenuItem key={v} value={v}>{l}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={updateMutation.isPending}>Отмена</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={!editLead || updateMutation.isPending}>
            {updateMutation.isPending ? <CircularProgress size={24} /> : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addOpen} onClose={() => !createMutation.isPending && setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить лида</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Email *" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} fullWidth size="small" required />
          <TextField label="Имя" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} fullWidth size="small" />
          <TextField label="Компания" value={addForm.company} onChange={(e) => setAddForm((f) => ({ ...f, company: e.target.value }))} fullWidth size="small" />
          <TextField label="Сайт" value={addForm.website} onChange={(e) => setAddForm((f) => ({ ...f, website: e.target.value }))} fullWidth size="small" placeholder="https://..." />
          <TextField label="Телефон" value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} fullWidth size="small" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={createMutation.isPending}>Отмена</Button>
          <Button variant="contained" onClick={handleAdd} disabled={!addForm.email.trim() || createMutation.isPending}>
            {createMutation.isPending ? <CircularProgress size={24} /> : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

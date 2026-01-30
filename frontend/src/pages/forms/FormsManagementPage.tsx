import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplyIcon from '@mui/icons-material/Reply';
import ArchiveIcon from '@mui/icons-material/Archive';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  listForms,
  getFormStats,
  listFormSubmissions,
  updateSubmissionStatus,
  deleteSubmission,
  listFormAbandonments,
  deleteForm,
} from '@/services/cmsApi';
import { Form, FormSubmission, FormAbandonment } from '@/types/cms';
import { useToast } from '@/components/common/ToastProvider';

type TabValue = 'overview' | 'submissions' | 'abandonments';

export function FormsManagementPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<TabValue>('overview');
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: forms = [] } = useQuery({ queryKey: ['forms'], queryFn: listForms });
  const { data: stats } = useQuery({ queryKey: ['forms', 'stats'], queryFn: getFormStats });
  const { data: submissions = [] } = useQuery({
    queryKey: ['forms', selectedFormId, 'submissions', statusFilter],
    queryFn: () => selectedFormId ? listFormSubmissions(selectedFormId, statusFilter === 'all' ? undefined : statusFilter) : Promise.resolve([]),
    enabled: !!selectedFormId && selectedTab === 'submissions',
  });
  const { data: abandonments = [] } = useQuery({
    queryKey: ['forms', selectedFormId, 'abandonments'],
    queryFn: () => selectedFormId ? listFormAbandonments(selectedFormId) : Promise.resolve([]),
    enabled: !!selectedFormId && selectedTab === 'abandonments',
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ formId, submissionId, status }: { formId: string; submissionId: number; status: string }) =>
      updateSubmissionStatus(formId, submissionId, status as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      showToast('Статус обновлён', 'success');
    },
  });

  const deleteSubmissionMut = useMutation({
    mutationFn: ({ formId, submissionId }: { formId: string; submissionId: number }) =>
      deleteSubmission(formId, submissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      showToast('Отправка удалена', 'success');
    },
  });

  const deleteFormMut = useMutation({
    mutationFn: deleteForm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      showToast('Форма удалена', 'success');
    },
  });

  useEffect(() => {
    if (!selectedFormId && forms.length > 0) {
      setSelectedFormId(forms[0].form_id);
    }
  }, [selectedFormId, forms]);

  const selectedForm = forms.find((f) => f.form_id === selectedFormId);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'error';
      case 'read': return 'info';
      case 'replied': return 'success';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Новая';
      case 'read': return 'Прочитана';
      case 'replied': return 'Отвечена';
      case 'archived': return 'Архив';
      default: return status;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Управление формами
      </Typography>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        {/* Stats Overview */}
        {stats && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Статистика</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>Всего форм</Typography>
                      <Typography variant="h4">{stats.overview.total_forms}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>Всего отправок</Typography>
                      <Typography variant="h4">{stats.overview.total_submissions}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>Новых</Typography>
                      <Typography variant="h4" color="error">{stats.overview.new_submissions}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>Брошенных</Typography>
                      <Typography variant="h4">{stats.overview.total_abandonments}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>Сегодня</Typography>
                      <Typography variant="h4">{stats.overview.submissions_today}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>За неделю</Typography>
                      <Typography variant="h4">{stats.overview.submissions_week}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>За месяц</Typography>
                      <Typography variant="h4">{stats.overview.submissions_month}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {stats.byForm && stats.byForm.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>По формам</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Форма</TableCell>
                          <TableCell align="right">Отправок</TableCell>
                          <TableCell align="right">Брошено</TableCell>
                          <TableCell align="right">Новых</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stats.byForm.map((f) => (
                          <TableRow key={f.form_id}>
                            <TableCell>{f.form_name}</TableCell>
                            <TableCell align="right">{f.submission_count}</TableCell>
                            <TableCell align="right">{f.abandonment_count}</TableCell>
                            <TableCell align="right">
                              <Chip label={f.new_count} color="error" size="small" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Paper>
          </Grid>
        )}

        {/* Forms List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Формы</Typography>
            {forms.map((form) => (
              <Accordion
                key={form.form_id}
                expanded={selectedFormId === form.form_id}
                onChange={() => setSelectedFormId(form.form_id)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', pr: 2 }}>
                    <Typography>{form.form_name}</Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Удалить форму?')) {
                          deleteFormMut.mutate(form.form_id);
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="textSecondary">
                    ID: {form.form_id}
                  </Typography>
                  {form.page_path && (
                    <Typography variant="body2" color="textSecondary">
                      Страница: {form.page_path}
                    </Typography>
                  )}
                  <Typography variant="body2" color="textSecondary">
                    Полей: {form.fields.length}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Paper>
        </Grid>

        {/* Form Details */}
        <Grid item xs={12} md={8}>
          {selectedForm ? (
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{selectedForm.form_name}</Typography>
                <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
                  <Tab label="Обзор" value="overview" />
                  <Tab label="Отправки" value="submissions" />
                  <Tab label="Брошенные" value="abandonments" />
                </Tabs>
              </Box>

              {selectedTab === 'overview' && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Поля формы</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Название</TableCell>
                          <TableCell>Тип</TableCell>
                          <TableCell align="center">Обязательное</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedForm.fields.map((field) => (
                          <TableRow key={field.name}>
                            <TableCell>{field.label}</TableCell>
                            <TableCell>{field.type}</TableCell>
                            <TableCell align="center">{field.required ? 'Да' : 'Нет'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {selectedTab === 'submissions' && (
                <Box>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Статус</InputLabel>
                      <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Статус">
                        <MenuItem value="all">Все</MenuItem>
                        <MenuItem value="new">Новые</MenuItem>
                        <MenuItem value="read">Прочитанные</MenuItem>
                        <MenuItem value="replied">Отвеченные</MenuItem>
                        <MenuItem value="archived">Архив</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Дата</TableCell>
                          <TableCell>Данные</TableCell>
                          <TableCell>Статус</TableCell>
                          <TableCell align="right">Действия</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {submissions.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell>{formatDate(sub.submitted_at)}</TableCell>
                            <TableCell>
                              <Box>
                                {Object.entries(sub.form_data).slice(0, 2).map(([key, val]) => (
                                  <Typography key={key} variant="body2">
                                    <strong>{key}:</strong> {String(val)}
                                  </Typography>
                                ))}
                                {Object.keys(sub.form_data).length > 2 && (
                                  <Typography variant="body2" color="textSecondary">
                                    ...ещё {Object.keys(sub.form_data).length - 2}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip label={getStatusLabel(sub.status)} color={getStatusColor(sub.status) as any} size="small" />
                            </TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={() => setSelectedSubmission(sub)}
                              >
                                <VisibilityIcon />
                              </IconButton>
                              {sub.status !== 'read' && (
                                <IconButton
                                  size="small"
                                  onClick={() => updateStatusMut.mutate({ formId: selectedFormId!, submissionId: sub.id, status: 'read' })}
                                >
                                  <CheckCircleIcon />
                                </IconButton>
                              )}
                              {sub.status !== 'replied' && (
                                <IconButton
                                  size="small"
                                  onClick={() => updateStatusMut.mutate({ formId: selectedFormId!, submissionId: sub.id, status: 'replied' })}
                                >
                                  <ReplyIcon />
                                </IconButton>
                              )}
                              <IconButton
                                size="small"
                                onClick={() => {
                                  if (window.confirm('Удалить отправку?')) {
                                    deleteSubmissionMut.mutate({ formId: selectedFormId!, submissionId: sub.id });
                                  }
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                        {submissions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              <Typography color="textSecondary">Нет отправок</Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {selectedTab === 'abandonments' && (
                <Box>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Начато</TableCell>
                          <TableCell>Брошено</TableCell>
                          <TableCell>Данные</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {abandonments.map((ab) => (
                          <TableRow key={ab.id}>
                            <TableCell>{formatDate(ab.started_at)}</TableCell>
                            <TableCell>{formatDate(ab.abandoned_at)}</TableCell>
                            <TableCell>
                              <Box>
                                {Object.entries(ab.form_data).slice(0, 2).map(([key, val]) => (
                                  <Typography key={key} variant="body2">
                                    <strong>{key}:</strong> {String(val)}
                                  </Typography>
                                ))}
                                {Object.keys(ab.form_data).length > 2 && (
                                  <Typography variant="body2" color="textSecondary">
                                    ...ещё {Object.keys(ab.form_data).length - 2}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                        {abandonments.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              <Typography color="textSecondary">Нет брошенных форм</Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Paper>
          ) : (
            <Paper sx={{ p: 3 }}>
              <Typography color="textSecondary">Выберите форму из списка</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Submission Detail Dialog */}
      <Dialog open={!!selectedSubmission} onClose={() => setSelectedSubmission(null)} maxWidth="md" fullWidth>
        <DialogTitle>Детали отправки</DialogTitle>
        <DialogContent>
          {selectedSubmission && (
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Данные формы</Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {Object.entries(selectedSubmission.form_data).map(([key, val]) => (
                      <TableRow key={key}>
                        <TableCell><strong>{key}</strong></TableCell>
                        <TableCell>{String(val)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Метаданные</Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>Статус</strong></TableCell>
                      <TableCell>
                        <Chip label={getStatusLabel(selectedSubmission.status)} color={getStatusColor(selectedSubmission.status) as any} size="small" />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Дата отправки</strong></TableCell>
                      <TableCell>{formatDate(selectedSubmission.submitted_at)}</TableCell>
                    </TableRow>
                    {selectedSubmission.ip_address && (
                      <TableRow>
                        <TableCell><strong>IP адрес</strong></TableCell>
                        <TableCell>{selectedSubmission.ip_address}</TableCell>
                      </TableRow>
                    )}
                    {selectedSubmission.referrer && (
                      <TableRow>
                        <TableCell><strong>Referrer</strong></TableCell>
                        <TableCell>{selectedSubmission.referrer}</TableCell>
                      </TableRow>
                    )}
                    {selectedSubmission.user_agent && (
                      <TableRow>
                        <TableCell><strong>User Agent</strong></TableCell>
                        <TableCell>{selectedSubmission.user_agent}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedSubmission(null)}>Закрыть</Button>
          {selectedSubmission && (
            <>
              {selectedSubmission.status !== 'read' && (
                <Button
                  onClick={() => {
                    updateStatusMut.mutate({ formId: selectedSubmission.form_id, submissionId: selectedSubmission.id, status: 'read' });
                    setSelectedSubmission(null);
                  }}
                >
                  Прочитана
                </Button>
              )}
              {selectedSubmission.status !== 'replied' && (
                <Button
                  onClick={() => {
                    updateStatusMut.mutate({ formId: selectedSubmission.form_id, submissionId: selectedSubmission.id, status: 'replied' });
                    setSelectedSubmission(null);
                  }}
                >
                  Отвечена
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}


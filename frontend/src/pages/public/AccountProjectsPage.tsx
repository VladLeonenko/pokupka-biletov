import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  TextField,
  Alert,
  Container,
  Avatar,
  Divider,
  IconButton,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMyProjects,
  estimateChangeRequest,
  getProjectUpsellOffers,
  acceptUpsellOffer,
  declineUpsellOffer,
  confirmChangeRequest,
  createFunnelForProject,
  getProjectComments,
  createProjectComment,
  type ClientProject,
  type UpsellOffer,
  type ProjectComment,
} from '@/services/projectsApi';
import { useAuth } from '@/auth/AuthProvider';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { useToast } from '@/components/common/ToastProvider';

export function AccountProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<number | ''>('');
  const [changeType, setChangeType] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [upsellDialogOpen, setUpsellDialogOpen] = useState(false);
  const [upsellOffers, setUpsellOffers] = useState<UpsellOffer[]>([]);
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);
  const [projectComments, setProjectComments] = useState<Record<number, ProjectComment[]>>({});
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<number, boolean>>({});

  const queryClient = useQueryClient();
  
  const { data: projects = [], isLoading, error } = useQuery<ClientProject[]>({
    queryKey: ['clientProjects'],
    queryFn: getMyProjects,
    staleTime: 0, // Всегда считать данные устаревшими, чтобы получать актуальные данные
    cacheTime: 0, // Не кешировать данные
  });

  // Автоматически создаем воронки для проектов без deal_id (только один раз при загрузке)
  const createFunnelMut = useMutation({
    mutationFn: createFunnelForProject,
    onError: (err: any) => {
      console.error('Failed to create funnel:', err);
    },
    onSuccess: () => {
      // Перезагружаем проекты после создания воронки
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
  });

  useEffect(() => {
    if (projects && projects.length > 0) {
      const projectsWithoutFunnel = projects.filter((p) => !p.dealId);
      projectsWithoutFunnel.forEach((project) => {
        createFunnelMut.mutate(project.id);
      });
    }
  }, [projects]);

  const estimateMut = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId) throw new Error('Не выбран проект');
      return estimateChangeRequest(selectedProjectId, {
        stageId: selectedStageId ? Number(selectedStageId) : undefined,
        changeType,
        priority,
      });
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка расчёта change request', 'error');
    },
  });

  const confirmChangeMut = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId) throw new Error('Не выбран проект');
      return confirmChangeRequest(selectedProjectId, {
        stageId: selectedStageId ? Number(selectedStageId) : undefined,
        changeType,
        priority,
      });
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка подтверждения change request', 'error');
    },
    onSuccess: () => {
      showToast('Запрос на изменение подтверждён. Менеджер получит задачу на доработку.', 'success');
    },
  });

  const upsellMut = useMutation({
    mutationFn: async (projectId: number) => {
      const offers = await getProjectUpsellOffers(projectId, { status: 'suggested' });
      setUpsellOffers(offers);
      return offers;
    },
    onError: (err: any) => {
      showToast(err?.message || 'Не удалось загрузить улучшения проекта', 'error');
    },
    onSuccess: (offers) => {
      if (offers && offers.length > 0) {
        setUpsellDialogOpen(true);
      }
    },
  });

  const acceptUpsellMut = useMutation({
    mutationFn: async ({ projectId, offerId }: { projectId: number; offerId: number }) => {
      const updated = await acceptUpsellOffer(projectId, offerId);
      return updated;
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка при подтверждении улучшения', 'error');
    },
    onSuccess: (offer) => {
      setUpsellOffers((prev) => prev.filter((o) => o.id !== offer.id));
      showToast('Улучшение проекта подтверждено, менеджер свяжется с вами', 'success');
    },
  });

  const declineUpsellMut = useMutation({
    mutationFn: async ({ projectId, offerId }: { projectId: number; offerId: number }) => {
      const updated = await declineUpsellOffer(projectId, offerId);
      return updated;
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка при отклонении улучшения', 'error');
    },
    onSuccess: (offer) => {
      setUpsellOffers((prev) => prev.filter((o) => o.id !== offer.id));
      showToast('Улучшение отложено/отклонено', 'info');
    },
  });

  const createCommentMut = useMutation({
    mutationFn: async ({ projectId, comment, stageId, taskId }: { projectId: number; comment: string; stageId?: number; taskId?: number }) => {
      return createProjectComment(projectId, comment, stageId, taskId);
    },
    onSuccess: (newComment, variables) => {
      setProjectComments((prev) => ({
        ...prev,
        [variables.projectId]: [...(prev[variables.projectId] || []), newComment],
      }));
      setCommentTexts((prev) => {
        const key = `${variables.projectId}-${variables.stageId || 'project'}-${variables.taskId || ''}`;
        const { [key]: _, ...rest } = prev;
        return rest;
      });
      showToast('Комментарий добавлен', 'success');
    },
    onError: (err: any) => {
      showToast(err?.message || 'Не удалось добавить комментарий', 'error');
    },
  });

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Проверка пользователя после всех хуков (для соблюдения правил React Hooks)
  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Войдите, чтобы просмотреть проекты</Typography>
          <Button variant="contained" onClick={() => navigate('/admin/login')}>
            Войти
          </Button>
        </Box>
      </Container>
    );
  }

  const handleEstimate = () => {
    if (!selectedProjectId) {
      showToast('Выберите проект', 'warning');
      return;
    }
    if (!changeType.trim()) {
      showToast('Опишите, что нужно изменить', 'warning');
      return;
    }
    estimateMut.mutate();
  };

  const handleOpenUpsellForProject = (projectId: number) => {
    upsellMut.mutate(projectId);
  };

  const loadProjectComments = async (projectId: number) => {
    if (loadingComments[projectId] || projectComments[projectId]) return;
    
    setLoadingComments((prev) => ({ ...prev, [projectId]: true }));
    try {
      const comments = await getProjectComments(projectId);
      setProjectComments((prev) => ({ ...prev, [projectId]: comments }));
    } catch (err: any) {
      showToast(err?.message || 'Не удалось загрузить комментарии', 'error');
    } finally {
      setLoadingComments((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  const handleToggleProject = (projectId: number) => {
    if (expandedProjectId === projectId) {
      setExpandedProjectId(null);
    } else {
      setExpandedProjectId(projectId);
      loadProjectComments(projectId);
    }
  };

  const handleSendComment = (projectId: number, stageId?: number, taskId?: number) => {
    const key = `${projectId}-${stageId || 'project'}-${taskId || ''}`;
    const comment = commentTexts[key]?.trim();
    if (!comment) {
      showToast('Введите комментарий', 'warning');
      return;
    }
    createCommentMut.mutate({ projectId, comment, stageId, taskId });
  };

  return (
    <>
      <style>{`
        .css-hg96mf {
          background: none !important;
          background-color: transparent !important;
        }
      `}</style>
      <SeoMetaTags
        title="Мои проекты - Primecoder"
        description="Прогресс проектов и запросы на изменения"
        url={currentUrl}
      />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Мои проекты
        </Typography>

        {isLoading && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
          </Box>
        )}

        {error && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="error">Не удалось загрузить проекты</Alert>
          </Box>
        )}

        {!isLoading && projects.length === 0 && (
          <Alert severity="info">У вас пока нет активных проектов</Alert>
        )}

        {projects.length > 0 && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {projects.map((p) => (
              <Grid item xs={12} md={12} key={p.id}>
                <Card sx={{ bgcolor: '#ffffff' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6">{p.title}</Typography>
                      <Chip
                        label={p.status}
                        size="small"
                        color={p.status === 'completed' ? 'success' : 'default'}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Прогресс: {p.progressPercent}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={p.progressPercent}
                      sx={{ mb: 2 }}
                    />
                    {p.deadline && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Дедлайн: {new Date(p.deadline).toLocaleDateString('ru-RU')}
                      </Typography>
                    )}
                    {p.budgetTotalCents != null && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Бюджет: {(p.budgetTotalCents / 100).toLocaleString('ru-RU')} ₽ /{' '}
                        {p.budgetUsedCents != null ? (p.budgetUsedCents / 100).toLocaleString('ru-RU') : '0'} ₽
                      </Typography>
                    )}

                    {p.stages && p.stages.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                          Этапы проекта:
                        </Typography>
                        {p.stages.map((s, idx) => {
                          const isCompleted = s.status === 'done';
                          const isInProgress = s.status === 'in_progress';
                          const isPending = s.status === 'pending';
                          
                          return (
                            <Box
                              key={s.id}
                              sx={{
                                mb: 2,
                                p: 1.5,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: isCompleted ? 'success.main' : isInProgress ? 'primary.main' : 'grey.300',
                                bgcolor: isCompleted ? 'success.light' : isInProgress ? 'primary.light' : 'grey.50',
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 600,
                                      textDecoration: isCompleted ? 'line-through' : 'none',
                                      color: isCompleted ? 'text.secondary' : 'text.primary',
                                    }}
                                  >
                                    {idx + 1}. {s.name}
                                  </Typography>
                                  <Chip
                                    label={
                                      isCompleted
                                        ? 'Выполнено'
                                        : isInProgress
                                        ? 'В работе'
                                        : 'Ожидает'
                                    }
                                    size="small"
                                    color={isCompleted ? 'success' : isInProgress ? 'primary' : 'default'}
                                  />
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                                  {s.progressPercent}%
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={s.progressPercent}
                                sx={{
                                  height: 8,
                                  borderRadius: 4,
                                  mb: 1,
                                  bgcolor: isCompleted ? 'success.dark' : isInProgress ? 'primary.dark' : 'grey.300',
                                }}
                              />
                              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                                {s.plannedHours && (
                                  <Typography variant="caption" color="text.secondary">
                                    Запланировано: {s.plannedHours} ч
                                  </Typography>
                                )}
                                {s.spentHours && (
                                  <Typography variant="caption" color="text.secondary">
                                    Затрачено: {s.spentHours} ч
                                  </Typography>
                                )}
                                {s.budgetPlannedCents && (
                                  <Typography variant="caption" color="text.secondary">
                                    Бюджет: {(s.budgetPlannedCents / 100).toLocaleString('ru-RU')} ₽
                                  </Typography>
                                )}
                                {s.budgetSpentCents && (
                                  <Typography variant="caption" color="text.secondary">
                                    Потрачено: {(s.budgetSpentCents / 100).toLocaleString('ru-RU')} ₽
                                  </Typography>
                                )}
                              </Box>

                              {s.upsellOffers && s.upsellOffers.length > 0 && (
                                <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                                    💡 Предложения по улучшению этапа:
                                  </Typography>
                                  {s.upsellOffers.map((offer) => (
                                    <Box
                                      key={offer.id}
                                      sx={{
                                        p: 1,
                                        mb: 1,
                                        borderRadius: 1,
                                        bgcolor: 'warning.light',
                                        border: '1px solid',
                                        borderColor: 'warning.main',
                                      }}
                                    >
                                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                                        {offer.title}
                                      </Typography>
                                      {offer.description && (
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                          {offer.description}
                                        </Typography>
                                      )}
                                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.dark' }}>
                                        +{(offer.priceCents / 100).toLocaleString('ru-RU')} ₽
                                      </Typography>
                                    </Box>
                                  ))}
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    )}

                    {p.tasks && p.tasks.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          Задачи проекта:
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {p.tasks.map((task) => (
                            <Box
                              key={task.id}
                              sx={{
                                p: 1,
                                borderRadius: 1,
                                bgcolor: task.status === 'completed' ? 'success.light' : 'grey.100',
                                border: '1px solid',
                                borderColor: task.status === 'completed' ? 'success.main' : 'grey.300',
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 500,
                                    textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                                    color: task.status === 'completed' ? 'text.secondary' : 'text.primary',
                                  }}
                                >
                                  {task.title}
                                </Typography>
                                <Chip
                                  label={
                                    task.status === 'completed'
                                      ? 'Выполнено'
                                      : task.status === 'in_progress'
                                      ? 'В работе'
                                      : task.status === 'new'
                                      ? 'Новая'
                                      : task.status
                                  }
                                  size="small"
                                  color={
                                    task.status === 'completed'
                                      ? 'success'
                                      : task.status === 'in_progress'
                                      ? 'primary'
                                      : 'default'
                                  }
                                  sx={{ ml: 1 }}
                                />
                              </Box>
                              {task.description && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                  {task.description}
                                </Typography>
                              )}
                              {task.assignedToName && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                  Исполнитель: {task.assignedToName}
                                </Typography>
                              )}
                              {task.dueDate && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                  Срок: {new Date(task.dueDate).toLocaleDateString('ru-RU')}
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        variant={selectedProjectId === p.id ? 'contained' : 'outlined'}
                        onClick={() => {
                          setSelectedProjectId(p.id);
                          setSelectedStageId('');
                        }}
                      >
                        Изменения по проекту
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleOpenUpsellForProject(p.id)}
                      >
                        Улучшить проект
                      </Button>
                      <Button
                        size="small"
                        variant={expandedProjectId === p.id ? 'contained' : 'outlined'}
                        startIcon={<ChatBubbleOutlineIcon />}
                        onClick={() => handleToggleProject(p.id)}
                      >
                        Комментарии
                      </Button>
                    </Box>

                    {expandedProjectId === p.id && (
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                          Комментарии к проекту:
                        </Typography>
                        
                        {loadingComments[p.id] && (
                          <Box sx={{ textAlign: 'center', py: 2 }}>
                            <LinearProgress />
                          </Box>
                        )}

                        {(projectComments[p.id] || []).length === 0 && !loadingComments[p.id] && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Пока нет комментариев. Задайте вопрос или уточните детали!
                          </Typography>
                        )}

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                          {(projectComments[p.id] || []).map((comment) => (
                            <Box
                              key={comment.id}
                              sx={{
                                p: 1.5,
                                borderRadius: 1,
                                bgcolor: comment.createdByClient ? 'primary.light' : 'grey.100',
                                border: '1px solid',
                                borderColor: comment.createdByClient ? 'primary.main' : 'grey.300',
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                  {(comment.createdByName || comment.createdByEmail || '?')[0].toUpperCase()}
                                </Avatar>
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                  {comment.createdByName || comment.createdByEmail || 'Неизвестно'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(comment.createdAt).toLocaleString('ru-RU')}
                                </Typography>
                              </Box>
                              <Typography variant="body2">{comment.comment}</Typography>
                            </Box>
                          ))}
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Задайте вопрос или уточните детали..."
                            multiline
                            maxRows={4}
                            value={commentTexts[`${p.id}-project-`] || ''}
                            onChange={(e) =>
                              setCommentTexts((prev) => ({
                                ...prev,
                                [`${p.id}-project-`]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                handleSendComment(p.id);
                              }
                            }}
                          />
                          <IconButton
                            color="primary"
                            onClick={() => handleSendComment(p.id)}
                            disabled={createCommentMut.isPending}
                          >
                            <SendIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {selectedProjectId && (
          <Card sx={{ bgcolor: '#ffffff' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Запрос на изменение (Change Request)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Этап</InputLabel>
                    <Select
                      label="Этап"
                      value={selectedStageId}
                      onChange={(e) => setSelectedStageId(e.target.value as any)}
                    >
                      <MenuItem value="">Любой этап</MenuItem>
                      {projects
                        .find((p) => p.id === selectedProjectId)
                        ?.stages.map((s) => (
                          <MenuItem key={s.id} value={s.id}>
                            {s.name}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Приоритет</InputLabel>
                    <Select
                      label="Приоритет"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                    >
                      <MenuItem value="low">Низкий</MenuItem>
                      <MenuItem value="medium">Средний</MenuItem>
                      <MenuItem value="high">Высокий</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Что нужно изменить (текст/цвет/функционал и т.п.)"
                    value={changeType}
                    onChange={(e) => setChangeType(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      onClick={handleEstimate}
                      disabled={estimateMut.isPending}
                    >
                      {estimateMut.isPending ? 'Считаем...' : 'Рассчитать стоимость изменения'}
                    </Button>
                    {estimateMut.data && (
                      <Button
                        variant="outlined"
                        color="success"
                        onClick={() => confirmChangeMut.mutate()}
                        disabled={confirmChangeMut.isPending}
                      >
                        {confirmChangeMut.isPending
                          ? 'Подтверждаем...'
                          : `Одобрить за ${(estimateMut.data.finalPriceCents / 100).toLocaleString('ru-RU')} ₽`}
                      </Button>
                    )}
                  </Box>
                </Grid>
              </Grid>

              {estimateMut.data && (
                <Box sx={{ mt: 3 }}>
                  <Alert severity="info">
                    {estimateMut.data.message}
                  </Alert>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Модуль улучшения проекта / upsell поп-ап */}
        {upsellDialogOpen && upsellOffers.length > 0 && (
          <Card sx={{ mt: 4, bgcolor: '#ffffff' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Улучшения проекта
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Мы подобрали несколько вариантов улучшения вашего проекта. Выберите то, что хотите добавить.
              </Typography>
              <Grid container spacing={2}>
                {upsellOffers.map((offer) => (
                  <Grid item xs={12} md={6} key={offer.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>
                          {offer.title}
                        </Typography>
                        {offer.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {offer.description}
                          </Typography>
                        )}
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Специалист: {offer.specialistType}, сложность: {offer.complexity}, срочность: {offer.urgency}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Объём: ~{offer.hours} ч, ставка: {(offer.ratePerHourCents / 100).toLocaleString('ru-RU')} ₽/ч
                        </Typography>
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>
                          Стоимость: {(offer.priceCents / 100).toLocaleString('ru-RU')} ₽
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            disabled={acceptUpsellMut.isPending}
                            onClick={() =>
                              acceptUpsellMut.mutate({ projectId: offer.projectId, offerId: offer.id })
                            }
                          >
                            Одобрить
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={declineUpsellMut.isPending}
                            onClick={() =>
                              declineUpsellMut.mutate({ projectId: offer.projectId, offerId: offer.id })
                            }
                          >
                            Отложить
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Box sx={{ mt: 2 }}>
                <Button
                  size="small"
                  onClick={() => {
                    setUpsellDialogOpen(false);
                    setUpsellOffers([]);
                  }}
                >
                  Закрыть
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}
      </Container>
    </>
  );
}



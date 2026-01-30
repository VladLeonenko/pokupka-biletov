import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Paper, Typography, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, Grid, Card, CardContent, Switch, FormControlLabel, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Link } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { getFunnel, listDeals, upsertDeal, deleteDeal, upsertFunnelStage, deleteFunnelStage, reorderFunnelStages, listPayments, listDocuments, listTasks, upsertTask, listProducts, applyTaskTemplateToDeal } from '@/services/cmsApi';
import { PaymentsSection } from './PaymentsSection';
import { DocumentsSection } from './DocumentsSection';
import { Deal, FunnelStage, Payment, DealDocument } from '@/types/cms';
import { useToast } from '@/components/common/ToastProvider';

export function FunnelViewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const funnelId = parseInt(id, 10);
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [dragOverStage, setDragOverStage] = useState<number | null>(null);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<FunnelStage | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<any> | null>(null);
  const [selectedDealForTask, setSelectedDealForTask] = useState<Deal | null>(null);

  const { data: funnel, isLoading: funnelLoading, error: funnelError } = useQuery({
    queryKey: ['funnel', funnelId],
    queryFn: () => getFunnel(funnelId),
    enabled: !isNaN(funnelId) && funnelId > 0,
  });

  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['funnel', funnelId, 'deals'],
    queryFn: () => listDeals(funnelId),
    enabled: !isNaN(funnelId) && funnelId > 0,
  });

  // Получаем задачи для всех сделок в воронке
  const dealIds = deals.map(d => d.id).filter(Boolean) as number[];
  const { data: allTasks = [] } = useQuery({
    queryKey: ['funnel', funnelId, 'tasks'],
    queryFn: () => Promise.all(dealIds.map(id => listTasks({ dealId: id }))).then(results => results.flat()),
    enabled: !isNaN(funnelId) && funnelId > 0 && dealIds.length > 0,
  });

  // Получаем список услуг для выбора
  const { data: products = [] } = useQuery({
    queryKey: ['products', 'active'],
    queryFn: () => listProducts(true),
  });

  // Группируем задачи по deal_id
  const tasksByDeal = useMemo(() => {
    const grouped: Record<number, any[]> = {};
    allTasks.forEach(task => {
      if (task.dealId) {
        if (!grouped[task.dealId]) grouped[task.dealId] = [];
        grouped[task.dealId].push(task);
      }
    });
    return grouped;
  }, [allTasks]);

  // Group deals by stage and calculate statistics
  const { dealsByStage, stageStats, funnelConversion } = useMemo(() => {
    const grouped: Record<number, Deal[]> = {};
    const stats: Record<number, { totalAmount: number; count: number; avgTime: number }> = {};
    
    funnel?.stages.forEach((s) => {
      grouped[s.id] = [];
      stats[s.id] = { totalAmount: 0, count: 0, avgTime: 0 };
    });
    
    deals.forEach((d) => {
      if (!grouped[d.stageId]) {
        grouped[d.stageId] = [];
        stats[d.stageId] = { totalAmount: 0, count: 0, avgTime: 0 };
      }
      grouped[d.stageId].push(d);
      
      // Calculate stats
      if (d.budget) {
        stats[d.stageId].totalAmount += d.budget || 0;
      }
      stats[d.stageId].count++;
      
      // Calculate time on stage (if movedAt exists, use it; otherwise use createdAt)
      let daysOnStage = 0;
      if (d.movedAt) {
        const movedDate = new Date(d.movedAt);
        const now = new Date();
        daysOnStage = (now.getTime() - movedDate.getTime()) / (1000 * 60 * 60 * 24);
      } else if (d.createdAt) {
        const createdDate = new Date(d.createdAt);
        const now = new Date();
        daysOnStage = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      }
      if (daysOnStage > 0) {
        stats[d.stageId].avgTime += daysOnStage;
      }
    });
    
    // Calculate average time per stage
    Object.keys(stats).forEach((stageIdStr) => {
      const stageId = parseInt(stageIdStr, 10);
      if (stats[stageId].count > 0 && stats[stageId].avgTime > 0) {
        stats[stageId].avgTime = stats[stageId].avgTime / stats[stageId].count;
      }
    });
    
    // Calculate funnel conversion (won deals / total deals * 100)
    const totalDeals = deals.length;
    const wonDeals = deals.filter(d => d.isWon).length;
    const conversion = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;
    
    return { dealsByStage: grouped, stageStats: stats, funnelConversion: conversion };
  }, [deals, funnel]);

  const mutation = useMutation({
    mutationFn: (deal: Partial<Deal>) => upsertDeal(funnelId, deal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel', funnelId] });
      queryClient.invalidateQueries({ queryKey: ['funnel', funnelId, 'deals'] });
      showToast('Сделка сохранена', 'success');
      setDealDialogOpen(false);
      resetDealForm();
    },
    onError: (err: any) => {
      console.error('Error saving deal:', err);
      showToast(err?.message || 'Ошибка при сохранении сделки', 'error');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (dealId: number) => deleteDeal(funnelId, dealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel', funnelId] });
      queryClient.invalidateQueries({ queryKey: ['funnel', funnelId, 'deals'] });
      showToast('Сделка удалена', 'success');
    },
    onError: (err: any) => {
      console.error('Error deleting deal:', err);
      showToast(err?.message || 'Ошибка при удалении сделки', 'error');
    },
  });

  const applyTemplateMut = useMutation({
    mutationFn: ({ dealId, productSlug, productTitle }: { dealId: number; productSlug: string; productTitle?: string }) =>
      applyTaskTemplateToDeal(funnelId, dealId, productSlug, productTitle),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['funnel', funnelId, 'tasks'] });
      showToast(`Создано ${data.tasksCreated} задач из шаблона`, 'success');
    },
    onError: (err: any) => {
      console.error('Error applying template:', err);
      showToast(err?.message || 'Ошибка при применении шаблона', 'error');
    },
  });

  const taskMutation = useMutation({
    mutationFn: (task: Partial<any>) => upsertTask(task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel', funnelId, 'tasks'] });
      showToast('Задача сохранена', 'success');
      setTaskDialogOpen(false);
      setEditingTask(null);
      setSelectedDealForTask(null);
    },
    onError: (err: any) => {
      console.error('Error saving task:', err);
      showToast(err?.message || 'Ошибка при сохранении задачи', 'error');
    },
  });

  const moveDealMut = useMutation({
    mutationFn: ({ dealId, newStageId }: { dealId: number; newStageId: number }) => {
      const deal = deals.find(d => d.id === dealId);
      if (!deal) throw new Error('Deal not found');
      return upsertDeal(funnelId, { ...deal, stageId: newStageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel', funnelId] });
      queryClient.invalidateQueries({ queryKey: ['funnel', funnelId, 'deals'] });
      showToast('Сделка перемещена', 'success');
      setDraggedDeal(null);
      setDragOverStage(null);
    },
    onError: (err: any) => {
      console.error('Error moving deal:', err);
      showToast(err?.message || 'Ошибка при перемещении сделки', 'error');
      setDraggedDeal(null);
      setDragOverStage(null);
    },
  });

  const handleDragStart = (deal: Deal) => {
    setDraggedDeal(deal);
  };

  const handleDragEnd = () => {
    setDraggedDeal(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stageId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, targetStageId: number) => {
    e.preventDefault();
    if (!draggedDeal) return;
    
    if (draggedDeal.stageId === targetStageId) {
      setDraggedDeal(null);
      setDragOverStage(null);
      return;
    }

    moveDealMut.mutate({ dealId: draggedDeal.id, newStageId: targetStageId });
  };

  const resetDealForm = () => {
    setEditingDeal(null);
  };

  const handleOpenStageDialog = (stage?: FunnelStage) => {
    if (stage) {
      setEditingStage(stage);
    } else {
      // Create new stage - get max sortOrder
      const maxSortOrder = funnel?.stages.reduce((max, s) => Math.max(max, s.sortOrder || 0), 0) || 0;
      setEditingStage({
        id: 0,
        funnelId,
        name: '',
        color: '#1976d2',
        sortOrder: maxSortOrder + 1,
        probability: 0,
      } as FunnelStage);
    }
    setStageDialogOpen(true);
  };

  const stageMutation = useMutation({
    mutationFn: (stage: Partial<FunnelStage>) => upsertFunnelStage(funnelId, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel', funnelId] });
      showToast('Этап сохранен', 'success');
      setStageDialogOpen(false);
      setEditingStage(null);
    },
    onError: (err: any) => {
      console.error('Error saving stage:', err);
      showToast(err?.message || 'Ошибка при сохранении этапа', 'error');
    },
  });

  const deleteStageMut = useMutation({
    mutationFn: (stageId: number) => deleteFunnelStage(funnelId, stageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel', funnelId] });
      showToast('Этап удален', 'success');
    },
    onError: (err: any) => {
      console.error('Error deleting stage:', err);
      showToast(err?.message || 'Ошибка при удалении этапа', 'error');
    },
  });

  const handleOpenDealDialog = (deal?: Deal) => {
    if (deal) {
      setEditingDeal(deal);
    } else {
      // Create new deal - ensure stageId is valid
      if (!funnel || !funnel.stages || funnel.stages.length === 0) {
        showToast('Невозможно создать сделку: воронка не имеет этапов. Добавьте этапы в воронку.', 'error');
        return;
      }
      const firstStageId = funnel.stages[0].id;
      if (!firstStageId) {
        showToast('Невозможно создать сделку: воронка не имеет этапов. Добавьте этапы в воронку.', 'error');
        return;
      }
      setEditingDeal({
        id: 0,
        funnelId,
        stageId: firstStageId,
        title: '',
        isWon: false,
        isLost: false,
      } as Deal);
    }
    setDealDialogOpen(true);
  };


  const formatCurrency = (amount?: number, currency = 'RUB') => {
    if (!amount) return '';
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(amount);
  };

  if (isNaN(funnelId) || funnelId <= 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5">Неверный ID воронки</Typography>
        <Button onClick={() => navigate('/admin/funnels')} sx={{ mt: 2 }}>
          Вернуться к списку воронок
        </Button>
      </Box>
    );
  }

  if (funnelLoading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>Загрузка...</Typography>
      </Box>
    );
  }

  if (funnelError) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error">Ошибка загрузки воронки</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {funnelError instanceof Error ? funnelError.message : 'Неизвестная ошибка'}
        </Typography>
        <Button onClick={() => navigate('/admin/funnels')} sx={{ mt: 2 }}>
          Вернуться к списку воронок
        </Button>
      </Box>
    );
  }

  if (!funnel) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5">Воронка не найдена</Typography>
        <Button onClick={() => navigate('/admin/funnels')} sx={{ mt: 2 }}>
          Вернуться к списку воронок
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">{funnel.name}</Typography>
          {funnel.description && (
            <Typography variant="body2" color="text.secondary">
              {funnel.description}
            </Typography>
          )}
          <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
            Конверсия: <strong>{funnelConversion.toFixed(1)}%</strong> ({deals.filter(d => d.isWon).length} из {deals.length} сделок)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => handleOpenStageDialog()}>
            Добавить этап
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDealDialog()}>
            Создать сделку
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
        {funnel.stages.map((stage) => (
          <Paper
            key={stage.id}
            sx={{
              minWidth: 300,
              maxWidth: 300,
              p: 2,
              bgcolor: stage.color + '10',
              border: `2px solid ${stage.color}`,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ color: stage.color }}>
                    {stage.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenStageDialog(stage)}
                    sx={{ p: 0.5 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      if (window.confirm(`Удалить этап "${stage.name}"? Все сделки на этом этапе будут перемещены.`)) {
                        deleteStageMut.mutate(stage.id);
                      }
                    }}
                    sx={{ p: 0.5 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Вероятность: {stage.probability}%
                </Typography>
              </Box>
            </Box>
            <Box sx={{ mb: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Сделок: <strong>{stageStats[stage.id]?.count || 0}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Сумма: <strong>{formatCurrency(stageStats[stage.id]?.totalAmount || 0)}</strong>
              </Typography>
              {stageStats[stage.id]?.avgTime > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Ср. время на этапе: <strong>{stageStats[stage.id].avgTime.toFixed(1)} дн.</strong>
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                minHeight: 100,
                bgcolor: dragOverStage === stage.id ? (stage.color + '20') : 'transparent',
                borderRadius: dragOverStage === stage.id ? 2 : 0,
                transition: 'background-color 0.2s, border 0.2s',
                border: dragOverStage === stage.id ? `2px dashed ${stage.color}` : '2px dashed transparent',
              }}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {dealsByStage[stage.id]?.map((deal) => (
                <Card
                  key={deal.id}
                  draggable
                  onDragStart={() => handleDragStart(deal)}
                  onDragEnd={handleDragEnd}
                  sx={{
                    mb: 1,
                    bgcolor: deal.isWon ? 'success.light' : deal.isLost ? 'error.light' : 'background.paper',
                    cursor: draggedDeal?.id === deal.id ? 'grabbing' : 'grab',
                    opacity: draggedDeal?.id === deal.id ? 0.5 : 1,
                    '&:hover': { boxShadow: 3 },
                    userSelect: 'none',
                  }}
                  onClick={(e) => {
                    // Don't open dialog if dragging
                    if (!draggedDeal || draggedDeal.id !== deal.id) {
                      handleOpenDealDialog(deal);
                    }
                  }}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {deal.title}
                    </Typography>
                    {deal.clientName && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {deal.clientName}
                      </Typography>
                    )}
                    {deal.budget && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {formatCurrency(deal.budget, deal.currency)}
                      </Typography>
                    )}
                    {tasksByDeal[deal.id] && tasksByDeal[deal.id].length > 0 && (
                      <Box sx={{ mt: 1, mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Задач: {tasksByDeal[deal.id].length}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }} onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedDealForTask(deal);
                          setEditingTask({ dealId: deal.id, status: 'new', priority: 'medium' });
                          setTaskDialogOpen(true);
                        }}
                        title="Добавить задачу"
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDealDialog(deal)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (window.confirm('Удалить сделку?')) {
                            deleteMut.mutate(deal.id);
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
              {(!dealsByStage[stage.id] || dealsByStage[stage.id].length === 0) && (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <Typography variant="caption">Нет сделок</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Deal Dialog */}
      <Dialog open={dealDialogOpen} onClose={() => setDealDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingDeal?.id ? 'Редактировать сделку' : 'Создать сделку'}</DialogTitle>
        <DialogContent>
          <DealForm
            deal={editingDeal}
            stages={funnel.stages}
            products={products}
            funnelId={funnelId}
            onChange={(deal) => setEditingDeal(deal as Deal)}
            onApplyTemplate={(dealId, productSlug, productTitle) => {
              applyTemplateMut.mutate({ dealId, productSlug, productTitle });
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDealDialogOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!editingDeal) return;
              if (!editingDeal.title?.trim()) {
                showToast('Заполните название сделки', 'warning');
                return;
              }
              mutation.mutate(editingDeal);
            }}
            disabled={!editingDeal?.title?.trim() || mutation.isPending}
          >
            {mutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stage Dialog */}
      <Dialog open={stageDialogOpen} onClose={() => setStageDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingStage?.id ? 'Редактировать этап' : 'Добавить этап'}
          <IconButton
            aria-label="close"
            onClick={() => setStageDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {editingStage && (
            <StageForm
              stage={editingStage}
              onChange={(stage) => setEditingStage(stage as FunnelStage)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStageDialogOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!editingStage) return;
              if (!editingStage.name?.trim()) {
                showToast('Заполните название этапа', 'warning');
                return;
              }
              stageMutation.mutate(editingStage);
            }}
            disabled={!editingStage?.name?.trim() || stageMutation.isPending}
          >
            {stageMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTask?.id ? 'Редактировать задачу' : 'Добавить задачу'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Название задачи"
              value={editingTask?.title || ''}
              onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Описание"
              multiline
              rows={3}
              value={editingTask?.description || ''}
              onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Приоритет</InputLabel>
              <Select
                value={editingTask?.priority || 'medium'}
                label="Приоритет"
                onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
              >
                <MenuItem value="low">Низкий</MenuItem>
                <MenuItem value="medium">Средний</MenuItem>
                <MenuItem value="high">Высокий</MenuItem>
                <MenuItem value="urgent">Срочный</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Статус</InputLabel>
              <Select
                value={editingTask?.status || 'new'}
                label="Статус"
                onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
              >
                <MenuItem value="new">Новая</MenuItem>
                <MenuItem value="in_progress">В работе</MenuItem>
                <MenuItem value="completed">Выполнена</MenuItem>
                <MenuItem value="cancelled">Отменена</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="datetime-local"
              label="Срок выполнения"
              value={editingTask?.dueDate ? new Date(editingTask.dueDate).toISOString().slice(0, 16) : ''}
              onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskDialogOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!editingTask?.title?.trim()) {
                showToast('Заполните название задачи', 'warning');
                return;
              }
              taskMutation.mutate(editingTask);
            }}
            disabled={!editingTask?.title?.trim() || taskMutation.isPending}
          >
            {taskMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function StageForm({ stage, onChange }: { stage: FunnelStage; onChange: (stage: Partial<FunnelStage>) => void }) {
  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Название этапа"
          value={stage.name || ''}
          onChange={(e) => onChange({ ...stage, name: e.target.value })}
          required
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Цвет (hex)"
          value={stage.color || '#1976d2'}
          onChange={(e) => onChange({ ...stage, color: e.target.value })}
          InputProps={{
            startAdornment: (
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '4px',
                  bgcolor: stage.color || '#1976d2',
                  mr: 1,
                  border: '1px solid #ccc',
                }}
              />
            ),
          }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Вероятность (%)"
          type="number"
          value={stage.probability || 0}
          onChange={(e) => onChange({ ...stage, probability: parseInt(e.target.value) || 0 })}
          inputProps={{ min: 0, max: 100 }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Порядок сортировки"
          type="number"
          value={stage.sortOrder || 0}
          onChange={(e) => onChange({ ...stage, sortOrder: parseInt(e.target.value) || 0 })}
          inputProps={{ min: 0 }}
        />
      </Grid>
    </Grid>
  );
}

function DealForm({ 
  deal, 
  stages, 
  products, 
  funnelId,
  onChange, 
  onApplyTemplate 
}: { 
  deal: Deal | null; 
  stages: FunnelStage[]; 
  products: any[];
  funnelId: number;
  onChange: (deal: Partial<Deal>) => void;
  onApplyTemplate?: (dealId: number, productSlug: string, productTitle?: string) => void;
}) {
  const [selectedProductSlug, setSelectedProductSlug] = useState<string>('');

  if (!deal) return null;

  const dealProductSlug = (deal as any).productSlug || selectedProductSlug;
  const selectedProduct = products.find(p => p.slug === dealProductSlug);

  return (
    <>
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Название сделки"
          value={deal.title || ''}
          onChange={(e) => onChange({ ...deal, title: e.target.value })}
          required
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Описание"
          value={deal.description || ''}
          onChange={(e) => onChange({ ...deal, description: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>Услуга</InputLabel>
          <Select
            value={dealProductSlug || ''}
            label="Услуга"
            onChange={(e) => {
              const slug = e.target.value as string;
              setSelectedProductSlug(slug);
              onChange({ ...deal, productSlug: slug } as any);
            }}
          >
            <MenuItem value="">Не выбрано</MenuItem>
            {products.map((p) => (
              <MenuItem key={p.slug} value={p.slug}>
                {p.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      {deal.id && deal.id > 0 && selectedProduct && onApplyTemplate && (
        <Grid item xs={12} md={6}>
          <Button
            variant="outlined"
            startIcon={<PlaylistAddIcon />}
            fullWidth
            onClick={() => {
              if (deal.id && selectedProduct) {
                onApplyTemplate(deal.id, selectedProduct.slug, selectedProduct.title);
              }
            }}
            sx={{ height: '56px' }}
          >
            Применить шаблон задач
          </Button>
        </Grid>
      )}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>Этап</InputLabel>
          <Select
            value={deal.stageId && deal.stageId > 0 ? deal.stageId : (stages.length > 0 ? stages[0].id : '')}
            label="Этап"
            onChange={(e) => onChange({ ...deal, stageId: e.target.value as number })}
          >
            {stages.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Бюджет"
          type="number"
          value={deal.budget || ''}
          onChange={(e) => onChange({ ...deal, budget: parseFloat(e.target.value) || undefined })}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Клиент (имя)"
          value={deal.clientName || ''}
          onChange={(e) => onChange({ ...deal, clientName: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={deal.clientEmail || ''}
          onChange={(e) => onChange({ ...deal, clientEmail: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Телефон"
          value={deal.clientPhone || ''}
          onChange={(e) => onChange({ ...deal, clientPhone: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Компания"
          value={deal.companyName || ''}
          onChange={(e) => onChange({ ...deal, companyName: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Планируемая дата закрытия"
          type="date"
          value={deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toISOString().split('T')[0] : ''}
          onChange={(e) => onChange({ ...deal, expectedCloseDate: e.target.value || undefined })}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={deal.isWon || false}
              onChange={(e) => {
                onChange({
                  ...deal,
                  isWon: e.target.checked,
                  isLost: e.target.checked ? false : deal.isLost,
                });
              }}
            />
          }
          label="Сделка выиграна"
        />
        <FormControlLabel
          control={
            <Switch
              checked={deal.isLost || false}
              onChange={(e) => {
                onChange({
                  ...deal,
                  isLost: e.target.checked,
                  isWon: e.target.checked ? false : deal.isWon,
                });
              }}
            />
          }
          label="Сделка проиграна"
          sx={{ ml: 2 }}
        />
      </Grid>
      {deal.isLost && (
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Причина потери"
            value={deal.lossReason || ''}
            onChange={(e) => onChange({ ...deal, lossReason: e.target.value })}
          />
        </Grid>
      )}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Ответственный (ID пользователя)"
          type="number"
          value={deal.assignedTo || ''}
          onChange={(e) => onChange({ ...deal, assignedTo: e.target.value ? parseInt(e.target.value) : undefined })}
          helperText="Укажите ID пользователя, ответственного за сделку"
        />
      </Grid>
    </Grid>
    {deal.id && deal.id > 0 && (
      <DealPaymentsAndDocuments dealId={deal.id} />
    )}
    </>
  );
}

function DealPaymentsAndDocuments({ dealId }: { dealId: number }) {
  const { data: payments = [] } = useQuery({
    queryKey: ['payments', dealId],
    queryFn: () => listPayments(dealId),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', dealId],
    queryFn: () => listDocuments(dealId),
  });

  return (
    <Box sx={{ mt: 3 }}>
      <PaymentsSection dealId={dealId} payments={payments} />
      <DocumentsSection dealId={dealId} documents={documents} />
    </Box>
  );
}


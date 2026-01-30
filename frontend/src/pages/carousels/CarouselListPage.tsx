import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Collapse,
  Grid,
  Card,
  CardMedia,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { listCarousels, deleteCarousel, updateCarousel, Carousel, CarouselItem } from '@/services/carouselsApi';
import { useToast } from '@/components/common/ToastProvider';
import { uploadImage } from '@/services/cmsApi';

export function CarouselListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number | null; name: string }>({
    open: false,
    id: null,
    name: '',
  });
  const [expandedCarousels, setExpandedCarousels] = useState<Set<number>>(new Set());
  const [editingItems, setEditingItems] = useState<{ [carouselId: number]: CarouselItem[] }>({});

  const { data: carousels = [], isLoading } = useQuery({
    queryKey: ['carousels'],
    queryFn: listCarousels,
  });

  // Автоматически разворачиваем карусель "team" при первой загрузке
  useEffect(() => {
    if (carousels.length > 0) {
      const teamCarousel = carousels.find(c => c.slug === 'team');
      if (teamCarousel && !expandedCarousels.has(teamCarousel.id)) {
        setExpandedCarousels(prev => new Set([...prev, teamCarousel.id]));
        // Инициализируем редактирование с текущими слайдами
        setEditingItems(prev => ({ ...prev, [teamCarousel.id]: [...(teamCarousel.items || [])] }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carousels.length]);

  const deleteMutation = useMutation({
    mutationFn: deleteCarousel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carousels'] });
      showToast('Карусель удалена', 'success');
      setDeleteDialog({ open: false, id: null, name: '' });
    },
    onError: (error: any) => {
      showToast(error.message || 'Ошибка при удалении карусели', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Carousel> }) => updateCarousel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carousels'] });
      queryClient.invalidateQueries({ queryKey: ['public-carousels'] });
      showToast('Карусель обновлена', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Ошибка при обновлении карусели', 'error');
    },
  });

  const toggleExpand = (carouselId: number) => {
    const newExpanded = new Set(expandedCarousels);
    if (newExpanded.has(carouselId)) {
      newExpanded.delete(carouselId);
      // Сбрасываем редактирование при закрытии
      const newEditing = { ...editingItems };
      delete newEditing[carouselId];
      setEditingItems(newEditing);
    } else {
      newExpanded.add(carouselId);
      // Инициализируем редактирование с текущими слайдами
      const carousel = carousels.find(c => c.id === carouselId);
      if (carousel) {
        setEditingItems({ ...editingItems, [carouselId]: [...(carousel.items || [])] });
      }
    }
    setExpandedCarousels(newExpanded);
  };

  const handleSaveItems = (carouselId: number) => {
    const carousel = carousels.find(c => c.id === carouselId);
    if (!carousel) {
      showToast('Карусель не найдена', 'error');
      return;
    }
    
    // Проверяем токен перед отправкой
    const token = localStorage.getItem('auth.token') || localStorage.getItem('token');
    if (!token) {
      showToast('Требуется авторизация. Пожалуйста, войдите снова.', 'error');
      // Можно перенаправить на страницу логина
      return;
    }
    
    const items = editingItems[carouselId] || [];
    updateMutation.mutate({
      id: carouselId,
      data: { items },
    });
  };

  const handleAddItem = (carouselId: number) => {
    const items = editingItems[carouselId] || [];
    const newItem: CarouselItem = {
      kind: 'text',
      image_url: '',
      caption_html: '',
      link_url: '',
      sort_order: items.length,
    };
    setEditingItems({
      ...editingItems,
      [carouselId]: [...items, newItem],
    });
  };

  const handleUpdateItem = (carouselId: number, index: number, field: string, value: any) => {
    const items = [...(editingItems[carouselId] || [])];
    items[index] = { ...items[index], [field]: value };
    setEditingItems({ ...editingItems, [carouselId]: items });
  };

  const handleDeleteItem = (carouselId: number, index: number) => {
    const items = editingItems[carouselId] || [];
    const newItems = items.filter((_, i) => i !== index);
    setEditingItems({ ...editingItems, [carouselId]: newItems });
  };

  const handleMoveItem = (carouselId: number, index: number, direction: 'up' | 'down') => {
    const items = [...(editingItems[carouselId] || [])];
    if (direction === 'up' && index > 0) {
      [items[index], items[index - 1]] = [items[index - 1], items[index]];
    } else if (direction === 'down' && index < items.length - 1) {
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
    }
    setEditingItems({ ...editingItems, [carouselId]: items });
  };

  const handlePreview = (carousel: Carousel) => {
    // Открываем продакшен в новой вкладке
    const url = `${window.location.origin}/`;
    window.open(url, '_blank');
  };

  const handleDelete = (id: number, name: string) => {
    setDeleteDialog({ open: true, id, name });
  };

  const confirmDelete = () => {
    if (deleteDialog.id) {
      deleteMutation.mutate(deleteDialog.id);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Карусели</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/admin/carousels/new')}
        >
          Создать карусель
        </Button>
      </Box>

      {carousels.length === 0 ? (
        <Alert severity="info">Карусели не найдены. Создайте первую карусель.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Название</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Тип</TableCell>
                <TableCell>Слайдов</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {carousels.map((carousel) => {
                const isExpanded = expandedCarousels.has(carousel.id);
                const items = editingItems[carousel.id] || carousel.items || [];
                
                return (
                  <React.Fragment key={carousel.id}>
                    <TableRow>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => toggleExpand(carousel.id)}
                        >
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                        {carousel.name}
                      </TableCell>
                      <TableCell>
                        <Chip label={carousel.slug} size="small" />
                      </TableCell>
                      <TableCell>{carousel.type || 'horizontal'}</TableCell>
                      <TableCell>{items.length}</TableCell>
                      <TableCell>
                        <Chip
                          label={carousel.is_active ? 'Активна' : 'Неактивна'}
                          color={carousel.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handlePreview(carousel)}
                          title="Превью в продакшене"
                          color="primary"
                        >
                          <PreviewIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/admin/carousels/${carousel.id}`)}
                          title="Полное редактирование"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(carousel.id, carousel.name)}
                          title="Удалить"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 0, border: 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 3, bgcolor: 'background.default' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Typography variant="h6">Слайды ({items.length})</Typography>
                              <Box>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<AddIcon />}
                                  onClick={() => handleAddItem(carousel.id)}
                                  sx={{ mr: 1 }}
                                >
                                  Добавить слайд
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<SaveIcon />}
                                  onClick={() => handleSaveItems(carousel.id)}
                                  disabled={updateMutation.isPending}
                                >
                                  Сохранить изменения
                                </Button>
                              </Box>
                            </Box>
                            <Grid container spacing={2}>
                              {items.map((item, index) => (
                                <Grid item xs={12} md={6} lg={4} key={index}>
                                  <Card>
                                    {item.image_url && (
                                      <CardMedia
                                        component="img"
                                        height="140"
                                        image={item.image_url}
                                        alt={`Slide ${index + 1}`}
                                      />
                                    )}
                                    <CardContent>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Chip label={`#${index + 1}`} size="small" />
                                        <Box>
                                          <IconButton
                                            size="small"
                                            onClick={() => handleMoveItem(carousel.id, index, 'up')}
                                            disabled={index === 0}
                                          >
                                            ↑
                                          </IconButton>
                                          <IconButton
                                            size="small"
                                            onClick={() => handleMoveItem(carousel.id, index, 'down')}
                                            disabled={index === items.length - 1}
                                          >
                                            ↓
                                          </IconButton>
                                          <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteItem(carousel.id, index)}
                                          >
                                            <DeleteIcon fontSize="small" />
                                          </IconButton>
                                        </Box>
                                      </Box>
                                      <TextField
                                        fullWidth
                                        size="small"
                                        label="Изображение URL"
                                        value={item.image_url || ''}
                                        onChange={(e) => handleUpdateItem(carousel.id, index, 'image_url', e.target.value)}
                                        margin="dense"
                                        helperText={
                                          <Button
                                            size="small"
                                            component="label"
                                            sx={{ mt: 0.5 }}
                                          >
                                            Загрузить
                                            <input
                                              hidden
                                              type="file"
                                              accept="image/*"
                                              onChange={async (ev) => {
                                                const file = ev.target.files?.[0];
                                                if (file) {
                                                  try {
                                                    const result = await uploadImage(file);
                                                    handleUpdateItem(carousel.id, index, 'image_url', result.url);
                                                    showToast('Изображение загружено', 'success');
                                                  } catch (error: any) {
                                                    showToast(error.message || 'Ошибка загрузки', 'error');
                                                  }
                                                }
                                              }}
                                            />
                                          </Button>
                                        }
                                      />
                                      <TextField
                                        fullWidth
                                        size="small"
                                        label="Текст/HTML"
                                        multiline
                                        rows={3}
                                        value={item.caption_html || ''}
                                        onChange={(e) => handleUpdateItem(carousel.id, index, 'caption_html', e.target.value)}
                                        margin="dense"
                                      />
                                      <TextField
                                        fullWidth
                                        size="small"
                                        label="Ссылка"
                                        value={item.link_url || ''}
                                        onChange={(e) => handleUpdateItem(carousel.id, index, 'link_url', e.target.value)}
                                        margin="dense"
                                      />
                                    </CardContent>
                                  </Card>
                                </Grid>
                              ))}
                              {items.length === 0 && (
                                <Grid item xs={12}>
                                  <Alert severity="info">Нет слайдов. Добавьте первый слайд.</Alert>
                                </Grid>
                              )}
                            </Grid>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, name: '' })}>
        <DialogTitle>Удалить карусель?</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить карусель &quot;{deleteDialog.name}&quot;?
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, name: '' })}>Отмена</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

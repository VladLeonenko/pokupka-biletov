import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIndicatorIcon,
} from '@mui/icons-material';
import { getCarousel, createCarousel, updateCarousel, Carousel, CarouselItem } from '@/services/carouselsApi';
import { useToast } from '@/components/common/ToastProvider';
import { uploadImage } from '@/services/cmsApi';
import { resolveImageUrl } from '@/utils/resolveImageUrl';

export function CarouselEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isNew = id === 'new';

  const [formData, setFormData] = useState<Partial<Carousel>>({
    slug: '',
    name: '',
    type: 'horizontal',
    settings: {
      autoplay: true,
      autoplaySpeed: 3000,
      speed: 1000,
      loop: true,
      margin: 30,
      items: 4,
      nav: false,
      dots: false,
    },
    items: [],
    is_active: true,
  });

  const [editingItem, setEditingItem] = useState<{ index: number; item: CarouselItem } | null>(null);
  const [itemDialog, setItemDialog] = useState(false);

  const { data: carousel, isLoading } = useQuery({
    queryKey: ['carousel', id],
    queryFn: () => getCarousel(Number(id!)),
    enabled: !isNew && !!id,
  });

  useEffect(() => {
    if (carousel) {
      setFormData({
        slug: carousel.slug,
        name: carousel.name,
        type: carousel.type || 'horizontal',
        settings: carousel.settings || {},
        items: carousel.items || [],
        is_active: carousel.is_active,
      });
    }
  }, [carousel]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Carousel>) => {
      if (isNew) {
        return createCarousel(data);
      } else {
        return updateCarousel(Number(id!), data);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['carousels'] });
      queryClient.invalidateQueries({ queryKey: ['carousel', id] });
      queryClient.invalidateQueries({ queryKey: ['public-carousels'] });
      showToast(isNew ? 'Карусель создана' : 'Карусель обновлена', 'success');
      if (isNew) {
        navigate(`/admin/carousels/${data.id}`);
      }
    },
    onError: (error: any) => {
      showToast(error.message || 'Ошибка при сохранении', 'error');
    },
  });

  const handleSave = () => {
    if (!formData.slug || !formData.name) {
      showToast('Заполните обязательные поля: slug и название', 'error');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleAddItem = () => {
    setEditingItem({ index: -1, item: { kind: 'image', image_url: '', caption_html: '', link_url: '' } });
    setItemDialog(true);
  };

  const handleEditItem = (index: number) => {
    setEditingItem({ index, item: { ...formData.items![index] } });
    setItemDialog(true);
  };

  const handleSaveItem = () => {
    if (!editingItem) return;
    const items = [...(formData.items || [])];
    if (editingItem.index === -1) {
      items.push(editingItem.item);
    } else {
      items[editingItem.index] = editingItem.item;
    }
    setFormData({ ...formData, items });
    setItemDialog(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (index: number) => {
    const items = formData.items?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, items });
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const items = [...(formData.items || [])];
    if (direction === 'up' && index > 0) {
      [items[index], items[index - 1]] = [items[index - 1], items[index]];
    } else if (direction === 'down' && index < items.length - 1) {
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
    }
    setFormData({ ...formData, items });
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
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/admin/carousels')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">{isNew ? 'Создать карусель' : 'Редактировать карусель'}</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Основная информация
            </Typography>
            <TextField
              fullWidth
              label="Slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              margin="normal"
              required
              helperText="Уникальный идентификатор карусели (например: blog-filters)"
            />
            <TextField
              fullWidth
              label="Название"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Тип карусели</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                label="Тип карусели"
              >
                <MenuItem value="horizontal">Горизонтальная</MenuItem>
                <MenuItem value="vertical">Вертикальная</MenuItem>
                <MenuItem value="filter">Фильтр (для блога)</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="Активна"
              sx={{ mt: 2 }}
            />
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Слайды ({formData.items?.length || 0})</Typography>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddItem}>
                Добавить слайд
              </Button>
            </Box>
            <List>
              {formData.items?.map((item, index) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Chip label={`#${index + 1}`} size="small" />
                        {item.image_url && (
                          <Box
                            component="img"
                            src={item.image_url}
                            alt={item.caption_html || `Slide ${index + 1}`}
                            sx={{ maxWidth: 100, maxHeight: 60, objectFit: 'cover' }}
                          />
                        )}
                        <Typography variant="body2">
                          {item.caption_html?.replace(/<[^>]*>/g, '').substring(0, 50) || 'Без названия'}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => handleMoveItem(index, 'up')} disabled={index === 0}>
                      ↑
                    </IconButton>
                    <IconButton size="small" onClick={() => handleMoveItem(index, 'down')} disabled={index === (formData.items?.length || 0) - 1}>
                      ↓
                    </IconButton>
                    <IconButton size="small" onClick={() => handleEditItem(index)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteItem(index)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            {(!formData.items || formData.items.length === 0) && (
              <Alert severity="info">Добавьте слайды для карусели</Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom>
              Настройки
            </Typography>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Настройки отображения</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.settings?.autoplay}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: { ...formData.settings, autoplay: e.target.checked },
                        })
                      }
                    />
                  }
                  label="Автопрокрутка"
                />
                <TextField
                  fullWidth
                  label="Скорость (мс)"
                  type="number"
                  value={formData.settings?.speed || 1000}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, speed: Number(e.target.value) },
                    })
                  }
                  margin="normal"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Интервал автопрокрутки (мс)"
                  type="number"
                  value={formData.settings?.autoplaySpeed || 3000}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, autoplaySpeed: Number(e.target.value) },
                    })
                  }
                  margin="normal"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Количество видимых элементов"
                  type="number"
                  value={formData.settings?.items || 4}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, items: Number(e.target.value) },
                    })
                  }
                  margin="normal"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Отступ между элементами (px)"
                  type="number"
                  value={formData.settings?.margin || 30}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, margin: Number(e.target.value) },
                    })
                  }
                  margin="normal"
                  size="small"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.settings?.loop}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: { ...formData.settings, loop: e.target.checked },
                        })
                      }
                    />
                  }
                  label="Зацикливание"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.settings?.nav}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: { ...formData.settings, nav: e.target.checked },
                        })
                      }
                    />
                  }
                  label="Навигационные стрелки"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.settings?.dots}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: { ...formData.settings, dots: e.target.checked },
                        })
                      }
                    />
                  }
                  label="Точки навигации"
                />
              </AccordionDetails>
            </Accordion>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button onClick={() => navigate('/admin/carousels')}>Отмена</Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </Box>

      {/* Dialog for editing item */}
      <Dialog open={itemDialog} onClose={() => setItemDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingItem?.index === -1 ? 'Добавить слайд' : 'Редактировать слайд'}</DialogTitle>
        <DialogContent>
          {editingItem && (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ mb: 2 }}>
                {editingItem.item.image_url && (
                  <Box
                    component="img"
                    src={resolveImageUrl(editingItem.item.image_url)}
                    alt="Preview"
                    sx={{ maxWidth: '100%', maxHeight: 200, mb: 2, display: 'block' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const result = await uploadImage(file);
                        setEditingItem({ ...editingItem, item: { ...editingItem.item, image_url: result.url } });
                        showToast('Изображение загружено', 'success');
                      } catch (error: any) {
                        showToast(error.message || 'Ошибка загрузки изображения', 'error');
                      }
                    }
                  }}
                  style={{ display: 'none' }}
                  id="image-upload-input"
                />
                <label htmlFor="image-upload-input">
                  <Button variant="outlined" component="span" fullWidth>
                    {editingItem.item.image_url ? 'Изменить изображение' : 'Загрузить изображение'}
                  </Button>
                </label>
              </Box>
              <TextField
                fullWidth
                label="Текст/HTML"
                multiline
                rows={4}
                value={editingItem.item.caption_html || ''}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, item: { ...editingItem.item, caption_html: e.target.value } })
                }
                margin="normal"
                helperText="Можно использовать HTML"
              />
              <TextField
                fullWidth
                label="Ссылка"
                value={editingItem.item.link_url || ''}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, item: { ...editingItem.item, link_url: e.target.value } })
                }
                margin="normal"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDialog(false)}>Отмена</Button>
          <Button onClick={handleSaveItem} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

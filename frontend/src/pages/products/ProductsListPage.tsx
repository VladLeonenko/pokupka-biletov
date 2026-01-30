import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listProducts, reorderProducts } from '@/services/cmsApi';
import { Box, Button, Card, CardActionArea, CardContent, Grid, Typography, Paper, List, ListItem, ListItemText, ListItemButton, IconButton, Alert, TextField, FormControlLabel, Switch, Chip, Autocomplete, Select, MenuItem, FormControl, InputLabel, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ProductAnalytics } from '../promotions/ProductAnalytics';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { ProductItem } from '@/types/cms';
import { getProductAnalytics, getSearchTags } from '@/services/ecommerceApi';
import { deleteProduct, upsertProduct } from '@/services/cmsApi';
import { useToast } from '@/components/common/ToastProvider';

export function ProductsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [items, setItems] = useState<ProductItem[]>([]);

  const [showInactive, setShowInactive] = useState(true); // Показывать все товары включая неактивные
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: products = [], isLoading } = useQuery({ 
    queryKey: ['products'], 
    queryFn: listProducts,
  });

  // Фильтруем и сортируем товары
  useEffect(() => {
    if (!products || products.length === 0) {
      setItems([]);
      return;
    }

    let filtered = [...products];
    
    if (!showInactive) {
      filtered = filtered.filter(p => p.isActive);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.title?.toLowerCase().includes(query) ||
        p.descriptionHtml?.toLowerCase().includes(query) ||
        p.slug?.toLowerCase().includes(query)
      );
    }
    
    if (filterTags.length > 0) {
      filtered = filtered.filter(p => 
        p.tags && p.tags.some((tag: string) => filterTags.includes(tag))
      );
    }
    
    // Сортируем по sortOrder
    const sorted = filtered.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    setItems(sorted);
  }, [products, showInactive, searchQuery, filterTags]);

  const { data: realAnalytics } = useQuery({
    queryKey: ['productAnalytics'],
    queryFn: () => getProductAnalytics(undefined, 30),
  });

  const { data: availableTags = [] } = useQuery({
    queryKey: ['searchTags'],
    queryFn: getSearchTags,
  });

  // Получаем все уникальные теги из товаров
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    products.forEach((p: ProductItem) => {
      if (p.tags) {
        p.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [products]);

  const reorderMutation = useMutation({
    mutationFn: reorderProducts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => deleteProduct(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('Товар удален', 'success');
    },
    onError: (error: any) => {
      showToast('Ошибка удаления: ' + (error?.message || 'Неизвестная ошибка'), 'error');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ slug, isActive }: { slug: string; isActive: boolean }) => {
      const product = products.find((p: ProductItem) => p.slug === slug);
      if (!product) throw new Error('Товар не найден');
      const updated = { ...product, isActive };
      await upsertProduct(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('Статус товара изменен', 'success');
    },
    onError: (error: any) => {
      showToast('Ошибка: ' + (error?.message || 'Неизвестная ошибка'), 'error');
    },
  });

  const handleDelete = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Вы уверены, что хотите удалить этот товар?')) {
      deleteMutation.mutate(slug);
    }
  };

  const handleToggleActive = (slug: string, currentActive: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleActiveMutation.mutate({ slug, isActive: !currentActive });
  };

  const handleViewProduct = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = window.location.origin + `/products/${encodeURIComponent(slug)}`;
    window.open(url, '_blank');
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    setItems(newItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex === null) return;

    // Сохраняем новый порядок
    const reorderItems = items.map((item, index) => ({
      slug: item.slug,
      sortOrder: index,
    }));

    reorderMutation.mutate(reorderItems);
    setDraggedIndex(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>Продукты и стоимость</Typography>
        <Button variant="contained" onClick={() => navigate('/admin/products/new')} sx={{ mr: 1 }}>
          Добавить продукт
        </Button>
        <Button variant="outlined" onClick={() => navigate('/admin/parsing')}>
          Парсинг услуг
        </Button>
      </Box>

      {/* Блок аналитики продуктов */}
      <ProductAnalytics realAnalytics={realAnalytics} />

      {/* Фильтры и поиск */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Поиск товаров"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Название, описание..."
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Autocomplete
              multiple
              options={allTags}
              value={filterTags}
              onChange={(e, newValue) => setFilterTags(newValue)}
              renderInput={(params) => <TextField {...params} label="Теги" />}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip variant="outlined" label={option} {...getTagProps({ index })} key={index} />
                ))
              }
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
              }
              label="Показать неактивные"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                Всего товаров: {items.length} / {products.length}
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => {
                  // Фильтры применяются автоматически через useEffect
                  queryClient.invalidateQueries({ queryKey: ['products'] });
                }}
              >
                Применить
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Alert severity="info" sx={{ mb: 2 }}>
        Перетащите товары для изменения порядка сортировки. Неактивные товары отмечены серым цветом.
      </Alert>

      <Paper>
        <List>
          {items.map((p, index) => (
            <ListItem
              key={p.slug}
              onDragOver={(e) => handleDragOver(e, index)}
              sx={{
                cursor: 'default',
                backgroundColor: draggedIndex === index ? 'action.selected' : (!p.isActive ? 'grey.100' : 'transparent'),
                opacity: !p.isActive ? 0.7 : 1,
                '&:hover': { backgroundColor: 'action.hover' },
              }}
            >
              <IconButton
                edge="start"
                sx={{ cursor: 'grab' }}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  handleDragStart(index);
                }}
                onDragEnd={(e) => {
                  e.stopPropagation();
                  handleDragEnd();
                }}
              >
                <DragHandleIcon />
              </IconButton>
              <ListItemButton
                onClick={() => {
                  console.log('[ProductsListPage] row click -> navigate to editor', p.slug);
                  navigate(`/admin/products/${encodeURIComponent(p.slug)}`);
                }}
              >
                <ListItemText
                  primaryTypographyProps={{ component: 'div' }}
                  secondaryTypographyProps={{ component: 'div' }}
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      {p.title}
                      {!p.isActive && <Chip label="Неактивен" size="small" color="default" />}
                      {p.tags && p.tags.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {p.tags.slice(0, 3).map((tag, idx) => (
                            <Chip key={idx} label={tag} size="small" variant="outlined" />
                          ))}
                          {p.tags.length > 3 && <Chip label={`+${p.tags.length - 3}`} size="small" />}
                        </Box>
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'block' }}>
                      {p.priceCents ? `${Math.round(p.priceCents / 100).toLocaleString('ru-RU')} ₽${p.pricePeriod === 'one_time' ? '' : ` / ${p.pricePeriod === 'monthly' ? 'месяц' : 'год'}`}` : 'Цена по запросу'}
                      {p.summary && <Typography variant="caption" component="span" display="block" sx={{ mt: 0.5 }}>{p.summary}</Typography>}
                    </Box>
                  }
                />
              </ListItemButton>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                <Tooltip title="Посмотреть на сайте">
                  <IconButton
                    size="small"
                    onClick={(e) => handleViewProduct(p.slug, e)}
                    color="primary"
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={p.isActive ? "Скрыть товар" : "Показать товар"}>
                  <IconButton
                    size="small"
                    onClick={(e) => handleToggleActive(p.slug, p.isActive !== false, e)}
                    color={p.isActive ? "default" : "warning"}
                  >
                    {p.isActive ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Редактировать">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('[ProductsListPage] edit click -> navigate to editor', p.slug);
                      navigate(`/admin/products/${encodeURIComponent(p.slug)}`);
                    }}
                    color="primary"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Удалить">
                  <IconButton
                    size="small"
                    onClick={(e) => handleDelete(p.slug, e)}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </ListItem>
          ))}
        </List>
        {items.length === 0 && !isLoading && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Товары не найдены</Typography>
          </Box>
        )}
      </Paper>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <Typography>Загрузка...</Typography>
        </Box>
      )}
    </Box>
  );
}



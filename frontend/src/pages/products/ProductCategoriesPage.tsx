import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  createProductCategory, 
  deleteProductCategory, 
  listProductCategories, 
  updateProductCategory 
} from '@/services/ecommerceApi';
import { 
  Box, 
  Button, 
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid, 
  IconButton, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow, 
  TextField, 
  Typography 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useState } from 'react';
import { useToast } from '@/components/common/ToastProvider';
import { ProductCategory } from '@/types/cms';

export function ProductCategoriesPage() {
  const { data: categories = [] } = useQuery({ 
    queryKey: ['product-categories'], 
    queryFn: () => listProductCategories(false) 
  });
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<ProductCategory>>({
    slug: '',
    name: '',
    description: '',
    sortOrder: 0,
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      slug: '',
      name: '',
      description: '',
      sortOrder: 0,
      isActive: true,
    });
    setEditingId(null);
  };

  const handleEdit = (category: ProductCategory) => {
    setFormData({
      slug: category.slug,
      name: category.name,
      description: category.description || '',
      sortOrder: category.sortOrder || 0,
      isActive: category.isActive ?? true,
    });
    setEditingId(category.id);
    setOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: () => createProductCategory(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      showToast('Категория создана', 'success');
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => showToast(e?.message || 'Ошибка создания', 'error')
  });

  const updateMutation = useMutation({
    mutationFn: () => updateProductCategory(editingId!, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      showToast('Категория обновлена', 'success');
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => showToast(e?.message || 'Ошибка обновления', 'error')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProductCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      showToast('Категория удалена', 'success');
    },
    onError: (e: any) => showToast(e?.message || 'Ошибка удаления', 'error')
  });

  const handleSubmit = () => {
    if (!formData.slug?.trim() || !formData.name?.trim()) {
      showToast('Заполните обязательные поля', 'error');
      return;
    }
    
    if (editingId) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const handleAddPresets = async () => {
    try {
      const presets: Partial<ProductCategory>[] = [
        { slug: 'marketing', name: 'Маркетинг', sortOrder: 1, isActive: true },
        { slug: 'razrabotka', name: 'Разработка', sortOrder: 2, isActive: true },
        { slug: 'seo', name: 'SEO', sortOrder: 3, isActive: true },
        { slug: 'reklama', name: 'Реклама', sortOrder: 4, isActive: true },
        { slug: 'ai', name: 'AI', sortOrder: 5, isActive: true },
        { slug: 'prodvizhenie', name: 'Продвижение', sortOrder: 6, isActive: true },
        { slug: 'digital', name: 'Digital', sortOrder: 7, isActive: true },
        { slug: 'autsorsing', name: 'Аутсорсинг', sortOrder: 8, isActive: true },
      ];
      
      for (const preset of presets) {
        // eslint-disable-next-line no-await-in-loop
        await createProductCategory(preset);
      }
      
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      showToast('Стартовые категории добавлены', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Ошибка добавления пресетов', 'error');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Категории продуктов</Typography>
        <Box>
          <Button 
            variant="outlined" 
            onClick={handleAddPresets}
            sx={{ mr: 1 }}
          >
            Добавить стартовые
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
          >
            Создать категорию
          </Button>
        </Box>
      </Box>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Название</TableCell>
              <TableCell>Описание</TableCell>
              <TableCell align="center">Порядок</TableCell>
              <TableCell align="center">Активна</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>{c.id}</TableCell>
                <TableCell>{c.slug}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.description || '—'}</TableCell>
                <TableCell align="center">{c.sortOrder || 0}</TableCell>
                <TableCell align="center">{c.isActive ? '✓' : '✗'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleEdit(c)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => {
                      if (confirm(`Удалить категорию "${c.name}"?`)) {
                        deleteMutation.mutate(c.id);
                      }
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">Нет категорий</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => { setOpen(false); resetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? 'Редактировать категорию' : 'Создать категорию'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Slug *"
                fullWidth
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                disabled={!!editingId}
                helperText="URL-идентификатор (только латиница, цифры, дефис)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Название *"
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Описание"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Порядок сортировки"
                type="number"
                fullWidth
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isActive ?? true}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Активна"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpen(false); resetForm(); }}>
            Отмена
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingId ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

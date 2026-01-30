import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPromotion, upsertPromotion, PromotionItem } from '@/services/cmsApi';
import { Box, Button, Checkbox, CircularProgress, FormControlLabel, Paper, TextField, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/common/ToastProvider';

export function PromotionEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isNew = id === 'new';

  const { data: existing, isLoading } = useQuery({
    queryKey: ['promotion', id],
    queryFn: () => (isNew ? undefined : getPromotion(Number(id))),
    enabled: !isNew,
  });

  const [formData, setFormData] = useState<PromotionItem>({
    title: '',
    description: '',
    expiryDate: null,
    expiryText: null,
    buttonText: 'Получить скидку',
    formId: null,
    isActive: true,
    sortOrder: 0,
    promoCode: null,
    hiddenLocation: null,
    discountPercent: 0,
    discountAmount: 0,
  });

  useEffect(() => {
    if (existing) {
      setFormData({
        id: existing.id,
        title: existing.title || '',
        description: existing.description || '',
        expiryDate: existing.expiryDate || null,
        expiryText: existing.expiryText || null,
        buttonText: existing.buttonText || 'Получить скидку',
        formId: existing.formId || null,
        isActive: existing.isActive ?? true,
        sortOrder: existing.sortOrder || 0,
        promoCode: existing.promoCode || null,
        hiddenLocation: existing.hiddenLocation || null,
        discountPercent: existing.discountPercent || 0,
        discountAmount: existing.discountAmount || 0,
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: upsertPromotion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      showToast('Акция сохранена', 'success');
      navigate('/admin/promotions');
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка сохранения', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading && !isNew) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          {isNew ? 'Новая акция' : 'Редактирование акции'}
        </Typography>
        <Button onClick={() => navigate('/admin/promotions')}>Отмена</Button>
        <Button variant="contained" onClick={handleSubmit} sx={{ ml: 1 }}>
          Сохранить
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Название акции"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Описание"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={4}
            required
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              label="Дата окончания (опционально)"
              type="date"
              value={formData.expiryDate || ''}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value || null, expiryText: e.target.value ? null : formData.expiryText })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Текст даты (например: 'Всегда', 'До 31.12.24')"
              value={formData.expiryText || ''}
              onChange={(e) => setFormData({ ...formData, expiryText: e.target.value || null, expiryDate: e.target.value ? null : formData.expiryDate })}
              placeholder="Оставьте пустым, если указана дата"
            />
          </Box>

          <TextField
            fullWidth
            label="Текст кнопки"
            value={formData.buttonText}
            onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="ID формы (для обработки)"
            value={formData.formId || ''}
            onChange={(e) => setFormData({ ...formData, formId: e.target.value || null })}
            placeholder="Например: primecombo-input"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Порядок сортировки"
            type="number"
            value={formData.sortOrder}
            onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) || 0 })}
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
            }
            label="Акция активна"
            sx={{ mb: 2 }}
          />

          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Промокод (для quiz)
          </Typography>

          <TextField
            fullWidth
            label="Промокод"
            value={formData.promoCode || ''}
            onChange={(e) => setFormData({ ...formData, promoCode: e.target.value || null })}
            placeholder="Например: PRIME2024"
            helperText="Промокод, который клиент должен найти на сайте"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Место скрытия промокода"
            value={formData.hiddenLocation || ''}
            onChange={(e) => setFormData({ ...formData, hiddenLocation: e.target.value || null })}
            placeholder="Например: footer, header, about-page, или CSS селектор"
            helperText="Где на сайте скрыт промокод (для справки)"
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              label="Скидка в процентах"
              type="number"
              value={formData.discountPercent || 0}
              onChange={(e) => setFormData({ ...formData, discountPercent: Number(e.target.value) || 0 })}
              inputProps={{ min: 0, max: 100 }}
            />
            <TextField
              fullWidth
              label="Скидка в рублях"
              type="number"
              value={formData.discountAmount || 0}
              onChange={(e) => setFormData({ ...formData, discountAmount: Number(e.target.value) || 0 })}
              inputProps={{ min: 0 }}
            />
          </Box>
        </form>
      </Paper>
    </Box>
  );
}




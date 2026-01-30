import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deletePromotion, listPromotions, PromotionItem } from '@/services/cmsApi';
import { Box, Button, Card, CardActionArea, CardContent, Chip, CircularProgress, Grid, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useToast } from '@/components/common/ToastProvider';

export function PromotionsListPage() {
  const { data: items = [], isLoading } = useQuery({ queryKey: ['promotions'], queryFn: listPromotions });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: deletePromotion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      showToast('Акция удалена', 'success');
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка удаления', 'error');
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>Акции</Typography>
        <Button variant="contained" onClick={() => navigate('/admin/promotions/new')}>
          Добавить акцию
        </Button>
      </Box>
      <Grid container spacing={2}>
        {items.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Нет акций. Добавьте первую акцию.</Typography>
            </Paper>
          </Grid>
        ) : (
          items.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardActionArea
                  onClick={() => navigate(`/admin/promotions/${item.id}`)}
                  sx={{ flexGrow: 1, p: 2 }}
                >
                  <CardContent sx={{ p: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'start', mb: 1 }}>
                      <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
                        {item.title}
                      </Typography>
                      {!item.isActive && (
                        <Chip label="Неактивна" size="small" color="default" />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, minHeight: 40 }}>
                      {item.description.length > 100
                        ? `${item.description.substring(0, 100)}...`
                        : item.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.expiryText || (item.expiryDate ? `До ${item.expiryDate}` : 'Без ограничений')}
                    </Typography>
                  </CardContent>
                </CardActionArea>
                <Box sx={{ display: 'flex', gap: 0.5, p: 1, justifyContent: 'flex-end', borderTop: 1, borderColor: 'divider' }}>
                  <Tooltip title="Редактировать">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/promotions/${item.id}`);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Удалить">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Удалить акцию "${item.title}"?`)) {
                          deleteMutation.mutate(item.id!);
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
}


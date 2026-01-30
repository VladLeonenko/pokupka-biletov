import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Paper, Typography, List, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel, Tabs, Tab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { listFunnels, upsertFunnel, deleteFunnel } from '@/services/cmsApi';
import { SalesFunnel } from '@/types/cms';
import { useToast } from '@/components/common/ToastProvider';
import { TasksListPage } from './TasksListPage';

export function FunnelsListPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'funnels' | 'tasks'>('funnels');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<SalesFunnel | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const { data: funnels = [] } = useQuery<SalesFunnel[]>({ queryKey: ['funnels'], queryFn: listFunnels });

  const mutation = useMutation<SalesFunnel, Error, Partial<SalesFunnel>>({
    mutationFn: upsertFunnel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      showToast('Воронка сохранена', 'success');
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      console.error('Error saving funnel:', err);
      showToast(err?.message || 'Ошибка при сохранении воронки', 'error');
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteFunnel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      showToast('Воронка удалена', 'success');
    },
    onError: (err: any) => {
      console.error('Error deleting funnel:', err);
      showToast(err?.message || 'Ошибка при удалении воронки', 'error');
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setIsActive(true);
    setEditingFunnel(null);
  };

  const handleOpenDialog = (funnel?: SalesFunnel) => {
    if (funnel) {
      setEditingFunnel(funnel);
      setName(funnel.name);
      setDescription(funnel.description || '');
      setIsActive(funnel.isActive);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    mutation.mutate({
      id: editingFunnel?.id,
      name,
      description,
      isActive,
      sortOrder: editingFunnel?.sortOrder || 0,
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Воронки</Typography>
        {tab === 'funnels' && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Создать воронку
          </Button>
        )}
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Воронки продаж" value="funnels" />
          <Tab label="Задачник" value="tasks" />
        </Tabs>
      </Paper>

      {tab === 'tasks' && <TasksListPage />}

      {tab === 'funnels' && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Список воронок</Typography>
          </Box>

          <List>
        {funnels.map((funnel) => (
          <Paper key={funnel.id} sx={{ mb: 2, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6">{funnel.name}</Typography>
                {funnel.description && (
                  <Typography variant="body2" color="text.secondary">
                    {funnel.description}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {funnel.isActive ? 'Активна' : 'Неактивна'}
                </Typography>
              </Box>
              <Box>
                <Button
                  variant="contained"
                  onClick={() => navigate(`/admin/funnels/${funnel.id}`)}
                  sx={{ mr: 1 }}
                >
                  Открыть
                </Button>
                <IconButton onClick={() => handleOpenDialog(funnel)}>
                  <EditIcon />
                </IconButton>
                <IconButton
                  onClick={() => {
                    if (window.confirm('Удалить воронку?')) {
                      deleteMut.mutate(funnel.id);
                    }
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
          </Paper>
        ))}
        {funnels.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Воронки не созданы</Typography>
          </Paper>
        )}
          </List>
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingFunnel ? 'Редактировать воронку' : 'Создать воронку'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Описание"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mt: 2 }}
          />
          <FormControlLabel
            control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
            label="Активна"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSave} disabled={!name.trim() || mutation.isPending}>
            {mutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


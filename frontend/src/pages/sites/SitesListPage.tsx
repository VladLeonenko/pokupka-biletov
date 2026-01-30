import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LanguageIcon from '@mui/icons-material/Language';
import PagesIcon from '@mui/icons-material/Pages';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import { listSites, createSite, updateSite, deleteSite, Site } from '@/services/sitesApi';

export default function SitesListPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const { token } = useAuth();

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: listSites,
    enabled: !!token,
    retry: false,
    onError: (error) => {
      console.error('[SitesListPage] Failed to load sites:', error);
    },
  });

  const createMutation = useMutation({
    mutationFn: createSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      setDialogOpen(false);
      setEditingSite(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Site> }) => updateSite(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      setDialogOpen(false);
      setEditingSite(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      setDeleteDialogOpen(false);
      setSiteToDelete(null);
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSite(null);
    setFormData({
      domain: '',
      name: '',
      type: 'landing',
      status: 'active',
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      domain: formData.get('domain') as string,
      name: formData.get('name') as string,
      type: formData.get('type') as Site['type'],
      status: formData.get('status') as Site['status'],
      template: formData.get('template') as string || 'default',
      settings: {},
      seoSettings: {},
      isPrimary: false,
    };

    if (editingSite) {
      updateMutation.mutate({ id: editingSite.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (site: Site) => {
    setSiteToDelete(site);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (siteToDelete) {
      deleteMutation.mutate(siteToDelete.id);
    }
  };

  const getStatusColor = (status: Site['status']) => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'default';
      case 'inactive': return 'error';
      case 'maintenance': return 'warning';
      default: return 'default';
    }
  };

  const getTypeLabel = (type: Site['type']) => {
    switch (type) {
      case 'main': return 'Главный';
      case 'blog': return 'Блог';
      case 'enterprise': return 'Enterprise';
      case 'landing': return 'Лендинг';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Управление сайтами</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Добавить сайт
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Управляйте всеми вашими сайтами из одной админ-панели. Отслеживайте лиды, аналитику и контент для каждого домена.
      </Alert>

      <Grid container spacing={3}>
        {sites.map((site) => (
          <Grid item xs={12} md={6} lg={4} key={site.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {site.name}
                      {site.isPrimary && (
                        <Chip label="Главный" size="small" color="primary" sx={{ ml: 1 }} />
                      )}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                      <LanguageIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {site.domain}
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpenDialog(site)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {!site.isPrimary && (
                      <IconButton size="small" onClick={() => handleDelete(site)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip label={getTypeLabel(site.type)} size="small" />
                  <Chip label={site.status} size="small" color={getStatusColor(site.status)} />
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PagesIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {site.pagesCount || 0} страниц
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LeaderboardIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {site.leadsCount || 0} лидов (30д)
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
              <Box sx={{ p: 2, pt: 0 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  href={`/admin/sites/${site.id}`}
                >
                  Управление
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Диалог создания/редактирования */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingSite ? 'Редактировать сайт' : 'Создать сайт'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                name="name"
                label="Название сайта"
                defaultValue={editingSite?.name || ''}
                required
                fullWidth
              />
              <TextField
                name="domain"
                label="Домен"
                defaultValue={editingSite?.domain || ''}
                placeholder="boost-ai.team"
                required
                fullWidth
                helperText="Без http://, только домен"
              />
              <FormControl fullWidth>
                <InputLabel>Тип сайта</InputLabel>
                <Select
                  name="type"
                  defaultValue={editingSite?.type || 'landing'}
                  label="Тип сайта"
                >
                  <MenuItem value="main">Главный</MenuItem>
                  <MenuItem value="landing">Лендинг</MenuItem>
                  <MenuItem value="blog">Блог</MenuItem>
                  <MenuItem value="enterprise">Enterprise</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Статус</InputLabel>
                <Select
                  name="status"
                  defaultValue={editingSite?.status || 'draft'}
                  label="Статус"
                >
                  <MenuItem value="draft">Черновик</MenuItem>
                  <MenuItem value="active">Активен</MenuItem>
                  <MenuItem value="inactive">Неактивен</MenuItem>
                  <MenuItem value="maintenance">На обслуживании</MenuItem>
                </Select>
              </FormControl>
              <TextField
                name="template"
                label="Шаблон"
                defaultValue={editingSite?.template || 'default'}
                fullWidth
                helperText="Название шаблона (default, boost-ai, blog, enterprise)"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Отмена</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Диалог удаления */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Удалить сайт?</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить сайт "{siteToDelete?.name}"? 
            Все страницы и лиды этого сайта также будут удалены.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
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


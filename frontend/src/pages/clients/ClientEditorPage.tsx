import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getClient, createClient, updateClient, Client } from '@/services/clientsApi';
import { createClientProjectForClient, getAllProjectsAdmin, deleteProject, ClientProject } from '@/services/projectsApi';
import {
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/components/common/ToastProvider';

const SOURCE_OPTIONS = [
  { value: 'manual', label: 'Вручную' },
  { value: 'form', label: 'Форма' },
  { value: 'chatbot', label: 'Чат-бот' },
  { value: 'phone', label: 'Телефон' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Другое' }
];

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Лид' },
  { value: 'client', label: 'Клиент' },
  { value: 'inactive', label: 'Неактивный' },
  { value: 'lost', label: 'Потерян' }
];

export function ClientEditorPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => (id && !isNew ? getClient(parseInt(id)) : Promise.resolve(null)),
    enabled: !isNew
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [source, setSource] = useState<'manual' | 'form' | 'chatbot' | 'phone' | 'email' | 'other'>('manual');
  const [sourceDetails, setSourceDetails] = useState('');
  const [status, setStatus] = useState<'lead' | 'client' | 'inactive' | 'lost'>('lead');
  const [notes, setNotes] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ClientProject | null>(null);

  const { data: clientProjects = [] } = useQuery({
    queryKey: ['clientProjects', id],
    queryFn: () => getAllProjectsAdmin(id && !isNew ? parseInt(id) : undefined),
    enabled: !isNew && !!id,
  });

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      if (!client || !client.id) {
        throw new Error('Клиент не найден');
      }
      return createClientProjectForClient({
        clientId: client.id,
        type: 'website',
        title: `Проект для ${client.name || 'клиента'}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientProjects', id] });
      showToast('Проект для клиента создан. Он появится в ЛК / Мои проекты', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Не удалось создать проект для клиента', 'error');
    },
  });

  useEffect(() => {
    if (client) {
      setName(client.name || '');
      setEmail(client.email || '');
      setPhone(client.phone || '');
      setCompany(client.company || '');
      setSource(client.source || 'manual');
      setSourceDetails(client.source_details || '');
      setStatus(client.status || 'lead');
      setNotes(client.notes || '');
    }
  }, [client]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const clientData: Partial<Client> = {
        name,
        email: email || undefined,
        phone: phone || undefined,
        company: company || undefined,
        source,
        source_details: sourceDetails || undefined,
        status,
        notes: notes || undefined
      };

      if (isNew) {
        return createClient(clientData);
      } else {
        return updateClient(parseInt(id!), clientData);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      showToast(isNew ? 'Клиент создан' : 'Клиент обновлен', 'success');
      navigate('/admin/clients');
    },
    onError: (error: any) => {
      showToast(error.message || 'Ошибка при сохранении', 'error');
    }
  });

  const handleSave = () => {
    if (!name.trim()) {
      showToast('Имя обязательно для заполнения', 'error');
      return;
    }
    saveMutation.mutate();
  };

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: number) => deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientProjects', id] });
      queryClient.invalidateQueries({ queryKey: ['clientProjects'] }); // Инвалидируем также общий кеш для ЛК пользователя
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      showToast('Проект удален', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Не удалось удалить проект', 'error');
    },
  });

  const handleDeleteClick = (project: ClientProject) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (projectToDelete) {
      deleteProjectMutation.mutate(projectToDelete.id);
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
        <Typography variant="h4">{isNew ? 'Добавить клиента' : 'Редактировать клиента'}</Typography>
        <Button variant="outlined" onClick={() => navigate('/admin/clients')}>
          Отмена
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Имя *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Телефон"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Компания"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Источник</InputLabel>
              <Select
                value={source}
                label="Источник"
                onChange={(e) => setSource(e.target.value as any)}
              >
                {SOURCE_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Детали источника"
              value={sourceDetails}
              onChange={(e) => setSourceDetails(e.target.value)}
              placeholder="Например, название формы или канала"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Статус</InputLabel>
              <Select
                value={status}
                label="Статус"
                onChange={(e) => setStatus(e.target.value as any)}
              >
                {STATUS_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Заметки"
              multiline
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Grid>
          {!isNew && client && (
            <>
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Метрики:</strong> Заказов: {client.total_orders} | 
                    LTV: {((client.total_revenue_cents || 0) / 100).toLocaleString('ru-RU')} ₽ | 
                    Средний чек: {client.average_order_value_cents ? ((client.average_order_value_cents / 100).toLocaleString('ru-RU')) : '0'} ₽
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Проекты клиента</Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => createProjectMutation.mutate()}
                      disabled={createProjectMutation.isPending}
                    >
                      {createProjectMutation.isPending ? 'Создание...' : 'Создать проект'}
                    </Button>
                  </Box>
                  {clientProjects.length === 0 ? (
                    <Alert severity="info">У клиента пока нет проектов</Alert>
                  ) : (
                    <List>
                      {clientProjects.map((project, idx) => (
                        <>
                          <ListItem key={project.id}>
                            <ListItemText
                              primary={project.title}
                              secondary={
                                <Box>
                                  <Typography variant="caption" sx={{ display: 'block' }}>
                                    Статус: {project.status} | Прогресс: {project.progressPercent}%
                                  </Typography>
                                  {project.deadline && (
                                    <Typography variant="caption" color="text.secondary">
                                      Дедлайн: {new Date(project.deadline).toLocaleDateString('ru-RU')}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <Tooltip title="Удалить проект">
                                <IconButton
                                  edge="end"
                                  onClick={() => handleDeleteClick(project)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </ListItemSecondaryAction>
                          </ListItem>
                          {idx < clientProjects.length - 1 && <Divider />}
                        </>
                      ))}
                    </List>
                  )}
                </Paper>
              </Grid>
            </>
          )}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={() => navigate('/admin/clients')}>
                Отмена
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saveMutation.isPending || !name.trim()}
              >
                {saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Удаление проекта</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите удалить проект "{projectToDelete?.title}"?
            <br />
            <strong>Это действие нельзя отменить.</strong> Все связанные данные (этапы, задачи, комментарии) также будут удалены.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteProjectMutation.isPending}
          >
            {deleteProjectMutation.isPending ? 'Удаление...' : 'Удалить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


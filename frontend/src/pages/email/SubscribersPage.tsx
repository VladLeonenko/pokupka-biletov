import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Pagination,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  Upload,
  Download,
  Search,
  Email,
  Person,
  Phone,
} from '@mui/icons-material';
import {
  listSubscribers,
  createSubscriber,
  updateSubscriber,
  deleteSubscriber,
  importSubscribers,
  EmailSubscriber,
} from '@/services/emailCampaignsApi';
import { useToast } from '@/components/common/ToastProvider';

export default function SubscribersPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<EmailSubscriber | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ['email-subscribers', page, limit, statusFilter, search],
    queryFn: () =>
      listSubscribers({
        page,
        limit,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createSubscriber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-subscribers'] });
      setOpenDialog(false);
      showToast('Подписчик создан', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EmailSubscriber> }) =>
      updateSubscriber(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-subscribers'] });
      setOpenDialog(false);
      setEditingSubscriber(null);
      showToast('Подписчик обновлен', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubscriber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-subscribers'] });
      showToast('Подписчик удален', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const importMutation = useMutation({
    mutationFn: importSubscribers,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['email-subscribers'] });
      setImportDialogOpen(false);
      setImportFile(null);
      showToast(
        `Импортировано: ${result.imported}, ошибок: ${result.errors}`,
        result.errors > 0 ? 'warning' : 'success'
      );
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const handleCreate = () => {
    setEditingSubscriber(null);
    setOpenDialog(true);
  };

  const handleEdit = (subscriber: EmailSubscriber) => {
    setEditingSubscriber(subscriber);
    setOpenDialog(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этого подписчика?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (formData: FormData) => {
    const data = {
      email: formData.get('email') as string,
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      tags: (formData.get('tags') as string)?.split(',').map((t) => t.trim()).filter(Boolean) || [],
    };

    if (editingSubscriber) {
      updateMutation.mutate({ id: editingSubscriber.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleImport = () => {
    if (!importFile) {
      showToast('Выберите файл', 'error');
      return;
    }
    importMutation.mutate(importFile);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'unsubscribed':
        return 'default';
      case 'bounced':
        return 'warning';
      case 'complained':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Активен';
      case 'unsubscribed':
        return 'Отписан';
      case 'bounced':
        return 'Отклонен';
      case 'complained':
        return 'Жалоба';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Ошибка при загрузке подписчиков</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Подписчики
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={() => setImportDialogOpen(true)}
          >
            Импорт CSV
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
            Добавить подписчика
          </Button>
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Поиск по email или имени..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Статус</InputLabel>
              <Select
                value={statusFilter}
                label="Статус"
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="all">Все</MenuItem>
                <MenuItem value="active">Активные</MenuItem>
                <MenuItem value="unsubscribed">Отписанные</MenuItem>
                <MenuItem value="bounced">Отклоненные</MenuItem>
                <MenuItem value="complained">Жалобы</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Имя</TableCell>
              <TableCell>Телефон</TableCell>
              <TableCell>Теги</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Дата подписки</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.subscribers.map((subscriber) => (
              <TableRow key={subscriber.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Email fontSize="small" color="action" />
                    {subscriber.email}
                  </Box>
                </TableCell>
                <TableCell>
                  {subscriber.name ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person fontSize="small" color="action" />
                      {subscriber.name}
                    </Box>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {subscriber.phone ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone fontSize="small" color="action" />
                      {subscriber.phone}
                    </Box>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {subscriber.tags && subscriber.tags.length > 0 ? (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {subscriber.tags.map((tag, idx) => (
                        <Chip key={idx} label={tag} size="small" />
                      ))}
                    </Box>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(subscriber.status)}
                    color={getStatusColor(subscriber.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(subscriber.subscribed_at).toLocaleDateString('ru-RU')}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleEdit(subscriber)}>
                    <Edit />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(subscriber.id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {data && data.total > limit && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={Math.ceil(data.total / limit)}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
          />
        </Box>
      )}

      {/* Диалог создания/редактирования */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(new FormData(e.currentTarget));
          }}
        >
          <DialogTitle>
            {editingSubscriber ? 'Редактировать подписчика' : 'Добавить подписчика'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="email"
              label="Email"
              type="email"
              fullWidth
              required
              defaultValue={editingSubscriber?.email || ''}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="name"
              label="Имя"
              fullWidth
              defaultValue={editingSubscriber?.name || ''}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="phone"
              label="Телефон"
              fullWidth
              defaultValue={editingSubscriber?.phone || ''}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="tags"
              label="Теги (через запятую)"
              fullWidth
              defaultValue={editingSubscriber?.tags?.join(', ') || ''}
              helperText="Разделяйте теги запятыми"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
            <Button type="submit" variant="contained">
              {editingSubscriber ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Диалог импорта */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Импорт подписчиков из CSV</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            CSV файл должен содержать колонки: email, name (опционально), phone (опционально), tags
            (опционально, через запятую)
          </Alert>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            style={{ marginBottom: 16 }}
          />
          {importMutation.isPending && <CircularProgress size={24} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={!importFile || importMutation.isPending}
          >
            Импортировать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


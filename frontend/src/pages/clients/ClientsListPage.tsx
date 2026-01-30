import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  listClients, 
  deleteClient, 
  exportClientsToCSV,
  Client,
  ClientsFilters 
} from '@/services/clientsApi';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Alert,
  Tooltip,
  Stack
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import { useToast } from '@/components/common/ToastProvider';

const SOURCE_OPTIONS = [
  { value: '', label: 'Все источники' },
  { value: 'manual', label: 'Вручную' },
  { value: 'form', label: 'Форма' },
  { value: 'chatbot', label: 'Чат-бот' },
  { value: 'phone', label: 'Телефон' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Другое' }
];

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'lead', label: 'Лид' },
  { value: 'client', label: 'Клиент' },
  { value: 'inactive', label: 'Неактивный' },
  { value: 'lost', label: 'Потерян' }
];

export function ClientsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [minLTV, setMinLTV] = useState('');
  const [maxLTV, setMaxLTV] = useState('');
  const [minAvgOrder, setMinAvgOrder] = useState('');
  const [maxAvgOrder, setMaxAvgOrder] = useState('');
  const [minOrders, setMinOrders] = useState('');
  const [maxOrders, setMaxOrders] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const filters: ClientsFilters = useMemo(() => ({
    page,
    limit,
    search: search || undefined,
    source: source || undefined,
    status: status || undefined,
    minLTV: minLTV ? parseFloat(minLTV) : undefined,
    maxLTV: maxLTV ? parseFloat(maxLTV) : undefined,
    minAvgOrder: minAvgOrder ? parseFloat(minAvgOrder) : undefined,
    maxAvgOrder: maxAvgOrder ? parseFloat(maxAvgOrder) : undefined,
    minOrders: minOrders ? parseInt(minOrders) : undefined,
    maxOrders: maxOrders ? parseInt(maxOrders) : undefined,
    sortBy,
    sortOrder
  }), [page, limit, search, source, status, minLTV, maxLTV, minAvgOrder, maxAvgOrder, minOrders, maxOrders, sortBy, sortOrder]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['clients', filters],
    queryFn: () => listClients(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      showToast('Клиент удален', 'success');
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    },
    onError: (error: any) => {
      showToast(error.message || 'Ошибка при удалении клиента', 'error');
    }
  });

  const handleDelete = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (clientToDelete) {
      deleteMutation.mutate(clientToDelete.id);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportClientsToCSV(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clients_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('Клиенты экспортированы', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка при экспорте', 'error');
    }
  };

  const formatCurrency = (cents: number | null | undefined) => {
    if (!cents) return '0 ₽';
    return `${(cents / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getSourceLabel = (source: string) => {
    const option = SOURCE_OPTIONS.find(opt => opt.value === source);
    return option?.label || source;
  };

  const getStatusLabel = (status: string) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    return option?.label || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'client': return 'success';
      case 'lead': return 'info';
      case 'inactive': return 'warning';
      case 'lost': return 'error';
      default: return 'default';
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('DESC');
    }
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Ошибка загрузки клиентов: {(error as Error).message}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Клиенты</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={isLoading}
          >
            Экспорт CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/admin/clients/new')}
          >
            Добавить клиента
          </Button>
        </Stack>
      </Box>

      {/* Фильтры */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Поиск"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Имя, email, телефон, компания"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Источник</InputLabel>
              <Select
                value={source}
                label="Источник"
                onChange={(e) => {
                  setSource(e.target.value);
                  setPage(1);
                }}
              >
                {SOURCE_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Статус</InputLabel>
              <Select
                value={status}
                label="Статус"
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                {STATUS_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="LTV от (₽)"
              type="number"
              value={minLTV}
              onChange={(e) => {
                setMinLTV(e.target.value);
                setPage(1);
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="LTV до (₽)"
              type="number"
              value={maxLTV}
              onChange={(e) => {
                setMaxLTV(e.target.value);
                setPage(1);
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Средний чек от (₽)"
              type="number"
              value={minAvgOrder}
              onChange={(e) => {
                setMinAvgOrder(e.target.value);
                setPage(1);
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Средний чек до (₽)"
              type="number"
              value={maxAvgOrder}
              onChange={(e) => {
                setMaxAvgOrder(e.target.value);
                setPage(1);
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Заказов от"
              type="number"
              value={minOrders}
              onChange={(e) => {
                setMinOrders(e.target.value);
                setPage(1);
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Заказов до"
              type="number"
              value={maxOrders}
              onChange={(e) => {
                setMaxOrders(e.target.value);
                setPage(1);
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Таблица клиентов */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Button
                  size="small"
                  onClick={() => handleSort('name')}
                  sx={{ textTransform: 'none', color: 'inherit', fontWeight: 'bold' }}
                >
                  Имя {sortBy === 'name' && (sortOrder === 'ASC' ? '↑' : '↓')}
                </Button>
              </TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Телефон</TableCell>
              <TableCell>Компания</TableCell>
              <TableCell>Источник</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>
                <Button
                  size="small"
                  onClick={() => handleSort('total_orders')}
                  sx={{ textTransform: 'none', color: 'inherit', fontWeight: 'bold' }}
                >
                  Заказов {sortBy === 'total_orders' && (sortOrder === 'ASC' ? '↑' : '↓')}
                </Button>
              </TableCell>
              <TableCell>
                <Button
                  size="small"
                  onClick={() => handleSort('total_revenue_cents')}
                  sx={{ textTransform: 'none', color: 'inherit', fontWeight: 'bold' }}
                >
                  LTV {sortBy === 'total_revenue_cents' && (sortOrder === 'ASC' ? '↑' : '↓')}
                </Button>
              </TableCell>
              <TableCell>
                <Button
                  size="small"
                  onClick={() => handleSort('average_order_value_cents')}
                  sx={{ textTransform: 'none', color: 'inherit', fontWeight: 'bold' }}
                >
                  Средний чек {sortBy === 'average_order_value_cents' && (sortOrder === 'ASC' ? '↑' : '↓')}
                </Button>
              </TableCell>
              <TableCell>Последний заказ</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  <Typography>Загрузка...</Typography>
                </TableCell>
              </TableRow>
            ) : data?.clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  <Typography>Клиенты не найдены</Typography>
                </TableCell>
              </TableRow>
            ) : (
              data?.clients.map((client) => (
                <TableRow key={client.id} hover>
                  <TableCell>{client.name}</TableCell>
                  <TableCell>{client.email || '-'}</TableCell>
                  <TableCell>{client.phone || '-'}</TableCell>
                  <TableCell>{client.company || '-'}</TableCell>
                  <TableCell>{getSourceLabel(client.source)}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(client.status)}
                      color={getStatusColor(client.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{client.total_orders}</TableCell>
                  <TableCell>{formatCurrency(client.total_revenue_cents)}</TableCell>
                  <TableCell>{formatCurrency(client.average_order_value_cents)}</TableCell>
                  <TableCell>{formatDate(client.last_order_date)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Редактировать">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/admin/clients/${client.id}`)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Удалить">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(client)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {data && (
          <TablePagination
            component="div"
            count={data.pagination.total}
            page={data.pagination.page - 1}
            onPageChange={(_, newPage) => setPage(newPage + 1)}
            rowsPerPage={data.pagination.limit}
            onRowsPerPageChange={(e) => {
              setLimit(parseInt(e.target.value, 10));
              setPage(1);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Строк на странице:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} из ${count}`}
          />
        )}
      </TableContainer>

      {/* Диалог подтверждения удаления */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Удалить клиента?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите удалить клиента "{clientToDelete?.name}"? Это действие нельзя отменить.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" autoFocus>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


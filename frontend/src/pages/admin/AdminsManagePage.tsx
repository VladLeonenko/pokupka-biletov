import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, LockReset as LockResetIcon } from '@mui/icons-material';
import { listAdmins, addAdmin, removeAdmin, resetAdminPassword, type Admin } from '@/services/adminsApi';
import { useToast } from '@/components/common/ToastProvider';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function AdminsManagePage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState<Admin | null>(null);
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'sales_manager'>('admin');
  const [resetPassword, setResetPassword] = useState('');

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: listAdmins,
  });

  const addMutation = useMutation({
    mutationFn: () => addAdmin({ email: formEmail, password: formPassword, name: formName || undefined, role: formRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setAddOpen(false);
      setFormEmail('');
      setFormPassword('');
      setFormName('');
      setFormRole('admin');
      showToast('Админ добавлен', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => removeAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      showToast('Доступ удалён', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => resetAdminPassword(id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setResetOpen(null);
      setResetPassword('');
      showToast('Пароль обновлён', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const handleAdd = () => {
    if (!formEmail.trim()) {
      showToast('Введите email', 'warning');
      return;
    }
    if (!formPassword || formPassword.length < 8) {
      showToast('Пароль минимум 8 символов', 'warning');
      return;
    }
    addMutation.mutate();
  };

  const handleReset = () => {
    if (!resetOpen || !resetPassword || resetPassword.length < 8) {
      showToast('Пароль минимум 8 символов', 'warning');
      return;
    }
    resetMutation.mutate({ id: resetOpen.id, password: resetPassword });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Администраторы</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          Добавить
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Админы имеют полный доступ. Менеджеры по продажам видят ограниченный набор разделов (продукты, заказы, клиенты, чаты и др.).
      </Alert>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Имя</TableCell>
                <TableCell>Роль</TableCell>
                <TableCell>Добавлен</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {admins.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.email}</TableCell>
                  <TableCell>{a.name || '—'}</TableCell>
                  <TableCell>{a.role === 'sales_manager' ? 'Менеджер по продажам' : 'Админ'}</TableCell>
                  <TableCell>{a.created_at ? format(new Date(a.created_at), 'd MMM yyyy', { locale: ru }) : '—'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" title="Сбросить пароль" onClick={() => setResetOpen(a)}>
                      <LockResetIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      title="Убрать доступ"
                      onClick={() => removeMutation.mutate(a.id)}
                      disabled={a.role === 'admin' && admins.filter((x) => x.role === 'admin').length <= 1}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={addOpen} onClose={() => !addMutation.isPending && setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Добавить администратора или менеджера</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Роль</InputLabel>
            <Select
              value={formRole}
              label="Роль"
              onChange={(e) => setFormRole(e.target.value as 'admin' | 'sales_manager')}
            >
              <MenuItem value="admin">Админ</MenuItem>
              <MenuItem value="sales_manager">Менеджер по продажам</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            sx={{ mb: 2 }}
            autoFocus
          />
          <TextField
            fullWidth
            label="Имя (необязательно)"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Пароль"
            type="password"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            helperText="Минимум 8 символов, заглавная, строчная, цифра"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={addMutation.isPending}>
            Отмена
          </Button>
          <Button variant="contained" onClick={handleAdd} disabled={addMutation.isPending}>
            {addMutation.isPending ? 'Создание...' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!resetOpen} onClose={() => !resetMutation.isPending && setResetOpen(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Сбросить пароль</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {resetOpen && (
            <Typography sx={{ mb: 2 }}>Новый пароль для {resetOpen.email}</Typography>
          )}
          <TextField
            fullWidth
            label="Новый пароль"
            type="password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            helperText="Минимум 8 символов, заглавная, строчная, цифра"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(null)} disabled={resetMutation.isPending}>
            Отмена
          </Button>
          <Button variant="contained" onClick={handleReset} disabled={resetMutation.isPending || resetPassword.length < 8}>
            {resetMutation.isPending ? 'Сохранение...' : 'Сбросить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState } from 'react';
import { listPayments, createPayment, updatePayment, deletePayment } from '@/services/cmsApi';
import { Payment } from '@/types/cms';
import { useToast } from '@/components/common/ToastProvider';

export function PaymentsSection({ dealId, payments }: { dealId: number; payments: Payment[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const createMut = useMutation({
    mutationFn: (payment: Partial<Payment>) => createPayment(payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', dealId] });
      showToast('Платеж создан', 'success');
      setDialogOpen(false);
      setEditingPayment(null);
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка при создании платежа', 'error');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payment }: { id: number; payment: Partial<Payment> }) => updatePayment(id, payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', dealId] });
      showToast('Платеж обновлен', 'success');
      setDialogOpen(false);
      setEditingPayment(null);
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка при обновлении платежа', 'error');
    },
  });

  const deleteMut = useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', dealId] });
      showToast('Платеж удален', 'success');
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка при удалении платежа', 'error');
    },
  });

  const handleOpenDialog = (payment?: Payment) => {
    if (payment) {
      setEditingPayment(payment);
    } else {
      setEditingPayment({
        id: 0,
        dealId,
        amount: 0,
        currency: 'RUB',
        dueDate: new Date().toISOString().split('T')[0],
        status: 'pending',
      } as Payment);
    }
    setDialogOpen(true);
  };

  const formatCurrency = (amount: number, currency = 'RUB') => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(amount);
  };

  const getStatusColor = (status: Payment['status']) => {
    switch (status) {
      case 'paid': return 'success';
      case 'overdue': return 'error';
      case 'cancelled': return 'default';
      default: return 'warning';
    }
  };

  const isOverdue = (dueDate: string, status: Payment['status']) => {
    if (status === 'paid' || status === 'cancelled') return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Платежи</Typography>
          <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Добавить платеж
          </Button>
        </Box>
        {payments.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Нет платежей</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Сумма</TableCell>
                  <TableCell>Срок оплаты</TableCell>
                  <TableCell>Дата оплаты</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Описание</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment) => {
                  const overdue = isOverdue(payment.dueDate, payment.status);
                  return (
                    <TableRow key={payment.id}>
                      <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
                      <TableCell>
                        {new Date(payment.dueDate).toLocaleDateString('ru-RU')}
                        {overdue && (
                          <Chip label="Просрочен" size="small" color="error" sx={{ ml: 1 }} />
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.paidDate ? new Date(payment.paidDate).toLocaleDateString('ru-RU') : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={payment.status === 'paid' ? 'Оплачен' : payment.status === 'overdue' ? 'Просрочен' : payment.status === 'cancelled' ? 'Отменен' : 'Ожидает оплаты'}
                          size="small"
                          color={getStatusColor(payment.status)}
                        />
                      </TableCell>
                      <TableCell>{payment.description || '-'}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenDialog(payment)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (window.confirm('Удалить платеж?')) {
                              deleteMut.mutate(payment.id);
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPayment?.id ? 'Редактировать платеж' : 'Добавить платеж'}</DialogTitle>
        <DialogContent>
          {editingPayment && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Сумма"
                  type="number"
                  value={editingPayment.amount || ''}
                  onChange={(e) => setEditingPayment({ ...editingPayment, amount: parseFloat(e.target.value) || 0 })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Валюта</InputLabel>
                  <Select
                    value={editingPayment.currency || 'RUB'}
                    label="Валюта"
                    onChange={(e) => setEditingPayment({ ...editingPayment, currency: e.target.value })}
                  >
                    <MenuItem value="RUB">RUB</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Срок оплаты"
                  type="date"
                  value={editingPayment.dueDate ? new Date(editingPayment.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditingPayment({ ...editingPayment, dueDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Дата оплаты"
                  type="date"
                  value={editingPayment.paidDate ? new Date(editingPayment.paidDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditingPayment({ ...editingPayment, paidDate: e.target.value || undefined })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Статус</InputLabel>
                  <Select
                    value={editingPayment.status || 'pending'}
                    label="Статус"
                    onChange={(e) => setEditingPayment({ ...editingPayment, status: e.target.value as Payment['status'] })}
                  >
                    <MenuItem value="pending">Ожидает оплаты</MenuItem>
                    <MenuItem value="paid">Оплачен</MenuItem>
                    <MenuItem value="overdue">Просрочен</MenuItem>
                    <MenuItem value="cancelled">Отменен</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Описание"
                  value={editingPayment.description || ''}
                  onChange={(e) => setEditingPayment({ ...editingPayment, description: e.target.value })}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!editingPayment) return;
              if (editingPayment.id && editingPayment.id > 0) {
                updateMut.mutate({ id: editingPayment.id, payment: editingPayment });
              } else {
                createMut.mutate(editingPayment);
              }
            }}
            disabled={!editingPayment?.amount || !editingPayment?.dueDate || createMut.isPending || updateMut.isPending}
          >
            {createMut.isPending || updateMut.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}




import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  LinearProgress,
  Alert,
  Link,
  Tooltip,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAdminOrders, updateOrderStatus, type AdminOrder } from '@/services/ecommerceApi';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from '@/components/common/ToastProvider';

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  pending: 'warning',
  paid: 'success',
  processing: 'info',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'error',
};

export default function OrdersAdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [anchorEl, setAnchorEl] = useState<{ el: HTMLElement; order: AdminOrder } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: listAdminOrders,
  });

  const updateMutation = useMutation({
    mutationFn: ({ orderNumber, status, paymentStatus }: { orderNumber: string; status?: string; paymentStatus?: string }) =>
      updateOrderStatus(orderNumber, { status, paymentStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      setAnchorEl(null);
      showToast('Статус обновлён', 'success');
    },
    onError: (e: Error) => showToast(e.message || 'Ошибка', 'error'),
  });

  const orders = data?.orders || [];

  const formatCents = (cents: number) => `${Math.round(cents / 100).toLocaleString('ru-RU')} ₽`;
  const itemsSummary = (items: AdminOrder['items']) =>
    items?.map((i) => `${i.productTitle} ×${i.quantity}`).join(', ') || '—';

  return (
    <Box sx={{ p: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Заказы
        </Typography>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/admin/funnels')}
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
        >
          Воронка продаж →
        </Link>
      </Box>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Не удалось загрузить заказы
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>№ / Дата</TableCell>
              <TableCell>Клиент</TableCell>
              <TableCell>Состав</TableCell>
              <TableCell align="right">Сумма</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Оплата</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  <ShoppingCartIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1, display: 'block', mx: 'auto' }} />
                  Заказов пока нет
                </TableCell>
              </TableRow>
            )}
            {orders.map((order) => (
              <TableRow key={order.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {order.orderNumber}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {order.createdAt ? format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru }) : '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">{order.customerName || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {order.customerEmail || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {order.customerPhone || '—'}
                    </Typography>
                    {order.clientId && (
                      <Link
                        component="button"
                        variant="caption"
                        onClick={() => navigate(`/admin/clients/${order.clientId}`)}
                        sx={{ display: 'block', mt: 0.5, textDecoration: 'none' }}
                      >
                        Клиент →
                      </Link>
                    )}
                  </Box>
                </TableCell>
                <TableCell sx={{ maxWidth: 200 }}>
                  <Typography variant="caption" noWrap title={itemsSummary(order.items)}>
                    {itemsSummary(order.items)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight={600}>{formatCents(order.totalCents)}</Typography>
                </TableCell>
                <TableCell>
                  <Chip label={order.status} size="small" color={STATUS_COLORS[order.status] || 'default'} />
                </TableCell>
                <TableCell>
                  <Chip label={order.paymentStatus} size="small" color={order.paymentStatus === 'paid' ? 'success' : 'default'} />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Открыть заказ">
                    <IconButton size="small" onClick={() => window.open(`/orders/${order.orderNumber}`, '_blank')}>
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={(e) => setAnchorEl({ el: e.currentTarget, order })}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl?.el}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => updateMutation.mutate({ orderNumber: anchorEl!.order.orderNumber, status: 'processing' })}>
          В обработке
        </MenuItem>
        <MenuItem onClick={() => updateMutation.mutate({ orderNumber: anchorEl!.order.orderNumber, status: 'paid', paymentStatus: 'paid' })}>
          Оплачен
        </MenuItem>
        <MenuItem onClick={() => updateMutation.mutate({ orderNumber: anchorEl!.order.orderNumber, status: 'shipped' })}>
          Отправлен
        </MenuItem>
        <MenuItem onClick={() => updateMutation.mutate({ orderNumber: anchorEl!.order.orderNumber, status: 'delivered' })}>
          Доставлен
        </MenuItem>
        <MenuItem onClick={() => updateMutation.mutate({ orderNumber: anchorEl!.order.orderNumber, status: 'cancelled' })}>
          Отменён
        </MenuItem>
      </Menu>
    </Box>
  );
}

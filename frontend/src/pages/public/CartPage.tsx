import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCart, updateCartItem, removeFromCart, clearCart, createOrder } from '@/services/ecommerceApi';
import { CartItem } from '@/types/cms';
import { Box, Typography, Card, CardContent, Button, TextField, IconButton, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Container } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '@/auth/AuthProvider';
import { useState, SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import { useToast } from '@/components/common/ToastProvider';

export function CartPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderData, setOrderData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    paymentMethod: '',
    notes: '',
  });

  const { data, isLoading } = useQuery({ queryKey: ['cart'], queryFn: getCart });
  const items = data?.items || [];

  const updateMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) => updateCartItem(id, quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => removeFromCart(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      if (typeof window !== 'undefined' && (window as any).showSuccessNotification) {
        (window as any).showSuccessNotification('Товар удален из корзины');
      }
    },
    onError: () => {
      if (typeof window !== 'undefined' && (window as any).showErrorNotification) {
        (window as any).showErrorNotification('Ошибка при удалении товара');
      }
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      if (typeof window !== 'undefined' && (window as any).showSuccessNotification) {
        (window as any).showSuccessNotification('Корзина очищена');
      }
    },
    onError: () => {
      if (typeof window !== 'undefined' && (window as any).showErrorNotification) {
        (window as any).showErrorNotification('Ошибка при очистке корзины');
      }
    },
  });

  const orderMutation = useMutation({
    mutationFn: () => createOrder(orderData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setOrderDialogOpen(false);
      if (typeof window !== 'undefined' && (window as any).showSuccessNotification) {
        (window as any).showSuccessNotification('Заказ успешно оформлен!');
      }
      navigate(`/orders/${data.order.orderNumber}`);
    },
    onError: (error) => {
      if (typeof window !== 'undefined' && (window as any).showErrorNotification) {
        (window as any).showErrorNotification('Ошибка при оформлении заказа. Попробуйте позже.');
      }
    },
  });

  const total = items.reduce((sum, item) => {
    return sum + (item.product?.priceCents || 0) * item.quantity;
  }, 0);

  const handleQuantityChange = (item: CartItem, delta: number) => {
    const newQuantity = item.quantity + delta;
    if (newQuantity >= 1) {
      updateMutation.mutate({ id: item.id, quantity: newQuantity });
    }
  };

  const handleOrder = () => {
    // Валидация для неавторизованных пользователей
    if (!user) {
      if (!orderData.customerName || !orderData.customerName.trim()) {
        showToast('Введите ваше имя', 'error');
        return;
      }
      if (!orderData.customerEmail || !orderData.customerEmail.trim()) {
        showToast('Введите email', 'error');
        return;
      }
      // Валидация email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(orderData.customerEmail.trim())) {
        showToast('Введите корректный email адрес', 'error');
        return;
      }
      if (!orderData.customerPhone || !orderData.customerPhone.trim()) {
        showToast('Введите номер телефона', 'error');
        return;
      }
    }
    
    // Проверка что корзина не пуста
    if (items.length === 0) {
      showToast('Корзина пуста. Добавьте товары перед оформлением заказа.', 'error');
      return;
    }
    
    orderMutation.mutate();
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (items.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Корзина пуста</Typography>
          <Button variant="contained" onClick={() => navigate('/catalog')}>
            Перейти в каталог
          </Button>
        </Box>
      </Container>
    );
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <SeoMetaTags
        title="Корзина - Primecoder"
        description="Ваша корзина покупок"
        url={currentUrl}
      />
      <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Корзина</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {items.map((item) => (
            <Card key={item.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                  }}
                >
                  <Box
                    component="img"
                    src={resolveImageUrl(item.product?.imageUrl)}
                    alt={item.product?.title || 'Товар'}
                    loading="lazy"
                    sx={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 1, backgroundColor: 'grey.200' }}
                    onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = fallbackImageUrl();
                    }}
                  />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">{item.product?.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.product?.priceCents ? `${(item.product.priceCents / 100).toFixed(2)} ${item.product.currency}` : 'Цена по запросу'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Button size="small" onClick={() => handleQuantityChange(item, -1)}>-</Button>
                      <TextField
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const qty = parseInt(e.target.value) || 1;
                          if (qty >= 1) {
                            updateMutation.mutate({ id: item.id, quantity: qty });
                          }
                        }}
                        size="small"
                        sx={{ width: 60 }}
                        inputProps={{ min: 1 }}
                      />
                      <Button size="small" onClick={() => handleQuantityChange(item, 1)}>+</Button>
                      <IconButton onClick={() => removeMutation.mutate(item.id)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      textAlign: { xs: 'left', sm: 'right' },
                      mt: { xs: 1, sm: 0 },
                    }}
                  >
                    <Typography variant="h6">
                      {item.product?.priceCents ? `${((item.product.priceCents * item.quantity) / 100).toFixed(2)} ${item.product.currency}` : 'Цена по запросу'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}

          <Button variant="outlined" color="error" onClick={() => clearMutation.mutate()} sx={{ mt: 2 }}>
            Очистить корзину
          </Button>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Итого</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography>Товаров: {items.reduce((sum, item) => sum + item.quantity, 0)}</Typography>
                <Typography variant="h6">
                  {total > 0 ? `${(total / 100).toFixed(2)} RUB` : 'Цена по запросу'}
                </Typography>
              </Box>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={() => setOrderDialogOpen(true)}
                disabled={orderMutation.isPending}
              >
                {orderMutation.isPending ? <CircularProgress size={24} /> : 'Оформить заказ'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Диалог оформления заказа */}
      <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Оформление заказа</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {!user && (
              <>
                <TextField
                  label="Имя"
                  value={orderData.customerName}
                  onChange={(e) => setOrderData(prev => ({ ...prev, customerName: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="Email"
                  type="email"
                  value={orderData.customerEmail}
                  onChange={(e) => setOrderData(prev => ({ ...prev, customerEmail: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="Телефон"
                  value={orderData.customerPhone}
                  onChange={(e) => setOrderData(prev => ({ ...prev, customerPhone: e.target.value }))}
                  required
                  fullWidth
                />
              </>
            )}
            <TextField
              label="Адрес доставки"
              multiline
              rows={3}
              value={orderData.shippingAddress}
              onChange={(e) => setOrderData(prev => ({ ...prev, shippingAddress: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Способ оплаты"
              value={orderData.paymentMethod}
              onChange={(e) => setOrderData(prev => ({ ...prev, paymentMethod: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Комментарий"
              multiline
              rows={3}
              value={orderData.notes}
              onChange={(e) => setOrderData(prev => ({ ...prev, notes: e.target.value }))}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleOrder} variant="contained" disabled={orderMutation.isPending}>
            {orderMutation.isPending ? <CircularProgress size={24} /> : 'Подтвердить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    </>
  );
}


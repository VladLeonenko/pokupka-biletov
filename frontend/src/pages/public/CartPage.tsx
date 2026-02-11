import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCart, updateCartItem, removeFromCart, clearCart, createOrder } from '@/services/ecommerceApi';
import { CartItem } from '@/types/cms';
import { Box, Typography, Button, TextField, IconButton, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Container } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useAuth } from '@/auth/AuthProvider';
import { useState, SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { PageHeader } from '@/components/common/PageHeader';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import { useToast } from '@/components/common/ToastProvider';

const inputSx = {
  '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' }, '&:hover fieldset': { borderColor: 'rgba(255,187,0,0.4)' }, '&.Mui-focused fieldset': { borderColor: '#ffbb00' } },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#ffbb00' },
};

const itemCardSx = {
  p: 2.5, borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)',
  bgcolor: 'rgba(20,20,20,0.6)', mb: 2,
  display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } as any, alignItems: { xs: 'flex-start', sm: 'center' } as any,
  transition: 'border-color 0.3s',
  '&:hover': { borderColor: 'rgba(255,187,0,0.15)' },
};

export function CartPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderData, setOrderData] = useState({ customerName: '', customerEmail: '', customerPhone: '', shippingAddress: '', paymentMethod: '', notes: '' });

  const { data, isLoading } = useQuery({ queryKey: ['cart'], queryFn: getCart });
  const items = data?.items || [];

  const updateMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) => updateCartItem(id, quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
  const removeMutation = useMutation({
    mutationFn: (id: number) => removeFromCart(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
  const clearMutation = useMutation({
    mutationFn: () => clearCart(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
  const orderMutation = useMutation({
    mutationFn: () => createOrder(orderData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setOrderDialogOpen(false);
      navigate(`/orders/${data.order.orderNumber}`);
    },
    onError: () => showToast('Ошибка при оформлении заказа', 'error'),
  });

  const total = items.reduce((sum, item) => sum + (item.product?.priceCents || 0) * item.quantity, 0);

  const handleQuantityChange = (item: CartItem, delta: number) => {
    const newQuantity = item.quantity + delta;
    if (newQuantity >= 1) updateMutation.mutate({ id: item.id, quantity: newQuantity });
  };

  const handleOrder = () => {
    if (!user) {
      if (!orderData.customerName?.trim()) { showToast('Введите имя', 'error'); return; }
      if (!orderData.customerEmail?.trim()) { showToast('Введите email', 'error'); return; }
      if (!orderData.customerPhone?.trim()) { showToast('Введите телефон', 'error'); return; }
    }
    if (items.length === 0) { showToast('Корзина пуста', 'error'); return; }
    orderMutation.mutate();
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}><CircularProgress sx={{ color: '#ffbb00' }} /></Box>;
  }

  if (items.length === 0) {
    return (
      <Box component="main" sx={{ minHeight: '100vh', color: '#fff', pt: { xs: 6.25, md: 6.25 }, pb: 8 }}>
        <Container maxWidth="lg">
          <PageHeader overline="Корзина" title="Ваша корзина" decoText="CART" />
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <ShoppingCartIcon sx={{ fontSize: 64, color: 'rgba(255,255,255,0.15)', mb: 2 }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', mb: 3 }}>Корзина пуста</Typography>
            <Button onClick={() => navigate('/catalog')} sx={{ bgcolor: '#ffbb00', color: '#141414', fontWeight: 700, px: 4, py: 1.2, borderRadius: 2, textTransform: 'none', '&:hover': { bgcolor: '#e5a800', color: '#141414' } }}>
              Перейти в каталог
            </Button>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <>
      <SeoMetaTags title="Корзина — Primecoder" description="Ваша корзина покупок" url={currentUrl} noindex />
      <Box component="main" sx={{ minHeight: '100vh', color: '#fff', pt: { xs: 6.25, md: 6.25 }, pb: 8 }}>
        <Container maxWidth="lg">
          <PageHeader overline="Корзина" title="Ваша корзина" decoText="CART" />

          <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
            {/* Items */}
            <Box sx={{ flex: 1 }} data-anim="fade-up">
              {items.map((item) => (
                <Box key={item.id} sx={itemCardSx}>
                  <Box
                    component="img"
                    src={resolveImageUrl(item.product?.imageUrl)}
                    alt={item.product?.title || 'Товар'}
                    loading="lazy"
                    sx={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
                    onError={(e: SyntheticEvent<HTMLImageElement>) => { (e.target as HTMLImageElement).src = fallbackImageUrl(); }}
                  />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, color: '#fff', fontSize: '1rem', mb: 0.5 }}>{item.product?.title}</Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mb: 1 }}>
                      {item.product?.priceCents ? `${Math.round(item.product.priceCents / 100).toLocaleString('ru-RU')} ₽` : 'По запросу'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button size="small" onClick={() => handleQuantityChange(item, -1)} sx={{ minWidth: 32, color: '#fff', borderColor: 'rgba(255,255,255,0.15)' }} variant="outlined">−</Button>
                      <Typography sx={{ color: '#fff', fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{item.quantity}</Typography>
                      <Button size="small" onClick={() => handleQuantityChange(item, 1)} sx={{ minWidth: 32, color: '#fff', borderColor: 'rgba(255,255,255,0.15)' }} variant="outlined">+</Button>
                      <IconButton onClick={() => removeMutation.mutate(item.id)} sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#ff5252' } }} size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography sx={{ fontWeight: 700, color: '#ffbb00', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
                    {item.product?.priceCents ? `${Math.round((item.product.priceCents * item.quantity) / 100).toLocaleString('ru-RU')} ₽` : 'По запросу'}
                  </Typography>
                </Box>
              ))}
              <Button onClick={() => clearMutation.mutate()} variant="outlined" sx={{ mt: 1, borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', textTransform: 'none', '&:hover': { borderColor: '#ff5252', color: '#ff5252' } }}>
                Очистить корзину
              </Button>
            </Box>

            {/* Summary */}
            <Box sx={{ width: { xs: '100%', md: 320 }, flexShrink: 0, position: 'sticky', top: 100, alignSelf: 'flex-start' }} data-anim="fade-up">
              <Box sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(255,187,0,0.2)', bgcolor: 'rgba(20,20,20,0.7)' }}>
                <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '1.1rem', mb: 2 }}>Итого</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>Товаров</Typography>
                  <Typography sx={{ color: '#fff', fontWeight: 600 }}>{items.reduce((s, i) => s + i.quantity, 0)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>Сумма</Typography>
                  <Typography sx={{ color: '#ffbb00', fontWeight: 700, fontSize: '1.3rem' }}>
                    {total > 0 ? `${Math.round(total / 100).toLocaleString('ru-RU')} ₽` : 'По запросу'}
                  </Typography>
                </Box>
                <Button
                  fullWidth
                  onClick={() => setOrderDialogOpen(true)}
                  disabled={orderMutation.isPending}
                  sx={{ bgcolor: '#ffbb00', color: '#141414', fontWeight: 700, py: 1.5, borderRadius: 2, textTransform: 'none', fontSize: '1rem', '&:hover': { bgcolor: '#e5a800', color: '#141414' } }}
                >
                  {orderMutation.isPending ? <CircularProgress size={22} sx={{ color: '#141414' }} /> : 'Оформить заказ'}
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Order dialog */}
          <Dialog
            open={orderDialogOpen}
            onClose={() => setOrderDialogOpen(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { bgcolor: '#1a1a1a', color: '#fff', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' } }}
          >
            <DialogTitle sx={{ fontWeight: 700, color: '#fff' }}>Оформление заказа</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                {!user && (
                  <>
                    <TextField label="Имя" value={orderData.customerName} onChange={(e) => setOrderData(p => ({ ...p, customerName: e.target.value }))} required fullWidth sx={inputSx} />
                    <TextField label="Email" type="email" value={orderData.customerEmail} onChange={(e) => setOrderData(p => ({ ...p, customerEmail: e.target.value }))} required fullWidth sx={inputSx} />
                    <TextField label="Телефон" value={orderData.customerPhone} onChange={(e) => setOrderData(p => ({ ...p, customerPhone: e.target.value }))} required fullWidth sx={inputSx} />
                  </>
                )}
                <TextField label="Комментарий" multiline rows={3} value={orderData.notes} onChange={(e) => setOrderData(p => ({ ...p, notes: e.target.value }))} fullWidth sx={inputSx} />
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setOrderDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'none' }}>Отмена</Button>
              <Button onClick={handleOrder} disabled={orderMutation.isPending} sx={{ bgcolor: '#ffbb00', color: '#141414', fontWeight: 700, px: 3, borderRadius: 2, textTransform: 'none', '&:hover': { bgcolor: '#e5a800', color: '#141414' } }}>
                {orderMutation.isPending ? <CircularProgress size={20} sx={{ color: '#141414' }} /> : 'Подтвердить'}
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </>
  );
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCart, updateCartItem, removeFromCart, clearCart, createOrder } from '@/services/ecommerceApi';
import { CartItem } from '@/types/cms';
import { Box, Typography, TextField, IconButton, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useAuth } from '@/auth/AuthProvider';
import { useState, SyntheticEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { TicketsUserPageLayout, ticketsUser } from '@/components/tickets/TicketsUserPageLayout';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';
import { useToast } from '@/components/common/ToastProvider';
import { pushPurchase, pushRemoveFromCart } from '@/utils/dataLayer';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#fff',
  },
};

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
    mutationFn: ({ id, product }: { id: number; product: CartItem['product'] }) => {
      if (product) {
        pushRemoveFromCart({
          id: product.slug || String(id),
          name: product.title || 'Позиция',
          price: product.priceCents ? product.priceCents / 100 : undefined,
          quantity: 1,
        });
      }
      return removeFromCart(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
  const clearMutation = useMutation({
    mutationFn: () => clearCart(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
  const orderMutation = useMutation({
    mutationFn: () => createOrder(orderData),
    onSuccess: (data) => {
      pushPurchase(
        data.order.orderNumber,
        items.map((item) => ({
          id: item.product?.slug || String(item.id),
          name: item.product?.title || 'Позиция',
          price: item.product?.priceCents ? item.product.priceCents / 100 : undefined,
          quantity: item.quantity,
        })),
        total > 0 ? total / 100 : undefined
      );
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setOrderDialogOpen(false);
      navigate(`/orders/${data.order.orderNumber}`);
    },
    onError: () => showToast('Не удалось создать заказ. Попробуйте ещё раз.', 'error'),
  });

  const total = items.reduce((sum, item) => sum + (item.product?.priceCents || 0) * item.quantity, 0);

  const handleQuantityChange = (item: CartItem, delta: number) => {
    const newQuantity = item.quantity + delta;
    if (newQuantity >= 1) updateMutation.mutate({ id: item.id, quantity: newQuantity });
  };

  const handleOrder = () => {
    if (!user) {
      if (!orderData.customerName?.trim()) {
        showToast('Укажите имя', 'error');
        return;
      }
      if (!orderData.customerEmail?.trim()) {
        showToast('Укажите email', 'error');
        return;
      }
      if (!orderData.customerPhone?.trim()) {
        showToast('Укажите телефон', 'error');
        return;
      }
    }
    if (items.length === 0) {
      showToast('Корзина пуста', 'error');
      return;
    }
    orderMutation.mutate();
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10, background: '#fafafa' }}>
        <CircularProgress sx={{ color: 'var(--neg-orange, #ff4e18)' }} />
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <SeoMetaTags title="Корзина" description="Выберите мероприятия и оформите билеты" url={currentUrl} noindex />
        <TicketsUserPageLayout
          overline="Покупка"
          title="Корзина пуста"
          subtitle="Добавьте места или услуги из карточки события — позиции появятся здесь перед оплатой."
        >
          <Box className={`${ticketsUser.card} ${ticketsUser.cardPad}`} sx={{ textAlign: 'center', maxWidth: 480, mx: 'auto', py: 3 }}>
            <ShoppingBagOutlinedIcon sx={{ fontSize: 56, color: 'rgba(0,0,0,0.12)', mb: 2 }} />
            <Typography className={ticketsUser.muted} sx={{ mb: 2.5 }}>
              Загляните в афишу или в поиск по мероприятиям — выберите дату и зону, затем перейдите к оплате.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
              <Link className={ticketsUser.btnPrimary} to="/events">
                Все мероприятия
              </Link>
              <Link className={ticketsUser.btnGhost} to="/">
                На главную
              </Link>
            </Box>
          </Box>
        </TicketsUserPageLayout>
      </>
    );
  }

  return (
    <>
      <SeoMetaTags title="Корзина — оформление" description="Проверьте состав заказа перед оплатой" url={currentUrl} noindex />
      <TicketsUserPageLayout
        overline="Покупка"
        title="Корзина"
        subtitle="Проверьте количество и сумму. После подтверждения создаётся заказ — дальше оплата и получение билетов на email."
      >
        <Box
          sx={{
            display: 'flex',
            gap: { xs: 2, md: 3 },
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'flex-start',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <Box className={`${ticketsUser.card} ${ticketsUser.cardPad}`} sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'flex-start', background: 'rgba(255,78,24,0.06)', borderColor: 'rgba(255,78,24,0.2)' }}>
              <InfoOutlinedIcon sx={{ color: 'var(--neg-orange, #ff4e18)', mt: 0.25 }} />
              <Typography className={ticketsUser.muted} sx={{ fontSize: '0.84rem' }}>
                Для билетов на события после оплаты приходит подтверждение на почту. Статус оплаты можно смотреть в разделе «Заказы» в{' '}
                <Link className={ticketsUser.link} to="/account">
                  личном кабинете
                </Link>
                .
              </Typography>
            </Box>

            {items.map((item) => (
              <Box
                key={item.id}
                className={`${ticketsUser.card} ${ticketsUser.cardPad}`}
                sx={{
                  display: 'flex',
                  gap: 2,
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  mb: 2,
                }}
              >
                <Box
                  component="img"
                  src={resolveImageUrl(item.product?.imageUrl)}
                  alt={item.product?.title || ''}
                  loading="lazy"
                  sx={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }}
                  onError={(e: SyntheticEvent<HTMLImageElement>) => {
                    (e.target as HTMLImageElement).src = fallbackImageUrl();
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, color: '#111', fontSize: '1rem', mb: 0.5 }}>{item.product?.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(0,0,0,0.45)', mb: 1.25 }}>
                    {item.product?.priceCents
                      ? `${Math.round(item.product.priceCents / 100).toLocaleString('ru-RU')} ₽ за ед.`
                      : 'Цена по запросу'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={ticketsUser.btnGhost}
                      style={{ padding: '6px 12px', minWidth: 40 }}
                      onClick={() => handleQuantityChange(item, -1)}
                    >
                      −
                    </button>
                    <Typography sx={{ fontWeight: 800, color: '#111', minWidth: 28, textAlign: 'center' }}>{item.quantity}</Typography>
                    <button
                      type="button"
                      className={ticketsUser.btnGhost}
                      style={{ padding: '6px 12px', minWidth: 40 }}
                      onClick={() => handleQuantityChange(item, 1)}
                    >
                      +
                    </button>
                    <IconButton
                      aria-label="Удалить"
                      onClick={() => removeMutation.mutate({ id: item.id, product: item.product })}
                      sx={{ color: 'rgba(0,0,0,0.35)', '&:hover': { color: '#c62828' } }}
                      size="small"
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography sx={{ fontWeight: 800, color: 'var(--neg-orange, #ff4e18)', fontSize: '1.05rem', whiteSpace: 'nowrap', alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                  {item.product?.priceCents
                    ? `${Math.round((item.product.priceCents * item.quantity) / 100).toLocaleString('ru-RU')} ₽`
                    : '—'}
                </Typography>
              </Box>
            ))}

            <button type="button" className={ticketsUser.btnGhost} onClick={() => clearMutation.mutate()}>
              Очистить корзину
            </button>
          </Box>

          <Box sx={{ width: { xs: '100%', md: 300 }, flexShrink: 0, position: { md: 'sticky' }, top: { md: 96 }, alignSelf: 'flex-start' }}>
            <Box className={`${ticketsUser.card} ${ticketsUser.cardPad}`} sx={{ borderColor: 'rgba(255,78,24,0.35)', boxShadow: '0 8px 32px rgba(255,78,24,0.12)' }}>
              <Typography sx={{ fontWeight: 900, color: '#111', fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', mb: 2 }}>
                Итого
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <span className={ticketsUser.muted}>Позиций</span>
                <Typography sx={{ fontWeight: 700, color: '#111' }}>{items.reduce((s, i) => s + i.quantity, 0)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <span className={ticketsUser.muted}>Сумма</span>
                <Typography sx={{ fontWeight: 900, color: 'var(--neg-orange, #ff4e18)', fontSize: '1.35rem' }}>
                  {total > 0 ? `${Math.round(total / 100).toLocaleString('ru-RU')} ₽` : 'По запросу'}
                </Typography>
              </Box>
              <button
                type="button"
                className={ticketsUser.btnPrimary}
                style={{ width: '100%' }}
                disabled={orderMutation.isPending}
                onClick={() => setOrderDialogOpen(true)}
              >
                {orderMutation.isPending ? (
                  <CircularProgress size={22} sx={{ color: '#fff' }} />
                ) : (
                  'Перейти к оформлению'
                )}
              </button>
            </Box>
          </Box>
        </Box>
      </TicketsUserPageLayout>

        <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
          <DialogTitle sx={{ fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '1rem', color: '#111' }}>
            Контакты для заказа
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
              {!user && (
                <>
                  <TextField label="Имя" required fullWidth value={orderData.customerName} onChange={(e) => setOrderData((p) => ({ ...p, customerName: e.target.value }))} sx={fieldSx} />
                  <TextField label="Email" type="email" required fullWidth value={orderData.customerEmail} onChange={(e) => setOrderData((p) => ({ ...p, customerEmail: e.target.value }))} sx={fieldSx} />
                  <TextField label="Телефон" required fullWidth value={orderData.customerPhone} onChange={(e) => setOrderData((p) => ({ ...p, customerPhone: e.target.value }))} sx={fieldSx} />
                </>
              )}
              <TextField
                label="Комментарий к заказу"
                placeholder="Например, номер столика или пожелания по местам"
                multiline
                rows={3}
                fullWidth
                value={orderData.notes}
                onChange={(e) => setOrderData((p) => ({ ...p, notes: e.target.value }))}
                sx={fieldSx}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <button type="button" className={ticketsUser.btnGhost} onClick={() => setOrderDialogOpen(false)}>
              Отмена
            </button>
            <button type="button" className={ticketsUser.btnPrimary} onClick={handleOrder} disabled={orderMutation.isPending}>
              {orderMutation.isPending ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Подтвердить'}
            </button>
          </DialogActions>
        </Dialog>
    </>
  );
}

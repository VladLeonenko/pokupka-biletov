import { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Container, Typography, Button, Card, CardContent, Grid, CircularProgress, Chip } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { getOrder, getOrderPaymentStatus } from '@/services/ecommerceApi';

export function OrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const returnedFromPayment = searchParams.get('paid') === '1';

  const { data, isLoading } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: async () => {
      const result = await getOrder(orderNumber || '');
      return result.order;
    },
    enabled: !!orderNumber,
  });
  const order = data;

  const pollPayments =
    !!order &&
    order.paymentStatus === 'pending' &&
    !!(order.paymentProvider && order.paymentProvider !== 'manual');

  const { data: paymentPoll } = useQuery({
    queryKey: ['order-payment-status', orderNumber],
    queryFn: () => getOrderPaymentStatus(orderNumber || ''),
    enabled: !!orderNumber && pollPayments,
    refetchInterval: (query) =>
      ['paid', 'failed'].includes(query.state.data?.paymentStatus || '') ? false : 8000,
  });

  useEffect(() => {
    if (paymentPoll?.paymentStatus === 'paid' && orderNumber) {
      void queryClient.invalidateQueries({ queryKey: ['order', orderNumber] });
    }
  }, [paymentPoll?.paymentStatus, orderNumber, queryClient]);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (isLoading) {
    return (
      <Box sx={{ py: 8, display: 'flex', justifyContent: 'center', bgcolor: '#fafafa', minHeight: '50vh' }}>
        <CircularProgress sx={{ color: 'var(--neg-orange, #ff4e18)' }} />
      </Box>
    );
  }

  if (!order) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, bgcolor: '#fafafa', minHeight: '60vh' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#111', mb: 1 }}>
          Заказ не найден
        </Typography>
        <Typography sx={{ color: 'rgba(0,0,0,0.55)', mb: 2 }}>Проверьте ссылку или откройте список заказов в кабинете.</Typography>
        <Button variant="contained" onClick={() => navigate('/account')} sx={{ bgcolor: 'var(--neg-orange, #ff4e18)', color: '#fff', fontWeight: 800 }}>
          В личный кабинет
        </Button>
      </Container>
    );
  }

  return (
    <>
      <SeoMetaTags
        title={`Заказ №${order.orderNumber}`}
        description={`Состав и статус заказа №${order.orderNumber}`}
        url={currentUrl}
        noindex={true}
      />
      <Box sx={{ bgcolor: '#fafafa', minHeight: '100vh', pb: 6 }}>
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/account')}
            sx={{ mb: 2, color: 'rgba(0,0,0,0.65)', fontWeight: 700, textTransform: 'none' }}
          >
            Назад в личный кабинет
          </Button>

          <Typography
            variant="overline"
            sx={{ letterSpacing: '0.2em', color: 'var(--neg-orange, #ff4e18)', fontWeight: 800, display: 'block', mb: 1 }}
          >
            Заказ
          </Typography>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '1.5rem', md: '2rem' },
              fontWeight: 900,
              color: '#111',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              mb: 3,
            }}
          >
            №{order.orderNumber}
          </Typography>

          {returnedFromPayment && order.paymentStatus === 'pending' ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Мы проверяем оплату. Обычно статус обновляется за несколько секунд, страницу можно не закрывать.
            </Alert>
          ) : null}

          {order.paymentStatus === 'paid' ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              Оплата прошла успешно. Подтверждение заказа и письмо для входа в личный кабинет отправляются на email.
            </Alert>
          ) : null}

          {order.paymentStatus === 'failed' ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Оплата не прошла. Деньги не списаны, попробуйте оплатить другой картой или оформите заказ заново.
            </Alert>
          ) : null}

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 2, borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 800 }}>
                  Позиции
                </Typography>
                {order.items && order.items.length > 0 ? (
                  order.items.map((item: any, idx: number) => {
                    // Поддержка разных форматов данных: item.product?.title или item.productTitle
                    const productTitle = item.product?.title || item.productTitle || 'Позиция';
                    const priceCents = item.product?.priceCents || item.priceCents || null;
                    const currency = item.product?.currency || order.currency || 'RUB';
                    const quantity = item.quantity || 1;
                    
                    return (
                      <Box key={idx} sx={{ mb: 2, pb: 2, borderBottom: idx < order.items.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                        <Typography variant="subtitle1">{productTitle}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Количество: {quantity} × {priceCents ? `${(priceCents / 100).toFixed(2)} ${currency}` : 'Цена по запросу'}
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          Итого: {priceCents ? `${((priceCents * quantity) / 100).toFixed(2)} ${currency}` : 'Цена по запросу'}
                        </Typography>
                      </Box>
                    );
                  })
                ) : (
                  <Typography color="text.secondary">Позиций в заказе нет</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 800 }}>
                  Заказ
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Статус</Typography>
                  <Chip 
                    label={order.status || 'Новый'} 
                    color={order.status === 'completed' || order.status === 'paid' ? 'success' : order.status === 'cancelled' ? 'error' : 'default'}
                    sx={{ mt: 0.5 }}
                  />
                </Box>
                {order.paymentStatus && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Оплата</Typography>
                    <Typography variant="body1">{order.paymentStatus}</Typography>
                    {pollPayments && paymentPoll?.remote?.state && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Поставщик: {paymentPoll.remote.state}
                      </Typography>
                    )}
                  </Box>
                )}
                {order.externalTickets && order.externalTickets.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Билеты (идентификаторы у поставщика)
                    </Typography>
                    {order.externalTickets.map((t) => (
                      <Typography key={t.id} variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {t.provider}: {t.externalTicketId}
                      </Typography>
                    ))}
                  </Box>
                )}
                {(order.totalCents != null || order.total != null) && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Итого</Typography>
                    <Typography variant="h6">
                      {(() => {
                        const cents = order.totalCents ?? order.total ?? 0;
                        return cents > 0 ? `${(cents / 100).toFixed(2)} ${order.currency || 'RUB'}` : 'Цена по запросу';
                      })()}
                    </Typography>
                  </Box>
                )}
                {order.customerName && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Имя</Typography>
                    <Typography variant="body1">{order.customerName}</Typography>
                  </Box>
                )}
                {order.customerEmail && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Email</Typography>
                    <Typography variant="body1">{order.customerEmail}</Typography>
                  </Box>
                )}
                {order.customerPhone && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Телефон</Typography>
                    <Typography variant="body1">{order.customerPhone}</Typography>
                  </Box>
                )}
                {order.shippingAddress && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Адрес доставки</Typography>
                    <Typography variant="body1">{order.shippingAddress}</Typography>
                  </Box>
                )}
                {order.createdAt && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">Дата создания</Typography>
                    <Typography variant="body1">
                      {new Date(order.createdAt).toLocaleString('ru-RU')}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        </Container>
      </Box>
    </>
  );
}


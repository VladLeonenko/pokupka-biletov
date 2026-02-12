import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Container, Typography, Button, Card, CardContent, Grid, CircularProgress, Chip } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { getOrder } from '@/services/ecommerceApi';

export function OrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: async () => {
      const result = await getOrder(orderNumber || '');
      return result.order;
    },
    enabled: !!orderNumber,
  });
  const order = data;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (isLoading) {
    return (
      <>
        <Container sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Container sx={{ py: 4 }}>
          <Typography variant="h4">Заказ не найден</Typography>
          <Button onClick={() => navigate('/account')} sx={{ mt: 2 }}>
            Вернуться в личный кабинет
          </Button>
        </Container>
      </>
    );
  }

  return (
    <>
      <SeoMetaTags
        title={`Заказ №${order.orderNumber} - Primecoder`}
        description={`Детали заказа №${order.orderNumber}`}
        url={currentUrl}
        noindex={true}
      />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/account')}
          sx={{ mb: 3 }}
        >
          Назад в личный кабинет
        </Button>

        <Typography variant="overline" sx={{ letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}>Заказ</Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', mb: 3 }}>
          Заказ №{order.orderNumber}
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Товары</Typography>
                {order.items && order.items.length > 0 ? (
                  order.items.map((item: any, idx: number) => {
                    // Поддержка разных форматов данных: item.product?.title или item.productTitle
                    const productTitle = item.product?.title || item.productTitle || 'Товар';
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
                  <Typography>Товары не найдены</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Информация о заказе</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Статус</Typography>
                  <Chip 
                    label={order.status || 'Новый'} 
                    color={order.status === 'completed' ? 'success' : order.status === 'cancelled' ? 'error' : 'default'}
                    sx={{ mt: 0.5 }}
                  />
                </Box>
                {order.total && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Итого</Typography>
                    <Typography variant="h6">
                      {order.total > 0 ? `${(order.total / 100).toFixed(2)} RUB` : 'Цена по запросу'}
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
    </>
  );
}


import { useQuery } from '@tanstack/react-query';
import { getMyOrders } from '@/services/ecommerceApi';
import { Box, Typography, Button, Avatar, Chip, Container, Stack } from '@mui/material';
import { useAuth } from '@/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import PersonIcon from '@mui/icons-material/Person';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { PageHeader } from '@/components/common/PageHeader';

const quickActions = [
  { label: 'Корзина', path: '/cart' },
  { label: 'Избранное', path: '/wishlist' },
  { label: 'Каталог', path: '/catalog' },
  { label: 'AI Boost Team', path: '/account/ai-team' },
  { label: 'Проекты', path: '/account/projects' },
  { label: 'AI Ассистент', path: '/ai-chat' },
];

const tools = [
  { label: 'Проверка позиций', desc: 'Мониторинг позиций сайта по ключевым запросам', path: '/tools/position-checker' },
  { label: 'Технический аудит', desc: 'SEO-аудит: скорость, ошибки, мобильная адаптация', path: '/tools/technical-audit' },
  { label: 'Мониторинг репутации', desc: 'Управление отзывами и упоминаниями', path: '/tools/reputation-monitor' },
  { label: 'Калькулятор ROI', desc: 'Прогноз бюджета и окупаемости', path: '/tools/roi-calculator' },
  { label: 'Финансовый планировщик', desc: 'Бюджет, цели, инвестиции', path: '/account/finance-planner' },
  { label: 'Личное развитие', desc: 'Тренировки, чтение, образование', path: '/account/personal-development' },
  { label: 'Конфиденциальность', desc: 'Управление персональными данными и cookies', path: '/account/privacy-settings' },
];

const cardSx = {
  p: 3, borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)', bgcolor: 'rgba(20,20,20,0.6)',
  transition: 'border-color 0.3s, transform 0.3s',
  '&:hover': { borderColor: 'rgba(255,187,0,0.2)', transform: 'translateY(-2px)' },
};

export function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: ordersData } = useQuery({ queryKey: ['myOrders'], queryFn: getMyOrders, enabled: !!user });

  if (!user) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', mb: 2 }}>Войдите, чтобы просмотреть личный кабинет</Typography>
          <Button onClick={() => navigate('/admin/login')} sx={{ bgcolor: '#ffbb00', color: '#141414', fontWeight: 700, px: 4, py: 1.2, borderRadius: 2, '&:hover': { bgcolor: '#e5a800', color: '#141414' } }}>Войти</Button>
        </Box>
      </Box>
    );
  }

  const orders = ordersData?.orders || [];
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <SeoMetaTags title="Личный кабинет — PrimeCoder" description="Личный кабинет пользователя" url={currentUrl} noindex={true} />
      <Box component="main" sx={{ minHeight: '100vh', color: '#fff', pt: { xs: 6.25, md: 6.25 }, pb: 8 }}>
        <Container maxWidth="lg">
          <PageHeader overline="Аккаунт" title="Личный кабинет" decoText="ACCOUNT" />

          <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
            {/* Profile sidebar */}
            <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }} data-anim="fade-up">
              <Box sx={{ ...cardSx, textAlign: 'center' }}>
                <Avatar sx={{ width: 72, height: 72, mx: 'auto', mb: 2, bgcolor: 'rgba(255,187,0,0.15)', color: '#ffbb00', fontSize: '1.5rem', fontWeight: 700 }}>
                  {(user as any)?.name?.[0] || user.email?.[0] || <PersonIcon />}
                </Avatar>
                <Typography sx={{ fontWeight: 600, color: '#fff', mb: 0.3 }}>{(user as any)?.name || 'Пользователь'}</Typography>
                {user.email && <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>{user.email}</Typography>}
                <Button onClick={logout} fullWidth sx={{ mt: 2, borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: '#ffbb00', color: '#ffbb00' } }} variant="outlined">
                  Выйти
                </Button>
              </Box>
            </Box>

            {/* Main content */}
            <Box sx={{ flex: 1 }}>
              {/* Quick actions */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 4 }} data-anim="fade-up">
                {quickActions.map((a) => (
                  <Button key={a.path} onClick={() => navigate(a.path)} sx={{ borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: 2, textTransform: 'none', fontWeight: 500, '&:hover': { borderColor: '#ffbb00', color: '#ffbb00' } }} variant="outlined">
                    {a.label}
                  </Button>
                ))}
              </Box>

              {/* Orders */}
              <Box sx={{ mb: 4 }} data-anim="fade-up">
                <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '1.2rem', mb: 2 }}>Мои заказы</Typography>
                {orders.length === 0 ? (
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)' }}>У вас пока нет заказов</Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {orders.map((order: any) => (
                      <Box key={order.id} sx={{ ...cardSx, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate(`/orders/${order.orderNumber}`)}>
                        <Box>
                          <Typography sx={{ fontWeight: 600, color: '#fff' }}>Заказ #{order.orderNumber}</Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                            {order.createdAt && new Date(order.createdAt).toLocaleDateString('ru-RU')} · {order.items?.length || 0} товаров
                          </Typography>
                        </Box>
                        <Chip
                          label={order.status === 'pending' ? 'Ожидает' : order.status === 'paid' ? 'Оплачен' : order.status === 'delivered' ? 'Доставлен' : order.status}
                          size="small"
                          sx={{ bgcolor: order.status === 'delivered' ? 'rgba(76,175,80,0.15)' : 'rgba(255,187,0,0.12)', color: order.status === 'delivered' ? '#4caf50' : '#ffbb00', fontWeight: 600 }}
                        />
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>

              {/* Tools */}
              <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '1.2rem', mb: 2 }} data-anim="fade-up">Инструменты</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)' }, gap: 2 }} data-anim="stagger">
                {tools.map((t) => (
                  <Box key={t.path} data-anim-child sx={{ ...cardSx, cursor: 'pointer' }} onClick={() => navigate(t.path)}>
                    <Typography sx={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem', mb: 0.5 }}>{t.label}</Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{t.desc}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  );
}

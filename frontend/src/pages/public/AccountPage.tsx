import { useQuery } from '@tanstack/react-query';
import { getMyOrders } from '@/services/ecommerceApi';
import { Box, Typography, Avatar, Chip, Stack } from '@mui/material';
import { useAuth } from '@/auth/AuthProvider';
import { Link, useNavigate } from 'react-router-dom';
import PersonIcon from '@mui/icons-material/Person';
import EventIcon from '@mui/icons-material/Event';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import PolicyOutlinedIcon from '@mui/icons-material/PolicyOutlined';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { TicketStage } from '@/components/tickets/TicketStage';
import { ticketsUser } from '@/components/tickets/TicketsUserPageLayout';

const quick = [
  { label: 'Афиша', to: '/', hint: 'Главная и подборки' },
  { label: 'Мероприятия', to: '/events', hint: 'Поиск и фильтры' },
  { label: 'Корзина', to: '/cart', hint: 'Выбранные позиции' },
  { label: 'Избранное', to: '/wishlist', hint: 'Сохранённые события' },
  { label: 'Контакты', to: '/contacts', hint: 'Поддержка и площадки' },
];

const hints = [
  {
    icon: <ConfirmationNumberOutlinedIcon sx={{ fontSize: 28, color: 'var(--neg-orange, #ff4e18)' }} />,
    title: 'Электронные билеты',
    text:
      'После оплаты данные заказа и билеты приходят на email. Сохраняйте письмо или покажите QR на входе — как указано в письме от организатора.',
  },
  {
    icon: <EventIcon sx={{ fontSize: 28, color: 'var(--neg-orange, #ff4e18)' }} />,
    title: 'Дата и состав заказа',
    text:
      'Статус оплаты и состав билетов смотрите в карточке заказа ниже. При вопросах по возврату или переносу обращайтесь в поддержку через контакты.',
  },
  {
    icon: <PolicyOutlinedIcon sx={{ fontSize: 28, color: 'var(--neg-orange, #ff4e18)' }} />,
    title: 'Данные и уведомления',
    text: (
      <>
        Персональные данные и рассылки можно настроить в разделе{' '}
        <Link className={ticketsUser.link} to="/account/privacy-settings">
          конфиденциальности
        </Link>
        .
      </>
    ),
  },
];

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Ожидает оплаты',
    paid: 'Оплачен',
    delivered: 'Выполнен',
    completed: 'Выполнен',
    cancelled: 'Отменён',
  };
  return map[status] || status;
}

export function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: ordersData } = useQuery({ queryKey: ['myOrders'], queryFn: getMyOrders, enabled: !!user });

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const orders = ordersData?.orders || [];

  if (!user) {
    return (
      <>
        <SeoMetaTags title="Личный кабинет" description="Войдите, чтобы управлять заказами и билетами" url={currentUrl} noindex />
        <TicketStage
          kicker="Аккаунт"
          title="Кабинет"
          lead="Войдите тем же email, что указывали при оплате — заказы подтянутся сами."
          stub="ВХОД"
        >
          <Box className={`${ticketsUser.card} ${ticketsUser.cardPad}`} sx={{ textAlign: 'center', maxWidth: 420, mx: 'auto' }}>
            <Typography className={ticketsUser.muted} sx={{ mb: 2 }}>
              Войдите под тем же email, что указывали при оплате — так мы сопоставим ваши заказы.
            </Typography>
            <button type="button" className={ticketsUser.btnPrimary} onClick={() => navigate('/admin/login')}>
              Войти
            </button>
          </Box>
        </TicketStage>
      </>
    );
  }

  return (
    <>
      <SeoMetaTags title="Личный кабинет — афиша и билеты" description="Заказы, подсказки по билетам и быстрые ссылки" url={currentUrl} noindex />
      <TicketStage
        kicker="Аккаунт"
        title="Ваш кабинет"
        lead="Заказы, избранное и быстрый переход в афишу."
        stub="МОЙ"
      >
        <Box
          sx={{
            display: 'flex',
            gap: { xs: 3, md: 4 },
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'flex-start',
          }}
        >
          <Box
            className={`${ticketsUser.card} ${ticketsUser.cardPad}`}
            sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0, textAlign: 'center' }}
          >
            <Avatar
              sx={{
                width: 72,
                height: 72,
                mx: 'auto',
                mb: 1.5,
                bgcolor: 'rgba(255, 78, 24, 0.12)',
                color: 'var(--neg-orange, #ff4e18)',
                fontSize: '1.5rem',
                fontWeight: 800,
              }}
            >
              {(user as { name?: string })?.name?.[0] || user.email?.[0]?.toUpperCase() || <PersonIcon />}
            </Avatar>
            <Typography sx={{ fontWeight: 800, color: '#111', fontSize: '1rem', mb: 0.25 }}>
              {(user as { name?: string })?.name || 'Покупатель'}
            </Typography>
            {user.email && (
              <Typography variant="body2" sx={{ color: 'rgba(0,0,0,0.45)', fontSize: '0.85rem', wordBreak: 'break-word' }}>
                {user.email}
              </Typography>
            )}
            <button type="button" className={ticketsUser.btnGhost} style={{ width: '100%', marginTop: 16 }} onClick={() => logout()}>
              Выйти
            </button>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <Typography className={ticketsUser.sectionLabel}>Быстрые ссылки</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1, mb: 3 }}>
              {quick.map((q) => (
                <Box key={q.to} component={Link} to={q.to} className={ticketsUser.card} sx={{ p: '14px 14px 12px', textDecoration: 'none', minHeight: 84, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontFamily: 'var(--neg-font-display, Geologica, system-ui, sans-serif)', fontWeight: 700, color: '#111', fontSize: '1.05rem', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                    {q.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(0,0,0,0.45)', display: 'block', mt: 0.5 }}>
                    {q.hint}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Typography className={ticketsUser.sectionLabel}>Мои заказы</Typography>
            {orders.length === 0 ? (
              <Box className={`${ticketsUser.card} ${ticketsUser.cardPad}`} sx={{ mb: 3 }}>
                <Typography className={ticketsUser.muted} sx={{ mb: 1.5 }}>
                  Пока нет оплаченных заказов. Выберите событие в афише и оформите покупку — она появится здесь.
                </Typography>
                <Link className={ticketsUser.btnPrimary} to="/events" style={{ display: 'inline-flex' }}>
                  К мероприятиям
                </Link>
              </Box>
            ) : (
              <Stack spacing={1.25} sx={{ mb: 3 }}>
                {orders.map((order: { id: number | string; orderNumber: string; createdAt?: string; status?: string; items?: unknown[] }) => (
                  <Box
                    key={order.id}
                    component={Link}
                    to={`/orders/${order.orderNumber}`}
                    className={`${ticketsUser.card} ${ticketsUser.cardPad}`}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 2,
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'box-shadow 0.2s, border-color 0.2s',
                      '&:hover': { boxShadow: '0 8px 28px rgba(0,0,0,0.08)', borderColor: 'rgba(255,78,24,0.35)' },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800, color: '#111', fontSize: '0.95rem' }}>Заказ №{order.orderNumber}</Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(0,0,0,0.45)', fontSize: '0.82rem' }}>
                        {order.createdAt && new Date(order.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                        {typeof order.items?.length === 'number' ? ` · ${order.items.length} поз.` : ''}
                      </Typography>
                    </Box>
                    <Chip
                      label={statusLabel(String(order.status || ''))}
                      size="small"
                      sx={{
                        flexShrink: 0,
                        fontWeight: 700,
                        bgcolor: 'rgba(0,0,0,0.06)',
                        color: '#111',
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            )}

            <Typography className={ticketsUser.sectionLabel}>Полезно при покупке</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
              {hints.map((h) => (
                <Box key={h.title} className={`${ticketsUser.card} ${ticketsUser.cardPad}`}>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                    <Box sx={{ flexShrink: 0 }}>{h.icon}</Box>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: '#111', fontSize: '0.88rem', mb: 0.75 }}>{h.title}</Typography>
                      <Typography component="div" className={ticketsUser.muted} sx={{ fontSize: '0.84rem' }}>
                        {h.text}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </TicketStage>
    </>
  );
}

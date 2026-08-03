import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { TicketsUserPageLayout, ticketsUser } from '@/components/tickets/TicketsUserPageLayout';
import { TicketHoldTimer } from '@/components/tickets/TicketHoldTimer';
import { useTicketCart } from '@/context/TicketCartContext';
import { isTicketHoldActive } from '@/utils/ticketSeatHold';

export function CartPage() {
  const {
    cart,
    hold,
    clearCart,
    ensureSeatHold,
    setPurchaseOpen,
    reservePending,
    reserveError,
  } = useTicketCart();

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const openCheckout = useCallback(async () => {
    if (!cart) return;
    const ok = await ensureSeatHold(cart);
    if (ok) setPurchaseOpen(true);
  }, [cart, ensureSeatHold, setPurchaseOpen]);

  if (!cart || cart.seats.length === 0) {
    return (
      <>
        <SeoMetaTags title="Корзина" description="Выберите места на схеме и оформите билеты" url={currentUrl} noindex />
        <TicketsUserPageLayout
          overline="Покупка"
          title="Корзина пуста"
          subtitle="Выберите места на схеме события — они появятся здесь и в нижней панели перед оплатой."
        >
          <Box className={`${ticketsUser.card} ${ticketsUser.cardPad}`} sx={{ textAlign: 'center', maxWidth: 480, mx: 'auto', py: 3 }}>
            <ShoppingBagOutlinedIcon sx={{ fontSize: 56, color: 'rgba(0,0,0,0.12)', mb: 2 }} />
            <Typography className={ticketsUser.muted} sx={{ mb: 2.5 }}>
              Откройте афишу, выберите событие и места на схеме зала или стадиона.
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

  const seatCount = cart.seats.length;
  const seatsLine =
    cart.seatLabels && cart.seatLabels.length > 0 ? cart.seatLabels : cart.seats;

  return (
    <>
      <SeoMetaTags title="Корзина — оформление билетов" description="Проверьте места перед оплатой" url={currentUrl} noindex />
      <TicketsUserPageLayout
        overline="Покупка"
        title="Корзина"
        subtitle="Места забронируются на несколько минут. Дальше — контакты и редирект в банк. Билет придёт на email."
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
            <Box
              className={`${ticketsUser.card} ${ticketsUser.cardPad}`}
              sx={{
                display: 'flex',
                gap: 1.5,
                mb: 2,
                alignItems: 'flex-start',
                background: 'rgba(255,78,24,0.06)',
                borderColor: 'rgba(255,78,24,0.2)',
              }}
            >
              <InfoOutlinedIcon sx={{ color: 'var(--neg-orange, #ff4e18)', mt: 0.25 }} />
              <Typography className={ticketsUser.muted} sx={{ fontSize: '0.84rem' }}>
                Шаги: места → данные → оплата в банке. После оплаты электронный билет приходит на email.
                Статус смотрите в{' '}
                <Link className={ticketsUser.link} to="/account">
                  личном кабинете
                </Link>
                .
              </Typography>
            </Box>

            <Box className={`${ticketsUser.card} ${ticketsUser.cardPad}`} sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 800, color: '#111', fontSize: '1.05rem', mb: 0.5 }}>
                {cart.eventTitle || 'Событие'}
              </Typography>
              {cart.sessionLabel ? (
                <Typography variant="body2" sx={{ color: 'rgba(0,0,0,0.45)', mb: 1.25 }}>
                  {cart.sessionLabel}
                </Typography>
              ) : null}
              <Typography sx={{ fontWeight: 700, color: '#111', mb: 1 }}>
                Выбрано мест: {seatCount}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                {seatsLine.map((s, i) => (
                  <Box
                    key={`${s}-${i}`}
                    sx={{
                      px: 1,
                      py: 0.4,
                      borderRadius: '2px',
                      bgcolor: 'rgba(0,0,0,0.05)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                    }}
                  >
                    {s}
                  </Box>
                ))}
              </Box>
              {isTicketHoldActive(hold) ? <TicketHoldTimer hold={hold} variant="bar" /> : null}
              {reserveError ? (
                <Typography variant="caption" color="error" component="div" sx={{ mt: 1 }}>
                  {reserveError}
                </Typography>
              ) : null}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                <Link className={ticketsUser.btnGhost} to={cart.ticketHref}>
                  Вернуться к схеме
                </Link>
                <button type="button" className={ticketsUser.btnGhost} onClick={clearCart}>
                  <DeleteOutlineIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
                  Очистить
                </button>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              width: { xs: '100%', md: 300 },
              flexShrink: 0,
              position: { md: 'sticky' },
              top: { md: 96 },
              alignSelf: 'flex-start',
            }}
          >
            <Box
              className={`${ticketsUser.card} ${ticketsUser.cardPad}`}
              sx={{ borderColor: 'rgba(255,78,24,0.35)', boxShadow: '0 8px 32px rgba(255,78,24,0.12)' }}
            >
              <Typography
                sx={{
                  fontWeight: 900,
                  color: '#111',
                  fontSize: '0.72rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  mb: 2,
                }}
              >
                Итого
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <span className={ticketsUser.muted}>Мест</span>
                <Typography sx={{ fontWeight: 700, color: '#111' }}>{seatCount}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <span className={ticketsUser.muted}>Сумма</span>
                <Typography sx={{ fontWeight: 900, color: 'var(--neg-orange, #ff4e18)', fontSize: '1.35rem' }}>
                  {cart.baseTotalRub > 0
                    ? `${cart.baseTotalRub.toLocaleString('ru-RU')} ₽`
                    : '—'}
                </Typography>
              </Box>
              <Typography className={ticketsUser.muted} sx={{ fontSize: '0.78rem', mb: 1.5 }}>
                Бронь на несколько минут · редирект в банк · билет на email
              </Typography>
              <button
                type="button"
                className={ticketsUser.btnPrimary}
                style={{ width: '100%' }}
                disabled={reservePending}
                onClick={() => void openCheckout()}
              >
                {reservePending ? (
                  <CircularProgress size={22} sx={{ color: '#fff' }} />
                ) : (
                  `К оплате${cart.baseTotalRub > 0 ? ` · ${cart.baseTotalRub.toLocaleString('ru-RU')} ₽` : ''}`
                )}
              </button>
            </Box>
          </Box>
        </Box>
      </TicketsUserPageLayout>
    </>
  );
}

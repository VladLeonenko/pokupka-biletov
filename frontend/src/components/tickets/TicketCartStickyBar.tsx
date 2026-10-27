import { lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Button, CircularProgress, IconButton, Paper, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTicketCart } from '@/context/TicketCartContext';
import { TicketHoldTimer } from '@/components/tickets/TicketHoldTimer';
import { isTicketHoldActive } from '@/utils/ticketSeatHold';
import styles from './TicketCartStickyBar.module.css';

const TicketPurchaseDialog = lazy(() =>
  import('@/components/tickets/TicketPurchaseDialog').then((m) => ({
    default: m.TicketPurchaseDialog,
  })),
);

export function TicketCartStickyBar() {
  const {
    cart,
    hold,
    purchaseOpen,
    setPurchaseOpen,
    clearCart,
    ensureSeatHold,
    reservePending,
    reserveError,
    releaseSeatHold,
  } = useTicketCart();

  const openPurchase = useCallback(async () => {
    if (!cart) return;
    const ok = await ensureSeatHold(cart);
    if (ok) setPurchaseOpen(true);
  }, [cart, ensureSeatHold, setPurchaseOpen]);

  /**
   * Плашка фиксированная, поэтому на мобильном она ложится поверх контента в
   * конце страницы. Пока она видна — резервируем под неё место внизу body.
   */
  const barRef = useRef<HTMLDivElement | null>(null);
  const shouldShowBar = Boolean(cart && cart.seats.length > 0 && !purchaseOpen);
  useEffect(() => {
    const node = barRef.current;
    if (!shouldShowBar || !node) return undefined;
    const prev = document.body.style.paddingBottom;
    const apply = () => {
      document.body.style.paddingBottom = `${Math.ceil(node.getBoundingClientRect().height)}px`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(node);
    return () => {
      ro.disconnect();
      document.body.style.paddingBottom = prev;
    };
  }, [shouldShowBar]);

  if (!cart || cart.seats.length === 0) return null;
  if (typeof document === 'undefined') return null;

  const seatCount = cart.seats.length;
  const seatsLine =
    cart.seatLabels && cart.seatLabels.length > 0 && cart.seatLabels.length <= 4
      ? cart.seatLabels.join('; ')
      : null;
  /** Ложа целиком / зона: в labels уже человекочитаемо — не пишем «Выбрано мест: 8». */
  const selectionTitle = seatsLine
    ? `Выбрано: ${seatsLine}`
    : `Выбрано мест: ${seatCount}`;

  return createPortal(
    <>
      {!purchaseOpen ? (
        <div className={styles.shell} ref={barRef}>
          <div className={styles.inner}>
            <Paper className={styles.bar} elevation={8} component="div" role="region" aria-label="Выбранные места">
              <IconButton
                className={styles.closeBtn}
                aria-label="Закрыть и сбросить выбор"
                onClick={clearCart}
                size="medium"
              >
                <CloseIcon />
              </IconButton>
              <div className={styles.main}>
                <Typography variant="body2" className={styles.title}>
                  {selectionTitle}
                </Typography>
                {isTicketHoldActive(hold) ? (
                  <TicketHoldTimer hold={hold} variant="bar" />
                ) : null}
                {reserveError ? (
                  <Typography variant="caption" color="error" component="div" sx={{ mt: 0.25 }}>
                    {reserveError}
                  </Typography>
                ) : null}
                {cart.eventTitle ? (
                  <Typography variant="caption" color="text.secondary" className={styles.title} component="div">
                    <Link to={cart.ticketHref} style={{ color: 'inherit', textDecoration: 'underline' }}>
                      {cart.eventTitle}
                    </Link>
                  </Typography>
                ) : null}
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.35, opacity: 0.9 }}>
                  {isTicketHoldActive(hold)
                    ? 'Бронь активна · дальше данные и оплата в банке · билет на email'
                    : 'Места → данные → оплата в банке · билет на email'}
                </Typography>
              </div>
              <div className={styles.actions}>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={reservePending}
                  onClick={() => void openPurchase()}
                >
                  {reservePending ? (
                    <CircularProgress size={20} sx={{ color: 'inherit' }} />
                  ) : (
                    <>
                      К оплате
                      {cart.baseTotalRub > 0 ? ` · ${cart.baseTotalRub.toLocaleString('ru-RU')} ₽` : ''}
                    </>
                  )}
                </Button>
              </div>
            </Paper>
          </div>
        </div>
      ) : null}

      {purchaseOpen ? (
        <Suspense fallback={null}>
          <TicketPurchaseDialog
            open={purchaseOpen}
            onClose={() => setPurchaseOpen(false)}
            repertoireId={cart.repertoireId}
            offerId={cart.offerId}
            seats={cart.seats}
            offerSelections={cart.mapOfferSelections}
            seatLabels={cart.seatLabels}
            eventTitle={cart.eventTitle}
            baseTotalRub={cart.baseTotalRub}
            sessionLabel={cart.sessionLabel}
            descriptionLead={cart.descriptionLead}
            requiresFanId={cart.requiresFanId}
            hold={hold}
            onHoldExpired={() => {
              void releaseSeatHold();
              setPurchaseOpen(false);
            }}
          />
        </Suspense>
      ) : null}
    </>,
    document.body,
  );
}

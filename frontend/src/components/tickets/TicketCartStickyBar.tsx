import { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Button, IconButton, Paper, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTicketCart } from '@/context/TicketCartContext';
import styles from './TicketCartStickyBar.module.css';

const TicketPurchaseDialog = lazy(() =>
  import('@/components/tickets/TicketPurchaseDialog').then((m) => ({
    default: m.TicketPurchaseDialog,
  })),
);

export function TicketCartStickyBar() {
  const { cart, purchaseOpen, setPurchaseOpen, clearCart } = useTicketCart();

  if (!cart || cart.seats.length === 0) return null;
  if (typeof document === 'undefined') return null;

  const seatCount = cart.seats.length;
  const seatsLine =
    cart.seatLabels && cart.seatLabels.length > 0 && cart.seatLabels.length <= 4
      ? cart.seatLabels.join('; ')
      : null;

  return createPortal(
    <>
      {!purchaseOpen ? (
        <div className={styles.shell}>
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
                  Выбрано мест: {seatCount}
                  {seatsLine ? ` · ${seatsLine}` : ''}
                </Typography>
                {cart.eventTitle ? (
                  <Typography variant="caption" color="text.secondary" className={styles.title} component="div">
                    <Link to={cart.ticketHref} style={{ color: 'inherit', textDecoration: 'underline' }}>
                      {cart.eventTitle}
                    </Link>
                  </Typography>
                ) : null}
              </div>
              <div className={styles.actions}>
                <Button variant="contained" color="primary" onClick={() => setPurchaseOpen(true)}>
                  Забронировать
                  {cart.baseTotalRub > 0 ? ` за ${cart.baseTotalRub.toLocaleString('ru-RU')} ₽` : ''}
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
          />
        </Suspense>
      ) : null}
    </>,
    document.body,
  );
}

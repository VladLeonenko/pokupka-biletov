import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, CircularProgress, Dialog, DialogContent, IconButton, TextField } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useMutation } from '@tanstack/react-query';
import { checkoutBiletTickets, validateBiletTicketPromo } from '@/services/biletPublicApi';
import { reachMetrikaGoal } from '@/utils/yandexMetrika';
import styles from './TicketPurchaseDialog.module.css';

export type TicketPurchaseDialogProps = {
  open: boolean;
  onClose: () => void;
  repertoireId: string;
  offerId: string;
  seats: string[];
  offerSelections?: Array<{ offerId: string; seats: string[] }>;
  seatLabels?: string[];
  eventTitle: string;
  /** Сумма до промокода, ₽ */
  baseTotalRub: number;
  /** Дата и время сеанса (из оффера), одна строка */
  sessionLabel?: string | null;
  /** Краткий тизер описания (как на странице события) */
  descriptionLead?: string | null;
};

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '2px' },
  '& .MuiInputLabel-root': { fontSize: '0.875rem' },
};

export function TicketPurchaseDialog({
  open,
  onClose,
  repertoireId,
  offerId,
  seats,
  offerSelections,
  seatLabels,
  eventTitle,
  baseTotalRub,
  sessionLabel,
  descriptionLead,
}: TicketPurchaseDialogProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [promo, setPromo] = useState('');
  const [promoHint, setPromoHint] = useState<{ ok: boolean; text: string } | null>(null);
  const [promoFinalRub, setPromoFinalRub] = useState<number | null>(null);
  const [promoDiscountRub, setPromoDiscountRub] = useState<number | null>(null);

  const base = useMemo(
    () => (Number.isFinite(baseTotalRub) ? Math.max(0, baseTotalRub) : 0),
    [baseTotalRub],
  );

  useEffect(() => {
    if (!open) return;
    setPromoHint(null);
    setPromoFinalRub(null);
    setPromoDiscountRub(null);
  }, [open, base]);

  useEffect(() => {
    if (!open) return;
    const code = promo.trim();
    if (!code) {
      setPromoHint(null);
      setPromoFinalRub(null);
      setPromoDiscountRub(null);
      return;
    }
    const t = window.setTimeout(() => {
      validateBiletTicketPromo(code, base)
        .then((r) => {
          if (!r.ok) {
            setPromoHint({ ok: false, text: r.error || 'Недоступен' });
            setPromoFinalRub(null);
            setPromoDiscountRub(null);
            return;
          }
          setPromoHint({ ok: true, text: 'Промокод учтён' });
          setPromoFinalRub(r.finalRub ?? null);
          setPromoDiscountRub(r.discountRub ?? null);
        })
        .catch((e: Error) => {
          setPromoHint({ ok: false, text: e.message || 'Ошибка проверки' });
          setPromoFinalRub(null);
          setPromoDiscountRub(null);
        });
    }, 450);
    return () => clearTimeout(t);
  }, [promo, base, open]);

  const displayFinalRub = promoFinalRub != null ? promoFinalRub : base;

  const checkoutMut = useMutation({
    mutationFn: async () => {
      return checkoutBiletTickets({
        offerId,
        seats,
        offerSelections,
        repertoireId,
        eventTitle,
        customerName: fullName.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim(),
        promoCode: promo.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      reachMetrikaGoal('purchase', {
        repertoire_id: repertoireId || undefined,
        offer_id: offerId || undefined,
        seats_count: seats.length,
        total_rub: displayFinalRub,
      });
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    },
  });

  const canSubmit =
    fullName.trim().length > 2 &&
    phone.replace(/\D/g, '').length >= 10 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    seats.length > 0;

  const handleClose = useCallback(() => {
    if (checkoutMut.isPending) return;
    onClose();
  }, [checkoutMut.isPending, onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      fullWidth
      scroll="paper"
      PaperProps={{
        className: styles.paper,
        elevation: 0,
        'aria-labelledby': 'ticket-purchase-title',
      }}
      BackdropProps={{ className: styles.overlay }}
    >
      <span className={styles.accentBar} aria-hidden />
      <div className={styles.head}>
        <p className={styles.kicker}>Оформление</p>
        <h2 id="ticket-purchase-title" className={styles.title}>
          Данные для оплаты
        </h2>
        <IconButton className={styles.closeBtn} aria-label="Закрыть" onClick={handleClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>

      <DialogContent className={styles.body}>
        <div className={styles.eventBlock}>
          <p className={styles.eventTitle}>{eventTitle}</p>
          <div className={styles.sessionBlock}>
            <span className={styles.sessionLabel}>Сеанс</span>
            <p className={styles.sessionWhen}>
              {sessionLabel?.trim() || 'Дата и время уточняются'}
            </p>
          </div>
          {descriptionLead?.trim() ? (
            <p className={styles.eventDesc}>{descriptionLead.trim()}</p>
          ) : null}
          <div className={styles.seatsRow}>
            <span className={styles.seatsLabel}>Места</span>
            {(seatLabels?.length ? seatLabels : seats).map((s, idx) => (
              <span key={`${s}-${idx}`} className={styles.seatChip}>
                {s}
              </span>
            ))}
          </div>
        </div>

        <p className={styles.sectionLabel}>Контакты</p>
        <div className={styles.formGrid}>
          <TextField
            required
            label="ФИО"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            fullWidth
            size="medium"
            autoComplete="name"
            className={styles.field}
            sx={fieldSx}
          />
          <div className={styles.formRow2}>
            <TextField
              required
              label="Телефон"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              size="medium"
              autoComplete="tel"
              placeholder="+7"
              className={styles.field}
              sx={fieldSx}
            />
            <TextField
              required
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              size="medium"
              autoComplete="email"
              type="email"
              className={styles.field}
              sx={fieldSx}
            />
          </div>
          <div className={styles.promoWrap}>
            <TextField
              label="Промокод"
              value={promo}
              onChange={(e) => setPromo(e.target.value.toUpperCase())}
              fullWidth
              size="medium"
              placeholder="Если есть"
              className={styles.field}
              sx={fieldSx}
            />
            {promoHint ? (
              <p
                className={`${styles.promoHint} ${promoHint.ok ? styles.promoHintOk : styles.promoHintBad}`}
                role="status"
              >
                {promoHint.text}
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.summary}>
          <p className={styles.summaryKicker}>Сводка</p>
          <div className={styles.row}>
            <span className={styles.rowMuted}>Билеты, {seats.length} шт.</span>
            <span className={styles.rowPrice}>{base.toLocaleString('ru-RU')} ₽</span>
          </div>
          {promoDiscountRub != null && promoDiscountRub > 0 ? (
            <div className={`${styles.row} ${styles.discountRow}`}>
              <span>Скидка по промокоду</span>
              <span className={styles.rowPrice}>−{promoDiscountRub.toLocaleString('ru-RU')} ₽</span>
            </div>
          ) : null}
          <hr className={styles.divider} />
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>К оплате</span>
            <span className={styles.totalValue}>{displayFinalRub.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>

        {checkoutMut.isError ? (
          <div className={styles.errorBox} role="alert">
            {(checkoutMut.error as Error)?.message || 'Не удалось перейти к оплате'}
          </div>
        ) : null}

        <p className={styles.legal}>
          Далее откроется защищённая страница <strong>Т-Банка</strong>. После успешной оплаты мы пришлём письмо с
          подтверждением заказа и, при первой покупке, ссылку для входа в личный кабинет.
        </p>
      </DialogContent>

      <Box className={styles.footer} component="div">
        <Button className={styles.btnGhost} onClick={handleClose} disabled={checkoutMut.isPending} color="inherit">
          Отмена
        </Button>
        <Button
          className={styles.btnPrimary}
          variant="contained"
          disableElevation
          disabled={!canSubmit || checkoutMut.isPending}
          onClick={() => {
            reachMetrikaGoal('checkout_start', {
              repertoire_id: repertoireId || undefined,
              offer_id: offerId || undefined,
              seats_count: seats.length,
              total_rub: displayFinalRub,
            });
            checkoutMut.mutate();
          }}
        >
          {checkoutMut.isPending ? (
            <CircularProgress size={22} sx={{ color: '#fff' }} />
          ) : (
            'Перейти к оплате'
          )}
        </Button>
      </Box>
    </Dialog>
  );
}

import { useSearchParams, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, CircularProgress, Container, Typography } from '@mui/material';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { fetchGiftTicketView } from '@/services/biletPublicApi';
import styles from './GiftTicketPage.module.css';

export function GiftTicketPage() {
  const { orderNumber = '' } = useParams<{ orderNumber: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() || '';

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['gift-ticket', orderNumber, token],
    queryFn: () => fetchGiftTicketView(orderNumber, token),
    enabled: Boolean(orderNumber && token),
    retry: false,
  });

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (!orderNumber || !token) {
    return (
      <Container sx={{ py: 6 }}>
        <Typography>Неверная ссылка на подарок.</Typography>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: 'var(--neg-orange, #ff4e18)' }} />
      </Box>
    );
  }

  if (isError || !data?.ok) {
    return (
      <Container sx={{ py: 6 }}>
        <Typography color="error">{(error as Error)?.message || 'Подарок не найден или ссылка устарела'}</Typography>
      </Container>
    );
  }

  const seats =
    data.seatLabels && data.seatLabels.length > 0 ? data.seatLabels : (data.seats || []).map((s) => String(s));

  return (
    <>
      <SeoMetaTags title="Вам подарили билет" description={data.eventTitle} url={currentUrl} noindex />
      <Container maxWidth="sm" className={styles.wrap}>
        <div className={styles.card}>
          <CardGiftcardOutlinedIcon className={styles.icon} aria-hidden />
          <p className={styles.kicker}>Подарок</p>
          <h1 className={styles.title}>{data.eventTitle}</h1>
          {data.fromName ? (
            <p className={styles.from}>
              От <strong>{data.fromName}</strong>
              {data.recipientName ? ` для ${data.recipientName}` : ''}
            </p>
          ) : null}
          {data.sessionLabel ? <p className={styles.meta}>Сеанс: {data.sessionLabel}</p> : null}
          {seats.length > 0 ? (
            <div className={styles.seats}>
              {seats.map((s) => (
                <span key={s} className={styles.seatChip}>
                  {s}
                </span>
              ))}
            </div>
          ) : null}
          {data.message ? <blockquote className={styles.message}>{data.message}</blockquote> : null}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, lineHeight: 1.6 }}>
            Электронный билет придёт на email покупателя после оплаты. Сохраните эту страницу или договоритесь с тем,
            кто вас пригласил.
          </Typography>
          <Button component={Link} to="/events" variant="contained" sx={{ mt: 3, bgcolor: '#ff4e18', fontWeight: 700 }}>
            Смотреть афишу
          </Button>
        </div>
      </Container>
    </>
  );
}

/**
 * Краткий текст под PageHeader на странице /new-client (без дубля заголовка).
 */
import { Box, Typography } from '@mui/material';

export function NewClientSection() {
  return (
    <Box sx={{ mb: 4 }} data-anim="fade-up">
      <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: { xs: '1rem', md: '1.1rem' }, lineHeight: 1.7, maxWidth: 640 }}>
        Мы рады новым партнёрам! Чтобы наше сотрудничество было максимально эффективным, заполните короткую анкету.
        Это поможет нам быстрее понять ваши потребности и предложить оптимальное решение для вашего бизнеса.
      </Typography>
    </Box>
  );
}

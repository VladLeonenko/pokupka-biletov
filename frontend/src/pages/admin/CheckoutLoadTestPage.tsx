import { Box, Typography } from '@mui/material';
import { CheckoutLoadTestPanel } from '@/components/admin/CheckoutLoadTestPanel';
import { MonitorControlPanel } from '@/components/admin/MonitorControlPanel';
import { TonSniperPanel } from '@/components/admin/TonSniperPanel';

export function CheckoutLoadTestPage() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
        Снайпер мест (авто-бронирование)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Через API Афиши: выбирает лучшие соседние пары мест и сразу выдаёт ссылку на оплату.
      </Typography>
      <MonitorControlPanel />
      <Box sx={{ mt: 3 }}>
        <CheckoutLoadTestPanel />
      </Box>
      <Box sx={{ mt: 3 }}>
        <TonSniperPanel />
      </Box>
    </Box>
  );
}

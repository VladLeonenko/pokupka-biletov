import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import {
  captureReferralIfNeeded,
  extractDeepLinkTo,
} from '@/utils/referral';

/** /r/:code — capture → редирект на to= или /. Невалидный код — сообщение, без cookie. */
export function ReferralLandingPage() {
  const { code: rawCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = String(rawCode || '')
      .trim()
      .toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{1,31}$/.test(code)) {
      setError('Некорректная ссылка агента');
      return;
    }

    let cancelled = false;
    (async () => {
      const r = await captureReferralIfNeeded(code);
      if (cancelled) return;

      if (!r.ok && r.error === 'agent_not_found') {
        setError('Ссылка агента не найдена или отключена');
        return;
      }
      if (!r.ok && r.error === 'invalid_code') {
        setError('Некорректная ссылка агента');
        return;
      }
      // network / прочее — всё равно ведём дальше (cookie могла сохраниться локально)
      const to = extractDeepLinkTo(`?${searchParams.toString()}`) || '/';
      navigate(to, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [rawCode, searchParams, navigate]);

  if (error) {
    return (
      <Box sx={{ minHeight: '40vh', display: 'grid', placeItems: 'center', gap: 2, p: 3 }}>
        <Alert severity="warning" sx={{ maxWidth: 420 }}>
          {error}
        </Alert>
        <Button component={RouterLink} to="/" variant="contained">
          На главную
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '40vh', display: 'grid', placeItems: 'center', gap: 1, p: 3 }}>
      <CircularProgress size={28} />
      <Typography variant="body2" color="text.secondary">
        Переход по ссылке агента…
      </Typography>
    </Box>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Paper, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthProvider';

export function MagicLinkPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { magicLinkLogin, user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Нет токена в ссылке');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const u = await magicLinkLogin(token);
        if (cancelled) return;
        const path = ['admin', 'sales_manager'].includes(u.role ?? '') ? '/admin' : '/account';
        navigate(path, { replace: true });
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка входа');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, magicLinkLogin, navigate]);

  if (user) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Paper sx={{ p: 3, width: 360 }} elevation={3}>
        {error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={28} />
            <Typography>Вход по ссылке…</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

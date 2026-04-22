import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import Cookies from 'js-cookie';
import { resetPasswordWithToken } from '@/services/ecommerceApi';
import { setAuthToken } from '@/utils/authStorage';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError('Пароли не совпадают');
      return;
    }
    if (!token) {
      setError('Нет токена в ссылке');
      return;
    }
    setLoading(true);
    try {
      const data = await resetPasswordWithToken(token, password);
      Cookies.set('auth_token', data.token, { expires: 7 });
      setAuthToken(data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      window.location.assign('/account');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Paper sx={{ p: 3, width: 400 }}>
          <Typography color="error">Некорректная ссылка сброса пароля.</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Paper sx={{ p: 3, width: 400 }} elevation={3}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Новый пароль
        </Typography>
        <form onSubmit={onSubmit}>
          <TextField
            label="Пароль"
            type="password"
            fullWidth
            sx={{ mb: 2 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <TextField
            label="Повтор пароля"
            type="password"
            fullWidth
            sx={{ mb: 2 }}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
          />
          {error && (
            <Typography color="error" sx={{ mb: 1 }}>
              {error}
            </Typography>
          )}
          <Button type="submit" variant="contained" fullWidth disabled={loading}>
            Сохранить
          </Button>
        </form>
      </Paper>
    </Box>
  );
}

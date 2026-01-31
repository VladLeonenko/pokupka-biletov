import { useState, useEffect } from 'react';
import { Box, Button, Paper, TextField, Typography, Link as MuiLink } from '@mui/material';
import { useAuth } from '@/auth/AuthProvider';
import { useNavigate, Link } from 'react-router-dom';

export function LoginPage() {
  const { login, token, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Если уже авторизован при загрузке страницы, редиректим
  useEffect(() => {
    if (token && user && !loading && !email && !password) {
      // Только если это не попытка входа (поля пустые)
      const targetPath = user.role === 'admin' ? '/admin' : '/account';
      navigate(targetPath, { replace: true });
    }
  }, [token, user, navigate, loading, email, password]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      // Не делаем navigate здесь - useEffect обработает редирект после обновления состояния
      // Просто ждем обновления состояния
      await new Promise(resolve => setTimeout(resolve, 200));
      // Если редирект не произошел автоматически, делаем его вручную
      if (loggedUser.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/account', { replace: true });
      }
    } catch (e: any) {
      setError(e.message || 'Ошибка входа');
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Paper sx={{ p: 3, width: 360 }} elevation={3}>
        <Typography variant="h6" sx={{ mb: 2 }}>Вход в админ‑панель</Typography>
        <form onSubmit={onSubmit}>
          <TextField label="Email" fullWidth sx={{ mb: 2 }} value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Пароль" type="password" fullWidth sx={{ mb: 2 }} value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>}
          <Button type="submit" variant="contained" fullWidth disabled={loading}>Войти</Button>
        </form>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Нет аккаунта?{' '}
            <MuiLink component={Link} to="/register" style={{ fontWeight: 'bold', textDecoration: 'none' }}>
              Зарегистрироваться
            </MuiLink>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}



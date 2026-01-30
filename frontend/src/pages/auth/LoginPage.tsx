import { useState } from 'react';
import { Box, Button, Paper, TextField, Typography, Link as MuiLink } from '@mui/material';
import { useAuth } from '@/auth/AuthProvider';
import { useNavigate, Link } from 'react-router-dom';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      navigate(loggedUser.role === 'admin' ? '/admin' : '/account');
    } catch (e: any) {
      setError(e.message || 'Ошибка входа');
    } finally {
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



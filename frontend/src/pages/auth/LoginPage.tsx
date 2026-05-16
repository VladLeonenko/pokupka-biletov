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
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Если уже авторизован при загрузке страницы (не во время логина), редиректим
  useEffect(() => {
    // Не редиректим если идет процесс логина или уже редиректим
    if (isRedirecting || loading) return;
    
    // Редиректим только если уже авторизован и это не попытка входа
    if (token && user && !email && !password) {
      const targetPath = ['admin', 'sales_manager'].includes(user.role ?? '') ? '/admin' : '/account';
      setIsRedirecting(true);
      navigate(targetPath, { replace: true });
    }
  }, [token, user, navigate, loading, email, password, isRedirecting]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setIsRedirecting(false); // Сбрасываем флаг редиректа перед логином
    
    try {
      const loggedUser = await login(email, password);
      setLoading(false);
      
      // Ждем обновления состояния и делаем редирект один раз
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const targetPath = ['admin', 'sales_manager'].includes(loggedUser.role ?? '') ? '/admin' : '/account';
      setIsRedirecting(true);
      navigate(targetPath, { replace: true });
    } catch (e: any) {
      setError(e.message || 'Ошибка входа');
      setLoading(false);
      setIsRedirecting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Paper sx={{ p: 3, width: 360 }} elevation={3}>
        <Typography variant="h6" sx={{ mb: 2 }}>Вход в личный кабинет</Typography>
        <form onSubmit={onSubmit}>
          <TextField label="Email" fullWidth sx={{ mb: 2 }} value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Пароль" type="password" fullWidth sx={{ mb: 2 }} value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>}
          <Button type="submit" variant="contained" fullWidth disabled={loading}>Войти</Button>
        </form>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <MuiLink component={Link} to="/auth/forgot-password" style={{ textDecoration: 'none' }}>
              Забыли пароль
            </MuiLink>
          </Typography>
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



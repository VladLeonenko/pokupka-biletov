import { useState } from 'react';
import { Box, Button, Paper, TextField, Typography, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';
import { requestMagicLink } from '@/services/ecommerceApi';

export function RequestMagicLinkPage() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestMagicLink(email.trim());
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Paper sx={{ p: 3, width: 400 }} elevation={3}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Вход без пароля
        </Typography>
        {done ? (
          <Typography>Если аккаунт с таким email есть, мы отправили ссылку для входа.</Typography>
        ) : (
          <form onSubmit={onSubmit}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              sx={{ mb: 2 }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && (
              <Typography color="error" sx={{ mb: 1 }}>
                {error}
              </Typography>
            )}
            <Button type="submit" variant="contained" fullWidth disabled={loading}>
              Отправить ссылку
            </Button>
          </form>
        )}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <MuiLink component={Link} to="/admin/login">
            Назад к входу
          </MuiLink>
        </Box>
      </Paper>
    </Box>
  );
}

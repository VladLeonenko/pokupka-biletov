import { Box, Typography, Button, Paper } from '@mui/material';
import { useAuth } from '@/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';

export default function TestAuth() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const storageToken = localStorage.getItem('token');

  return (
    <Box sx={{ p: 4, bgcolor: '#141414', minHeight: '100vh' }}>
      <Typography variant="h4" sx={{ color: '#ffffff', mb: 4 }}>
        🔍 Диагностика авторизации
      </Typography>

      <Paper sx={{ p: 3, bgcolor: '#1a1a1a', mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
          useAuth()
        </Typography>
        <Typography sx={{ color: '#51cf66', fontFamily: 'monospace' }}>
          token: {token ? `"${token.substring(0, 20)}..."` : 'null'}
        </Typography>
        <Typography sx={{ color: '#51cf66', fontFamily: 'monospace' }}>
          user: {user ? JSON.stringify({ id: user.id, email: user.email, role: user.role }) : 'null'}
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, bgcolor: '#1a1a1a', mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
          localStorage
        </Typography>
        <Typography sx={{ color: '#51cf66', fontFamily: 'monospace' }}>
          token: {storageToken ? `"${storageToken.substring(0, 20)}..."` : 'null'}
        </Typography>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={() => navigate('/admin/planner')}
          sx={{ bgcolor: '#667eea' }}
        >
          Перейти к планировщику
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            console.log('Full token:', storageToken);
            console.log('Full user:', user);
          }}
          sx={{ borderColor: '#ffffff', color: '#ffffff' }}
        >
          Вывести в консоль
        </Button>
      </Box>
    </Box>
  );
}



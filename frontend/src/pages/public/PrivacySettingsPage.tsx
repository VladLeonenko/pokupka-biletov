import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
} from '@mui/material';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { getConsents, deleteConsent } from '@/services/consentsApi';
import { useAuth } from '@/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { CookieSettingsModal } from '@/components/privacy/CookieSettingsModal';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import { useCookieConsent } from '@/hooks/useCookieConsent';

export function PrivacySettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getPreferences } = useCookieConsent();
  const [showCookieSettings, setShowCookieSettings] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; consentId: number | null }>({
    open: false,
    consentId: null,
  });

  const { data: consents = [], isLoading } = useQuery({
    queryKey: ['consents'],
    queryFn: getConsents,
    enabled: true, // Работает и без авторизации (по session_id)
  });

  const deleteMutation = useMutation({
    mutationFn: deleteConsent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consents'] });
      setDeleteDialog({ open: false, consentId: null });
    },
  });

  useEffect(() => {
    if (!user) {
      navigate('/admin/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const cookiePreferences = getPreferences();

  const handleDeleteConsent = (id: number) => {
    setDeleteDialog({ open: true, consentId: id });
  };

  const confirmDelete = () => {
    if (deleteDialog.consentId) {
      deleteMutation.mutate(deleteDialog.consentId);
    }
  };

  const getConsentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cookies: '🍪 Cookies',
      privacy: '🔒 Обработка ПД',
      marketing: '📧 Маркетинг',
      analytics: '📊 Аналитика',
    };
    return labels[type] || type;
  };

  const getConsentStatus = (accepted: boolean) => {
    return accepted ? (
      <Chip label="Активно" color="success" size="small" />
    ) : (
      <Chip label="Отозвано" color="error" size="small" />
    );
  };

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Button variant="text" onClick={() => navigate('/account')} sx={{ mb: 2 }}>
            ← Вернуться в кабинет
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            ⚙️ Настройки конфиденциальности
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Управляйте своими согласиями на обработку персональных данных
          </Typography>
        </Box>

        {/* Настройки Cookies */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                🍪 Настройки файлов Cookie
              </Typography>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setShowCookieSettings(true)}
              >
                Изменить настройки
              </Button>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Обязательные:</strong> {cookiePreferences.necessary ? '✅ Включены' : '❌ Отключены'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Функциональные:</strong> {cookiePreferences.functional ? '✅ Включены' : '❌ Отключены'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Аналитические:</strong> {cookiePreferences.analytical ? '✅ Включены' : '❌ Отключены'}
              </Typography>
              <Typography variant="body2">
                <strong>Маркетинговые:</strong> {cookiePreferences.marketing ? '✅ Включены' : '❌ Отключены'}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* История согласий */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              📋 История согласий
            </Typography>

            {isLoading ? (
              <Typography>Загрузка...</Typography>
            ) : consents.length === 0 ? (
              <Alert severity="info">
                У вас пока нет сохранённых согласий. Согласия будут отображаться здесь после их предоставления.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Тип</TableCell>
                      <TableCell>Статус</TableCell>
                      <TableCell>Дата предоставления</TableCell>
                      <TableCell>Последнее обновление</TableCell>
                      <TableCell align="right">Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {consents.map((consent) => (
                      <TableRow key={consent.id}>
                        <TableCell>{getConsentTypeLabel(consent.type)}</TableCell>
                        <TableCell>{getConsentStatus(consent.accepted)}</TableCell>
                        <TableCell>
                          {new Date(consent.created_at).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          {new Date(consent.updated_at).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDeleteConsent(consent.id)}
                          >
                            Отозвать
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Информация */}
        <Alert severity="info" sx={{ mt: 4 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>💡 Важно:</strong> Отзыв согласия может ограничить функциональность сайта. 
            Некоторые функции требуют обработки персональных данных для работы.
          </Typography>
          <Typography variant="body2">
            Подробнее о том, как мы обрабатываем ваши данные, читайте в{' '}
            <Button
              size="small"
              onClick={() => navigate('/politic')}
              sx={{ textDecoration: 'underline', p: 0, minWidth: 'auto' }}
            >
              Политике конфиденциальности
            </Button>
            .
          </Typography>
        </Alert>
      </Container>

      {/* Модальное окно настроек cookies */}
      <CookieSettingsModal
        open={showCookieSettings}
        onClose={() => setShowCookieSettings(false)}
        onSave={() => {
          setShowCookieSettings(false);
          queryClient.invalidateQueries({ queryKey: ['consents'] });
        }}
      />

      {/* Диалог подтверждения удаления */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, consentId: null })}>
        <DialogTitle>Отозвать согласие?</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите отозвать это согласие? Это может ограничить функциональность сайта.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, consentId: null })}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Отзыв...' : 'Отозвать'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}


import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Link,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { CookieSettingsModal } from './CookieSettingsModal';
import { useCookieConsent } from '@/hooks/useCookieConsent';

interface CookieConsentModalProps {
  open: boolean;
  onClose: () => void;
}

export function CookieConsentModal({ open, onClose }: CookieConsentModalProps) {
  const [showSettings, setShowSettings] = useState(false);
  const { acceptAll, rejectAll, hasConsent } = useCookieConsent();

  const handleAcceptAll = () => {
    acceptAll();
    onClose();
  };

  const handleRejectAll = () => {
    rejectAll();
    onClose();
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleSettingsSaved = () => {
    setShowSettings(false);
    onClose();
  };

  if (showSettings) {
    return (
      <CookieSettingsModal
        open={showSettings}
        onClose={handleCloseSettings}
        onSave={handleSettingsSaved}
      />
    );
  }

  return (
    <Dialog
      open={open}
      onClose={() => {}} // Нельзя закрыть без выбора
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: '1.25rem' }}>
        🍪 Использование файлов Cookie
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" paragraph>
          Мы используем файлы Cookie и аналогичные технологии для улучшения работы сайта, 
          анализа использования и персонализации контента.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Нажимая "Принять все", вы соглашаетесь на использование всех типов cookies. 
          Вы можете настроить предпочтения или отклонить необязательные cookies.
        </Typography>
        <Box sx={{ mt: 2, mb: 1 }}>
          <Link
            href="/politic"
            target="_blank"
            sx={{ fontSize: '0.875rem', textDecoration: 'underline' }}
          >
            Подробнее в Политике конфиденциальности
          </Link>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleRejectAll}
          fullWidth={false}
          sx={{ minWidth: { xs: '100%', sm: 120 } }}
        >
          Отклонить
        </Button>
        <Button
          variant="outlined"
          onClick={handleOpenSettings}
          fullWidth={false}
          sx={{ minWidth: { xs: '100%', sm: 140 } }}
        >
          Настроить
        </Button>
        <Button
          variant="contained"
          onClick={handleAcceptAll}
          fullWidth={false}
          sx={{
            minWidth: { xs: '100%', sm: 140 },
            background: 'linear-gradient(135deg, #4caf50 0%, #2196f3 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #43a047 0%, #1e88e5 100%)',
            },
          }}
        >
          Принять все
        </Button>
      </DialogActions>
    </Dialog>
  );
}


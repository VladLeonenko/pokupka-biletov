import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControlLabel,
  Checkbox,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useCookieConsent } from '@/hooks/useCookieConsent';

interface CookieSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface CookiePreferences {
  necessary: boolean; // всегда true
  functional: boolean;
  analytical: boolean;
  marketing: boolean;
}

export function CookieSettingsModal({ open, onClose, onSave }: CookieSettingsModalProps) {
  const { getPreferences, savePreferences } = useCookieConsent();
  const [preferences, setPreferences] = useState<CookiePreferences>(() => {
    const saved = getPreferences();
    return {
      necessary: true, // всегда включено
      functional: saved.functional ?? true,
      analytical: saved.analytical ?? false,
      marketing: saved.marketing ?? false,
    };
  });

  const handleToggle = (type: keyof CookiePreferences) => {
    if (type === 'necessary') return; // нельзя отключить
    setPreferences((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleSave = () => {
    savePreferences(preferences);
    onSave();
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytical: true,
      marketing: true,
    };
    savePreferences(allAccepted);
    onSave();
  };

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      functional: false,
      analytical: false,
      marketing: false,
    };
    savePreferences(onlyNecessary);
    onSave();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          ⚙️ Настройки файлов Cookie
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Выберите, какие типы cookies вы разрешаете использовать
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Обязательные cookies необходимы для работы сайта и не могут быть отключены.
          </Alert>

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={preferences.necessary}
                    disabled
                    sx={{ mr: 1 }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Обязательные cookies
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Всегда активны
                    </Typography>
                  </Box>
                }
                onClick={(e) => e.stopPropagation()}
              />
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" paragraph>
                Эти cookies необходимы для базовой функциональности сайта:
              </Typography>
              <Box component="ul" sx={{ pl: 3, mb: 0 }}>
                <li>Авторизация и безопасность</li>
                <li>Сохранение товаров в корзине</li>
                <li>Запоминание настроек сайта</li>
                <li>Защита от мошенничества</li>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={preferences.functional}
                    onChange={() => handleToggle('functional')}
                    sx={{ mr: 1 }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Функциональные cookies
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Улучшают пользовательский опыт
                    </Typography>
                  </Box>
                }
                onClick={(e) => e.stopPropagation()}
              />
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" paragraph>
                Эти cookies позволяют сайту запоминать ваши выборы и настройки:
              </Typography>
              <Box component="ul" sx={{ pl: 3, mb: 0 }}>
                <li>Языковые предпочтения</li>
                <li>История просмотров</li>
                <li>Сохранённые фильтры и настройки</li>
                <li>Персонализация интерфейса</li>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={preferences.analytical}
                    onChange={() => handleToggle('analytical')}
                    sx={{ mr: 1 }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Аналитические cookies
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Помогают улучшить сайт
                    </Typography>
                  </Box>
                }
                onClick={(e) => e.stopPropagation()}
              />
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" paragraph>
                Эти cookies помогают нам понять, как посетители используют сайт:
              </Typography>
              <Box component="ul" sx={{ pl: 3, mb: 0 }}>
                <li>Google Analytics (собирает статистику в обезличенном виде)</li>
                <li>Яндекс.Метрика (анализ поведения пользователей)</li>
                <li>Подсчёт посещений и популярных страниц</li>
                <li>Выявление проблем в работе сайта</li>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={preferences.marketing}
                    onChange={() => handleToggle('marketing')}
                    sx={{ mr: 1 }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Маркетинговые cookies
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Для показа релевантной рекламы
                    </Typography>
                  </Box>
                }
                onClick={(e) => e.stopPropagation()}
              />
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" paragraph>
                Эти cookies используются для показа персонализированной рекламы:
              </Typography>
              <Box component="ul" sx={{ pl: 3, mb: 0 }}>
                <li>Ретаргетинг (показ рекламы на других сайтах)</li>
                <li>Отслеживание эффективности рекламных кампаний</li>
                <li>Персонализация рекламных объявлений</li>
                <li>Социальные сети (кнопки "Поделиться")</li>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleRejectAll}
          fullWidth={false}
          sx={{ minWidth: { xs: '100%', sm: 120 } }}
        >
          Отклонить все
        </Button>
        <Button
          variant="outlined"
          onClick={onClose}
          fullWidth={false}
          sx={{ minWidth: { xs: '100%', sm: 100 } }}
        >
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          fullWidth={false}
          sx={{
            minWidth: { xs: '100%', sm: 140 },
            background: 'linear-gradient(135deg, #4caf50 0%, #2196f3 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #43a047 0%, #1e88e5 100%)',
            },
          }}
        >
          Сохранить
        </Button>
        <Button
          variant="contained"
          onClick={handleAcceptAll}
          fullWidth={false}
          sx={{
            minWidth: { xs: '100%', sm: 140 },
            background: 'linear-gradient(135deg, #9c27b0 0%, #e91e63 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #8e24aa 0%, #d81b60 100%)',
            },
          }}
        >
          Принять все
        </Button>
      </DialogActions>
    </Dialog>
  );
}


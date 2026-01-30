import { useState, FormEvent } from 'react';
import { getApiBase } from '@/utils/apiBase';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  FormControlLabel, 
  Checkbox,
  Grid,
  Alert,
  CircularProgress
} from '@mui/material';
import { useToast } from '@/components/common/ToastProvider';
import { Link } from 'react-router-dom';

/**
 * Секция с формой обратной связи на странице кейса
 */
export function CasesFormSection() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    tel: '',
    email: '',
    question: '',
    privacy_consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,8})+$/.test(email);
  };

  const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Введите имя';
    }

    if (!formData.tel.trim()) {
      newErrors.tel = 'Введите номер телефона';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Введите email';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Введите корректный email';
    }

    if (!formData.privacy_consent) {
      newErrors.privacy_consent = 'Необходимо согласие на обработку персональных данных';
    }

    setErrors(newErrors);
    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validation = validateForm();
    
    if (!validation.isValid) {
      const errorMessages = Object.values(validation.errors);
      if (errorMessages.length > 0) {
        showToast(errorMessages[0], 'error');
      } else {
        showToast('Пожалуйста, заполните все обязательные поля', 'error');
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      const API_BASE = getApiBase();
      
      const formId = 'contact-form';
      const response = await fetch(`${API_BASE}/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          tel: formData.tel,
          email: formData.email,
          question: formData.question,
          privacy_consent: formData.privacy_consent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Ошибка отправки формы' }));
        throw new Error(errorData.error || 'Ошибка отправки формы');
      }

      await response.json();

      setSubmitSuccess(true);
      setFormData({ name: '', tel: '', email: '', question: '', privacy_consent: false });
      setErrors({});
      showToast('Спасибо! Ваше сообщение отправлено. Мы свяжемся с вами в ближайшее время.', 'success');

      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error: any) {
      console.error('Form submission error:', error);
      const errorMessage = error.message || 'Ошибка при отправке формы';
      setErrors({ submit: errorMessage });
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <Container maxWidth={false} sx={{ maxWidth: '1170px', mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, my: 8 }}>
      <Grid container spacing={4} alignItems="flex-start">
        {/* Левая часть - описание */}
        <Grid item xs={12} md={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '1.75rem', md: '2.5rem' },
                fontWeight: 500,
                color: '#fff',
                lineHeight: 1.2,
              }}
            >
            Оставьте заявку<br />
            и получите проект мечты
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontSize: { xs: '1.25rem', md: '1.5rem' },
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              С нами вы приобретаете:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                'Уникальный продукт',
                'Высокие результаты',
                'Гарантии',
              ].map((item, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: '12px',
                      height: '12px',
                      bgcolor: '#FFBB00',
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: { xs: '1rem', md: '1.125rem' },
                      color: 'rgba(255, 255, 255, 0.9)',
                    }}
                  >
                    {item}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>

        {/* Правая часть - форма */}
        <Grid item xs={12} md={7}>
          <Box
            id="contacts-form"
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              p: { xs: 3, md: 4 },
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontSize: { xs: '1.25rem', md: '1.5rem' },
                fontWeight: 500,
                color: '#fff',
                mb: 3,
              }}
            >
              Обратная связь
            </Typography>
            <Box
              component="form"
            id="contact-form"
            onSubmit={handleSubmit}
              sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
          >
              <TextField
                name="name"
                label="Имя"
                placeholder="Введите имя"
                value={formData.name}
                onChange={handleChange}
                required
                error={!!errors.name}
                helperText={errors.name}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FFBB00',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#FFBB00',
                  },
                }}
              />

              <TextField
                name="tel"
                label="Телефон"
                type="tel"
                placeholder="Введите номер телефона"
                value={formData.tel}
                onChange={handleChange}
                required
                error={!!errors.tel}
                helperText={errors.tel}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FFBB00',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#FFBB00',
                  },
                }}
              />

              <TextField
                name="email"
                label="Электронная почта"
                type="email"
                placeholder="Введите email"
                value={formData.email}
                onChange={handleChange}
                required
                error={!!errors.email}
                helperText={errors.email}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FFBB00',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#FFBB00',
                  },
                }}
              />

              <TextField
                name="question"
                label="Ваш вопрос"
                placeholder="Введите вопрос"
                value={formData.question}
                onChange={handleChange}
                multiline
                rows={4}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FFBB00',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#FFBB00',
                  },
                }}
              />

              {submitSuccess && (
                <Alert severity="success" sx={{ bgcolor: 'rgba(76, 175, 80, 0.2)', color: '#4caf50' }}>
                  Сообщение успешно отправлено!
                </Alert>
              )}

              {errors.submit && (
                <Alert severity="error" sx={{ bgcolor: 'rgba(244, 67, 54, 0.2)', color: '#f44336' }}>
                  {errors.submit}
                </Alert>
              )}

              <FormControlLabel
                control={
                  <Checkbox
                    name="privacy_consent"
                    checked={formData.privacy_consent}
                    onChange={handleChange}
                    required
                    sx={{
                      color: '#FFBB00',
                      '&.Mui-checked': {
                        color: '#FFBB00',
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    Нажимая «Отправить», Вы подтверждаете, что ознакомились с{' '}
                    <Link to="/privacy" style={{ color: '#FFBB00', textDecoration: 'underline' }}>
                      политикой конфиденциальности
                    </Link>
                    {' '}и соглашаетесь на обработку персональных данных
                  </Typography>
                }
                sx={{ alignItems: 'flex-start', mt: 1 }}
              />
                {errors.privacy_consent && (
                <Typography sx={{ color: '#ff4444', fontSize: '12px', ml: 4 }}>
                    {errors.privacy_consent}
                </Typography>
                )}

              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                fullWidth
                sx={{
                  bgcolor: '#FFBB00',
                  color: '#000',
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 500,
                  textTransform: 'none',
                  '&:hover': {
                    bgcolor: '#ffd43b',
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(255, 187, 0, 0.5)',
                    color: 'rgba(0, 0, 0, 0.5)',
                  },
                }}
              >
                {isSubmitting ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} sx={{ color: '#000' }} />
                    Отправка...
                  </Box>
                ) : (
                  'Отправить'
                )}
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}


import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  IconButton,
  Grid,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  Phone,
} from '@mui/icons-material';
import { useAuth } from '@/auth/AuthProvider';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [agreeToPrivacy, setAgreeToPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');

  // Валидация пароля по современным стандартам 2025
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Пароль должен содержать минимум 8 символов';
    }
    if (!/[a-zа-яё]/.test(password)) {
      return 'Пароль должен содержать хотя бы одну строчную букву';
    }
    if (!/[A-ZА-ЯЁ]/.test(password)) {
      return 'Пароль должен содержать хотя бы одну заглавную букву';
    }
    if (!/[0-9]/.test(password)) {
      return 'Пароль должен содержать хотя бы одну цифру';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'Пароль должен содержать хотя бы один специальный символ (!@#$%^&*...)';
    }
    // Проверка на популярные слабые пароли
    const commonPasswords = ['password', '12345678', 'qwerty', 'admin', 'password123'];
    if (commonPasswords.includes(password.toLowerCase())) {
      return 'Этот пароль слишком распространен, выберите другой';
    }
    return null;
  };

  // Валидация email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Валидация телефона (опционально)
  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Телефон не обязателен
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Очищаем ошибку при изменении поля
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrors({});

    // Валидация формы
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Имя обязательно для заполнения';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Имя должно содержать минимум 2 символа';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email обязателен для заполнения';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Введите корректный email адрес';
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Введите корректный номер телефона';
    }

    if (!formData.password) {
      newErrors.password = 'Пароль обязателен для заполнения';
    } else {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        newErrors.password = passwordError;
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Подтвердите пароль';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    if (!agreeToTerms) {
      newErrors.terms = 'Необходимо согласие с условиями использования';
    }

    if (!agreeToPrivacy) {
      newErrors.privacy = 'Необходимо согласие на обработку персональных данных';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const result = await register(
        formData.email.trim(),
        formData.password,
        formData.name.trim(),
        formData.phone.trim() || undefined,
        agreeToTerms,
        agreeToPrivacy
      );

      if (result.requiresVerification) {
        setRequiresVerification(true);
        setVerificationEmail(formData.email);
        setSuccess(true);
      } else {
        // Успешная регистрация, переходим в личный кабинет
        navigate('/account');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка при регистрации. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setError('Введите код подтверждения');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { verifyCode: verifyCodeApi } = await import('@/services/ecommerceApi');
      await verifyCodeApi(verificationEmail, verificationCode.trim(), true);
      // После успешной верификации переходим в личный кабинет
      navigate('/account');
    } catch (err: any) {
      setError(err.message || 'Неверный код подтверждения');
    } finally {
      setLoading(false);
    }
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <SeoMetaTags
        title="Регистрация - Primecoder"
        description="Создайте аккаунт для доступа к личному кабинету и всем услугам"
        url={currentUrl}
      />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          bgcolor: 'background.default',
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={3}
            sx={{
              p: 4,
              borderRadius: 2,
            }}
          >
            {!requiresVerification ? (
              <>
                <Typography variant="h4" component="h1" gutterBottom align="center">
                  Регистрация
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                  Создайте аккаунт для доступа к личному кабинету
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <form onSubmit={handleSubmit}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Имя *"
                        value={formData.name}
                        onChange={handleChange('name')}
                        error={!!errors.name}
                        helperText={errors.name}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="email"
                        label="Email *"
                        value={formData.email}
                        onChange={handleChange('email')}
                        error={!!errors.email}
                        helperText={errors.email}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Email />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="tel"
                        label="Телефон"
                        placeholder="+7 (999) 123-45-67"
                        value={formData.phone}
                        onChange={handleChange('phone')}
                        error={!!errors.phone}
                        helperText={errors.phone || 'Необязательно'}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Phone />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type={showPassword ? 'text' : 'password'}
                        label="Пароль *"
                        value={formData.password}
                        onChange={handleChange('password')}
                        error={!!errors.password}
                        helperText={
                          errors.password ||
                          'Минимум 8 символов, заглавные и строчные буквы, цифры, спецсимволы'
                        }
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type={showConfirmPassword ? 'text' : 'password'}
                        label="Подтвердите пароль *"
                        value={formData.confirmPassword}
                        onChange={handleChange('confirmPassword')}
                        error={!!errors.confirmPassword}
                        helperText={errors.confirmPassword}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                edge="end"
                              >
                                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={agreeToTerms}
                            onChange={(e) => setAgreeToTerms(e.target.checked)}
                          />
                        }
                        label={
                          <Typography variant="body2">
                            Я согласен с{' '}
                            <Link to="/terms" target="_blank" style={{ color: 'inherit' }}>
                              условиями использования
                            </Link>{' '}
                            *
                          </Typography>
                        }
                      />
                      {errors.terms && (
                        <Typography variant="caption" color="error" sx={{ ml: 4, display: 'block' }}>
                          {errors.terms}
                        </Typography>
                      )}
                    </Grid>

                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={agreeToPrivacy}
                            onChange={(e) => setAgreeToPrivacy(e.target.checked)}
                          />
                        }
                        label={
                          <Typography variant="body2">
                            Я согласен на{' '}
                            <Link to="/privacy" target="_blank" style={{ color: 'inherit' }}>
                              обработку персональных данных
                            </Link>{' '}
                            *
                          </Typography>
                        }
                      />
                      {errors.privacy && (
                        <Typography variant="caption" color="error" sx={{ ml: 4, display: 'block' }}>
                          {errors.privacy}
                        </Typography>
                      )}
                    </Grid>

                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        size="large"
                        disabled={loading}
                        sx={{ mt: 2 }}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Зарегистрироваться'}
                      </Button>
                    </Grid>

                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          или
                        </Typography>
                      </Divider>
                    </Grid>

                    <Grid item xs={12}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Уже есть аккаунт?{' '}
                          <Link to="/admin/login" style={{ fontWeight: 'bold' }}>
                            Войти
                          </Link>
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </form>
              </>
            ) : (
              <>
                <Typography variant="h5" component="h1" gutterBottom align="center">
                  Подтверждение email
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                  Мы отправили код подтверждения на {verificationEmail}
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Код подтверждения отправлен на вашу почту
                  </Alert>
                )}

                <TextField
                  fullWidth
                  label="Код подтверждения"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  sx={{ mb: 2 }}
                  placeholder="Введите 6-значный код"
                  inputProps={{ maxLength: 6 }}
                />

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleVerifyCode}
                  disabled={loading || !verificationCode.trim()}
                  sx={{ mb: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Подтвердить'}
                </Button>

                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => {
                    setRequiresVerification(false);
                    setVerificationCode('');
                    setError(null);
                  }}
                >
                  Назад
                </Button>
              </>
            )}
          </Paper>
        </Container>
      </Box>
      <style>{`
        /* Стили для меню - скрыто по умолчанию */
        .menu {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          opacity: 0 !important;
          visibility: hidden !important;
          z-index: 50 !important;
          pointer-events: none !important;
          transition: opacity 0.3s ease, visibility 0.3s ease !important;
        }

        #burger-toggle:checked ~ .menu {
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
          z-index: 52 !important;
        }

        body {
          position: relative !important;
        }
      `}</style>
    </>
  );
}


import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import styles from '../auth/LoginPage.module.css';

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
        title="Регистрация"
        description="Создайте аккаунт, чтобы покупать билеты и смотреть заказы в личном кабинете."
        url={currentUrl}
        noindex={true}
      />
      <main className={styles.wrap}>
        <div className={styles.card}>
          <p className={styles.kicker}>Кабинет</p>
          {!requiresVerification ? (
            <>
              <h1 className={styles.title}>Регистрация</h1>
              <p className={styles.lead}>Аккаунт нужен, чтобы хранить заказы и входить без повторного ввода данных.</p>
              <form className={styles.form} onSubmit={handleSubmit}>
                <input
                  className={`${styles.field} ${errors.name ? styles.fieldError : ''}`}
                  placeholder="Имя"
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange('name')}
                />
                {errors.name ? <p className={styles.error}>{errors.name}</p> : null}
                <input
                  className={`${styles.field} ${errors.email ? styles.fieldError : ''}`}
                  type="email"
                  placeholder="Email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                />
                {errors.email ? <p className={styles.error}>{errors.email}</p> : null}
                <input
                  className={`${styles.field} ${errors.phone ? styles.fieldError : ''}`}
                  type="tel"
                  placeholder="Телефон, если есть"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                />
                {errors.phone ? <p className={styles.error}>{errors.phone}</p> : <p className={styles.hint}>Необязательно</p>}
                <div className={styles.fieldWrap}>
                  <input
                    className={`${styles.field} ${styles.fieldPad} ${errors.password ? styles.fieldError : ''}`}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Пароль"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange('password')}
                  />
                  <button className={styles.ghost} type="button" onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? 'Скрыть' : 'Показать'}
                  </button>
                </div>
                {errors.password ? (
                  <p className={styles.error}>{errors.password}</p>
                ) : (
                  <p className={styles.hint}>От 8 символов: буквы разного регистра, цифра и спецсимвол</p>
                )}
                <div className={styles.fieldWrap}>
                  <input
                    className={`${styles.field} ${styles.fieldPad} ${errors.confirmPassword ? styles.fieldError : ''}`}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Повтор пароля"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleChange('confirmPassword')}
                  />
                  <button className={styles.ghost} type="button" onClick={() => setShowConfirmPassword((v) => !v)}>
                    {showConfirmPassword ? 'Скрыть' : 'Показать'}
                  </button>
                </div>
                {errors.confirmPassword ? <p className={styles.error}>{errors.confirmPassword}</p> : null}
                <label className={styles.check}>
                  <input type="checkbox" checked={agreeToTerms} onChange={(e) => setAgreeToTerms(e.target.checked)} />
                  <span>
                    Согласен с <Link to="/offer">условиями оферты</Link>
                  </span>
                </label>
                {errors.terms ? <p className={styles.error}>{errors.terms}</p> : null}
                <label className={styles.check}>
                  <input type="checkbox" checked={agreeToPrivacy} onChange={(e) => setAgreeToPrivacy(e.target.checked)} />
                  <span>
                    Согласен на <Link to="/privacy">обработку персональных данных</Link>
                  </span>
                </label>
                {errors.privacy ? <p className={styles.error}>{errors.privacy}</p> : null}
                {error ? <p className={styles.error}>{error}</p> : null}
                <button className={styles.submit} type="submit" disabled={loading}>
                  {loading ? 'Создаём…' : 'Зарегистрироваться'}
                </button>
              </form>
              <div className={styles.links}>
                <p>
                  Уже есть аккаунт? <Link to="/auth/login">Войти</Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <h1 className={styles.title}>Подтверждение</h1>
              <p className={styles.lead}>Код отправили на {verificationEmail}</p>
              {success ? <p className={styles.note}>Проверьте почту и введите 6 цифр.</p> : null}
              <form
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleVerifyCode();
                }}
              >
                <input
                  className={styles.field}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Код из письма"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                />
                {error ? <p className={styles.error}>{error}</p> : null}
                <button className={styles.submit} type="submit" disabled={loading || !verificationCode.trim()}>
                  {loading ? 'Проверяем…' : 'Подтвердить'}
                </button>
                <button
                  className={styles.textBtn}
                  type="button"
                  onClick={() => {
                    setRequiresVerification(false);
                    setVerificationCode('');
                    setError(null);
                  }}
                >
                  Назад
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </>
  );
}

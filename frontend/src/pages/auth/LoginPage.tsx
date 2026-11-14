import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { useNavigate, Link } from 'react-router-dom';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { login, token, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isRedirecting || loading) return;
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
    setIsRedirecting(false);

    try {
      const loggedUser = await login(email, password);
      setLoading(false);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const targetPath = ['admin', 'sales_manager'].includes(loggedUser.role ?? '') ? '/admin' : '/account';
      setIsRedirecting(true);
      navigate(targetPath, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
      setLoading(false);
      setIsRedirecting(false);
    }
  };

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.kicker}>Кабинет</p>
        <h1 className={styles.title}>Вход</h1>
        <form className={styles.form} onSubmit={onSubmit}>
          <input
            className={styles.field}
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={styles.field}
            type="password"
            autoComplete="current-password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error ? <p className={styles.error}>{error}</p> : null}
          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Входим…' : 'Войти'}
          </button>
        </form>
        <div className={styles.links}>
          <p>
            <Link to="/auth/forgot-password">Забыли пароль</Link>
          </p>
          <p>
            Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

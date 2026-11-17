import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Cookies from 'js-cookie';
import { resetPasswordWithToken } from '@/services/ecommerceApi';
import { setAuthToken } from '@/utils/authStorage';
import styles from './LoginPage.module.css';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError('Пароли не совпадают');
      return;
    }
    if (!token) {
      setError('Нет токена в ссылке');
      return;
    }
    setLoading(true);
    try {
      const data = await resetPasswordWithToken(token, password);
      Cookies.set('auth_token', data.token, { expires: 7 });
      setAuthToken(data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      window.location.assign('/account');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.kicker}>Кабинет</p>
        <h1 className={styles.title}>Новый пароль</h1>
        {!token ? (
          <p className={styles.error}>Некорректная ссылка сброса пароля.</p>
        ) : (
          <form className={styles.form} onSubmit={onSubmit}>
            <input
              className={styles.field}
              type="password"
              required
              autoComplete="new-password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              className={styles.field}
              type="password"
              required
              autoComplete="new-password"
              placeholder="Повтор пароля"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
            {error ? <p className={styles.error}>{error}</p> : null}
            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </form>
        )}
        <div className={styles.links}>
          <p>
            <Link to="/auth/login">Назад к входу</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

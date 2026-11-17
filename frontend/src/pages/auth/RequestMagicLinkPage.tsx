import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestMagicLink } from '@/services/ecommerceApi';
import styles from './LoginPage.module.css';

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
    <main className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.kicker}>Кабинет</p>
        <h1 className={styles.title}>Вход без пароля</h1>
        {done ? (
          <p className={styles.note}>Если аккаунт с таким email есть, мы отправили ссылку для входа.</p>
        ) : (
          <form className={styles.form} onSubmit={onSubmit}>
            <input
              className={styles.field}
              type="email"
              required
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error ? <p className={styles.error}>{error}</p> : null}
            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? 'Отправляем…' : 'Отправить ссылку'}
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

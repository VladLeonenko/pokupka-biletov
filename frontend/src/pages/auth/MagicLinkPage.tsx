import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import styles from './LoginPage.module.css';

export function MagicLinkPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { magicLinkLogin, user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Нет токена в ссылке');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const u = await magicLinkLogin(token);
        if (cancelled) return;
        const path = ['admin', 'sales_manager'].includes(u.role ?? '') ? '/admin' : '/account';
        navigate(path, { replace: true });
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка входа');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, magicLinkLogin, navigate]);

  if (user) return null;

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.kicker}>Кабинет</p>
        <h1 className={styles.title}>Вход по ссылке</h1>
        {error ? (
          <>
            <p className={styles.error}>{error}</p>
            <div className={styles.links}>
              <p>
                <Link to="/auth/login">Войти с паролем</Link>
              </p>
            </div>
          </>
        ) : (
          <p className={styles.note}>Проверяем ссылку…</p>
        )}
      </div>
    </main>
  );
}

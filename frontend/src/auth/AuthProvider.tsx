import Cookies from 'js-cookie';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getApiBase } from '@/utils/apiBase';
import { setAuthToken, removeAuthToken } from '@/utils/authStorage';

type User = { id: number; email: string; role: string; name?: string; phone?: string } | null;

type AuthCtx = {
  user: User;
  token: string | null;
  login: (email: string, password: string) => Promise<NonNullable<User>>;
  magicLinkLogin: (token: string) => Promise<NonNullable<User>>;
  register: (email: string, password: string, name?: string, phone?: string, agreeToTerms?: boolean, agreeToPrivacy?: boolean) => Promise<{ requiresVerification?: boolean }>;
  registerPhone: (phone: string, name?: string) => Promise<{ userId: number; requiresVerification: boolean }>;
  verifyCode: (emailOrPhone: string, code: string, isEmail: boolean) => Promise<void>;
  oauthGoogle: (token: string) => Promise<void>;
  oauthYandex: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
return Cookies.get('auth_token') || null;
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<User>(() => {
    if (typeof window === 'undefined') return null;
    try {
const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'auth.token') {
        setToken(event.newValue);
      }
      if (event.key === 'auth.user') {
        try {
          setUser(event.newValue ? JSON.parse(event.newValue) : null);
        } catch {
          setUser(null);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const applyAuthPayload = async (data: { token: string; user: NonNullable<User> }) => {
    Cookies.set('auth_token', data.token, { expires: 7 });
    setAuthToken(data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    try {
      const { syncCart } = await import('@/services/ecommerceApi');
      await syncCart();
    } catch (e) {
      console.error('Failed to sync cart:', e);
    }
    return data.user;
  };

  const login = async (email: string, password: string) => {
    const base = getApiBase();
    const res = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!res.ok) throw new Error('Неверный логин или пароль');
    const data = await res.json();
    return applyAuthPayload(data);
  };

  const magicLinkLogin = async (rawToken: string) => {
    const { verifyMagicLinkToken } = await import('@/services/ecommerceApi');
    const data = await verifyMagicLinkToken(rawToken);
    return applyAuthPayload(data);
  };

  const register = async (
    email: string,
    password: string,
    name?: string,
    phone?: string,
    agreeToTerms?: boolean,
    agreeToPrivacy?: boolean
  ) => {
    const { register: registerApi } = await import('@/services/ecommerceApi');
    const data = await registerApi(email, password, name, phone, agreeToTerms, agreeToPrivacy);
    await applyAuthPayload(data);
    return { requiresVerification: data.requiresVerification };
  };

  const registerPhone = async (phone: string, name?: string) => {
    const { registerPhone: registerPhoneApi } = await import('@/services/ecommerceApi');
    return await registerPhoneApi(phone, name);
  };

  const verifyCode = async (emailOrPhone: string, code: string, isEmail: boolean) => {
    const { verifyCode: verifyCodeApi } = await import('@/services/ecommerceApi');
    const data = await verifyCodeApi(emailOrPhone, code, isEmail);
    await applyAuthPayload(data);
  };

  const oauthGoogle = async (token: string) => {
    const { oauthGoogle: oauthGoogleApi } = await import('@/services/ecommerceApi');
    const data = await oauthGoogleApi(token);
    await applyAuthPayload(data);
  };

  const oauthYandex = async (token: string) => {
    const { oauthYandex: oauthYandexApi } = await import('@/services/ecommerceApi');
    const data = await oauthYandexApi(token);
    await applyAuthPayload(data);
  };

  const refreshUser = async () => {
    try {
      const { getCurrentUser } = await import('@/services/ecommerceApi');
      const data = await getCurrentUser();
localStorage.setItem('auth_user', JSON.stringify(data.user));

      setUser(data.user);
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  };

  const logout = () => {
    Cookies.remove('auth_token');
    removeAuthToken();
    localStorage.removeItem('auth_user');

    setToken(null);
    setUser(null);
  };

  // Проверка валидности токена и автоматический logout при истечении
  useEffect(() => {
    if (!token) return;
    
    let cancelled = false;
    let checkInterval: NodeJS.Timeout | null = null;
    
    const checkTokenValidity = async () => {
      if (cancelled) return;
      
      try {
        const { getCurrentUser } = await import('@/services/ecommerceApi');
        const data = await getCurrentUser();
        
        if (cancelled) return;
        
        if (data?.user) {
          // Токен валиден, обновляем данные пользователя
          localStorage.setItem('auth_user', JSON.stringify(data.user));
          setUser(data.user);
        }
      } catch (error: any) {
        // 401 — токен истек
        if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
          console.warn('[AuthProvider] Token expired or invalid, logging out');
          if (!cancelled) {
            logout();
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin/login')) {
              window.location.href = '/admin/login';
            }
          }
        } else if (error?.name === 'TypeError' && (error?.message?.includes('Load failed') || error?.message?.includes('Failed to fetch'))) {
          // Сетевые ошибки (блокировка, таймаут) — не выходить из аккаунта, не спамить
          if (process.env.NODE_ENV === 'development') {
            console.warn('[AuthProvider] Network error checking token (may be blocked), keeping session');
          }
        } else {
          console.error('[AuthProvider] Failed to check token validity:', error);
        }
      }
    };
    
    // Проверяем сразу при монтировании если есть токен но нет user
    if (token && !user) {
      void checkTokenValidity();
    }
    
    // Периодически проверяем валидность токена (каждые 5 минут)
    checkInterval = setInterval(() => {
      if (token && !cancelled) {
        void checkTokenValidity();
      }
    }, 5 * 60 * 1000); // 5 минут
    
    return () => {
      cancelled = true;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [token, user]);

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      magicLinkLogin,
      register,
      registerPhone,
      verifyCode,
      oauthGoogle,
      oauthYandex,
      logout,
      refreshUser,
    }),
    [user, token]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}





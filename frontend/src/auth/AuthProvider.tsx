import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getApiBase } from '@/utils/apiBase';

type User = { id: number; email: string; role: string; name?: string; phone?: string } | null;

type AuthCtx = {
  user: User;
  token: string | null;
  login: (email: string, password: string) => Promise<NonNullable<User>>;
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
      return localStorage.getItem('auth.token');
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<User>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('auth.user');
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

  const login = async (email: string, password: string) => {
    const base = getApiBase();
    const res = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!res.ok) throw new Error('Неверный логин или пароль');
    const data = await res.json();
    localStorage.setItem('auth.token', data.token);
    localStorage.setItem('auth.user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    
    // Синхронизируем корзину после авторизации
    try {
      const { syncCart } = await import('@/services/ecommerceApi');
      await syncCart();
    } catch (e) {
      console.error('Failed to sync cart:', e);
    }
    return data.user;
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
    localStorage.setItem('auth.token', data.token);
    localStorage.setItem('auth.user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return { requiresVerification: data.requiresVerification };
  };

  const registerPhone = async (phone: string, name?: string) => {
    const { registerPhone: registerPhoneApi } = await import('@/services/ecommerceApi');
    return await registerPhoneApi(phone, name);
  };

  const verifyCode = async (emailOrPhone: string, code: string, isEmail: boolean) => {
    const { verifyCode: verifyCodeApi } = await import('@/services/ecommerceApi');
    const data = await verifyCodeApi(emailOrPhone, code, isEmail);
    localStorage.setItem('auth.token', data.token);
    localStorage.setItem('auth.user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    
    // Синхронизируем корзину после верификации
    try {
      const { syncCart } = await import('@/services/ecommerceApi');
      await syncCart();
    } catch (e) {
      console.error('Failed to sync cart:', e);
    }
  };

  const oauthGoogle = async (token: string) => {
    const { oauthGoogle: oauthGoogleApi } = await import('@/services/ecommerceApi');
    const data = await oauthGoogleApi(token);
    localStorage.setItem('auth.token', data.token);
    localStorage.setItem('auth.user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    
    // Синхронизируем корзину после авторизации
    try {
      const { syncCart } = await import('@/services/ecommerceApi');
      await syncCart();
    } catch (e) {
      console.error('Failed to sync cart:', e);
    }
  };

  const oauthYandex = async (token: string) => {
    const { oauthYandex: oauthYandexApi } = await import('@/services/ecommerceApi');
    const data = await oauthYandexApi(token);
    localStorage.setItem('auth.token', data.token);
    localStorage.setItem('auth.user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    
    // Синхронизируем корзину после авторизации
    try {
      const { syncCart } = await import('@/services/ecommerceApi');
      await syncCart();
    } catch (e) {
      console.error('Failed to sync cart:', e);
    }
  };

  const refreshUser = async () => {
    try {
      const { getCurrentUser } = await import('@/services/ecommerceApi');
      const data = await getCurrentUser();
      localStorage.setItem('auth.user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth.token');
    localStorage.removeItem('auth.user');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    let cancelled = false;
    const hydrateUser = async () => {
      if (!token) return;
      if (user) return;
      try {
        const { getCurrentUser } = await import('@/services/ecommerceApi');
        const data = await getCurrentUser();
        if (cancelled) return;
        if (data?.user) {
          localStorage.setItem('auth.user', JSON.stringify(data.user));
          setUser(data.user);
        }
      } catch (error) {
        console.error('[AuthProvider] Failed to hydrate user from token:', error);
        if (!cancelled) {
          logout();
        }
      }
    };
    void hydrateUser();
    return () => {
      cancelled = true;
    };
  }, [token, user]);

  const value = useMemo(() => ({ user, token, login, register, registerPhone, verifyCode, oauthGoogle, oauthYandex, logout, refreshUser }), [user, token]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}





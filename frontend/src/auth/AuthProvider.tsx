import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getApiBase } from '@/utils/apiBase';
import { getAuthToken, setAuthToken, removeAuthToken, getAuthUser, setAuthUser, removeAuthUser } from '@/utils/authStorage';

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
  // Используем универсальное хранилище с fallback для Safari ITP
  const [token, setTokenState] = useState<string | null>(() => getAuthToken());
  const [user, setUserState] = useState<User>(() => getAuthUser());

  // Обертка для setToken с синхронизацией в хранилище
  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      setAuthToken(newToken);
    } else {
      removeAuthToken();
    }
  };

  // Обертка для setUser с синхронизацией в хранилище
  const setUser = (newUser: User) => {
    setUserState(newUser);
    if (newUser) {
      setAuthUser(newUser);
    } else {
      removeAuthUser();
    }
  };

  // Слушаем изменения в хранилище (для синхронизации между вкладками)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'auth.token') {
        const newToken = event.newValue || getAuthToken();
        setTokenState(newToken);
        if (newToken) setAuthToken(newToken);
      }
      if (event.key === 'auth.user') {
        try {
          const newUser = event.newValue ? JSON.parse(event.newValue) : getAuthUser();
          setUserState(newUser);
          if (newUser) setAuthUser(newUser);
        } catch {
          setUserState(null);
        }
      }
    };
    
    window.addEventListener('storage', handleStorage);
    
    // Периодически проверяем токен из хранилища (для Safari ITP recovery)
    const checkInterval = setInterval(() => {
      const storedToken = getAuthToken();
      if (storedToken !== token) {
        setTokenState(storedToken);
      }
      const storedUser = getAuthUser();
      if (JSON.stringify(storedUser) !== JSON.stringify(user)) {
        setUserState(storedUser);
      }
    }, 30000); // Каждые 30 секунд
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(checkInterval);
    };
  }, [token, user]);

  const login = async (email: string, password: string) => {
    const base = getApiBase();
    const res = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!res.ok) throw new Error('Неверный логин или пароль');
    const data = await res.json();
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
      setUser(data.user);
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  };

  const logout = () => {
    removeAuthToken();
    removeAuthUser();
    setTokenState(null);
    setUserState(null);
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
          setUser(data.user);
        }
      } catch (error: any) {
        // Если получили 401, токен истек
        if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
          console.warn('[AuthProvider] Token expired or invalid, logging out');
          if (!cancelled) {
            logout();
            // Редиректим на логин только если не на странице логина
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin/login')) {
              window.location.href = '/admin/login';
            }
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

  const value = useMemo(() => ({ user, token, login, register, registerPhone, verifyCode, oauthGoogle, oauthYandex, logout, refreshUser }), [user, token]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}





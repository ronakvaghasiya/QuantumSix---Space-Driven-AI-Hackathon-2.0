'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  api,
  type AuthResponse,
  type LoginInput,
  type RegisterInput,
} from '@/lib/api';
import {
  AuthUser,
  clearAuth,
  detectClientPlatform,
  getStoredUser,
  getToken,
  PlatformRuntime,
  saveAuth,
} from '@/lib/auth';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  platform: PlatformRuntime | null;
  login: (input: Omit<LoginInput, 'clientPlatform'>) => Promise<void>;
  register: (input: Omit<RegisterInput, 'clientPlatform'>) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [platform, setPlatform] = useState<PlatformRuntime | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPlatform = useCallback(async () => {
    try {
      const runtime = await api.platform.runtime();
      setPlatform(runtime);
    } catch {
      setPlatform(null);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setPlatform(null);
      return;
    }
    try {
      const me = await api.auth.me();
      setUser(me);
      await loadPlatform();
    } catch {
      clearAuth();
      setUser(null);
      setPlatform(null);
    }
  }, [loadPlatform]);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored && getToken()) {
      setUser(stored);
      refreshMe().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshMe]);

  const login = useCallback(
    async (input: Omit<LoginInput, 'clientPlatform'>) => {
      const res: AuthResponse = await api.auth.login({
        ...input,
        clientPlatform: detectClientPlatform(),
      });
      saveAuth(res);
      setUser(res.user);
      await loadPlatform();
      router.replace('/');
    },
    [loadPlatform, router],
  );

  const register = useCallback(
    async (input: Omit<RegisterInput, 'clientPlatform'>) => {
      const res: AuthResponse = await api.auth.register({
        ...input,
        clientPlatform: detectClientPlatform(),
      });
      saveAuth(res);
      setUser(res.user);
      await loadPlatform();
      router.replace('/');
    },
    [loadPlatform, router],
  );

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    setPlatform(null);
    router.replace('/login');
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, platform, login, register, logout, refreshMe }),
    [user, loading, platform, login, register, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

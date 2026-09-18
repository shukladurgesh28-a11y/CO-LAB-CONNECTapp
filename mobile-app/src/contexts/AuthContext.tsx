import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getToken, setToken } from '@/lib/api';
import { login as apiLogin, logout as apiLogout, me } from '@/services/auth';
import type { Role, User } from '@/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setSessionUser: (user: User) => void;
  isSociety: boolean;
  isWorker: boolean;
  isCustomer: boolean;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (await getToken()) {
          setUser(await me());
        }
      } catch {
        await setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email.trim(), password);
    setUser(data.user);
    return data.user;
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    setUser(await me());
  }, []);

  const setSessionUser = useCallback((u: User) => setUser(u), []);

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        refreshUser,
        setSessionUser,
        isSociety: user?.role === 'cooperative_admin',
        isWorker: user?.role === 'worker',
        isCustomer: !user || user?.role === 'customer',
      }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function homeForRole(role?: Role): string {
  void role;
  return '/(app)';
}

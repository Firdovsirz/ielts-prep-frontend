import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, onUnauthorized, tokenStore, unwrap } from '../api/client';

type AuthState = {
  token: string | null;
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  /** Replaces the session after the account's e-mail or password changed (the server issues a new token). */
  applySession: (session: { token: string; email: string }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => tokenStore.get());
  const [email, setEmail] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    setEmail(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => onUnauthorized(() => setToken(null)), []);

  useEffect(() => {
    if (!token) return;
    unwrap(api.GET('/api/auth/me'))
      .then((me) => setEmail(me.email))
      .catch(() => undefined);
  }, [token]);

  const login = useCallback(async (e: string, password: string) => {
    const res = await unwrap(api.POST('/api/auth/login', { body: { email: e, password } }));
    tokenStore.set(res.token);
    setToken(res.token);
    setEmail(res.email);
  }, []);

  const applySession = useCallback((session: { token: string; email: string }) => {
    tokenStore.set(session.token);
    setToken(session.token);
    setEmail(session.email);
  }, []);

  const value = useMemo(
    () => ({ token, email, login, applySession, logout }),
    [token, email, login, applySession, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiGet, apiPost, getToken, setToken } from '../api';
import type { Role, User } from '../types';

interface SignupPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  signup: (payload: SignupPayload) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await apiGet<{ user: User }>('/auth/me');
        setUser(data.user);
      } catch {
        await setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(payload: LoginPayload) {
    const data = await apiPost<{ token: string; user: User }>('/auth/login', payload);
    await setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function signup(payload: SignupPayload) {
    const data = await apiPost<{ token: string; user: User }>('/auth/signup', payload);
    await setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await setToken(null);
    setUser(null);
  }

  async function refresh() {
    try {
      const data = await apiGet<{ user: User }>('/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      return null;
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

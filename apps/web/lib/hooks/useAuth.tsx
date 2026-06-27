'use client';

// Auth-контекст: отслеживает состояние авторизации Supabase через
// onAuthStateChange и предоставляет { user, loading, requiresPasswordSetup }
// всему дереву компонентов.
//
// requiresPasswordSetup — флаг для флоу восстановления пароля ("Забыли
// пароль?" на экране входа): когда человек переходит по ссылке из такого
// письма, Supabase создаёт временную сессию ДО того, как у него есть новый
// пароль. Без этого флага AppShell увидел бы user != null и сразу же
// перенаправил на /today, не дав показать форму "введите новый пароль".

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  requiresPasswordSetup: boolean;
  clearPasswordSetupFlag: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  requiresPasswordSetup: false,
  clearPasswordSetupFlag: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresPasswordSetup, setRequiresPasswordSetup] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY') {
        setRequiresPasswordSetup(true);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const clearPasswordSetupFlag = () => setRequiresPasswordSetup(false);

  return (
    <AuthContext.Provider value={{ user, loading, requiresPasswordSetup, clearPasswordSetupFlag }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

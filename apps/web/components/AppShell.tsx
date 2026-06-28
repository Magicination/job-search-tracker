'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../lib/hooks/useAuth';
import { Header } from './Header';
import { NavTabs } from './NavTabs';
import { ThemeToggle } from './ThemeToggle';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, requiresPasswordSetup } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== '/login') {
      router.replace('/login');
    }
    // Не уводим с /login, пока человек не задал пароль после перехода по
    // ссылке из письма — иначе форма установки пароля никогда не успеет
    // показаться.
    if (user && !requiresPasswordSetup && (pathname === '/login' || pathname === '/')) {
      router.replace('/applications');
    }
  }, [user, loading, requiresPasswordSetup, pathname, router]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-text-dim">
        Загрузка…
      </div>
    );
  }

  if (!user) {
    // На /login показываем только содержимое страницы, без хедера/навигации,
    // но переключатель темы доступен и до входа.
    return (
      <main className="relative flex flex-1 flex-col">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        {children}
      </main>
    );
  }

  return (
    <>
      <Header />
      <NavTabs />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">
        {children}
      </main>
    </>
  );
}

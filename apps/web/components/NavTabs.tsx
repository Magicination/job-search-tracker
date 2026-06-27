'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/hooks/useAuth';

const TABS = [
  { href: '/today', label: 'Сегодня' },
  { href: '/applications', label: 'Отклики' },
  { href: '/analytics', label: 'Аналитика' },
  { href: '/progress', label: 'Прогресс' },
  { href: '/resources', label: 'Ресурсы и ссылки' },
] as const;

export function NavTabs() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="relative border-b border-border-soft bg-bg">
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm transition ${
                active
                  ? 'border-accent-amber text-text'
                  : 'border-transparent text-text-dim hover:text-text'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {/* Лёгкий fade справа — намёк, что табы можно проскроллить дальше на узких экранах */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-bg to-transparent sm:hidden"
        aria-hidden="true"
      />
    </nav>
  );
}

'use client';

import { useAuth } from '../lib/hooks/useAuth';
import { useHeaderStats } from '../lib/hooks/useHeaderStats';
import { ThemeToggle } from './ThemeToggle';
import { supabase } from '../lib/supabase';
import { NotebookDrawerPortal } from './NotebookDrawerPortal';

function StatPill({ label, value, accentClass }: { label: string; value: number | string; accentClass: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-panel-2 px-3 py-1.5">
      <span className={`text-base font-semibold tabular-nums ${accentClass}`}>{value}</span>
      <span className="text-xs text-text-dim whitespace-nowrap">{label}</span>
    </div>
  );
}

export function Header() {
  const { user } = useAuth();
  const { applied, interview, offer } = useHeaderStats();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-sm text-text-dim">{user.email}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatPill label="отправлено" value={applied} accentClass="text-accent-blue" />
          <StatPill label="интервью" value={interview} accentClass="text-accent-coral" />
          <StatPill label="оффер" value={offer} accentClass="text-accent-teal" />
          <NotebookDrawerPortal />
          <ThemeToggle />
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-dim transition hover:border-border-soft hover:text-text"
          >
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}

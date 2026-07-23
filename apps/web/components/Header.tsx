'use client';

import Link from 'next/link';
import type { Stage } from '@job-search-tracker/shared';
import { useAuth } from '../lib/hooks/useAuth';
import { useHeaderStats } from '../lib/hooks/useHeaderStats';
import { useStages } from '../lib/hooks/useStages';
import { ThemeToggle } from './ThemeToggle';
import { supabase } from '../lib/supabase';

const TEXT_CLASS: Record<Stage['color'], string> = {
  blue: 'text-accent-blue',
  amber: 'text-accent-amber',
  teal: 'text-accent-teal',
  coral: 'text-accent-coral',
  neutral: 'text-text-faint',
};

function StatPill({
  label,
  value,
  accentClass,
  href,
}: {
  label: string;
  value: number | string;
  accentClass: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-border bg-panel-2 px-3 py-1.5 transition hover:border-border-soft"
    >
      <span className={`text-base font-semibold tabular-nums ${accentClass}`}>{value}</span>
      <span className="text-xs text-text-dim whitespace-nowrap">{label}</span>
    </Link>
  );
}

export function Header() {
  const { user } = useAuth();
  const { stages } = useStages();
  const { counts } = useHeaderStats(stages);

  if (!user) return null;

  const orderedStages = [...stages].sort((a, b) => a.position - b.position);

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-sm text-text-dim">{user.email}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {orderedStages.map((stage) => (
            <StatPill
              key={stage.id}
              label={stage.name.toLowerCase()}
              value={counts[stage.id] ?? 0}
              accentClass={TEXT_CLASS[stage.color]}
              href={`/applications?stage=${stage.id}`}
            />
          ))}
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

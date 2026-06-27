'use client';

import type { StudyTrack } from '@job-search-tracker/shared';
import { calculateProgressPercent } from '@job-search-tracker/shared';
import { useProgress } from '../../lib/hooks/useProgress';
import { SkeletonCard } from '../../components/Skeleton';

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border-soft bg-panel p-4">
      <div className="text-2xl font-semibold tabular-nums text-text">{value}</div>
      <div className="mt-1 text-xs text-text-dim">{label}</div>
    </div>
  );
}

function ProgressBar({
  trackLabel,
  hours,
  goalHours,
  accentClassName,
  onAdjust,
}: {
  trackLabel: string;
  hours: number;
  goalHours: number;
  // Tailwind-класс вида "bg-accent-blue" — завязан на CSS-переменную
  // var(--accent-*), которая меняется между темами через .light в
  // globals.css. Фиксированный hex здесь выглядел бы блёкло на светлом фоне,
  // как раньше выглядели бейджи до перехода на variant-систему (см. Badge.tsx).
  accentClassName: string;
  onAdjust: (delta: number) => void;
}) {
  const percent = calculateProgressPercent(hours, goalHours);

  return (
    <div className="rounded-lg border border-border-soft bg-panel p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium text-text">{trackLabel}</span>
        <span className="text-sm text-text-dim tabular-nums">
          {hours} / {goalHours} ч ({percent}%)
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-panel-2">
        <div
          className={`h-full rounded-full transition-all ${accentClassName}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onAdjust(-1)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-dim transition hover:border-border-soft hover:text-text"
        >
          −1 час
        </button>
        <button
          onClick={() => onAdjust(1)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-dim transition hover:border-border-soft hover:text-text"
        >
          +1 час
        </button>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const { metrics, studyHours, loading, adjustHours } = useProgress();

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-lg font-semibold text-text">Прогресс</h1>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
      </div>
    );
  }

  const eng = studyHours.find((s) => s.track === 'eng');
  const sql = studyHours.find((s) => s.track === 'sql');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-text">Прогресс</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Всего откликов" value={metrics.applicationsCount} />
        <MetricCard label="Интервью + офферы" value={metrics.interviewOrOfferCount} />
        <MetricCard label="Офферы" value={metrics.offerCount} />
        <MetricCard label="Выполнено задач" value={metrics.tasksDoneCount} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {eng && (
          <ProgressBar
            trackLabel="Английский"
            hours={eng.hours}
            goalHours={eng.goal_hours}
            accentClassName="bg-accent-blue"
            onAdjust={(delta) => adjustHours('eng' as StudyTrack, delta)}
          />
        )}
        {sql && (
          <ProgressBar
            trackLabel="SQL / аналитика"
            hours={sql.hours}
            goalHours={sql.goal_hours}
            accentClassName="bg-accent-teal"
            onAdjust={(delta) => adjustHours('sql' as StudyTrack, delta)}
          />
        )}
      </div>
    </div>
  );
}

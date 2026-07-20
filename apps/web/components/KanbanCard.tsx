'use client';

import type { Application, ApplicationStatus } from '@job-search-tracker/shared';
import { APPLICATION_STATUS_LABELS, type StatusHistoryPoint } from '@job-search-tracker/shared';
import { TriangleAlert } from 'lucide-react';

const STATUS_ORDER: ApplicationStatus[] = ['applied', 'interview', 'offer', 'rejected'];
const STALE_DAYS_THRESHOLD = 7;

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const applied = new Date(dateStr);
  const now = new Date();
  const diffMs = now.setHours(0, 0, 0, 0) - applied.setHours(0, 0, 0, 0);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Мини-таймлайн статусов: принимает историю статусов и показывает последние переходы.
 */
function StatusTimeline({ history }: { history?: StatusHistoryPoint[] }) {
  if (!history || history.length === 0) return null;

  const sorted = [...history].sort(
    (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  );
  if (sorted.length === 0) return null;

  const latest = sorted[0];
  const dateOnly = latest.changed_at
    ? new Date(latest.changed_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    : '';
  const fromText =
    latest.from_status !== null
      ? APPLICATION_STATUS_LABELS[latest.from_status as keyof typeof APPLICATION_STATUS_LABELS] || latest.from_status
      : '—';
  const toText =
    APPLICATION_STATUS_LABELS[latest.to_status as keyof typeof APPLICATION_STATUS_LABELS] || latest.to_status;

  if (sorted.length > 1) {
    const prev = sorted[1];
    const now = new Date();
    const aDate = prev.changed_at ? new Date(prev.changed_at).setHours(0, 0, 0, 0) : now.setHours(0, 0, 0, 0);
    const diffMs = now.getTime() - aDate;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (days <= 1) {
      return <span className="ml-3 text-[10px] text-text-faint">сегодня: {fromText} → {toText}</span>;
    } else if (days <= 7) {
      return <span className="ml-3 text-[10px] text-text-faint">{days} дн. назад: {fromText} → {toText}</span>;
    } else {
      return <span className="ml-3 text-[10px] text-text-faint">неделя+: {fromText} → {toText}</span>;
    }
  }

  return <span className="ml-3 text-[10px] text-text-faint">{dateOnly}: {fromText} → {toText}</span>;
}

export function KanbanCard({
  app,
  onOpen,
  onStatusChange,
  dimmed,
  onDragStartCard,
  onDragEndCard,
  history,
  saving,
}: {
  app: Application;
  onOpen: () => void;
  onStatusChange: (status: ApplicationStatus) => void;
  dimmed?: boolean;
  onDragStartCard?: () => void;
  onDragEndCard?: () => void;
  history?: StatusHistoryPoint[];
  saving?: boolean;
}) {
  const idx = STATUS_ORDER.indexOf(app.status);
  const days = app.status === 'applied' ? daysSince(app.applied_date) : null;
  const isStale = days !== null && days >= STALE_DAYS_THRESHOLD;

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('text/plain', app.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStartCard?.();
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => onDragEndCard?.()}
      className={`cursor-grab select-none rounded-lg border border-l-4 p-3 text-left shadow-sm transition-all hover:shadow-md active:cursor-grabbing ${dimmed ? 'opacity-40 shadow-lg' : ''} ${
        isStale
          ? 'border-accent-amber/50 border-l-accent-amber bg-accent-amber/5'
          : app.status === 'interview'
          ? 'border-border-soft border-l-accent-amber bg-panel hover:border-accent-amber/60 hover:bg-accent-amber/5'
          : app.status === 'offer'
          ? 'border-border-soft border-l-accent-teal bg-panel hover:border-accent-teal/60 hover:bg-accent-teal/5'
          : app.status === 'rejected'
          ? 'border-border-soft border-l-accent-coral bg-panel hover:border-accent-coral/60 hover:bg-accent-coral/5'
          : 'border-border-soft border-l-accent-blue bg-panel hover:border-accent-blue/70 hover:bg-accent-blue/5'
      }`}
    >
      <div className="relative">
        <button onClick={onOpen} className="block w-full text-left">
          <span className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-text">{app.company || 'Без названия'}</p>
            {saving && (
              <svg
                className="h-3 w-3 shrink-0 animate-spin text-text-faint"
                viewBox="0 0 24 24"
                fill="none"
                aria-label="Сохранение…"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
          </span>
          <p className="truncate text-xs text-text-faint">{app.role}</p>
          {app.salary && <p className="mt-1 truncate text-xs text-text-faint">{app.salary}</p>}
        </button>

        {isStale && (
          <p className="mt-1 flex items-center gap-1 text-xs text-accent-amber" title={`Долго без изменения статуса: ${days} дн.`}>
            <TriangleAlert className="h-3 w-3" /> {days} дн. без ответа
          </p>
        )}

        <div className="mt-1">
          <StatusTimeline history={history} />
        </div>

        <div className="mt-2 flex items-center justify-between">
          <button
            disabled={idx <= 0}
            onClick={() => idx > 0 && onStatusChange(STATUS_ORDER[idx - 1])}
            className="rounded px-1.5 py-0.5 text-xs text-text-faint hover:text-text disabled:opacity-20"
            title="Вернуть на предыдущий статус"
          >
            ‹
          </button>
          <button
            disabled={idx >= STATUS_ORDER.length - 1}
            onClick={() => idx < STATUS_ORDER.length - 1 && onStatusChange(STATUS_ORDER[idx + 1])}
            className="rounded px-1.5 py-0.5 text-xs text-text-faint hover:text-text disabled:opacity-20"
            title="Продвинуть на следующий статус"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import type { Application, ApplicationStatus } from '@job-search-tracker/shared';

const STATUS_ORDER: ApplicationStatus[] = ['applied', 'interview', 'offer', 'rejected'];
const STALE_DAYS_THRESHOLD = 7;

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const applied = new Date(dateStr);
  const now = new Date();
  const diffMs = now.setHours(0, 0, 0, 0) - applied.setHours(0, 0, 0, 0);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function KanbanCard({
  app,
  onOpen,
  onStatusChange,
}: {
  app: Application;
  onOpen: () => void;
  onStatusChange: (status: ApplicationStatus) => void;
}) {
  const idx = STATUS_ORDER.indexOf(app.status);
  const days = app.status === 'applied' ? daysSince(app.applied_date) : null;
  const isStale = days !== null && days >= STALE_DAYS_THRESHOLD;

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('text/plain', app.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`cursor-grab select-none rounded-lg border p-3 text-left transition hover:border-border active:cursor-grabbing ${
        isStale ? 'border-accent-amber/50 bg-accent-amber/5' : 'border-border-soft bg-panel'
      }`}
    >
      <button onClick={onOpen} className="block w-full text-left">
        <p className="truncate text-sm font-medium text-text">{app.company || 'Без названия'}</p>
        <p className="truncate text-xs text-text-dim">{app.role}</p>
        {app.salary && <p className="mt-1 truncate text-xs text-text-faint">{app.salary}</p>}
        {isStale && (
          <p className="mt-1 text-xs text-accent-amber" title={`Долго без изменения статуса: ${days} дн.`}>
            ⚠ {days} дн. без ответа
          </p>
        )}
      </button>
      {/* Ручной фолбэк смены статуса — на тачскринах drag-and-drop неудобен,
          эти стрелки двигают карточку на соседний статус в пайплайне. */}
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
  );
}

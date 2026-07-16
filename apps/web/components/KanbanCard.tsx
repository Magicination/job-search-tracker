'use client';

import type { Application, ApplicationStatus } from '@job-search-tracker/shared';

const STATUS_ORDER: ApplicationStatus[] = ['applied', 'interview', 'offer', 'rejected'];

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

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('text/plain', app.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="cursor-grab select-none rounded-lg border border-border-soft bg-panel p-3 text-left transition hover:border-border active:cursor-grabbing"
    >
      <button onClick={onOpen} className="block w-full text-left">
        <p className="truncate text-sm font-medium text-text">{app.company || 'Без названия'}</p>
        <p className="truncate text-xs text-text-dim">{app.role}</p>
        {app.salary && <p className="mt-1 truncate text-xs text-text-faint">{app.salary}</p>}
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

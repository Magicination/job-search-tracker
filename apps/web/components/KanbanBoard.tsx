'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Application, ApplicationStatus, ResumeVersion, ApplicationStatusHistoryEntry } from '@job-search-tracker/shared';
import { APPLICATION_STATUS_LABELS } from '@job-search-tracker/shared';
import { KanbanCard } from './KanbanCard';
import { Modal } from './Modal';
import { ApplicationCard } from './ApplicationCard';

const STATUS_ORDER: ApplicationStatus[] = ['applied', 'interview', 'offer', 'rejected'];
const STALE_DAYS_THRESHOLD = 7;

function daysSinceApplied(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const applied = new Date(dateStr);
  const now = new Date();
  const diffMs = now.setHours(0, 0, 0, 0) - applied.setHours(0, 0, 0, 0);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function KanbanBoard({
  applications, resumeVersions, onUpdate, onDateChange, onTimeChange, onStatusChange, onDelete, autoOpenId, onAutoOpenHandled, history,
}: {
  applications: Application[];
  resumeVersions: ResumeVersion[];
  onUpdate: (id: string, field: keyof Application, value: any, debounceMs?: number) => void;
  onDateChange: (id: string, newDate: string) => void;
  onTimeChange: (id: string, newTime: string) => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDelete?: (id: string) => void;
  autoOpenId?: string | null;
  onAutoOpenHandled?: () => void;
  history?: ApplicationStatusHistoryEntry[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ApplicationStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const onResize = () => updateScrollState();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateScrollState, applications.length]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  function historyFor(appId: string) {
    return (history ?? [])
      .filter((h) => h.application_id === appId)
      .map((h) => ({ from_status: h.from_status, to_status: h.to_status, changed_at: h.changed_at }));
  }

  function scrollBoard(direction: 1 | -1) {
    scrollRef.current?.scrollBy({ left: direction * 260, behavior: 'smooth' });
  }

  if (autoOpenId && autoOpenId !== openId) {
    setOpenId(autoOpenId);
    onAutoOpenHandled?.();
  }

  const openApp = applications.find((a) => a.id === openId) ?? null;

  const overdueCount = applications.filter((a) => {
    const days = daysSinceApplied(a.applied_date);
    return a.status === 'applied' && days !== null && days >= STALE_DAYS_THRESHOLD;
  }).length;

  function handleDrop(e: React.DragEvent, status: ApplicationStatus) {
    e.preventDefault();
    setDragOverStatus(null);
    const id = e.dataTransfer.getData('text/plain');
    if (id) onStatusChange(id, status);
  }

  return (
    <>
      {overdueCount > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-accent-coral/30 bg-accent-coral/5 p-3">
          <p className="text-sm text-accent-coral">
            {overdueCount} {overdueCount === 1 ? 'отклик' : 'откликов'} без ответа больше недели
          </p>
        </div>
      )}

      {isMobile ? (
        <div className="flex flex-col gap-4">
          {STATUS_ORDER.map((status) => {
            const apps = applications.filter((a) => a.status === status);
            return (
              <div key={status} className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-medium text-text">{APPLICATION_STATUS_LABELS[status]}</h3>
                  <span className="text-xs text-text-faint">{apps.length}</span>
                </div>
                {apps.length === 0 ? (
                  <p className="px-1 text-xs text-text-faint">Пусто</p>
                ) : (
                  apps.map((app) => (
                    <KanbanCard
                      key={app.id}
                      app={app}
                      onOpen={() => setOpenId(app.id)}
                      onStatusChange={(s) => onStatusChange(app.id, s)}
                      history={historyFor(app.id)}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="relative -mx-4 sm:mx-0">
          {canScrollLeft && (
            <button onClick={() => scrollBoard(-1)} aria-label="Прокрутить влево"
              className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-panel px-2 py-1 text-text-dim shadow-md hover:text-text sm:left-2">
              ‹
            </button>
          )}
          {canScrollRight && (
            <>
              <div className="pointer-events-none absolute right-0 top-0 z-[5] h-full w-10 bg-gradient-to-l from-bg to-transparent" />
              <button onClick={() => scrollBoard(1)} aria-label="Прокрутить вправо"
                className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-panel px-2 py-1 text-text-dim shadow-md hover:text-text sm:right-2">
                ›
              </button>
            </>
          )}
          <div ref={scrollRef} onScroll={updateScrollState} className="flex gap-3 overflow-x-auto px-4 pb-2 sm:px-0">
            {STATUS_ORDER.map((status) => {
              const apps = applications.filter((a) => a.status === status);
              return (
                <div key={status}
                  onDragOver={(e) => { e.preventDefault(); setDragOverStatus(status); }}
                  onDragLeave={() => setDragOverStatus((s) => (s === status ? null : s))}
                  onDrop={(e) => handleDrop(e, status)}
                  className={`flex w-48 shrink-0 flex-col gap-2 rounded-lg border p-2 transition sm:w-60 ${
                    dragOverStatus === status ? 'border-accent-amber bg-panel' : 'border-border-soft'
                  }`}>
                  <div className="flex items-center justify-between px-1 py-1">
                    <h3 className="text-sm font-medium text-text">{APPLICATION_STATUS_LABELS[status]}</h3>
                    <span className="text-xs text-text-faint">{apps.length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {apps.length === 0 ? (
                      <p className="px-1 text-xs text-text-faint">Пусто</p>
                    ) : (
                      apps.map((app) => (
                        <KanbanCard
                          key={app.id}
                          app={app}
                          dimmed={draggingId === app.id}
                          onOpen={() => setOpenId(app.id)}
                          onStatusChange={(s) => onStatusChange(app.id, s)}
                          onDragStartCard={() => setDraggingId(app.id)}
                          onDragEndCard={() => setDraggingId(null)}
                          history={historyFor(app.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {openApp && (
        <Modal onClose={() => setOpenId(null)}>
          <ApplicationCard
            app={openApp}
            resumeVersions={resumeVersions}
            onUpdate={(field, value, debounceMs) => onUpdate(openApp.id, field, value, debounceMs)}
            onDateChange={(newDate) => onDateChange(openApp.id, newDate)}
            onTimeChange={(newTime) => onTimeChange(openApp.id, newTime)}
            onStatusChange={(status) => onStatusChange(openApp.id, status)}
            onDelete={() => {
              onDelete?.(openApp.id);
              setOpenId(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}

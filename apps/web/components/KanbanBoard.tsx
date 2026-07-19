'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Application, ApplicationStatus, ResumeVersion, ApplicationStatusHistoryEntry } from '@job-search-tracker/shared';
import { APPLICATION_STATUS_LABELS, type StatusHistoryPoint } from '@job-search-tracker/shared';
import { KanbanCard } from './KanbanCard';
import { Modal } from './Modal';
import { ApplicationCard } from './ApplicationCard';
import { ToastProvider } from '../lib/hooks/useToast';
import { supabase } from '../lib/supabase';

const STATUS_ORDER: ApplicationStatus[] = ['applied', 'interview', 'offer', 'rejected'];

export type SortMode = 'oldest' | 'newest';

function sortedApplications(sortMode?: SortMode) {
  const mode = sortMode ?? 'newest';
  if (mode === 'oldest') {
    return applications.slice().sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
  return applications.slice().sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
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

  // Selection state for bulk operations
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle checkbox selection/deselection
  const toggleSelect = useCallback((id: string) => {
    setSelectedAppIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Handle bulk delete from keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && 
          document.activeElement?.tagName !== 'INPUT' && 
          document.activeElement?.tagName !== 'TEXTAREA' &&
          selectedAppIds.size > 0) {
        const selectedApps = applications.filter(a => selectedAppIds.has(a.id));
        Promise.all(selectedApps.map(app => 
          supabase.from('applications').delete().eq('id', app.id)
        )).then(() => {
          setApplications(prev => prev.filter(a => !selectedAppIds.has(a.id)));
          setSelectedAppIds(new Set());
        });
      }
    }
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAppIds, applications]);

  // Mobile view detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Helper to get history for an application
  function historyFor(appId: string) {
    return (history ?? [])
      .filter((h) => h.application_id === appId)
      .map((h) => ({ from_status: h.from_status, to_status: h.to_status, changed_at: h.changed_at }));
  }

  function scrollBoard(direction: 1 | -1) {
    scrollRef.current?.scrollBy({ left: direction * 260, behavior: 'smooth' });
  }

  // Свежесозданный отклик открывается сразу — его обычно хочется дозаполнить.
  if (autoOpenId && autoOpenId !== openId) {
    setOpenId(autoOpenId);
    onAutoOpenHandled?.();
  }

  const openApp = sortedApplications('oldest')?.find((a) => a.id === openId) ?? null;

  function handleDrop(e: React.DragEvent, status: ApplicationStatus) {
    e.preventDefault();
    setDragOverStatus(null);
    const id = e.dataTransfer.getData('text/plain');
    if (id) onStatusChange(id, status);
  }

  // Handle bulk delete from toolbar button
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Delete key for bulk delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && 
          document.activeElement?.tagName !== 'INPUT' && 
          document.activeElement?.tagName !== 'TEXTAREA' &&
          selectedAppIds.size > 0) {
        const selectedApps = applications.filter(a => selectedAppIds.has(a.id));
        Promise.all(selectedApps.map(app => 
          supabase.from('applications').delete().eq('id', app.id)
        )).then(() => {
          setApplications(prev => prev.filter(a => !selectedAppIds.has(a.id)));
          setSelectedAppIds(new Set());
        });
      }
    }
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAppIds, applications]);

  return (
    <>
      {/* Summary banner */}
      {(() => {
        const overdueCount = applications.filter(a => {
          const daysSinceApplied = Math.floor((Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24));
          return a.status === 'applied' && daysSinceApplied > 7;
        }).length;
        
        const overdueInterv = applications.filter(a => {
          const daysSinceStatus = Math.floor((Date.now() - new Date(a.last_status_change_at).getTime()) / (1000 * 60 * 60 * 24));
          return a.status === 'interview' && daysSinceStatus > 3;
        }).length;

        const totalOverdue = overdueCount + overdueInterv;
        
        if (totalOverdue === 0) return null;

        const statusLabel = overdueInterv > 0 ? 'интервью' : 'отклика';
        const timeText = overdueInterv > 0 && overdueCount > 0 ? `${overdueCount} без ответа больше недели, ${overdueInterv} в` : overdueInterv > 0 ? `в интервью более 3 дней` : 'без ответа больше недели';
        
        return (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-accent-coral/30 bg-accent-coral/5 p-3">
            <div>
              <p className="text-sm font-semibold text-accent-coral">{totalOverdue} {statusLabel} {timeText}</p>
              <p className="text-xs text-accent-coral/70 mt-1">Нажмите на фильтр "Отправлен", чтобы посмотреть все отклики</p>
            </div>
            <a 
              href="/applications?filter=applied"
              className="rounded-full bg-accent-coral px-3 py-1 text-xs font-semibold text-bg hover:bg-accent-coral/80 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-blue"
            >
              Посмотреть все
            </a>
          </div>
        );
      })()}

      <ToastProvider>
        {isMobile ? (
          <div className="flex flex-col gap-4">
            {STATUS_ORDER.map((status) => {
              const apps = sortedApplications('oldest')?.filter((a) => a.status === status);
              return (
                <div key={status} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-medium text-text">{APPLICATION_STATUS_LABELS[status]}</h3>
                    <span className="text-xs text-text-faint">{apps?.length ?? 0}</span>
                  </div>
                {apps?.length === 0 ? (
                  <p className="px-1 text-xs text-text-faint">Пусто</p>
                ) : apps?.map((app) => {
                    return (
                      <KanbanCard
                        key={app.id}
                        app={app}
                        onOpen={() => setOpenId(app.id)}
                        onStatusChange={(s) => onStatusChange(app.id, s)}
                        history={historyFor(app.id)}
                      />
                    )
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="relative -mx-4 sm:mx-0">
            {canScrollLeft && (
              <button onClick={() => scrollBoard(-1)} aria-label="Прокрутить влево"
                className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-panel px-2 py-1 text-text-dim shadow-md hover:text-text focus-visible:border-accent-blue outline-none sm:left-2">
                ‹
              </button>
            )}
            {canScrollRight && (
              <>
                <div className="pointer-events-none absolute right-0 top-0 z-[5] h-full w-10 bg-gradient-to-l from-bg to-transparent" />
                <button onClick={() => scrollBoard(1)} aria-label="Прокрутить вправо"
                  className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-panel px-2 py-1 text-text-dim shadow-md hover:text-text focus-visible:border-accent-blue outline-none sm:right-2">
                  ›
                </button>
              </>
            )}
            <div ref={scrollRef} onScroll={updateScrollState} className="flex gap-3 overflow-x-auto px-4 pb-2 sm:px-0">
              {STATUS_ORDER.map((status) => {
                const apps = sortedApplications('oldest')?.filter((a) => a.status === status);

                return (
                  <div
                    key={status}
                    onDragOver={(e) => { e.preventDefault(); setDragOverStatus(status); }}
                    onDragLeave={() => setDragOverStatus((s) => (s === status ? null : s))}
                    onDrop={(e) => handleDrop(e, status)}
                    className={`flex w-48 shrink-0 flex-col gap-2 rounded-lg border p-2 transition-all sm:w-60 ${
                      dragOverStatus === status ? 'border-accent-amber bg-panel' : 'border-border-soft'
                    }`}>
                    <div className="flex items-center justify-between px-1 py-1">
                      <h3 className="text-sm font-medium text-text">{APPLICATION_STATUS_LABELS[status]}</h3>
                      <span className="text-xs text-text-faint">{apps?.length ?? 0}</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {apps?.length === 0 ? (
                        <p className="px-1 text-xs text-text-faint">Пусто</p>
                      ) : (
                        apps?.map((app) => (
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

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Application, ResumeVersion, ApplicationStatusHistoryEntry, Company, Stage } from '@job-search-tracker/shared';
import { KanbanCard } from './KanbanCard';
import { ApplicationsTable } from './ApplicationsTable';
import { Modal } from './Modal';
import { ApplicationCard } from './ApplicationCard';
import { StagesManager } from './StagesManager';
import { LayoutGrid, List, Settings } from 'lucide-react';

const STALE_DAYS_THRESHOLD = 7;
const VIEW_MODE_KEY = 'jt_applications_view_mode';

function daysSinceApplied(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const applied = new Date(dateStr);
  const now = new Date();
  const diffMs = now.setHours(0, 0, 0, 0) - applied.setHours(0, 0, 0, 0);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function KanbanBoard({
  applications, resumeVersions, stages, onUpdate, onDateChange, onTimeChange, onStageChange, onDelete, autoOpenId, onAutoOpenHandled, history, savingIds, companies, onUpdateCompany,
  onAddStage, onUpdateStage, onSwapStages, onDeleteStage,
}: {
  applications: Application[];
  resumeVersions: ResumeVersion[];
  stages: Stage[];
  onUpdate: (id: string, field: keyof Application, value: any, debounceMs?: number) => void;
  onDateChange: (id: string, newDate: string) => void;
  onTimeChange: (id: string, newTime: string) => void;
  onStageChange: (id: string, stageId: string) => void;
  onDelete?: (id: string) => void;
  autoOpenId?: string | null;
  onAutoOpenHandled?: () => void;
  history?: ApplicationStatusHistoryEntry[];
  savingIds?: Set<string>;
  companies?: Company[];
  onUpdateCompany?: (companyId: string, fields: { url: string }) => void;
  onAddStage: (name: string, color: Stage['color']) => void;
  onUpdateStage: (id: string, fields: Partial<Pick<Stage, 'name' | 'color' | 'auto_archive'>>) => void;
  onSwapStages: (idA: string, idB: string) => void;
  onDeleteStage: (id: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [stagesManagerOpen, setStagesManagerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const orderedStages = [...stages].sort((a, b) => a.position - b.position);

  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_MODE_KEY);
    if (saved === 'kanban' || saved === 'table') setViewMode(saved);
  }, []);

  function handleSetViewMode(mode: 'kanban' | 'table') {
    setViewMode(mode);
    window.localStorage.setItem(VIEW_MODE_KEY, mode);
  }

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
  }, [updateScrollState, applications.length, stages.length]);

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
      .map((h) => ({ from_stage_id: h.from_stage_id, to_stage_id: h.to_stage_id, changed_at: h.changed_at }));
  }

  function scrollBoard(direction: 1 | -1) {
    scrollRef.current?.scrollBy({ left: direction * 260, behavior: 'smooth' });
  }

  if (autoOpenId && autoOpenId !== openId) {
    setOpenId(autoOpenId);
    onAutoOpenHandled?.();
  }

  const openApp = applications.find((a) => a.id === openId) ?? null;
  const firstStage = orderedStages[0];

  const overdueCount = firstStage
    ? applications.filter((a) => {
        const days = daysSinceApplied(a.applied_date);
        return a.stage_id === firstStage.id && days !== null && days >= STALE_DAYS_THRESHOLD;
      }).length
    : 0;

  function handleDrop(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    setDragOverStage(null);
    const id = e.dataTransfer.getData('text/plain');
    if (id) onStageChange(id, stageId);
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          <button
            onClick={() => handleSetViewMode('kanban')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition ${
              viewMode === 'kanban' ? 'bg-panel-2 text-text' : 'text-text-faint hover:text-text-dim'
            }`}
            title="Канбан"
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Канбан
          </button>
          <button
            onClick={() => handleSetViewMode('table')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition ${
              viewMode === 'table' ? 'bg-panel-2 text-text' : 'text-text-faint hover:text-text-dim'
            }`}
            title="Список"
          >
            <List className="h-3.5 w-3.5" /> Список
          </button>
        </div>
        <button
          onClick={() => setStagesManagerOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-dim transition hover:border-border-soft"
        >
          <Settings className="h-3.5 w-3.5" /> Свои этапы
        </button>
      </div>

      {overdueCount > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-accent-coral/30 bg-accent-coral/5 p-3">
          <p className="text-sm text-accent-coral">
            {overdueCount} {overdueCount === 1 ? 'отклик' : 'откликов'} без ответа больше недели
          </p>
        </div>
      )}

      {viewMode === 'table' ? (
        <ApplicationsTable
          applications={applications}
          stages={stages}
          savingIds={savingIds}
          onOpen={setOpenId}
          onStageChange={onStageChange}
        />
      ) : isMobile ? (
        <div className="flex flex-col gap-4">
          {orderedStages.map((stage) => {
            const apps = applications.filter((a) => a.stage_id === stage.id);
            return (
              <div key={stage.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-medium text-text">{stage.name}</h3>
                  <span className="text-xs text-text-faint">{apps.length}</span>
                </div>
                {apps.length === 0 ? (
                  <p className="px-1 text-xs text-text-faint">Пусто</p>
                ) : (
                  apps.map((app) => (
                    <KanbanCard
                      key={app.id}
                      app={app}
                      stages={stages}
                      onOpen={() => setOpenId(app.id)}
                      onStageChange={(s) => onStageChange(app.id, s)}
                      history={historyFor(app.id)}
                      saving={savingIds?.has(app.id)}
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
            {orderedStages.map((stage) => {
              const apps = applications.filter((a) => a.stage_id === stage.id);
              return (
                <div key={stage.id}
                  onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
                  onDragLeave={() => setDragOverStage((s) => (s === stage.id ? null : s))}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  className={`flex w-48 shrink-0 flex-col gap-2 rounded-lg border p-2 transition sm:w-60 lg:w-72 ${
                    dragOverStage === stage.id ? 'border-accent-amber bg-panel' : 'border-border-soft'
                  }`}>
                  <div className="flex items-center justify-between px-1 py-1">
                    <h3 className="text-sm font-medium text-text">{stage.name}</h3>
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
                          stages={stages}
                          dimmed={draggingId === app.id}
                          onOpen={() => setOpenId(app.id)}
                          onStageChange={(s) => onStageChange(app.id, s)}
                          onDragStartCard={() => setDraggingId(app.id)}
                          onDragEndCard={() => setDraggingId(null)}
                          history={historyFor(app.id)}
                          saving={savingIds?.has(app.id)}
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
            stages={stages}
            onUpdate={(field, value, debounceMs) => onUpdate(openApp.id, field, value, debounceMs)}
            onDateChange={(newDate) => onDateChange(openApp.id, newDate)}
            onTimeChange={(newTime) => onTimeChange(openApp.id, newTime)}
            onStageChange={(stageId) => onStageChange(openApp.id, stageId)}
            onDelete={() => {
              onDelete?.(openApp.id);
              setOpenId(null);
            }}
            company={openApp.company_id ? companies?.find((c) => c.id === openApp.company_id) ?? null : null}
            onUpdateCompany={onUpdateCompany}
          />
        </Modal>
      )}

      {stagesManagerOpen && (
        <Modal onClose={() => setStagesManagerOpen(false)}>
          <StagesManager
            stages={stages}
            onAddStage={onAddStage}
            onUpdateStage={onUpdateStage}
            onSwapStages={onSwapStages}
            onDeleteStage={onDeleteStage}
          />
        </Modal>
      )}
    </>
  );
}

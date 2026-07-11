'use client';

import { useState } from 'react';
import type { Application, ApplicationStatus, ResumeVersion } from '@job-search-tracker/shared';
import { APPLICATION_STATUS_LABELS } from '@job-search-tracker/shared';
import { KanbanCard } from './KanbanCard';
import { Modal } from './Modal';
import { ApplicationCard } from './ApplicationCard';

const STATUS_ORDER: ApplicationStatus[] = ['applied', 'screen', 'interview', 'offer', 'rejected'];

export function KanbanBoard({
  applications,
  resumeVersions,
  onUpdate,
  onDateChange,
  onTimeChange,
  onStatusChange,
  onDelete,
  autoOpenId,
  onAutoOpenHandled,
}: {
  applications: Application[];
  resumeVersions: ResumeVersion[];
  onUpdate: (id: string, field: keyof Application, value: any, debounceMs?: number) => void;
  onDateChange: (id: string, newDate: string) => void;
  onTimeChange: (id: string, newTime: string) => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
  autoOpenId?: string | null;
  onAutoOpenHandled?: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ApplicationStatus | null>(null);

  // Свежесозданный отклик открывается сразу — его обычно хочется дозаполнить.
  if (autoOpenId && autoOpenId !== openId) {
    setOpenId(autoOpenId);
    onAutoOpenHandled?.();
  }

  const openApp = applications.find((a) => a.id === openId) ?? null;

  function handleDrop(e: React.DragEvent, status: ApplicationStatus) {
    e.preventDefault();
    setDragOverStatus(null);
    const id = e.dataTransfer.getData('text/plain');
    if (id) onStatusChange(id, status);
  }

  return (
    <>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {STATUS_ORDER.map((status) => {
          const apps = applications.filter((a) => a.status === status);
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStatus(status);
              }}
              onDragLeave={() => setDragOverStatus((s) => (s === status ? null : s))}
              onDrop={(e) => handleDrop(e, status)}
              className={`flex w-64 shrink-0 flex-col gap-2 rounded-lg border p-2 transition ${
                dragOverStatus === status ? 'border-accent-amber bg-panel' : 'border-border-soft'
              }`}
            >
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
                      onOpen={() => setOpenId(app.id)}
                      onStatusChange={(s) => onStatusChange(app.id, s)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

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
              onDelete(openApp.id);
              setOpenId(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}

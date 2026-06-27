'use client';

import { useState } from 'react';
import type { Application, ApplicationStatus, ResumeVersion } from '@job-search-tracker/shared';
import { APPLICATION_STATUS_BADGE_VARIANT, APPLICATION_STATUS_LABELS } from '@job-search-tracker/shared';
import { useApplications } from '../../lib/hooks/useApplications';
import { useResumeVersions } from '../../lib/hooks/useResumeVersions';
import { Badge } from '../../components/Badge';
import { SkeletonList } from '../../components/Skeleton';

const STATUS_OPTIONS: ApplicationStatus[] = ['applied', 'screen', 'interview', 'offer', 'rejected'];

function EditableCell({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full min-w-[120px] rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-text outline-none transition focus-visible:border-accent-blue focus-visible:bg-panel-2"
    />
  );
}

function ApplicationRow({
  app,
  resumeVersions,
  onUpdate,
  onDateChange,
  onStatusChange,
  onDelete,
}: {
  app: Application;
  resumeVersions: ResumeVersion[];
  onUpdate: <K extends keyof Application>(field: K, value: Application[K], debounceMs?: number) => void;
  onDateChange: (newDate: string) => void;
  onStatusChange: (status: ApplicationStatus) => void;
  onDelete: () => void;
}) {
  return (
    <tr className="border-b border-border-soft">
      <td className="p-1">
        <EditableCell value={app.company} onChange={(v) => onUpdate('company', v)} placeholder="Компания" />
      </td>
      <td className="p-1">
        <EditableCell value={app.role} onChange={(v) => onUpdate('role', v)} placeholder="Вакансия" />
      </td>
      <td className="p-1">
        <EditableCell value={app.source} onChange={(v) => onUpdate('source', v)} placeholder="Источник" />
      </td>
      <td className="p-1">
        <input
          type="date"
          value={app.applied_date ?? ''}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-text outline-none focus-visible:border-accent-blue focus-visible:bg-panel-2"
        />
      </td>
      <td className="p-1">
        <select
          value={app.status}
          onChange={(e) => onStatusChange(e.target.value as ApplicationStatus)}
          className="rounded-md border border-transparent bg-transparent px-1 py-1 text-sm outline-none focus-visible:border-accent-blue"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {APPLICATION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <div className="mt-1">
          <Badge label={APPLICATION_STATUS_LABELS[app.status]} variant={APPLICATION_STATUS_BADGE_VARIANT[app.status]} />
        </div>
      </td>
      <td className="p-1">
        <select
          value={app.resume_version_id ?? ''}
          onChange={(e) => onUpdate('resume_version_id', e.target.value || null, 0)}
          className="w-full rounded-md border border-transparent bg-transparent px-1 py-1.5 text-sm text-text-dim outline-none focus-visible:border-accent-blue"
        >
          <option value="">—</option>
          {resumeVersions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </td>
      <td className="p-1">
        <EditableCell value={app.note} onChange={(v) => onUpdate('note', v)} placeholder="Заметка" />
      </td>
      <td className="p-1 text-center">
        <button onClick={onDelete} aria-label="Удалить отклик" className="text-text-faint hover:text-accent-coral">
          ✕
        </button>
      </td>
    </tr>
  );
}

function ResumeVersionsPanel({
  versions,
  onAdd,
  onDelete,
}: {
  versions: ResumeVersion[];
  onAdd: (name: string, notes: string) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [open, setOpen] = useState(versions.length === 0);

  function handleAdd() {
    if (!name.trim()) return;
    onAdd(name.trim(), '');
    setName('');
  }

  return (
    <div className="rounded-lg border border-border-soft bg-panel p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm text-text-dim"
      >
        <span>Версии резюме / сопроводительного ({versions.length})</span>
        <span>{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {versions.length === 0 ? (
            <p className="text-xs text-text-faint">
              Создайте версию, если планируете тестировать разные варианты резюме или
              сопроводительного письма — потом на странице «Аналитика» будет видно,
              какая версия даёт лучшую конверсию.
            </p>
          ) : (
            versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-2 rounded-md bg-panel-2 px-2 py-1.5">
                <span className="text-sm text-text">{v.name}</span>
                <button
                  onClick={() => onDelete(v.id)}
                  aria-label="Удалить версию"
                  className="text-text-faint hover:text-accent-coral"
                >
                  ✕
                </button>
              </div>
            ))
          )}
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: v2 — упор на SQL"
              className="min-w-[160px] flex-1 rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-sm text-text outline-none focus-visible:border-accent-blue"
            />
            <button
              onClick={handleAdd}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-dim transition hover:border-border-soft hover:text-text"
            >
              Добавить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApplicationsPage() {
  const { applications, loading, addApplication, updateField, updateStatus, updateAppliedDate, deleteApplication } =
    useApplications();
  const { versions, addVersion, deleteVersion } = useResumeVersions();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text">Отклики</h1>
        <button
          onClick={addApplication}
          className="rounded-lg bg-accent-amber px-4 py-2 text-sm font-medium text-bg"
        >
          + Добавить отклик
        </button>
      </div>

      <ResumeVersionsPanel
        versions={versions}
        onAdd={(name, notes) => addVersion(name, notes, null)}
        onDelete={deleteVersion}
      />

      {loading ? (
        <SkeletonList rows={4} />
      ) : applications.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-dim">
          Откликов пока нет — добавьте первый, чтобы начать вести учёт.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-soft">
          <p className="px-3 py-1.5 text-xs text-text-faint sm:hidden">← Таблица скроллится горизонтально →</p>
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-border-soft bg-panel-2 text-xs text-text-dim">
                <th className="p-2 font-medium">Компания</th>
                <th className="p-2 font-medium">Вакансия</th>
                <th className="p-2 font-medium">Источник</th>
                <th className="p-2 font-medium">Дата</th>
                <th className="p-2 font-medium">Статус</th>
                <th className="p-2 font-medium">Версия резюме</th>
                <th className="p-2 font-medium">Заметка</th>
                <th className="p-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <ApplicationRow
                  key={app.id}
                  app={app}
                  resumeVersions={versions}
                  onUpdate={(field, value, debounceMs) => updateField(app.id, field, value, debounceMs)}
                  onDateChange={(newDate) => updateAppliedDate(app.id, newDate)}
                  onStatusChange={(status) => updateStatus(app.id, status)}
                  onDelete={() => deleteApplication(app.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

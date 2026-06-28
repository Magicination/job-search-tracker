'use client';

import { useState } from 'react';
import type { Application, ApplicationStatus, ResumeVersion, CoverLetterVersion } from '@job-search-tracker/shared';
import {
  APPLICATION_STATUS_BADGE_VARIANT,
  APPLICATION_STATUS_LABELS,
  STANDARD_APPLICATION_SOURCES,
} from '@job-search-tracker/shared';
import { Badge } from './Badge';
import { getDocumentDownloadUrl } from '../lib/documentStorage';

const STATUS_OPTIONS: ApplicationStatus[] = ['applied', 'screen', 'interview', 'offer', 'rejected'];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-text-faint">{children}</span>;
}

function TextField({
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
      className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text outline-none focus-visible:border-accent-blue"
    />
  );
}

function SourceField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [customMode, setCustomMode] = useState(value !== '' && !STANDARD_APPLICATION_SOURCES.includes(value));

  if (customMode) {
    return (
      <div className="flex gap-1">
        <TextField value={value} onChange={onChange} placeholder="Свой источник" />
        <button
          type="button"
          onClick={() => setCustomMode(false)}
          title="Выбрать из списка"
          className="rounded-md border border-border px-2 text-xs text-text-dim hover:text-text"
        >
          ☰
        </button>
      </div>
    );
  }

  return (
    <select
      value={STANDARD_APPLICATION_SOURCES.includes(value) ? value : ''}
      onChange={(e) => {
        if (e.target.value === '__custom__') {
          setCustomMode(true);
          onChange('');
        } else {
          onChange(e.target.value);
        }
      }}
      className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text outline-none focus-visible:border-accent-blue"
    >
      <option value="">— выбрать —</option>
      {STANDARD_APPLICATION_SOURCES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
      <option value="__custom__">Другое (ввести вручную)…</option>
    </select>
  );
}

async function handleOpenFile(filePath: string | null) {
  if (!filePath) return;
  const url = await getDocumentDownloadUrl(filePath);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

export function ApplicationCard({
  app,
  resumeVersions,
  coverLetterVersions,
  onUpdate,
  onDateChange,
  onTimeChange,
  onStatusChange,
  onDelete,
}: {
  app: Application;
  resumeVersions: ResumeVersion[];
  coverLetterVersions: CoverLetterVersion[];
  onUpdate: <K extends keyof Application>(field: K, value: Application[K], debounceMs?: number) => void;
  onDateChange: (newDate: string) => void;
  onTimeChange: (newTime: string) => void;
  onStatusChange: (status: ApplicationStatus) => void;
  onDelete: () => void;
}) {
  const appliedTime = app.applied_at ? new Date(app.applied_at).toTimeString().slice(0, 5) : '';

  const selectedResumeVersion = resumeVersions.find((v) => v.id === app.resume_version_id);
  const selectedCoverLetterVersion = coverLetterVersions.find((v) => v.id === app.cover_letter_version_id);

  return (
    <div className="rounded-lg border border-border-soft bg-panel p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <FieldLabel>Компания</FieldLabel>
            <TextField value={app.company} onChange={(v) => onUpdate('company', v)} placeholder="Компания" />
          </div>
          <div>
            <FieldLabel>Вакансия</FieldLabel>
            <TextField value={app.role} onChange={(v) => onUpdate('role', v)} placeholder="Вакансия" />
          </div>
        </div>
        <button
          onClick={onDelete}
          aria-label="Удалить отклик"
          className="mt-5 shrink-0 text-text-faint hover:text-accent-coral"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <FieldLabel>Источник</FieldLabel>
          <SourceField value={app.source} onChange={(v) => onUpdate('source', v, 0)} />
        </div>
        <div>
          <FieldLabel>Дата</FieldLabel>
          <input
            type="date"
            value={app.applied_date ?? ''}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text outline-none focus-visible:border-accent-blue"
          />
        </div>
        <div>
          <FieldLabel>Время</FieldLabel>
          <input
            type="time"
            value={appliedTime}
            onChange={(e) => onTimeChange(e.target.value)}
            className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text outline-none focus-visible:border-accent-blue"
          />
        </div>
        <div>
          <FieldLabel>Статус</FieldLabel>
          <select
            value={app.status}
            onChange={(e) => onStatusChange(e.target.value as ApplicationStatus)}
            className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text outline-none focus-visible:border-accent-blue"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {APPLICATION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <FieldLabel>Зарплата</FieldLabel>
          <TextField value={app.salary} onChange={(v) => onUpdate('salary', v)} placeholder="напр. 150-200к ₽" />
        </div>
        <div>
          <FieldLabel>Опыт</FieldLabel>
          <TextField
            value={app.experience_required}
            onChange={(v) => onUpdate('experience_required', v)}
            placeholder="напр. 1-3 года"
          />
        </div>
        <div>
          <FieldLabel>Версия резюме</FieldLabel>
          <div className="flex items-center gap-1">
            <select
              value={app.resume_version_id ?? ''}
              onChange={(e) => onUpdate('resume_version_id', e.target.value || null, 0)}
              className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text-dim outline-none focus-visible:border-accent-blue"
            >
              <option value="">—</option>
              {resumeVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            {selectedResumeVersion?.file_path && (
              <button
                onClick={() => handleOpenFile(selectedResumeVersion.file_path)}
                title="Открыть файл"
                className="text-text-faint hover:text-accent-blue"
              >
                📎
              </button>
            )}
          </div>
        </div>
        <div>
          <FieldLabel>Версия сопроводительного</FieldLabel>
          <div className="flex items-center gap-1">
            <select
              value={app.cover_letter_version_id ?? ''}
              onChange={(e) => onUpdate('cover_letter_version_id', e.target.value || null, 0)}
              className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text-dim outline-none focus-visible:border-accent-blue"
            >
              <option value="">—</option>
              {coverLetterVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            {selectedCoverLetterVersion?.file_path && (
              <button
                onClick={() => handleOpenFile(selectedCoverLetterVersion.file_path)}
                title="Открыть файл"
                className="text-text-faint hover:text-accent-blue"
              >
                📎
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex-1">
          <FieldLabel>Заметка</FieldLabel>
          <TextField value={app.note} onChange={(v) => onUpdate('note', v)} placeholder="Заметка" />
        </div>
        <Badge label={APPLICATION_STATUS_LABELS[app.status]} variant={APPLICATION_STATUS_BADGE_VARIANT[app.status]} />
      </div>
    </div>
  );
}

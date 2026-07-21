'use client';

import { useState } from 'react';
import type { Application, ApplicationStatus, ResumeVersion } from '@job-search-tracker/shared';
import {
  APPLICATION_STATUS_BADGE_VARIANT,
  APPLICATION_STATUS_LABELS,
  STANDARD_APPLICATION_SOURCES,
  STANDARD_EXPERIENCE_LEVELS,
} from '@job-search-tracker/shared';
import { Badge } from './Badge';
import { getDocumentDownloadUrl } from '../lib/documentStorage';
import { Paperclip, X, ExternalLink } from 'lucide-react';

const STATUS_OPTIONS: ApplicationStatus[] = ['applied', 'interview', 'offer', 'rejected'];

/** Грубая проверка "похоже на URL" — без строгой валидации, просто чтобы решить, рисовать ли ссылку. */
function looksLikeUrl(text: string): boolean {
  return /^(https?:\/\/|www\.)\S+\.\S+/i.test(text.trim());
}

function getUrlDomain(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function toHref(text: string): string {
  const trimmed = text.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

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
  const [saveFeedback, setSaveFeedback] = useState(false);

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text outline-none focus-visible:border-accent-blue hover:border-border/80 transition-colors"
      />
      {/* Индикатор успешного сохранения поля */}
      <div className="pointer-events-none absolute -top-1 right-1 flex h-4 w-4">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-accent-teal opacity-0 transition-opacity duration-150 ease-out" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Выбор из стандартного списка + возможность ввести своё значение —
 * переиспользуется и для источника отклика, и для уровня опыта. customLabel
 * настраивает подпись пункта "ввести вручную" под конкретное поле.
 */
function SelectOrCustomField({
  value,
  onChange,
  options,
  customPlaceholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  customPlaceholder: string;
}) {
  const [customMode, setCustomMode] = useState(value !== '' && !options.includes(value));

  if (customMode) {
    return (
      <div className="flex gap-1">
        <TextField value={value} onChange={onChange} placeholder={customPlaceholder} />
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
      value={options.includes(value) ? value : ''}
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
      {options.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
      <option value="__custom__">Другое (ввести вручную)…</option>
    </select>
  );
}

/** Заметка — текстовое поле, но если содержимое похоже на ссылку, под ним
 *  показывается кликабельный вариант (открывается в новой вкладке). */
function NoteField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <TextField value={value} onChange={onChange} placeholder="Заметка" />
      {looksLikeUrl(value) && (
        <a
          href={toHref(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block truncate text-xs text-accent-blue underline-offset-2 hover:underline"
        >
          {value.trim()}
        </a>
      )}
    </div>
  );
}

async function handleOpenFile(filePath: string | null) {
  if (!filePath) return;
  const newWindow = window.open('', '_blank', 'noopener,noreferrer');
  const url = await getDocumentDownloadUrl(filePath);
  if (url && newWindow) {
    newWindow.location.href = url;
  } else {
    newWindow?.close();
  }
}

export function ApplicationCard({
  app,
  resumeVersions,
  onUpdate,
  onDateChange,
  onTimeChange,
  onStatusChange,
  onDelete,
  company,
  onUpdateCompany,
}: {
  app: Application;
  resumeVersions: ResumeVersion[];
  onUpdate: <K extends keyof Application>(field: K, value: Application[K], debounceMs?: number) => void;
  onDateChange: (newDate: string) => void;
  onTimeChange: (newTime: string) => void;
  onStatusChange: (status: ApplicationStatus) => void;
  onDelete?: () => Promise<void> | void;
  company?: { id: string; url: string | null } | null;
  onUpdateCompany?: (companyId: string, fields: { url: string }) => void;
}) {
  const appliedTime = app.applied_at ? new Date(app.applied_at).toTimeString().slice(0, 5) : '';

  // Flag for delete action
  const [willDelete, setWillDelete] = useState(false);
  const [editingCompanyUrl, setEditingCompanyUrl] = useState(false);

  const selectedResumeVersion = resumeVersions.find((v) => v.id === app.resume_version_id);

  return (
    <div className="rounded-lg border border-border-soft bg-panel p-3 max-w-md overflow-y-auto">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <FieldLabel>Компания</FieldLabel>
            <TextField value={app.company} onChange={(v) => onUpdate('company', v)} placeholder="Компания" />
            {company && (
              editingCompanyUrl ? (
                <input
                  autoFocus
                  defaultValue={company.url ?? ''}
                  placeholder="https://сайт-компании..."
                  onBlur={(e) => {
                    onUpdateCompany?.(company.id, { url: e.target.value });
                    setEditingCompanyUrl(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                  className="mt-1 w-full rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-text outline-none focus-visible:border-accent-blue"
                />
              ) : company.url ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <a
                    href={toHref(company.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-accent-blue hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> {getUrlDomain(company.url)}
                  </a>
                  <button onClick={() => setEditingCompanyUrl(true)} className="text-xs text-text-faint hover:text-text-dim">
                    изменить
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingCompanyUrl(true)}
                  className="mt-1 text-xs text-text-faint hover:text-text-dim"
                >
                  + добавить сайт компании
                </button>
              )
            )}
          </div>
          <div>
            <FieldLabel>Вакансия</FieldLabel>

            <TextField value={app.role} onChange={(v) => onUpdate('role', v)} placeholder="Вакансия" />
          </div>
        </div>
      </div>

      <div className="mt-2">
        <FieldLabel>Ссылка на вакансию</FieldLabel>
        <TextField value={app.vacancy_url ?? ''} onChange={(v) => onUpdate('vacancy_url', v)} placeholder="https://..." />
        {app.vacancy_url && looksLikeUrl(app.vacancy_url) && (
          <a
            href={toHref(app.vacancy_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-accent-blue hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> {getUrlDomain(app.vacancy_url)}
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2">
        <div>
          <FieldLabel>Источник</FieldLabel>
          <SelectOrCustomField
            value={app.source}
            onChange={(v) => onUpdate('source', v, 0)}
            options={STANDARD_APPLICATION_SOURCES}
            customPlaceholder="Свой источник"
          />
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
            className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text outline-none focus-visible:border-accent-blue [&::-webkit-calendar-picker-indicator]:opacity-70"
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

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Зарплата</FieldLabel>
          <TextField value={app.salary} onChange={(v) => onUpdate('salary', v)} placeholder="напр. 150-200к ₽" />
        </div>
        <div>
          <FieldLabel>Опыт</FieldLabel>
          <SelectOrCustomField
            value={app.experience_required}
            onChange={(v) => onUpdate('experience_required', v)}
            options={STANDARD_EXPERIENCE_LEVELS}
            customPlaceholder="напр. 1–3 года"
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
                <Paperclip className="h-3.5 w-3.5 inline" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex-1">
          <FieldLabel>Заметка</FieldLabel>
          <NoteField value={app.note} onChange={(v) => onUpdate('note', v)} />
        </div>
        <Badge label={APPLICATION_STATUS_LABELS[app.status]} variant={APPLICATION_STATUS_BADGE_VARIANT[app.status]} />
      </div>

      <div className="mt-3 border-t border-border-soft pt-2 flex items-center justify-between gap-2">
        <div className="flex-1 text-right">
          <p className="text-xs text-text-dim truncate" title={app.company || app.role || 'без названия'}>
            {app.company || app.role || 'без названия'}
          </p>
        </div>
        <button
          onClick={() => setWillDelete(true)}
          className="text-xs text-accent-coral hover:underline focus-visible:border border-border-soft rounded px-1.5 py-0.5 outline-none"
        >
          Удалить отклик
        </button>
      </div>

      {/* Delete confirmation modal */}
      {willDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg border border-border bg-bg shadow-xl">
            <h2 className="text-base font-semibold text-text mb-3">Удалить отклик</h2>
            <p className="mb-4 text-sm text-text-dim">Этот отклик будет удалён навсегда. Восстановить его будет невозможно.</p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setWillDelete(false)}
                className="rounded-lg border border-border bg-panel-2 px-4 py-2 text-sm text-text-dim hover:text-text transition"
              >
                Отмена
              </button>
              <button
                onClick={() => { setWillDelete(false); onDelete?.(); }}
                className="rounded-lg border border-accent-coral bg-bg px-4 py-2 text-sm font-medium text-accent-coral hover:bg-panel transition"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

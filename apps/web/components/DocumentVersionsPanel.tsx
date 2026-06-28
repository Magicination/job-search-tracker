'use client';

import { useState, useRef } from 'react';

interface DocumentVersionLike {
  id: string;
  name: string;
  file_name: string;
}

export function DocumentVersionsPanel({
  title,
  emptyHint,
  versions,
  onAdd,
  onDelete,
  defaultOpen,
}: {
  title: string;
  emptyHint: string;
  versions: DocumentVersionLike[];
  onAdd: (name: string, notes: string, file: File | null) => void;
  onDelete: (id: string) => void;
  defaultOpen?: boolean;
}) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(defaultOpen ?? versions.length === 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    if (!name.trim()) return;
    onAdd(name.trim(), '', file);
    setName('');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="rounded-lg border border-border-soft bg-panel p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm text-text-dim"
      >
        <span>
          {title} ({versions.length})
        </span>
        <span>{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {versions.length === 0 ? (
            <p className="text-xs text-text-faint">{emptyHint}</p>
          ) : (
            versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-2 rounded-md bg-panel-2 px-2 py-1.5">
                <div className="flex flex-col">
                  <span className="text-sm text-text">{v.name}</span>
                  {v.file_name && <span className="text-xs text-text-faint">📎 {v.file_name}</span>}
                </div>
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
          <div className="flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название версии"
              className="min-w-[160px] flex-1 rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-sm text-text outline-none focus-visible:border-accent-blue"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.rtf,.odt"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="max-w-[180px] text-xs text-text-dim file:mr-2 file:rounded-md file:border file:border-border file:bg-panel-2 file:px-2 file:py-1 file:text-xs file:text-text-dim"
            />
            <button
              onClick={handleAdd}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-dim transition hover:border-border-soft hover:text-text"
            >
              Добавить
            </button>
          </div>
          <p className="text-xs text-text-faint">
            Файл необязателен — можно просто завести название для отслеживания, а файл прикрепить позже.
            Поддерживаются PDF, DOC, DOCX, RTF, ODT, до 10 МБ.
          </p>
        </div>
      )}
    </div>
  );
}

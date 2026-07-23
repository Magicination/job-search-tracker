'use client';

import { useState, useRef } from 'react';
import { getDocumentDownloadUrl } from '../lib/documentStorage';
import { Paperclip, X, Eye } from 'lucide-react';

interface DocumentVersionLike {
  id: string;
  name: string;
  file_name: string;
  file_path?: string | null;
  body_text?: string;
}

function isPdf(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.pdf');
}

export function DocumentVersionsPanel({
  title,
  emptyHint,
  versions,
  onAdd,
  onDelete,
  defaultOpen,
  showTextField,
}: {
  title: string;
  emptyHint: string;
  versions: DocumentVersionLike[];
  onAdd: (name: string, notes: string, file: File | null, bodyText: string) => void;
  onDelete: (id: string) => void;
  defaultOpen?: boolean;
  /** Показывать поле для ввода текста письма напрямую — нужно для сопроводительных, не для резюме. */
  showTextField?: boolean;
}) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [bodyText, setBodyText] = useState('');
  const [open, setOpen] = useState(defaultOpen ?? true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    if (!name.trim()) return;
    onAdd(name.trim(), '', file, bodyText);
    setName('');
    setFile(null);
    setBodyText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handlePreview(v: DocumentVersionLike) {
    if (!v.file_path) return;
    if (previewFileId === v.id) {
      setPreviewFileId(null);
      setPreviewUrl(null);
      return;
    }
    const url = await getDocumentDownloadUrl(v.file_path);
    if (url) {
      setPreviewUrl(url);
      setPreviewFileId(v.id);
    }
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
              <div key={v.id} className="rounded-md bg-panel-2 px-2 py-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-sm text-text">{v.name}</span>
                    {v.file_name && (
                      <span className="flex items-center gap-1 text-xs text-text-faint">
                        <Paperclip className="h-3 w-3" /> {v.file_name}
                      </span>
                    )}
                    {v.body_text && (
                      <span className="mt-1 max-w-md text-xs text-text-faint line-clamp-2">{v.body_text}</span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {v.file_path && isPdf(v.file_name) && (
                      <button
                        onClick={() => handlePreview(v)}
                        title="Предпросмотр PDF"
                        className="text-text-faint hover:text-accent-blue"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(v.id)}
                      aria-label="Удалить версию"
                      className="text-text-faint hover:text-accent-coral"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {previewFileId === v.id && previewUrl && (
                  <iframe
                    src={previewUrl}
                    title={`Предпросмотр: ${v.name}`}
                    className="mt-2 h-[70vh] w-full rounded-md border border-border"
                  />
                )}
                {previewFileId === v.id && !isPdf(v.file_name) && (
                  <p className="mt-2 text-xs text-text-faint">
                    Предпросмотр в браузере доступен только для PDF — этот файл можно только скачать.
                  </p>
                )}
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
          {showTextField && (
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Можно ввести текст письма прямо здесь — необязательно вместе с файлом, можно и то и другое, и можно только текст без файла"
              rows={3}
              className="resize-none rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none focus-visible:border-accent-blue"
            />
          )}
          <p className="text-xs text-text-faint">
            Файл необязателен — можно просто завести название для отслеживания, а файл прикрепить позже.
            Поддерживаются PDF, DOC, DOCX, RTF, ODT, до 10 МБ. Предпросмотр в браузере — только для PDF.
          </p>
        </div>
      )}
    </div>
  );
}

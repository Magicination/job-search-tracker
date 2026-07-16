'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNotes } from '../lib/hooks/useNotes';
import { getDocumentDownloadUrl } from '../lib/documentStorage';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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

/**
 * Портал-компонент блокнота. Управляется через createPortal.
 * Фиксированный z-index=50, без transition, overflow: visible.
 */
export function NotebookDrawerPortal() {
  const [open, setOpen] = useState(false);
  const { notes, loading, addNote, toggleShared, deleteNote, currentUserId } = useNotes();

  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [shared, setShared] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Close on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await addNote(content, url, file, shared);
    setSubmitting(false);
    setContent('');
    setUrl('');
    setFile(null);
    setShared(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-dim transition hover:border-border-soft hover:text-text"
        title="Блокнот"
      >
        📒 Блокнот
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="flex h-full w-full max-w-xs flex-col gap-3 overflow-y-auto border-l border-border bg-bg p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text">Блокнот</h2>
              <button onClick={() => setOpen(false)} className="text-text-faint hover:text-text">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-border-soft p-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Заметка…"
                rows={2}
                className="w-full resize-none rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text outline-none focus-visible:border-accent-blue"
              />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Ссылка (необязательно)"
                className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text outline-none focus-visible:border-accent-blue"
              />
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-xs text-text-dim"
              />
              <label className="flex items-center gap-2 text-xs text-text-dim">
                <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
                Поделиться со всеми
              </label>
              <button
                type="submit"
                disabled={submitting || (!content.trim() && !url.trim() && !file)}
                className="rounded-lg bg-accent-amber px-3 py-1.5 text-sm font-medium text-bg disabled:opacity-60"
              >
                {submitting ? 'Сохранение…' : 'Добавить'}
              </button>
            </form>

            <div className="flex flex-col gap-2">
              {loading ? (
                <p className="text-sm text-text-faint">Загрузка…</p>
              ) : notes.length === 0 ? (
                <p className="text-sm text-text-faint">Пока пусто.</p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="rounded-lg border border-border-soft bg-panel p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {n.content && <p className="whitespace-pre-wrap text-sm text-text">{n.content}</p>}
                        {n.url && (
                          <a
                            href={n.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block truncate text-xs text-accent-blue underline-offset-2 hover:underline"
                          >
                            {n.url}
                          </a>
                        )}
                        {n.file_path && (
                          <div className="mt-2 flex items-center justify-between rounded border border-border bg-panel-2 p-2">
                            <span className="text-sm font-medium text-text">{n.file_name}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenFile(n.file_path)}
                                className="rounded border border-border px-2 py-1 text-xs hover:border-border-soft"
                                title="Открыть файл"
                              >
                                Открыть
                              </button>
                              <a
                                href={await getDocumentDownloadUrl(n.file_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded border border-border px-2 py-1 text-xs hover:border-border-soft"
                                download
                                title="Скачать файл"
                              >
                                Скачать
                              </a>
                            </div>
                          </div>,
                          document.body
                        )}
                      </div>
                      {n.user_id === currentUserId && (
                        <button
                          onClick={() => deleteNote(n.id)}
                          className="shrink-0 text-text-faint hover:text-accent-coral"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-xs text-text-faint">{formatDateTime(n.created_at)}</span>
                      {n.user_id === currentUserId && (
                        <button
                          onClick={() => toggleShared(n.id, !n.is_shared)}
                          className="text-xs text-text-faint hover:text-text"
                        >
                          {n.is_shared ? 'Сделать личной' : 'Поделиться'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

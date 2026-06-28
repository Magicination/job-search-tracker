'use client';

import { useState, type FormEvent } from 'react';

export function CreateFromUrlBar({
  onCreate,
}: {
  onCreate: (url: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    setError(null);

    const result = await onCreate(url.trim());

    setSubmitting(false);
    if (result.success) {
      setUrl('');
    } else {
      setError(result.error ?? 'Не удалось создать отклик из ссылки.');
    }
  }

  return (
    <div className="rounded-lg border border-border-soft bg-panel p-3">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-text-dim shrink-0">Создать из ссылки:</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hh.ru/vacancy/12345678"
          className="min-w-[220px] flex-1 rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none focus-visible:border-accent-blue"
        />
        <button
          type="submit"
          disabled={submitting || !url.trim()}
          className="rounded-lg bg-accent-amber px-4 py-2 text-sm font-medium text-bg transition disabled:opacity-60"
        >
          {submitting ? 'Загрузка…' : 'Создать'}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-accent-coral">{error}</p>}
      <p className="mt-2 text-xs text-text-faint">
        Пока поддерживаются только ссылки hh.ru — компания, вакансия, зарплата и требуемый опыт
        заполнятся автоматически, остальное можно дополнить вручную.
      </p>
    </div>
  );
}

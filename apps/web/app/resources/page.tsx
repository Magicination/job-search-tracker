'use client';

import { useState } from 'react';
import {
  RESOURCE_SECTIONS,
  PM_BOOKS,
  SHARED_RESOURCE_CATEGORY_LABELS,
  type ResourceBadge,
  type BadgeVariant,
  type SharedResourceCategory,
} from '@job-search-tracker/shared';
import { Badge } from '../../components/Badge';
import { useSharedResources } from '../../lib/hooks/useSharedResources';
import { SkeletonCard } from '../../components/Skeleton';

const BADGE_LABELS: Record<NonNullable<ResourceBadge>, string> = {
  free: 'бесплатно',
  paid: 'платно',
  international: 'международные',
};

const BADGE_VARIANTS: Record<NonNullable<ResourceBadge>, BadgeVariant> = {
  free: 'teal',
  paid: 'amber',
  international: 'blue',
};

const CATEGORY_OPTIONS: SharedResourceCategory[] = [
  'job_boards',
  'internships',
  'sql_analytics',
  'english',
  'interview_prep',
  'other',
];

function AddResourceForm({
  onAdd,
}: {
  onAdd: (title: string, url: string, note: string, category: SharedResourceCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<SharedResourceCategory>('other');

  function handleSubmit() {
    if (!title.trim() || !url.trim()) return;
    onAdd(title.trim(), url.trim(), note.trim(), category);
    setTitle('');
    setUrl('');
    setNote('');
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-accent-amber px-4 py-2 text-sm font-medium text-bg"
      >
        + Добавить свою ссылку
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border-soft bg-panel p-4">
      <p className="text-xs text-text-faint">
        Эта ссылка станет видна всем пользователям приложения, не только вам.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название"
          className="min-w-[160px] flex-1 rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none focus-visible:border-accent-blue"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Ссылка (https://…)"
          className="min-w-[200px] flex-1 rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none focus-visible:border-accent-blue"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as SharedResourceCategory)}
          className="rounded-lg border border-border bg-panel-2 px-2 py-2 text-sm text-text outline-none focus-visible:border-accent-blue"
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {SHARED_RESOURCE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Короткая заметка (необязательно)"
        className="rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none focus-visible:border-accent-blue"
      />
      <div className="flex gap-2">
        <button onClick={handleSubmit} className="rounded-lg bg-accent-amber px-4 py-2 text-sm font-medium text-bg">
          Добавить
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-4 py-2 text-sm text-text-dim hover:text-text"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  const { resources, loading, addResource, deleteResource, currentUserId } = useSharedResources();
  const [search, setSearch] = useState('');

  const query = search.trim().toLowerCase();

  const filteredStaticSections = RESOURCE_SECTIONS.map((section) => ({
    ...section,
    cards: section.cards.filter((card) => {
      if (!query) return true;
      const haystack = `${card.title} ${card.note}`.toLowerCase();
      return haystack.includes(query);
    }),
  })).filter((section) => section.cards.length > 0);

  const filteredShared = resources.filter((r) => {
    if (!query) return true;
    return `${r.title} ${r.note}`.toLowerCase().includes(query);
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-text">Ресурсы и ссылки</h1>
        <AddResourceForm onAdd={addResource} />
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск по ресурсам…"
        className="w-full max-w-md rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none focus-visible:border-accent-blue"
      />

      <section>
        <h2 className="mb-3 text-sm font-medium text-text-dim">
          Добавлено пользователями {resources.length > 0 && `(${filteredShared.length})`}
        </h2>
        {loading ? (
          <SkeletonCard lines={2} />
        ) : filteredShared.length === 0 ? (
          <p className="text-sm text-text-faint">
            {query ? 'Ничего не найдено.' : 'Пока никто ничего не добавил — будьте первым.'}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredShared.map((r) => (
              <div key={r.id} className="rounded-lg border border-border-soft bg-panel p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-text">{r.title}</h3>
                  <div className="flex items-center gap-2">
                    <Badge label={SHARED_RESOURCE_CATEGORY_LABELS[r.category]} variant="blue" />
                    {r.user_id === currentUserId && (
                      <button
                        onClick={() => deleteResource(r.id)}
                        aria-label="Удалить"
                        className="text-text-faint hover:text-accent-coral"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent-blue underline-offset-2 hover:underline"
                >
                  {r.url}
                </a>
                {r.note && <p className="mt-1 text-xs text-text-faint">{r.note}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {filteredStaticSections.map((section) => (
        <section key={section.heading}>
          <h2 className="mb-3 text-sm font-medium text-text-dim">{section.heading}</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {section.cards.map((card) => (
              <div key={card.title} className="rounded-lg border border-border-soft bg-panel p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-text">{card.title}</h3>
                  {card.badge && <Badge label={BADGE_LABELS[card.badge]} variant={BADGE_VARIANTS[card.badge]} />}
                </div>
                <ul className="mb-2 flex flex-col gap-1">
                  {card.links.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-accent-blue underline-offset-2 hover:underline"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-text-faint">{card.note}</p>
              </div>
            ))}
          </div>

          {section.footnote && (
            <p className="mt-3 rounded-lg border border-border-soft bg-panel-2 p-3 text-xs text-text-dim">
              {section.footnote}
            </p>
          )}
        </section>
      ))}

      {!query && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-text-dim">Книги</h2>
          <div className="rounded-lg border border-border-soft bg-panel p-4">
            <ul className="flex flex-col gap-1 text-sm text-text">
              {PM_BOOKS.map((book) => (
                <li key={book}>{book}</li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

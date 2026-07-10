'use client';

import { useState } from 'react';
import type { Application } from '@job-search-tracker/shared';
import { APPLICATION_STATUS_BADGE_VARIANT, APPLICATION_STATUS_LABELS } from '@job-search-tracker/shared';
import { useApplications } from '../../lib/hooks/useApplications';
import { useResumeVersions } from '../../lib/hooks/useResumeVersions';
import { useCoverLetterVersions } from '../../lib/hooks/useCoverLetterVersions';
import { useApplicationFilters } from '../../lib/hooks/useApplicationFilters';
import { ApplicationCard } from '../../components/ApplicationCard';
import { DocumentVersionsPanel } from '../../components/DocumentVersionsPanel';
import { ApplicationFiltersBar } from '../../components/ApplicationFiltersBar';
import { BookmarkletCard } from '../../components/BookmarkletCard';
import { Badge } from '../../components/Badge';
import { SkeletonList } from '../../components/Skeleton';

/**
 * Свёрнутая по умолчанию строка-сводка отклика — компания, вакансия, статус.
 * Разворачивается в полную ApplicationCard по клику. Сделано так по прямому
 * запросу: список из многих развёрнутых карточек с десятком полей в каждой
 * визуально путает, особенно когда основная масса откликов уже не требует
 * внимания (просто отправлены, ничего нового). Свежесозданный через "+
 * Добавить отклик" или "Создать из ссылки" разворачивается сразу — его
 * обычно сразу хочется дозаполнить.
 */
function CollapsibleApplicationRow({
  app,
  expanded,
  onToggle,
  children,
}: {
  app: Application;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  if (expanded) {
    return (
      <div>
        <button
          onClick={onToggle}
          className="mb-1 text-xs text-text-faint hover:text-text-dim"
        >
          ▾ Свернуть
        </button>
        {children}
      </div>
    );
  }

  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-border-soft bg-panel px-4 py-3 text-left transition hover:border-border"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="truncate text-sm font-medium text-text">{app.company || 'Без названия'}</span>
        <span className="truncate text-sm text-text-dim">{app.role}</span>
      </div>
      <Badge label={APPLICATION_STATUS_LABELS[app.status]} variant={APPLICATION_STATUS_BADGE_VARIANT[app.status]} />
    </button>
  );
}

export default function ApplicationsPage() {
  const {
    applications,
    loading,
    addApplication,
    addApplicationFromFields,
    updateField,
    updateStatus,
    updateAppliedDate,
    updateAppliedTime,
    deleteApplication,
  } = useApplications();
  const { versions: resumeVersions, addVersion: addResumeVersion, deleteVersion: deleteResumeVersion } =
    useResumeVersions();
  const {
    versions: coverLetterVersions,
    addVersion: addCoverLetterVersion,
    deleteVersion: deleteCoverLetterVersion,
  } = useCoverLetterVersions();

  const { filters, setFilters, filtered, availableSources, resetFilters, hasActiveFilters } =
    useApplicationFilters(applications);

  // Раскрытые карточки — по id. Новый отклик (через addApplication или
  // addApplicationFromUrl) добавляется сюда автоматически, см. handleAdd*.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddEmpty() {
    const newId = await addApplication();
    if (newId) setExpandedIds((prev) => new Set(prev).add(newId));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text">Отклики</h1>
      </div>

      {/* Главное действие страницы — крупная кнопка по центру блока создания,
          а не мелкая ссылка в углу, чтобы новый пользователь сразу понимал,
          с чего начать. */}
      <div className="flex flex-col gap-3 rounded-lg border border-accent-amber/30 bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-dim">Добавьте отклик вручную или автоматически через букмарклет.</p>
          <button
            onClick={handleAddEmpty}
            className="shrink-0 rounded-lg bg-accent-amber px-5 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90"
          >
            + Новый отклик
          </button>
        </div>
        <BookmarkletCard />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DocumentVersionsPanel
          title="Версии резюме"
          emptyHint="Создайте версию, если планируете тестировать разные варианты резюме — потом на странице «Аналитика» будет видно, какая версия даёт лучшую конверсию."
          versions={resumeVersions}
          onAdd={addResumeVersion}
          onDelete={deleteResumeVersion}
        />
        <DocumentVersionsPanel
          title="Версии сопроводительного письма"
          emptyHint="Создайте версию, если планируете тестировать разные варианты сопроводительного письма."
          versions={coverLetterVersions}
          onAdd={addCoverLetterVersion}
          onDelete={deleteCoverLetterVersion}
          showTextField
        />
      </div>

      {!loading && applications.length > 0 && (
        <ApplicationFiltersBar
          filters={filters}
          setFilters={setFilters}
          availableSources={availableSources}
          hasActiveFilters={hasActiveFilters}
          resetFilters={resetFilters}
          resultCount={filtered.length}
        />
      )}

      {loading ? (
        <SkeletonList rows={4} />
      ) : applications.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-dim">
          Откликов пока нет — добавьте первый, чтобы начать вести учёт.
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-dim">
          Ничего не найдено по текущим фильтрам — попробуйте изменить условия поиска.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((app) => (
            <CollapsibleApplicationRow
              key={app.id}
              app={app}
              expanded={expandedIds.has(app.id)}
              onToggle={() => toggleExpanded(app.id)}
            >
              <ApplicationCard
                app={app}
                resumeVersions={resumeVersions}
                coverLetterVersions={coverLetterVersions}
                onUpdate={(field, value, debounceMs) => updateField(app.id, field, value, debounceMs)}
                onDateChange={(newDate) => updateAppliedDate(app.id, newDate)}
                onTimeChange={(newTime) => updateAppliedTime(app.id, newTime)}
                onStatusChange={(status) => updateStatus(app.id, status)}
                onDelete={() => {
                  deleteApplication(app.id);
                  setExpandedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(app.id);
                    return next;
                  });
                }}
              />
            </CollapsibleApplicationRow>
          ))}
        </div>
      )}
    </div>
  );
}

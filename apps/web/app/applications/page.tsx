
'use client';

import { useState } from 'react';
import { useApplications } from '../../lib/hooks/useApplications';
import { useResumeVersions } from '../../lib/hooks/useResumeVersions';
import { useApplicationFilters } from '../../lib/hooks/useApplicationFilters';
import { KanbanBoard } from '../../components/KanbanBoard';
import { DocumentVersionsPanel } from '../../components/DocumentVersionsPanel';
import { ApplicationFiltersBar } from '../../components/ApplicationFiltersBar';
import { BookmarkletCard } from '../../components/BookmarkletCard';
import { SkeletonList } from '../../components/Skeleton';

/** @type definitions and exports are handled by the main component */
export default function ApplicationsPage() {
  const {
    applications,
    loading,
    addApplication,
    updateField,
    updateStatus,
    updateAppliedDate,
    updateAppliedTime,
    deleteApplication,
  } = useApplications();
  const { versions: resumeVersions, addVersion: addResumeVersion, deleteVersion: deleteResumeVersion } =
    useResumeVersions();

  const { filters, setFilters, filtered, availableSources, resetFilters, hasActiveFilters } =
    useApplicationFilters(applications);

  const [autoOpenId, setAutoOpenId] = useState<string | null>(null);

  async function handleAddEmpty() {
    const newId = await addApplication();
    if (newId) setAutoOpenId(newId);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Fixed header button for adding new application */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold text-text">Отклики</h1>
        <button
          onClick={handleAddEmpty}
          className="shrink-0 rounded-lg bg-accent-amber px-4 py-1.5 text-sm font-semibold text-bg transition hover:opacity-90"
          title="Добавить новый отклик"
        >
          + Новый отклик
        </button>
      </div>

      {/* Main actions area */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-dim">Добавьте отклик вручную или автоматически через букмарклет.</p>
        <div className="flex flex-wrap gap-2">
          <BookmarkletCard />
          <button
            onClick={handleAddEmpty}
            className="shrink-0 rounded-lg bg-accent-amber px-5 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90"
          >
            + Новый отклик
          </button>
        </div>
      </div>

      <DocumentVersionsPanel
        title="Версии резюме"
        emptyHint="Создайте версию, если планируете тестировать разные варианты резюме — потом на странице «Аналитика» будет видно, какая версия даёт лучшую конверсию."
        versions={resumeVersions}
        onAdd={addResumeVersion}
        onDelete={deleteResumeVersion}
      />

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
        <KanbanBoard
          applications={filtered}
          resumeVersions={resumeVersions}
          onUpdate={(id, field, value, debounceMs) => updateField(id, field as any, value, debounceMs)}
          onDateChange={updateAppliedDate}
          onTimeChange={updateAppliedTime}
          onStatusChange={updateStatus}
          onDelete={deleteApplication}
          autoOpenId={autoOpenId}
          onAutoOpenHandled={() => setAutoOpenId(null)}
        />
      )}
    </div>
  );
}

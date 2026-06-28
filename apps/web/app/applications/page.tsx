'use client';

import { useApplications } from '../../lib/hooks/useApplications';
import { useResumeVersions } from '../../lib/hooks/useResumeVersions';
import { useCoverLetterVersions } from '../../lib/hooks/useCoverLetterVersions';
import { useApplicationFilters } from '../../lib/hooks/useApplicationFilters';
import { ApplicationCard } from '../../components/ApplicationCard';
import { DocumentVersionsPanel } from '../../components/DocumentVersionsPanel';
import { ApplicationFiltersBar } from '../../components/ApplicationFiltersBar';
import { SkeletonList } from '../../components/Skeleton';

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
  const {
    versions: coverLetterVersions,
    addVersion: addCoverLetterVersion,
    deleteVersion: deleteCoverLetterVersion,
  } = useCoverLetterVersions();

  const { filters, setFilters, filtered, availableSources, resetFilters, hasActiveFilters } =
    useApplicationFilters(applications);

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
        <div className="flex flex-col gap-3">
          {filtered.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              resumeVersions={resumeVersions}
              coverLetterVersions={coverLetterVersions}
              onUpdate={(field, value, debounceMs) => updateField(app.id, field, value, debounceMs)}
              onDateChange={(newDate) => updateAppliedDate(app.id, newDate)}
              onTimeChange={(newTime) => updateAppliedTime(app.id, newTime)}
              onStatusChange={(status) => updateStatus(app.id, status)}
              onDelete={() => deleteApplication(app.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

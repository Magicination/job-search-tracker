'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStages } from '../../lib/hooks/useStages';
import { useApplications } from '../../lib/hooks/useApplications';
import { useResumeVersions } from '../../lib/hooks/useResumeVersions';
import { useApplicationFilters } from '../../lib/hooks/useApplicationFilters';
import { useApplicationHistory } from '../../lib/hooks/useApplicationHistory';
import { useCompanies } from '../../lib/hooks/useCompanies';
import { KanbanBoard } from '../../components/KanbanBoard';
import { ApplicationFiltersBar } from '../../components/ApplicationFiltersBar';
import { BookmarkletCard } from '../../components/BookmarkletCard';
import { ArchiveSection } from '../../components/ArchiveSection';
import { SkeletonList } from '../../components/Skeleton';
import { exportApplicationsToCsv, exportWeeklySummaryToCsv } from '../../lib/exportApplications';

export default function ApplicationsPage() {
  const { stages, addStage, updateStage: updateStageDef, swapStagePositions, deleteStage } = useStages();
  const {
    applications,
    loading,
    savingIds,
    addApplication,
    updateField,
    updateStage,
    updateAppliedDate,
    updateAppliedTime,
    deleteApplication,
    restoreApplication,
    permanentlyDeleteApplication,
  } = useApplications(stages);
  const { versions: resumeVersions } = useResumeVersions();

  const { history } = useApplicationHistory();
  const { companies, findOrCreateCompany, updateCompany } = useCompanies();

  const activeApplications = applications.filter((a) => !a.archived);
  const archivedApplications = applications.filter((a) => a.archived);

  const { filters, setFilters, filtered, availableSources, resetFilters, hasActiveFilters } =
    useApplicationFilters(activeApplications);

  /**
   * Компания — отдельная сущность (см. useCompanies): при изменении текста
   * поля "Компания" на отклике находим/создаём соответствующую запись и
   * привязываем company_id, чтобы группировка в архиве и рейтинг компании
   * работали независимо от точного текста в каждом отдельном отклике.
   */
  async function handleUpdate(id: string, field: string, value: any, debounceMs?: number) {
    updateField(id, field as any, value, debounceMs);
    if (field === 'company' && typeof value === 'string' && value.trim()) {
      const companyId = await findOrCreateCompany(value);
      if (companyId) updateField(id, 'company_id' as any, companyId, 0);
    }
  }

  const searchParams = useSearchParams();
  useEffect(() => {
    const stageParam = searchParams.get('stage');
    if (stageParam) {
      setFilters((f) => ({ ...f, stageId: stageParam }));
    }
  }, [searchParams, setFilters]);

  const [autoOpenId, setAutoOpenId] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (e.key.toLowerCase() === 'n' && !isTyping && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleAddEmpty();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddEmpty() {
    const newId = await addApplication();
    if (newId) setAutoOpenId(newId);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text">Отклики</h1>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-dim">Добавьте отклик вручную или автоматически через букмарклет.</p>
        <div className="flex flex-wrap gap-2">
          <BookmarkletCard />
          <button
            onClick={() => exportApplicationsToCsv(applications, stages)}
            disabled={applications.length === 0}
            className="shrink-0 rounded-lg border border-border px-4 py-2.5 text-sm text-text-dim transition hover:border-border-soft disabled:opacity-50"
            title="Скачать все отклики в CSV"
          >
            Экспорт
          </button>
          <button
            onClick={() => exportWeeklySummaryToCsv(applications, history, stages)}
            disabled={applications.length === 0}
            className="shrink-0 rounded-lg border border-border px-4 py-2.5 text-sm text-text-dim transition hover:border-border-soft disabled:opacity-50"
            title="Сводка по неделям: сколько отправлено и сколько дошло до интервью"
          >
            Экспорт по неделям
          </button>
          <button
            onClick={handleAddEmpty}
            className="shrink-0 rounded-lg bg-accent-amber px-5 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90"
          >
            + Новый отклик
          </button>
        </div>
      </div>

      {!loading && applications.length > 0 && (
        <ApplicationFiltersBar
          filters={filters}
          setFilters={setFilters}
          availableSources={availableSources}
          stages={stages}
          hasActiveFilters={hasActiveFilters}
          resetFilters={resetFilters}
          resultCount={filtered.length}
        />
      )}

      {loading ? (
        <SkeletonList rows={4} />
      ) : activeApplications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm text-text-dim">
            Откликов пока нет — добавьте вручную кнопкой выше или установите букмарклет для hh.ru.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-dim">
          Ничего не найдено по текущим фильтрам — попробуйте изменить условия поиска.
        </p>
      ) : (
        <KanbanBoard
          applications={filtered}
          resumeVersions={resumeVersions}
          stages={stages}
          history={history}
          savingIds={savingIds}
          companies={companies}
          onUpdateCompany={updateCompany}
          onUpdate={handleUpdate}
          onDateChange={updateAppliedDate}
          onTimeChange={updateAppliedTime}
          onStageChange={updateStage}
          onDelete={deleteApplication}
          autoOpenId={autoOpenId}
          onAutoOpenHandled={() => setAutoOpenId(null)}
          onAddStage={addStage}
          onUpdateStage={updateStageDef}
          onSwapStages={swapStagePositions}
          onDeleteStage={deleteStage}
        />
      )}

      <ArchiveSection
        archivedApplications={archivedApplications}
        companies={companies}
        stages={stages}
        onRestore={restoreApplication}
        onPermanentDelete={permanentlyDeleteApplication}
        onUpdateCompany={updateCompany}
      />
    </div>
  );
}

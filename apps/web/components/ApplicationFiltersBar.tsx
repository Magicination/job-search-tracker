'use client';

import type { ApplicationFilters } from '../lib/hooks/useApplicationFilters';
import type { Stage } from '@job-search-tracker/shared';

export function ApplicationFiltersBar({
  filters,
  setFilters,
  availableSources,
  stages,
  hasActiveFilters,
  resetFilters,
  resultCount,
}: {
  filters: ApplicationFilters;
  setFilters: (updater: (prev: ApplicationFilters) => ApplicationFilters) => void;
  availableSources: string[];
  stages: Stage[];
  hasActiveFilters: boolean;
  resetFilters: () => void;
  resultCount: number;
}) {
  return (
    <div className="sticky top-16 z-[5] flex flex-col gap-2 rounded-lg border border-border-soft bg-panel/95 p-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          placeholder="Поиск по компании, вакансии, заметке, зарплате…"
          className="min-w-[200px] flex-1 rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none focus-visible:border-accent-blue"
        />

        <select
          value={filters.stageId}
          onChange={(e) => setFilters((prev) => ({ ...prev, stageId: e.target.value }))}
          className="rounded-lg border border-border bg-panel-2 px-2 py-2 text-sm text-text outline-none focus-visible:border-accent-blue"
        >
          <option value="all">Все этапы</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={filters.source}
          onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))}
          className="rounded-lg border border-border bg-panel-2 px-2 py-2 text-sm text-text outline-none focus-visible:border-accent-blue"
        >
          <option value="all">Все источники</option>
          {availableSources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-text-dim">
          с
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
            className="rounded-lg border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus-visible:border-accent-blue"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-text-dim">
          по
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
            className="rounded-lg border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus-visible:border-accent-blue"
          />
        </label>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-dim transition hover:border-border-soft hover:text-text"
          >
            Сбросить фильтры
          </button>
        )}

        <span className="ml-auto text-xs text-text-faint">
          {resultCount} {resultCount === 1 ? 'отклик' : 'откликов'}
        </span>
      </div>
    </div>
  );
}

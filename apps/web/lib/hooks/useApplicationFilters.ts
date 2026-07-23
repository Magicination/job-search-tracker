'use client';

// Поиск + фильтры по откликам — работают на клиенте над уже загруженным
// массивом applications. Для объёма данных одного пользователя (десятки-
// сотни откликов) это быстрее и проще, чем гонять запрос в БД на каждое
// изменение фильтра.

import { useMemo, useState } from 'react';
import type { Application } from '@job-search-tracker/shared';

export interface ApplicationFilters {
  search: string;
  stageId: string | 'all';
  source: string | 'all';
  dateFrom: string; // YYYY-MM-DD, пусто = без ограничения
  dateTo: string;
}

const EMPTY_FILTERS: ApplicationFilters = {
  search: '',
  stageId: 'all',
  source: 'all',
  dateFrom: '',
  dateTo: '',
};

export function useApplicationFilters(applications: Application[]) {
  const [filters, setFilters] = useState<ApplicationFilters>(EMPTY_FILTERS);

  const availableSources = useMemo(() => {
    const set = new Set<string>();
    for (const app of applications) {
      if (app.source.trim()) set.add(app.source.trim());
    }
    return Array.from(set).sort();
  }, [applications]);

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return applications.filter((app) => {
      if (filters.stageId !== 'all' && app.stage_id !== filters.stageId) return false;
      if (filters.source !== 'all' && app.source !== filters.source) return false;
      if (filters.dateFrom && (!app.applied_date || app.applied_date < filters.dateFrom)) return false;
      if (filters.dateTo && (!app.applied_date || app.applied_date > filters.dateTo)) return false;

      if (query) {
        // Поиск по всем текстовым колонкам сразу — компания, вакансия,
        // источник, заметка, зарплата, требуемый опыт.
        const haystack = [
          app.company,
          app.role,
          app.source,
          app.note,
          app.salary,
          app.experience_required,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [applications, filters]);

  const resetFilters = () => setFilters(EMPTY_FILTERS);
  const hasActiveFilters =
    filters.search !== '' ||
    filters.stageId !== 'all' ||
    filters.source !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '';

  return { filters, setFilters, filtered, availableSources, resetFilters, hasActiveFilters };
}

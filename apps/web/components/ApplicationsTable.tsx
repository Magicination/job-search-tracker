'use client';

import type { Application, Stage } from '@job-search-tracker/shared';

export function ApplicationsTable({
  applications,
  stages,
  savingIds,
  onOpen,
  onStageChange,
}: {
  applications: Application[];
  stages: Stage[];
  savingIds?: Set<string>;
  onOpen: (id: string) => void;
  onStageChange: (id: string, stageId: string) => void;
}) {
  const orderedStages = [...stages].sort((a, b) => a.position - b.position);

  return (
    <div className="overflow-x-auto rounded-lg border border-border-soft">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border-soft bg-panel text-left text-xs text-text-faint">
            <th className="px-3 py-2 font-medium">Компания</th>
            <th className="px-3 py-2 font-medium">Вакансия</th>
            <th className="px-3 py-2 font-medium">Зарплата</th>
            <th className="px-3 py-2 font-medium">Дата</th>
            <th className="px-3 py-2 font-medium">Этап</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => {
            return (
              <tr key={app.id} className="border-b border-border-soft last:border-0 hover:bg-panel/60">
                <td className="max-w-[200px] truncate px-3 py-2">
                  <button onClick={() => onOpen(app.id)} className="text-left text-text hover:underline">
                    {app.company || 'Без названия'}
                  </button>
                </td>
                <td className="max-w-[240px] truncate px-3 py-2 text-text-dim">{app.role}</td>
                <td className="max-w-[160px] truncate px-3 py-2 text-text-faint">{app.salary}</td>
                <td className="whitespace-nowrap px-3 py-2 text-text-faint">
                  {app.applied_date ? new Date(app.applied_date).toLocaleDateString('ru-RU') : '—'}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <select
                      value={app.stage_id}
                      onChange={(e) => onStageChange(app.id, e.target.value)}
                      className="rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-text outline-none focus-visible:border-accent-blue"
                    >
                      {orderedStages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {savingIds?.has(app.id) && (
                      <svg className="h-3 w-3 animate-spin text-text-faint" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {applications.length === 0 && <p className="p-4 text-center text-sm text-text-faint">Ничего не найдено.</p>}
    </div>
  );
}

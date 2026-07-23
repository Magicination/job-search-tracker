import type { Application, ApplicationStatusHistoryEntry, Stage } from '@job-search-tracker/shared';

function getIsoWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function csvEscape(value: string | null | undefined): string {
  const str = value ?? '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const TEXT_COLUMNS: { key: keyof Application; label: string }[] = [
  { key: 'company', label: 'Компания' },
  { key: 'role', label: 'Вакансия' },
  { key: 'source', label: 'Источник' },
  { key: 'applied_date', label: 'Дата отклика' },
  { key: 'salary', label: 'Зарплата' },
  { key: 'experience_required', label: 'Опыт' },
  { key: 'vacancy_url', label: 'Ссылка на вакансию' },
  { key: 'note', label: 'Заметка' },
  { key: 'created_at', label: 'Создано' },
];

export function exportApplicationsToCsv(applications: Application[], stages: Stage[]) {
  const stageNameById = new Map(stages.map((s) => [s.id, s.name]));
  const header = ['Этап', ...TEXT_COLUMNS.map((c) => c.label)].map(csvEscape).join(',');
  const rows = applications.map((app) =>
    [csvEscape(stageNameById.get(app.stage_id) ?? ''), ...TEXT_COLUMNS.map((c) => csvEscape(app[c.key] as string | null))].join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `job-search-tracker-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportWeeklySummaryToCsv(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[]
) {
  const orderedStages = [...stages].sort((a, b) => a.position - b.position);
  const firstStageId = orderedStages[0]?.id;

  const weeks = new Map<string, { sent: number; movedForward: Set<string> }>();

  for (const app of applications) {
    if (!app.applied_date) continue;
    const key = getIsoWeekKey(app.applied_date);
    if (!weeks.has(key)) weeks.set(key, { sent: 0, movedForward: new Set() });
    weeks.get(key)!.sent += 1;
  }

  for (const h of history) {
    if (firstStageId && h.to_stage_id !== firstStageId) {
      const app = applications.find((a) => a.id === h.application_id);
      if (app?.applied_date) {
        const key = getIsoWeekKey(app.applied_date);
        weeks.get(key)?.movedForward.add(app.id);
      }
    }
  }

  const rows = Array.from(weeks.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, d]) => `${week},${d.sent},${d.movedForward.size}`);

  const csv = ['Неделя,Отправлено,Получили любое движение дальше', ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `job-search-tracker-weekly-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

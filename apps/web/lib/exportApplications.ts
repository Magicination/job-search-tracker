import type { Application, ApplicationStatusHistoryEntry } from '@job-search-tracker/shared';

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

const COLUMNS: { key: keyof Application; label: string }[] = [
  { key: 'company', label: 'Компания' },
  { key: 'role', label: 'Вакансия' },
  { key: 'source', label: 'Источник' },
  { key: 'status', label: 'Статус' },
  { key: 'applied_date', label: 'Дата отклика' },
  { key: 'salary', label: 'Зарплата' },
  { key: 'experience_required', label: 'Опыт' },
  { key: 'vacancy_url', label: 'Ссылка на вакансию' },
  { key: 'note', label: 'Заметка' },
  { key: 'created_at', label: 'Создано' },
];

export function exportApplicationsToCsv(applications: Application[]) {
  const header = COLUMNS.map((c) => csvEscape(c.label)).join(',');
  const rows = applications.map((app) =>
    COLUMNS.map((c) => csvEscape(app[c.key] as string | null)).join(',')
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

export function exportWeeklySummaryToCsv(applications: Application[], history: ApplicationStatusHistoryEntry[]) {
  const weeks = new Map<string, { sent: number; interviewOrBetter: Set<string> }>();

  for (const app of applications) {
    if (!app.applied_date) continue;
    const key = getIsoWeekKey(app.applied_date);
    if (!weeks.has(key)) weeks.set(key, { sent: 0, interviewOrBetter: new Set() });
    weeks.get(key)!.sent += 1;
  }

  for (const h of history) {
    if (h.to_status === 'interview' || h.to_status === 'offer') {
      const app = applications.find((a) => a.id === h.application_id);
      if (app?.applied_date) {
        const key = getIsoWeekKey(app.applied_date);
        weeks.get(key)?.interviewOrBetter.add(app.id);
      }
    }
  }

  const rows = Array.from(weeks.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, d]) => `${week},${d.sent},${d.interviewOrBetter.size}`);

  const csv = ['Неделя,Отправлено,Дошло до интервью+', ...rows].join('\n');
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

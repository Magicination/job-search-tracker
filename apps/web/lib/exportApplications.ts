import type { Application } from '@job-search-tracker/shared';

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

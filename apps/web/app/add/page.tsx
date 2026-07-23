'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApplications } from '../../lib/hooks/useApplications';
import { useStages } from '../../lib/hooks/useStages';

export default function AddFromBookmarkletPage() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const { stages } = useStages();
 const { applications, addApplicationFromFields } = useApplications(stages);

 const initialUrl = searchParams.get('url') ?? '';
 const [company, setCompany] = useState(searchParams.get('company') ?? '');
 const [role, setRole] = useState(searchParams.get('role') ?? '');
 const [salary, setSalary] = useState(searchParams.get('salary') ?? '');
 const [experience, setExperience] = useState(searchParams.get('experience') ?? '');
 const [url] = useState(initialUrl);
 const [submitting, setSubmitting] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const duplicate = applications.find(
 (a) =>
 (url && a.vacancy_url === url) ||
 (company.trim() &&
 role.trim() &&
 a.company.trim().toLowerCase() === company.trim().toLowerCase() &&
 a.role.trim().toLowerCase() === role.trim().toLowerCase())
 );

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();

 if (duplicate) {
 const proceed = window.confirm(
 `Похоже, такой отклик уже есть (добавлен ${new Date(duplicate.created_at).toLocaleDateString('ru-RU')}). Всё равно создать ещё один?`
 );
 if (!proceed) return;
 }

 setSubmitting(true);
 setError(null);

 const result = await addApplicationFromFields({
 company,
 role,
 salary,
 experience_required: experience,
 source: url.includes('hh.') ? 'hh.ru' : '',
 vacancy_url: url,
 });

 setSubmitting(false);
 if (result.success) {
 router.push('/applications');
 } else {
 setError(result.error ?? 'Не удалось создать отклик.');
 }
 }

 return (
 <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
 <h1 className="text-lg font-semibold text-text">Новый отклик из hh.ru</h1>
 {!company && !role && (
 <p className="text-sm text-accent-coral">
 Поля пустые — букмарклет не смог их прочитать на этой странице.
 Проверьте, что открыта страница конкретной вакансии, или заполните вручную.
 </p>
 )}
 {duplicate && (
 <p className="rounded-lg border border-accent-amber/50 bg-accent-amber/10 p-2 text-sm text-text-dim">
 Похоже, такой отклик уже есть в списке (добавлен{' '}
 {new Date(duplicate.created_at).toLocaleDateString('ru-RU')}). Можно всё равно продолжить.
 </p>
 )}
 <form onSubmit={handleSubmit} className="flex flex-col gap-3">
 <label className="flex flex-col gap-1 text-sm text-text-dim">
 Компания
 <input
 value={company}
 onChange={(e) => setCompany(e.target.value)}
 className="rounded-lg border border-border bg-panel-2 px-3 py-2 text-text outline-none focus-visible:border-accent-blue"
 />
 </label>
 <label className="flex flex-col gap-1 text-sm text-text-dim">
 Вакансия
 <input
 value={role}
 onChange={(e) => setRole(e.target.value)}
 className="rounded-lg border border-border bg-panel-2 px-3 py-2 text-text outline-none focus-visible:border-accent-blue"
 />
 </label>
 <label className="flex flex-col gap-1 text-sm text-text-dim">
 Зарплата
 <input
 value={salary}
 onChange={(e) => setSalary(e.target.value)}
 className="rounded-lg border border-border bg-panel-2 px-3 py-2 text-text outline-none focus-visible:border-accent-blue"
 />
 </label>
 <label className="flex flex-col gap-1 text-sm text-text-dim">
 Требуемый опыт
 <input
 value={experience}
 onChange={(e) => setExperience(e.target.value)}
 className="rounded-lg border border-border bg-panel-2 px-3 py-2 text-text outline-none focus-visible:border-accent-blue"
 />
 </label>
 {url && (
 <p className="truncate text-xs text-text-faint" title={url}>
 Ссылка: {url}
 </p>
 )}
 {error && <p className="text-xs text-accent-coral">{error}</p>}
 <button
 type="submit"
 disabled={submitting}
 className="rounded-lg bg-accent-amber px-4 py-2 text-sm font-semibold text-bg transition disabled:opacity-60"
 >
 {submitting ? 'Сохранение…' : duplicate ? 'Всё равно создать' : 'Создать отклик'}
 </button>
 </form>
 </div>
 );
}

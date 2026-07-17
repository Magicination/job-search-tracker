'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import type { Application } from '@job-search-tracker/shared';
import { getTodayLocal } from '@job-search-tracker/shared';
export default function AddFromBookmarkletPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Загружаем приложения для проверки дубликатов
  const [applications, setApplications] = useState<Application[]>([]);
  useEffect(() => {
    const fetchApplications = async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setApplications(data as Application[]);
      }
    };
    fetchApplications();
  }, []);

  const initialUrl = searchParams.get('url') ?? '';
  const [company, setCompany] = useState(searchParams.get('company') ?? '');
  const [role, setRole] = useState(searchParams.get('role') ?? '');
  const [salary, setSalary] = useState(searchParams.get('salary') ?? '');
  const [experience, setExperience] = useState(searchParams.get('experience') ?? '');
  const [url] = useState(initialUrl);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Проверка на дубли: по vacancy_url ИЛИ (company + role совпадают в lower)
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

    // Получаем user_id через auth
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setError('Вы не авторизованы. Пожалуйста, войдите в аккаунт.');
      setSubmitting(false);
      return;
    }

    // Создаем отклик через supabase напрямую
    const now = new Date().toISOString();
    const { data: created, error } = await supabase
      .from('applications')
      .insert({
        user_id: authData.user.id,
        company,
        role,
        source: url.includes('hh.') ? 'hh.ru' : '',
        applied_date: getTodayLocal(),
        applied_at: now,
        status: 'applied',
        note: '',
        salary,
        experience_required: experience,
        vacancy_url: url,
      })
      .select()
      .single();

    setSubmitting(false);
    if (error || !created) {
      setError('Не удалось создать отклик. Попробуйте ещё раз.');
    } else {
      router.push('/applications');
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4 max-h-[90vh] overflow-y-auto">
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

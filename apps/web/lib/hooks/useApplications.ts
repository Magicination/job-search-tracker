'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Application, ApplicationStatus } from '@job-search-tracker/shared';
import { getTodayLocal } from '@job-search-tracker/shared';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { isHhUrl, extractHhVacancyId, fetchHhVacancyFromBrowser } from '../hhVacancyParser';

export function useApplications() {
  const { user } = useAuth();
  const { showError } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const fetchApplications = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      showError('Не удалось загрузить отклики. Проверьте соединение и обновите страницу.');
    } else if (data) {
      setApplications(data as Application[]);
    }
    setLoading(false);
  }, [user, showError]);

  useEffect(() => {
    if (!user) return;
    fetchApplications();

    const channel = supabase
      .channel('applications-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications', filter: `user_id=eq.${user.id}` },
        () => fetchApplications()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /**
   * Общая логика создания отклика + первой записи в историю статусов.
   * Используется и пустой кнопкой "Добавить отклик", и автозаполнением по
   * ссылке — чтобы не дублировать вставку в application_status_history.
   */
  const insertApplicationWithHistory = useCallback(
    async (fields: Partial<Application>) => {
      if (!user) return null;
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          company: '',
          role: '',
          source: '',
          applied_date: getTodayLocal(),
          applied_at: now,
          status: 'applied',
          note: '',
          salary: '',
          experience_required: '',
          ...fields,
        })
        .select()
        .single();

      if (error || !data) {
        showError('Не удалось создать отклик. Попробуйте ещё раз.');
        return null;
      }

      setApplications((prev) => [data as Application, ...prev]);
      const { error: historyError } = await supabase.from('application_status_history').insert({
        user_id: user.id,
        application_id: (data as Application).id,
        from_status: null,
        to_status: 'applied',
        changed_at: now,
      });
      if (historyError) {
        showError('Отклик создан, но не сохранился в истории для аналитики.');
      }

      return data as Application;
    },
    [user, showError]
  );

  const addApplication = useCallback(async (): Promise<string | null> => {
    const created = await insertApplicationWithHistory({});
    return created?.id ?? null;
  }, [insertApplicationWithHistory]);

  /**
   * Создаёт отклик, предзаполненный данными, разобранными по ссылке на
   * вакансию (сейчас только hh.ru). Источник ('hh.ru') проставляется
   * автоматически — раз ссылка именно с hh.ru, нет смысла спрашивать
   * пользователя.
   *
   * Сначала пробуем запрос прямо из браузера (lib/hhVacancyParser.ts) — у
   * серверных функций Vercel hh.ru возвращает 403 (похоже на блокировку
   * датацентровых IP анти-бот защитой), а у обычного пользовательского IP
   * шансы на успех выше. Если браузерный запрос не прошёл (CORS, сеть) —
   * пробуем /api/parse-vacancy как запасной путь.
   */
  const addApplicationFromUrl = useCallback(
    async (url: string): Promise<{ success: boolean; error?: string; id?: string }> => {
      if (!isHhUrl(url)) {
        return { success: false, error: 'Автозаполнение пока поддерживает только ссылки hh.ru.' };
      }

      const vacancyId = extractHhVacancyId(url);
      if (!vacancyId) {
        return {
          success: false,
          error: 'Не удалось найти ID вакансии в ссылке. Проверьте, что это ссылка вида hh.ru/vacancy/12345678.',
        };
      }

      let parsed: { company: string; role: string; salary: string; experienceRequired: string } | null = null;
      let lastError = '';

      try {
        parsed = await fetchHhVacancyFromBrowser(vacancyId);
      } catch (browserErr) {
        lastError = browserErr instanceof Error ? browserErr.message : 'Браузерный запрос не удался.';

        // Fallback на сервер — оставлен на случай, если у конкретного
        // пользователя сетевые условия отличаются (например, hh.ru снимет
        // IP-блокировку, или проблема была именно в CORS, не в IP).
        try {
          const response = await fetch('/api/parse-vacancy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });
          const serverParsed = await response.json();
          if (response.ok) {
            parsed = serverParsed;
          } else {
            lastError = serverParsed.error ?? lastError;
          }
        } catch {
          // оставляем lastError от браузерной попытки — он информативнее
        }
      }

      if (!parsed) {
        return { success: false, error: lastError || 'Не удалось разобрать ссылку.' };
      }

      const created = await insertApplicationWithHistory({
        company: parsed.company ?? '',
        role: parsed.role ?? '',
        salary: parsed.salary ?? '',
        experience_required: parsed.experienceRequired ?? '',
        source: 'hh.ru',
      });

      if (!created) {
        return { success: false, error: 'Данные разобраны, но не удалось сохранить отклик.' };
      }

      return { success: true, id: created.id };
    },
    [insertApplicationWithHistory]
  );

  /** Немедленное обновление в UI + debounce ~500мс перед записью в БД (для текстовых полей). */
  const updateField = useCallback(
    <K extends keyof Application>(id: string, field: K, value: Application[K], debounceMs = 500) => {
      let previousValue: Application[K] | undefined;
      setApplications((prev) =>
        prev.map((app) => {
          if (app.id !== id) return app;
          previousValue = app[field];
          return { ...app, [field]: value };
        })
      );

      const key = `${id}:${field}`;
      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }
      debounceTimers.current[key] = setTimeout(async () => {
        const { error } = await supabase
          .from('applications')
          .update({ [field]: value, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) {
          showError('Не удалось сохранить изменение. Попробуйте ещё раз.');
          if (previousValue !== undefined) {
            setApplications((prev) =>
              prev.map((app) => (app.id === id ? { ...app, [field]: previousValue as Application[K] } : app))
            );
          }
        }
      }, debounceMs);
    },
    [showError]
  );

  /**
   * Изменение даты отклика через UI (поле с типом date) должно синхронно
   * сдвигать и день в applied_at — иначе при ручной правке даты (например,
   * пользователь задним числом добавляет старый отклик или исправляет
   * опечатку) applied_at останется со старым днём, и аналитика по дню
   * недели/времени суток будет смотреть на дату, которую пользователь уже
   * не видит и не имел в виду. Время суток из старого applied_at сохраняем
   * (если оно было) — меняем только календарный день, не "обнуляем" время.
   */
  const updateAppliedDate = useCallback(
    (id: string, newDate: string) => {
      const current = applications.find((app) => app.id === id);
      if (!current) return;

      let newAppliedAt: string | null = null;
      if (newDate) {
        const [year, month, day] = newDate.split('-').map(Number);
        const previousTime = current.applied_at ? new Date(current.applied_at) : null;
        const combined = new Date(
          year,
          month - 1,
          day,
          previousTime ? previousTime.getHours() : 9,
          previousTime ? previousTime.getMinutes() : 0
        );
        newAppliedAt = combined.toISOString();
      }

      const previousDate = current.applied_date;
      const previousAt = current.applied_at;

      setApplications((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, applied_date: newDate || null, applied_at: newAppliedAt } : app
        )
      );

      const key = `${id}:applied_date`;
      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }
      debounceTimers.current[key] = setTimeout(async () => {
        const { error } = await supabase
          .from('applications')
          .update({
            applied_date: newDate || null,
            applied_at: newAppliedAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) {
          showError('Не удалось сохранить дату отклика. Попробуйте ещё раз.');
          setApplications((prev) =>
            prev.map((app) => (app.id === id ? { ...app, applied_date: previousDate, applied_at: previousAt } : app))
          );
        }
      }, 0);
    },
    [applications, showError]
  );

  /**
   * Изменение только времени (часы:минуты) отклика, не трогая календарную
   * дату — отдельный input для времени в UI, см. requirement "время отклика
   * для аналитики". Логика зеркальна updateAppliedDate, но с другой осью.
   */
  const updateAppliedTime = useCallback(
    (id: string, newTime: string) => {
      const current = applications.find((app) => app.id === id);
      if (!current) return;

      const baseDate = current.applied_at ? new Date(current.applied_at) : new Date();
      const [hours, minutes] = newTime.split(':').map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return;

      const combined = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        baseDate.getDate(),
        hours,
        minutes
      );
      const newAppliedAt = combined.toISOString();
      const previousAt = current.applied_at;

      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, applied_at: newAppliedAt } : app))
      );

      const key = `${id}:applied_at`;
      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }
      debounceTimers.current[key] = setTimeout(async () => {
        const { error } = await supabase
          .from('applications')
          .update({ applied_at: newAppliedAt, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) {
          showError('Не удалось сохранить время отклика. Попробуйте ещё раз.');
          setApplications((prev) =>
            prev.map((app) => (app.id === id ? { ...app, applied_at: previousAt } : app))
          );
        }
      }, 500);
    },
    [applications, showError]
  );

  const deleteApplication = useCallback(
    async (id: string) => {
      const removed = applications.find((app) => app.id === id);
      setApplications((prev) => prev.filter((app) => app.id !== id));

      const { error } = await supabase.from('applications').delete().eq('id', id);
      if (error && removed) {
        showError('Не удалось удалить отклик. Попробуйте ещё раз.');
        setApplications((prev) => [...prev, removed].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      }
    },
    [applications, showError]
  );

  /**
   * Обновление статуса — отдельно от updateField, так как помимо самого поля
   * нужно записать переход в application_status_history (для воронки конверсии
   * и расчёта времени между статусами). См. 04-features-logic.md: статус не
   * меняется автоматически, только по явному действию пользователя — и это
   * единственное место, где должна появляться новая запись в истории.
   */
  const updateStatus = useCallback(
    async (id: string, newStatus: ApplicationStatus) => {
      if (!user) return;
      const current = applications.find((app) => app.id === id);
      if (!current || current.status === newStatus) return;

      const now = new Date().toISOString();
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: newStatus, updated_at: now } : app))
      );

      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus, updated_at: now })
        .eq('id', id);

      if (error) {
        showError('Не удалось изменить статус. Попробуйте ещё раз.');
        setApplications((prev) => prev.map((app) => (app.id === id ? current : app)));
        return;
      }

      const { error: historyError } = await supabase.from('application_status_history').insert({
        user_id: user.id,
        application_id: id,
        from_status: current.status,
        to_status: newStatus,
        changed_at: now,
      });
      if (historyError) {
        showError('Статус изменён, но не сохранился в истории для аналитики.');
      }
    },
    [user, applications, showError]
  );

  return {
    applications,
    loading,
    addApplication,
    addApplicationFromUrl,
    updateField,
    updateStatus,
    updateAppliedDate,
    updateAppliedTime,
    deleteApplication,
  };
}

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Application, ApplicationStatus } from '@job-search-tracker/shared';
import { getTodayLocal } from '@job-search-tracker/shared';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export function useApplications() {
  const { user } = useAuth();
  const { showToast, removeToast } = useToast();
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
      
      // Сначала создаём отклик, возвращая auto-generated ID от Supabase
      const { data, error } = await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          company: fields.company ?? '',
          role: fields.role ?? '',
          source: fields.source ?? '',
          applied_date: fields.applied_date ?? getTodayLocal(),
          applied_at: fields.applied_at ?? now,
          status: 'applied',
          note: fields.note ?? '',
          salary: fields.salary ?? '',
          experience_required: fields.experience_required ?? '',
          vacancy_url: fields.vacancy_url ?? null,
        })
        .select()
        .single();

      if (error || !data) {
        console.error('Error creating application:', error);
        showToast('Не удалось создать отклик. Проверьте соединение и обновите страницу.', 'error');
        return null;
      }

      setApplications((prev) => [data as Application, ...prev]);
      
      // Добавляем запись в историю статусов
      const { error: historyError } = await supabase
        .from('application_status_history')
        .insert({
          user_id: user.id,
          application_id: (data as Application).id,
          from_status: null,
          to_status: 'applied',
          changed_at: now,
        });
      
      if (historyError) {
        console.error('Error creating status history:', historyError);
        // Не показываем ошибку пользователю — отклик создан, история не критична
      } else {
        showToast('Отклик успешно сохранён', 'success');
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
   * Создаёт отклик из полей, уже разобранных на клиенте — букмарклетом на
   * странице вакансии hh.ru (читает JobPosting schema прямо из DOM, без
   * серверных или браузерных запросов к api.hh.ru, которые hh.ru блокирует
   * анти-бот защитой). Букмарклет передаёт данные через query-параметры
   * страницы /add, которая и вызывает эту функцию. Ссылка на вакансию
   * кладётся в vacancy_url — там работает автоопределение и подсветка URL.
   */
  const addApplicationFromFields = useCallback(
    async (fields: {
      company?: string;
      role?: string;
      salary?: string;
      experience_required?: string;
      source?: string;
      note?: string;
      vacancy_url?: string;
    }): Promise<{ success: boolean; error?: string; id?: string }> => {
      const created = await insertApplicationWithHistory(fields);
      if (!created) {
        return { success: false, error: 'Не удалось сохранить отклик.' };
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
          showToast(`Не удалось сохранить ${String(field).toLowerCase()}. Попробуйте ещё раз.`, 'error');
          if (previousValue !== undefined) {
            setApplications((prev) =>
              prev.map((app) => (app.id === id ? { ...app, [field]: previousValue as Application[K] } : app))
            );
          }
        } else {
          showToast(`Изменение ${String(field).toLowerCase()} сохранено`, 'success');
        }
      }, debounceMs);
    },
    [showToast]
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
          showToast('Не удалось сохранить дату отклика. Попробуйте ещё раз.', 'error');
          setApplications((prev) =>
            prev.map((app) => (app.id === id ? { ...app, applied_date: previousDate, applied_at: previousAt } : app))
          );
        } else {
          showToast('Дата отклика сохранена', 'success');
        }
      }, 0);
    },
    [applications, showToast]
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
          showToast('Не удалось сохранить время отклика. Попробуйте ещё раз.', 'error');
          setApplications((prev) =>
            prev.map((app) => (app.id === id ? { ...app, applied_at: previousAt } : app))
          );
        } else {
          showToast('Время отклика сохранено', 'success');
        }
      }, 500);
    },
    [applications, showToast]
  );

  const deleteApplication = useCallback(
    async (id: string) => {
      const removed = applications.find((app) => app.id === id);
      setApplications((prev) => prev.filter((app) => app.id !== id));

      const { error } = await supabase.from('applications').delete().eq('id', id);
      
      if (error && removed) {
        showToast('Не удалось удалить отклик. Попробуйте ещё раз.', 'error');
        setApplications((prev) => [...prev, removed].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      } else {
        showToast('Отклик успешно удалён', 'success');
      }
    },
    [applications, showToast]
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
        showToast('Не удалось изменить статус. Попробуйте ещё раз.', 'error');
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
        console.error('Failed to create status history entry:', historyError);
      } else {
        const statusText = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
        showToast(`Статус обновлён: ${statusText}`, 'success');
      }
    },
    [user, applications, showToast]
  );

  return {
    applications,
    loading,
    addApplication,
    addApplicationFromFields,
    updateField,
    updateStatus,
    updateAppliedDate,
    updateAppliedTime,
    deleteApplication,
  };
}

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Application, Stage } from '@job-search-tracker/shared';
import { getTodayLocal } from '@job-search-tracker/shared';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

function isSameLocalDay(isoA: string, isoB: string): boolean {
  const a = new Date(isoA);
  const b = new Date(isoB);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getFirstStage(stages: Stage[]): Stage | null {
  if (stages.length === 0) return null;
  return [...stages].sort((a, b) => a.position - b.position)[0];
}

/**
 * stages передаются извне (из useStages()), а не создаются здесь — этому
 * хуку нужен полный список этапов пользователя, чтобы: 1) знать id
 * "первого" этапа при создании нового отклика, 2) проверять auto_archive
 * у текущего этапа при смене стадии (см. updateStage), 3) лениво
 * доархивировать отклики, у которых "проигрышный" день уже прошёл
 * (см. commitStaleArchive).
 */
export function useApplications(stages: Stage[]) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /**
   * Отклики на auto_archive-этапе, у которых rejected_at относится не к
   * сегодняшнему дню — реально архивируем в БД (лениво, при загрузке).
   * Так реализуется "остаётся видимым до конца дня, на следующий день
   * уходит в архив" без отдельного крон-задания: проверка идёт при
   * каждой загрузке списка, а день определяется по локальному времени
   * устройства пользователя в момент проверки.
   */
  const commitStaleArchive = useCallback(
    async (apps: Application[], stagesList: Stage[]) => {
      if (stagesList.length === 0) return;
      const autoArchiveIds = new Set(stagesList.filter((s) => s.auto_archive).map((s) => s.id));
      const now = new Date().toISOString();

      const stale = apps.filter(
        (app) =>
          !app.archived &&
          autoArchiveIds.has(app.stage_id) &&
          app.rejected_at &&
          !isSameLocalDay(app.rejected_at, now)
      );

      if (stale.length === 0) return;

      const staleIds = stale.map((a) => a.id);
      setApplications((prev) => prev.map((a) => (staleIds.includes(a.id) ? { ...a, archived: true } : a)));

      const { error } = await supabase.from('applications').update({ archived: true }).in('id', staleIds);
      if (error) {
        console.error('Failed to lazily archive stale applications:', error);
      }
    },
    []
  );

  const fetchApplications = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Не удалось загрузить отклики. Проверьте соединение и обновите страницу.', 'error');
    } else if (data) {
      setApplications(data as Application[]);
      commitStaleArchive(data as Application[], stages);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, showToast]);

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

  // Повторная проверка "не пора ли доархивировать" при каждом обновлении
  // списка этапов (например, стадии ещё не были загружены на момент
  // первого fetchApplications).
  useEffect(() => {
    if (applications.length > 0 && stages.length > 0) {
      commitStaleArchive(applications, stages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages.length]);

  /**
   * Общая логика создания отклика + первой записи в историю статусов.
   * Используется и пустой кнопкой "Добавить отклик", и автозаполнением по
   * ссылке — чтобы не дублировать вставку в application_status_history.
   */
  const insertApplicationWithHistory = useCallback(
    async (fields: Partial<Application>) => {
      if (!user) return null;
      const firstStage = getFirstStage(stages);
      if (!firstStage) {
        showToast('Этапы канбана ещё загружаются, попробуйте через секунду.', 'error');
        return null;
      }
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          company: fields.company ?? '',
          role: fields.role ?? '',
          source: fields.source ?? '',
          applied_date: fields.applied_date ?? getTodayLocal(),
          applied_at: fields.applied_at ?? now,
          stage_id: firstStage.id,
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

      const { error: historyError } = await supabase.from('application_status_history').insert({
        user_id: user.id,
        application_id: (data as Application).id,
        from_stage_id: null,
        to_stage_id: firstStage.id,
        changed_at: now,
      });

      if (historyError) {
        console.error('Error creating status history:', historyError);
      } else {
        showToast('Отклик успешно сохранён', 'success');
      }

      return data as Application;
    },
    [user, stages, showToast]
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

  /**
   * "Удаление" отклика — не стирает строку в базе, а помечает archived=true.
   * Обратимо через restoreApplication. Ничего не удаляем физически по
   * умолчанию — см. историю с почти потерянными данными на миграции статуса
   * "Скрининг", после этого решили не рисковать необратимыми операциями.
   */
  const deleteApplication = useCallback(
    async (id: string) => {
      const removed = applications.find((app) => app.id === id);
      setApplications((prev) => prev.map((app) => (app.id === id ? { ...app, archived: true } : app)));

      const { error } = await supabase.from('applications').update({ archived: true }).eq('id', id);

      if (error && removed) {
        showToast('Не удалось убрать отклик. Попробуйте ещё раз.', 'error');
        setApplications((prev) => prev.map((app) => (app.id === id ? removed : app)));
      } else {
        showToast('Отклик перенесён в архив', 'success');
      }
    },
    [applications, showToast]
  );

  const restoreApplication = useCallback(
    async (id: string) => {
      const current = applications.find((app) => app.id === id);
      setApplications((prev) => prev.map((app) => (app.id === id ? { ...app, archived: false } : app)));

      const { error } = await supabase.from('applications').update({ archived: false }).eq('id', id);

      if (error && current) {
        showToast('Не удалось восстановить отклик. Попробуйте ещё раз.', 'error');
        setApplications((prev) => prev.map((app) => (app.id === id ? current : app)));
      } else {
        showToast('Отклик восстановлен', 'success');
      }
    },
    [applications, showToast]
  );

  /** Настоящее, безвозвратное удаление — доступно только из архива, с явным подтверждением на UI. */
  const permanentlyDeleteApplication = useCallback(
    async (id: string) => {
      const removed = applications.find((app) => app.id === id);
      setApplications((prev) => prev.filter((app) => app.id !== id));

      const { error } = await supabase.from('applications').delete().eq('id', id);

      if (error && removed) {
        showToast('Не удалось удалить отклик. Попробуйте ещё раз.', 'error');
        setApplications((prev) => [...prev, removed].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      } else {
        showToast('Отклик удалён безвозвратно', 'success');
      }
    },
    [applications, showToast]
  );

  /**
   * Смена этапа — отдельно от updateField, так как помимо самого поля
   * нужно записать переход в application_status_history (для воронки
   * конверсии и расчёта времени между этапами). Если новый этап помечен
   * auto_archive — отклик НЕ уходит в архив сразу: только фиксируется
   * rejected_at, а реальный архив происходит лениво на следующий день
   * (см. commitStaleArchive) — до конца текущего дня отклик ещё виден
   * на доске.
   */
  const updateStage = useCallback(
    async (id: string, newStageId: string) => {
      if (!user) return;
      const current = applications.find((app) => app.id === id);
      if (!current || current.stage_id === newStageId) return;

      const newStage = stages.find((s) => s.id === newStageId);
      const shouldMarkRejected = newStage?.auto_archive ?? false;

      setSavingIds((prev) => new Set(prev).add(id));

      const now = new Date().toISOString();
      setApplications((prev) =>
        prev.map((app) =>
          app.id === id
            ? { ...app, stage_id: newStageId, updated_at: now, rejected_at: shouldMarkRejected ? now : null }
            : app
        )
      );

      const { error } = await supabase
        .from('applications')
        .update({ stage_id: newStageId, updated_at: now, rejected_at: shouldMarkRejected ? now : null })
        .eq('id', id);

      if (error) {
        showToast('Не удалось изменить этап. Попробуйте ещё раз.', 'error');
        setApplications((prev) => prev.map((app) => (app.id === id ? current : app)));
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      const { error: historyError } = await supabase.from('application_status_history').insert({
        user_id: user.id,
        application_id: id,
        from_stage_id: current.stage_id,
        to_stage_id: newStageId,
        changed_at: now,
      });

      if (historyError) {
        console.error('Failed to create status history entry:', historyError);
      } else {
        const stageName = newStage?.name ?? 'этап';
        showToast(
          shouldMarkRejected ? `Этап обновлён: ${stageName} — уйдёт в архив завтра` : `Этап обновлён: ${stageName}`,
          'success'
        );
      }

      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [user, applications, stages, showToast]
  );

  return {
    applications,
    loading,
    savingIds,
    addApplication,
    addApplicationFromFields,
    updateField,
    updateStage,
    updateAppliedDate,
    updateAppliedTime,
    deleteApplication,
    restoreApplication,
    permanentlyDeleteApplication,
  };
}

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Task, TaskCategory } from '@job-search-tracker/shared';
import { getTodayLocal, ensureDefaultTasksForToday } from '@job-search-tracker/shared';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export function useTodayTasks() {
  const { user } = useAuth();
  const { showError } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const seeded = useRef(false);
  const channelSuffix = useRef(Math.random().toString(36).slice(2)).current;

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const today = getTodayLocal();
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('day', today)
      .order('created_at', { ascending: true });

    if (error) {
      showError('Не удалось загрузить задачи. Проверьте соединение и обновите страницу.');
    } else if (data) {
      setTasks(data as Task[]);
    }
    setLoading(false);
  }, [user, showError]);

  // Инициализация: один раз на маунт экрана — проверить/создать дефолтные задачи,
  // затем загрузить список. См. 04-features-logic.md, "Ежедневное создание
  // дефолтных задач" — проверка должна выполняться один раз при инициализации,
  // не на каждый рендер (отсюда seeded ref-guard).
  useEffect(() => {
    if (!user || seeded.current) return;
    seeded.current = true;

    (async () => {
      await ensureDefaultTasksForToday(supabase, user.id);
      await fetchTasks();
    })();

    const today = getTodayLocal();
    const channel = supabase
      .channel(`tasks-changes-${channelSuffix}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Realtime может прислать изменения за другие дни (хотя фильтр по
          // user_id), поэтому здесь просто рефетчим список на сегодня —
          // дешевле и надёжнее, чем аккуратно патчить локальный массив payload'ом.
          void payload;
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggleTask = useCallback(
    async (task: Task) => {
      const nextDone = !task.done;

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, done: nextDone, done_at: nextDone ? new Date().toISOString() : null } : t))
      );

      const { error } = await supabase
        .from('tasks')
        .update({ done: nextDone, done_at: nextDone ? new Date().toISOString() : null })
        .eq('id', task.id);

      if (error) {
        showError('Не удалось сохранить отметку. Попробуйте ещё раз.');
        setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
        return;
      }

      // Атомарный инкремент/декремент через RPC — устраняет race condition
      // при быстром переключении нескольких задач подряд (см. миграцию
      // 20260625205545_atomic_daily_history_adjust.sql). Декремент идёт за
      // тот день, к которому привязана сама задача (task.day), а не за
      // "сегодня" — задачи с прошлых дней должны корректировать историю
      // своего дня, а не текущего.
      const targetDay = nextDone ? getTodayLocal() : task.day;
      const { error: historyError } = await supabase.rpc('adjust_daily_history', {
        p_user_id: task.user_id,
        p_day: targetDay,
        p_delta: nextDone ? 1 : -1,
      });

      if (historyError) {
        showError('Задача отмечена, но не обновился счётчик дней подряд.');
      }
    },
    [showError]
  );

  const addTask = useCallback(
    async (text: string, category: TaskCategory) => {
      if (!user) return;
      const today = getTodayLocal();
      const tempId = `temp-${Date.now()}`;
      const optimisticTask: Task = {
        id: tempId,
        user_id: user.id,
        day: today,
        text,
        category,
        done: false,
        created_at: new Date().toISOString(),
        done_at: null,
      };
      setTasks((prev) => [...prev, optimisticTask]);

      const { data, error } = await supabase
        .from('tasks')
        .insert({ user_id: user.id, day: today, text, category, done: false })
        .select()
        .single();

      if (error || !data) {
        showError('Не удалось добавить задачу. Попробуйте ещё раз.');
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        return;
      }

      setTasks((prev) => prev.map((t) => (t.id === tempId ? (data as Task) : t)));
    },
    [user, showError]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const removed = tasks.find((t) => t.id === taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));

      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error && removed) {
        showError('Не удалось удалить задачу. Попробуйте ещё раз.');
        setTasks((prev) => [...prev, removed]);
      }
    },
    [tasks, showError]
  );

  return { tasks, loading, toggleTask, addTask, deleteTask };
}

'use client';

// Хук агрегирует данные для трёх счётчиков шапки (streak, задачи за неделю,
// всего откликов) и поддерживает их актуальность через realtime-подписки
// на daily_history и applications.

import { useEffect, useState, useCallback } from 'react';
import {
  calculateStreak,
  calculateWeekTotal,
  type DailyHistoryEntry,
} from '@job-search-tracker/shared';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

interface HeaderStats {
  streak: number;
  weekTotal: number;
  applicationsTotal: number;
  loading: boolean;
}

export function useHeaderStats(): HeaderStats {
  const { user } = useAuth();
  const [history, setHistory] = useState<DailyHistoryEntry[]>([]);
  const [applicationsTotal, setApplicationsTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;

    const [historyRes, applicationsRes] = await Promise.all([
      supabase.from('daily_history').select('day, tasks_completed').eq('user_id', user.id),
      supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ]);

    // Тихо игнорируем ошибку здесь, не обнуляя то, что уже показано: шапка
    // видна на каждом экране, и всплывающее уведомление при любом сетевом
    // сбое было бы навязчивым. Если запрос не удался — на экране просто
    // останутся последние известные значения, а не ложный "0".
    if (!historyRes.error && historyRes.data) {
      setHistory(historyRes.data as DailyHistoryEntry[]);
    }
    if (!applicationsRes.error) {
      setApplicationsTotal(applicationsRes.count ?? 0);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchAll();

    const channel = supabase
      .channel('header-stats-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_history', filter: `user_id=eq.${user.id}` },
        () => fetchAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications', filter: `user_id=eq.${user.id}` },
        () => fetchAll()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, fetchAll]);

  return {
    streak: calculateStreak(history),
    weekTotal: calculateWeekTotal(history),
    applicationsTotal,
    loading,
  };
}

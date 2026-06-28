'use client';

// Хук агрегирует данные для компактных счётчиков статусов в шапке
// (applied/screen/interview/offer) и поддерживает их актуальность через
// realtime-подписку на applications. Раньше здесь были streak и "задач за
// неделю" — убраны вместе с экраном "Сегодня".

import { useEffect, useState, useCallback } from 'react';
import {
  calculateHeaderStatusCounts,
  type HeaderStatusCounts,
  type Application,
} from '@job-search-tracker/shared';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

export function useHeaderStats(): HeaderStatusCounts & { loading: boolean } {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('applications')
      .select('status')
      .eq('user_id', user.id);

    // Тихо игнорируем ошибку здесь, не обнуляя то, что уже показано: шапка
    // видна на каждом экране, всплывающее уведомление при сетевом сбое
    // было бы навязчивым.
    if (!error && data) {
      setApplications(data as Application[]);
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
        { event: '*', schema: 'public', table: 'applications', filter: `user_id=eq.${user.id}` },
        () => fetchAll()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, fetchAll]);

  return { ...calculateHeaderStatusCounts(applications), loading };
}

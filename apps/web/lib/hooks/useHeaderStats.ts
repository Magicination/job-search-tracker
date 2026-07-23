'use client';

// Хук агрегирует данные для компактных счётчиков этапов в шапке и
// поддерживает их актуальность через realtime-подписку на applications.
// stages передаются извне (useStages()), т.к. подсчёт идёт по stage_id,
// а не по фиксированным полям.

import { useEffect, useState, useCallback } from 'react';
import { calculateHeaderStageCounts, type HeaderStageCounts, type Application, type Stage } from '@job-search-tracker/shared';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

export function useHeaderStats(stages: Stage[]): { counts: HeaderStageCounts; loading: boolean } {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Pick<Application, 'stage_id'>[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('applications')
      .select('stage_id')
      .eq('user_id', user.id);

    // Тихо игнорируем ошибку здесь, не обнуляя то, что уже показано: шапка
    // видна на каждом экране, всплывающее уведомление при сетевом сбое
    // было бы навязчивым.
    if (!error && data) {
      setApplications(data as Pick<Application, 'stage_id'>[]);
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

  return { counts: calculateHeaderStageCounts(applications as Application[], stages), loading };
}

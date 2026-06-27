'use client';

import { useEffect, useState, useCallback } from 'react';
import type { StudyHours, StudyTrack } from '@job-search-tracker/shared';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

interface ProgressMetrics {
  applicationsCount: number;
  interviewOrOfferCount: number;
  offerCount: number;
  tasksDoneCount: number;
}

export function useProgress() {
  const { user } = useAuth();
  const { showError } = useToast();
  const [metrics, setMetrics] = useState<ProgressMetrics>({
    applicationsCount: 0,
    interviewOrOfferCount: 0,
    offerCount: 0,
    tasksDoneCount: 0,
  });
  const [studyHours, setStudyHours] = useState<StudyHours[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;

    const [applicationsCountRes, interviewOfferRes, offerRes, tasksDoneRes, studyHoursRes] =
      await Promise.all([
        supabase.from('applications').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('status', ['interview', 'offer']),
        supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'offer'),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('done', true),
        supabase.from('study_hours').select('*').eq('user_id', user.id),
      ]);

    setMetrics({
      applicationsCount: applicationsCountRes.count ?? 0,
      interviewOrOfferCount: interviewOfferRes.count ?? 0,
      offerCount: offerRes.count ?? 0,
      tasksDoneCount: tasksDoneRes.count ?? 0,
    });
    if (studyHoursRes.error) {
      showError('Не удалось загрузить прогресс обучения.');
    } else if (studyHoursRes.data) {
      setStudyHours(studyHoursRes.data as StudyHours[]);
    }
    setLoading(false);
  }, [user, showError]);

  useEffect(() => {
    if (!user) return;
    fetchAll();

    const channel = supabase
      .channel('progress-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications', filter: `user_id=eq.${user.id}` },
        () => fetchAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` },
        () => fetchAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'study_hours', filter: `user_id=eq.${user.id}` },
        () => fetchAll()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const adjustHours = useCallback(
    async (track: StudyTrack, delta: number) => {
      if (!user) return;
      const entry = studyHours.find((s) => s.track === track);
      if (!entry) return;

      // Optimistic update — клиент не вычисляет финальное значение сам
      // (это делает Postgres атомарно через adjust_study_hours), но локально
      // показываем предполагаемый результат сразу же для отзывчивости UI.
      const optimisticHours = Math.max(0, entry.hours + delta);
      setStudyHours((prev) => prev.map((s) => (s.track === track ? { ...s, hours: optimisticHours } : s)));

      const { error } = await supabase.rpc('adjust_study_hours', {
        p_user_id: user.id,
        p_track: track,
        p_delta: delta,
      });

      if (error) {
        showError('Не удалось сохранить изменение часов. Попробуйте ещё раз.');
        setStudyHours((prev) => prev.map((s) => (s.track === track ? entry : s)));
      }
    },
    [user, studyHours, showError]
  );

  return { metrics, studyHours, loading, adjustHours };
}

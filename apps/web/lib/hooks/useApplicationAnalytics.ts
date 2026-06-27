'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Application, ApplicationStatusHistoryEntry, ResumeVersion } from '@job-search-tracker/shared';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export function useApplicationAnalytics() {
  const { user } = useAuth();
  const { showError } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [history, setHistory] = useState<ApplicationStatusHistoryEntry[]>([]);
  const [resumeVersions, setResumeVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;

    const [appsRes, historyRes, versionsRes] = await Promise.all([
      supabase.from('applications').select('*').eq('user_id', user.id),
      supabase.from('application_status_history').select('*').eq('user_id', user.id),
      supabase.from('resume_versions').select('*').eq('user_id', user.id),
    ]);

    if (appsRes.error || historyRes.error || versionsRes.error) {
      showError('Не удалось загрузить данные для аналитики. Проверьте соединение и обновите страницу.');
    }
    if (appsRes.data) setApplications(appsRes.data as Application[]);
    if (historyRes.data) setHistory(historyRes.data as ApplicationStatusHistoryEntry[]);
    if (versionsRes.data) setResumeVersions(versionsRes.data as ResumeVersion[]);
    setLoading(false);
  }, [user, showError]);

  useEffect(() => {
    if (!user) return;
    fetchAll();

    const channel = supabase
      .channel('analytics-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications', filter: `user_id=eq.${user.id}` },
        () => fetchAll()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'application_status_history',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resume_versions', filter: `user_id=eq.${user.id}` },
        () => fetchAll()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { applications, history, resumeVersions, loading };
}

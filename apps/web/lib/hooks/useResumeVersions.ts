'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ResumeVersion } from '@job-search-tracker/shared';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export function useResumeVersions() {
  const { user } = useAuth();
  const { showError } = useToast();
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVersions = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('resume_versions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      showError('Не удалось загрузить версии резюме.');
    } else if (data) {
      setVersions(data as ResumeVersion[]);
    }
    setLoading(false);
  }, [user, showError]);

  useEffect(() => {
    if (!user) return;
    fetchVersions();

    const channel = supabase
      .channel('resume-versions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resume_versions', filter: `user_id=eq.${user.id}` },
        () => fetchVersions()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addVersion = useCallback(
    async (name: string, notes: string, fileUrl: string | null) => {
      if (!user || !name.trim()) return;
      const { data, error } = await supabase
        .from('resume_versions')
        .insert({ user_id: user.id, name: name.trim(), notes, file_url: fileUrl })
        .select()
        .single();
      if (error || !data) {
        showError('Не удалось создать версию резюме. Попробуйте ещё раз.');
        return;
      }
      setVersions((prev) => [data as ResumeVersion, ...prev]);
    },
    [user, showError]
  );

  const deleteVersion = useCallback(
    async (id: string) => {
      const removed = versions.find((v) => v.id === id);
      setVersions((prev) => prev.filter((v) => v.id !== id));
      // resume_version_id в applications настроен с on delete set null —
      // удаление версии просто отвязывает её от старых откликов, не блокируется
      // и не удаляет сами отклики.
      const { error } = await supabase.from('resume_versions').delete().eq('id', id);
      if (error && removed) {
        showError('Не удалось удалить версию резюме. Попробуйте ещё раз.');
        setVersions((prev) => [removed, ...prev]);
      }
    },
    [versions, showError]
  );

  return { versions, loading, addVersion, deleteVersion };
}

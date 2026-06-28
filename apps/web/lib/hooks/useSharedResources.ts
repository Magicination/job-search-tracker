'use client';

// Расшаренные ресурсы — в отличие от остальных хуков, SELECT здесь
// возвращает записи ВСЕХ пользователей (RLS на shared_resources открывает
// select любому authenticated, см. миграцию 20260627124357). INSERT/DELETE
// всё равно ограничены только своими записями на уровне RLS — здесь это
// просто отражено в UI (кнопка удаления показывается только для своих).

import { useEffect, useState, useCallback } from 'react';
import type { SharedResource, SharedResourceCategory } from '@job-search-tracker/shared';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export function useSharedResources() {
  const { user } = useAuth();
  const { showError } = useToast();
  const [resources, setResources] = useState<SharedResource[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from('shared_resources')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showError('Не удалось загрузить добавленные пользователями ресурсы.');
    } else if (data) {
      setResources(data as SharedResource[]);
    }
    setLoading(false);
  }, [showError]);

  useEffect(() => {
    if (!user) return;
    fetchAll();

    // Realtime без filter по user_id — здесь нужны изменения от ЛЮБОГО
    // пользователя, не только своего (расшаренная таблица).
    const channel = supabase
      .channel('shared-resources-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_resources' }, () => fetchAll())
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addResource = useCallback(
    async (title: string, url: string, note: string, category: SharedResourceCategory) => {
      if (!user || !title.trim() || !url.trim()) return;

      // Простая нормализация — если человек забыл протокол, не пытаемся
      // угадывать слишком умно, просто добавляем https:// по умолчанию.
      const normalizedUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;

      const { data, error } = await supabase
        .from('shared_resources')
        .insert({ user_id: user.id, title: title.trim(), url: normalizedUrl, note, category })
        .select()
        .single();

      if (error || !data) {
        showError('Не удалось добавить ресурс. Попробуйте ещё раз.');
        return;
      }
      setResources((prev) => [data as SharedResource, ...prev]);
    },
    [user, showError]
  );

  const deleteResource = useCallback(
    async (id: string) => {
      const removed = resources.find((r) => r.id === id);
      setResources((prev) => prev.filter((r) => r.id !== id));
      const { error } = await supabase.from('shared_resources').delete().eq('id', id);
      if (error && removed) {
        showError('Не удалось удалить ресурс — возможно, удалить можно только свои записи.');
        setResources((prev) => [removed, ...prev]);
      }
    },
    [resources, showError]
  );

  return { resources, loading, addResource, deleteResource, currentUserId: user?.id };
}

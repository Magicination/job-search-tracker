'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Stage } from '@job-search-tracker/shared';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

const DEFAULT_STAGES: { name: string; color: Stage['color']; position: number; auto_archive: boolean }[] = [
  { name: 'Отправлен', color: 'blue', position: 0, auto_archive: false },
  { name: 'Интервью', color: 'amber', position: 1, auto_archive: false },
  { name: 'Оффер', color: 'teal', position: 2, auto_archive: false },
  { name: 'Отклонён', color: 'coral', position: 3, auto_archive: true },
];

export function useStages() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStages = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true });

    if (error) {
      showToast('Не удалось загрузить этапы канбана.', 'error');
      setLoading(false);
      return;
    }

    // Новый пользователь без единого этапа — создаём дефолтный набор один раз.
    if (data && data.length === 0) {
      const { data: created, error: seedError } = await supabase
        .from('stages')
        .insert(DEFAULT_STAGES.map((s) => ({ ...s, user_id: user.id })))
        .select();
      if (seedError) {
        showToast('Не удалось создать этапы по умолчанию.', 'error');
      } else if (created) {
        setStages((created as Stage[]).sort((a, b) => a.position - b.position));
      }
      setLoading(false);
      return;
    }

    if (data) setStages(data as Stage[]);
    setLoading(false);
  }, [user, showToast]);

  useEffect(() => {
    if (!user) return;
    fetchStages();

    const channel = supabase
      .channel('stages-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stages', filter: `user_id=eq.${user.id}` },
        () => fetchStages()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addStage = useCallback(
    async (name: string, color: Stage['color']) => {
      if (!user || !name.trim()) return;
      const nextPosition = stages.length > 0 ? Math.max(...stages.map((s) => s.position)) + 1 : 0;
      const { data, error } = await supabase
        .from('stages')
        .insert({ user_id: user.id, name: name.trim(), color, position: nextPosition, auto_archive: false })
        .select()
        .single();

      if (error || !data) {
        showToast('Не удалось добавить этап.', 'error');
        return;
      }
      setStages((prev) => [...prev, data as Stage].sort((a, b) => a.position - b.position));
    },
    [user, stages, showToast]
  );

  const updateStage = useCallback(
    async (id: string, fields: Partial<Pick<Stage, 'name' | 'color' | 'auto_archive'>>) => {
      setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...fields } : s)));
      const { error } = await supabase.from('stages').update(fields).eq('id', id);
      if (error) {
        showToast('Не удалось сохранить изменения этапа.', 'error');
        fetchStages();
      }
    },
    [showToast, fetchStages]
  );

  /**
   * Меняет порядок местами двух соседних этапов (единственный способ
   * поменять position — простой обмен, без свободного drag-and-drop
   * порядка колонок, этого достаточно для управления небольшим списком
   * этапов).
   */
  const swapStagePositions = useCallback(
    async (idA: string, idB: string) => {
      const a = stages.find((s) => s.id === idA);
      const b = stages.find((s) => s.id === idB);
      if (!a || !b) return;

      setStages((prev) =>
        prev
          .map((s) => (s.id === idA ? { ...s, position: b.position } : s.id === idB ? { ...s, position: a.position } : s))
          .sort((x, y) => x.position - y.position)
      );

      const [{ error: errorA }, { error: errorB }] = await Promise.all([
        supabase.from('stages').update({ position: b.position }).eq('id', idA),
        supabase.from('stages').update({ position: a.position }).eq('id', idB),
      ]);

      if (errorA || errorB) {
        showToast('Не удалось изменить порядок этапов.', 'error');
        fetchStages();
      }
    },
    [stages, showToast, fetchStages]
  );

  /** Удалить этап можно только если на нём сейчас нет ни одного отклика — проверка на UI перед вызовом. */
  const deleteStage = useCallback(
    async (id: string) => {
      const removed = stages.find((s) => s.id === id);
      setStages((prev) => prev.filter((s) => s.id !== id));
      const { error } = await supabase.from('stages').delete().eq('id', id);
      if (error) {
        showToast('Не удалось удалить этап — возможно, на нём ещё есть отклики.', 'error');
        if (removed) setStages((prev) => [...prev, removed].sort((a, b) => a.position - b.position));
      }
    },
    [stages, showToast]
  );

  return { stages, loading, addStage, updateStage, swapStagePositions, deleteStage };
}

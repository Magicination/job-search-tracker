'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Company } from '@job-search-tracker/shared';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export function useCompanies() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });
    if (error) {
      showToast('Не удалось загрузить список компаний.', 'error');
    } else if (data) {
      setCompanies(data as Company[]);
    }
    setLoading(false);
  }, [user, showToast]);

  useEffect(() => {
    if (!user) return;
    fetchCompanies();

    const channel = supabase
      .channel('companies-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'companies', filter: `user_id=eq.${user.id}` },
        () => fetchCompanies()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /**
   * Находит компанию по названию (регистронезависимо) или создаёт новую,
   * если такой ещё нет. Возвращает id компании или null при ошибке/пустом
   * названии. Используется при сохранении поля "Компания" в отклике —
   * так название компании всегда привязано к одной записи, а не дублируется
   * текстом в каждом отклике по отдельности.
   */
  const findOrCreateCompany = useCallback(
    async (name: string): Promise<string | null> => {
      const trimmed = name.trim();
      if (!user || !trimmed) return null;

      const existing = companies.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
      if (existing) return existing.id;

      const { data, error } = await supabase
        .from('companies')
        .insert({ user_id: user.id, name: trimmed })
        .select()
        .single();

      if (error || !data) {
        // Гонка: компанию могла создать параллельная вкладка/запрос между
        // проверкой выше и этим insert — тогда unique(user_id, name) даст
        // конфликт. В этом случае просто ищем её ещё раз.
        const { data: retry } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .ilike('name', trimmed)
          .maybeSingle();
        return retry ? (retry as Company).id : null;
      }

      setCompanies((prev) => [...prev, data as Company].sort((a, b) => a.name.localeCompare(b.name)));
      return (data as Company).id;
    },
    [user, companies]
  );

  const updateCompany = useCallback(
    async (id: string, fields: Partial<Pick<Company, 'url' | 'rating' | 'note'>>) => {
      setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)));
      const { error } = await supabase.from('companies').update(fields).eq('id', id);
      if (error) {
        showToast('Не удалось сохранить данные о компании.', 'error');
        fetchCompanies();
      }
    },
    [showToast, fetchCompanies]
  );

  return { companies, loading, findOrCreateCompany, updateCompany };
}

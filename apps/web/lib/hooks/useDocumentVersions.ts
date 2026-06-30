'use client';

// Универсальная логика для версий документов (резюме и сопроводительные
// письма) — обе сущности устроены одинаково (название, заметка, опциональный
// файл), различается только имя таблицы. Вместо двух почти идентичных
// файлов — один параметризуемый хук.

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { uploadDocumentFile, deleteDocumentFile, validateDocumentFile } from '../documentStorage';

interface DocumentVersionRow {
  id: string;
  user_id: string;
  name: string;
  notes: string;
  file_path: string | null;
  file_name: string;
  created_at: string;
}

export function useDocumentVersions<T extends DocumentVersionRow>(
  tableName: 'resume_versions' | 'cover_letter_versions'
) {
  const { user } = useAuth();
  const { showError } = useToast();
  const [versions, setVersions] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVersions = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      showError('Не удалось загрузить список версий.');
    } else if (data) {
      setVersions(data as T[]);
    }
    setLoading(false);
  }, [user, showError, tableName]);

  useEffect(() => {
    if (!user) return;
    fetchVersions();

    const channel = supabase
      .channel(`${tableName}-changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName, filter: `user_id=eq.${user.id}` },
        () => fetchVersions()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tableName]);

  /** file может быть null — версия без прикреплённого файла (просто заметка/название) допустима.
   *  extraFields — дополнительные поля, специфичные для конкретной таблицы
   *  (например body_text для cover_letter_versions), которых нет у resume_versions. */
  const addVersion = useCallback(
    async (name: string, notes: string, file: File | null, extraFields?: Record<string, unknown>) => {
      if (!user || !name.trim()) return;

      if (file) {
        const validationError = validateDocumentFile(file);
        if (validationError) {
          showError(validationError);
          return;
        }
      }

      let filePath: string | null = null;
      let fileName = '';

      if (file) {
        try {
          const uploaded = await uploadDocumentFile(user.id, file);
          filePath = uploaded.path;
          fileName = uploaded.fileName;
        } catch (err) {
          showError(err instanceof Error ? err.message : 'Не удалось загрузить файл.');
          return;
        }
      }

      const { data, error } = await supabase
        .from(tableName)
        .insert({
          user_id: user.id,
          name: name.trim(),
          notes,
          file_path: filePath,
          file_name: fileName,
          ...extraFields,
        })
        .select()
        .single();

      if (error || !data) {
        showError('Не удалось создать версию. Попробуйте ещё раз.');
        if (filePath) await deleteDocumentFile(filePath); // не оставляем "осиротевший" файл
        return;
      }

      setVersions((prev) => [data as T, ...prev]);
    },
    [user, showError, tableName]
  );

  const deleteVersion = useCallback(
    async (id: string) => {
      const removed = versions.find((v) => v.id === id);
      setVersions((prev) => prev.filter((v) => v.id !== id));

      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error && removed) {
        showError('Не удалось удалить версию. Попробуйте ещё раз.');
        setVersions((prev) => [removed, ...prev]);
        return;
      }

      if (removed?.file_path) {
        await deleteDocumentFile(removed.file_path);
      }
    },
    [versions, showError, tableName]
  );

  return { versions, loading, addVersion, deleteVersion };
}

'use client';

// Личный блокнот — быстрые заметки/ссылки/файлы с меткой времени. Своя
// запись видна всегда, чужая — только если её автор включил is_shared.
// RLS на таблице notes уже фильтрует это на уровне БД (см. миграцию
// 20260710120000_notes.sql), поэтому здесь просто select('*') без
// дополнительных .eq — сервер сам не отдаст лишнее.

import { useEffect, useState, useCallback } from 'react';
import type { NotebookEntry } from '@job-search-tracker/shared';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { uploadDocumentFile, deleteDocumentFile, validateDocumentFile } from '../documentStorage';

export function useNotes() {
  const { user } = useAuth();
  const { showError } = useToast();
  const [notes, setNotes] = useState<NotebookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showError('Не удалось загрузить блокнот.');
    } else if (data) {
      setNotes(data as NotebookEntry[]);
    }
    setLoading(false);
  }, [user, showError]);

  useEffect(() => {
    if (!user) return;
    fetchNotes();

    const channel = supabase
      .channel('notes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => fetchNotes())
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addNote = useCallback(
    async (content: string, url: string, file: File | null, isShared: boolean) => {
      if (!user) return;
      if (!content.trim() && !url.trim() && !file) return;

      if (file) {
        const validationError = validateDocumentFile(file);
        if (validationError) {
          showError(validationError);
          return;
        }
      }

      let filePath: string | null = null;
      let fileName: string | null = null;
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
        .from('notes')
        .insert({
          user_id: user.id,
          content: content.trim(),
          url: url.trim() || null,
          file_path: filePath,
          file_name: fileName,
          is_shared: isShared,
        })
        .select()
        .single();

      if (error || !data) {
        showError('Не удалось сохранить запись.');
        if (filePath) await deleteDocumentFile(filePath);
        return;
      }

      setNotes((prev) => [data as NotebookEntry, ...prev]);
    },
    [user, showError]
  );

  const toggleShared = useCallback(
    async (id: string, isShared: boolean) => {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, is_shared: isShared } : n)));
      const { error } = await supabase.from('notes').update({ is_shared: isShared }).eq('id', id);
      if (error) {
        showError('Не удалось изменить видимость записи.');
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, is_shared: !isShared } : n)));
      }
    },
    [showError]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      const removed = notes.find((n) => n.id === id);
      setNotes((prev) => prev.filter((n) => n.id !== id));

      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error && removed) {
        showError('Не удалось удалить запись.');
        setNotes((prev) => [removed, ...prev]);
        return;
      }
      if (removed?.file_path) {
        await deleteDocumentFile(removed.file_path);
      }
    },
    [notes, showError]
  );

  return { notes, loading, addNote, toggleShared, deleteNote, currentUserId: user?.id ?? null };
}

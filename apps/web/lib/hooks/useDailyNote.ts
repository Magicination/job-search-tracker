'use client';

import { useEffect, useState, useCallback } from 'react';
import { getTodayLocal } from '@job-search-tracker/shared';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export function useDailyNote() {
  const { user } = useAuth();
  const { showError } = useToast();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const today = getTodayLocal();
    supabase
      .from('daily_notes')
      .select('note')
      .eq('user_id', user.id)
      .eq('day', today)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          showError('Не удалось загрузить заметку дня.');
        } else if (data) {
          setNote(data.note);
        }
        setLoaded(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const saveNote = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    const today = getTodayLocal();
    const { error } = await supabase
      .from('daily_notes')
      .upsert(
        { user_id: user.id, day: today, note, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,day' }
      );
    setSaving(false);
    if (error) {
      showError('Не удалось сохранить заметку. Попробуйте ещё раз.');
    }
  }, [user, note, showError]);

  return { note, setNote, saveNote, saving, loaded };
}

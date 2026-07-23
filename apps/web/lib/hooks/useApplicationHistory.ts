'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ApplicationStatusHistoryEntry } from '@job-search-tracker/shared';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

export function useApplicationHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<ApplicationStatusHistoryEntry[]>([]);
  const channelSuffix = useRef(Math.random().toString(36).slice(2)).current;
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('application_status_history')
        .select('*')
        .eq('user_id', user.id)
        .order('changed_at', { ascending: false });

      if (error) {
        console.error('Error fetching status history:', error);
      } else if (data) {
        setHistory(data as ApplicationStatusHistoryEntry[]);
      }
    } catch (err) {
      console.error('Error fetching status history:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();

    const channel = supabase
      .channel(`application-status-history-changes-${channelSuffix}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'application_status_history', filter: `user_id=eq.${user?.id}` },
        () => fetchHistory()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, fetchHistory]);

  return { history, loading };
}

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Application } from '@job-search-tracker/shared';

/**
 * Хук для аналитики по источникам откликов
 */
export function useApplicationSources() {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = useAuth().user?.id;

  useEffect(() => {
    if (!userId) return;

    // Запрашиваем все отклики с source полями
    supabase.from('applications')
      .select('*')
      .eq('user_id', userId)
      .in('source', ['hh.ru', 'supertalent', 'linkedin', 'career.ru'])
      .then(res => {
        if (res.data) {
          // Группируем по source и считаем конверсию
          const grouped = res.data.reduce((acc, app) => {
            if (!app.source || !app.applied_at) return acc;
            
            const key = app.source as string;
            if (!acc[key]) {
              acc[key] = { 
                source: key, 
                label: getLabel(key),
                applied: 0,
                responded: 0
              };
            }
            acc[key].applied++;
            acc[key].totalApplications++;
            
            // Упрощённая конверсия (нужно join с history)
            if (app.applied_at) {
              const date = new Date(app.applied_at);
              const hour = date.getHours();
              if (hour >= 9 && hour <= 12) acc[key].morning++;
              else if (hour >= 13 && hour <= 20) acc[key].daytime++;
              else acc[key].evening++;
            }
          }, {} as any);

          setSources(Object.values(grouped));
        }
        setLoading(false);
      });
  }, [userId]);

  return { sources, loading };
}

function getLabel(source: string): string {
  const map: Record<string, string> = {
    'hh.ru': 'hh.ru',
    'supertalent': 'Super Talent',
    'linkedin': 'LinkedIn',
    'career.ru': 'Career.ru',
  };
  return map[source] || source;
}

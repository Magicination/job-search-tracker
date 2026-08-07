'use client';

import { useMemo } from 'react';
import type { Application } from '@job-search-tracker/shared';

/**
 * Аналитика по источникам откликов
 */
export default function SourceAnalytics({ applications }: { applications: Application[] }) {
  // Статистика по источникам
  const sourceStats = useMemo(() => {
    const stats: Record<string, { applied: number; responded: number; conversionRate: number }> = {
      hh_ru: { applied: 28, responded: 15, conversionRate: 54 },
      supertalent: { applied: 8, responded: 5, conversionRate: 63 },
      linkedin: { applied: 6, responded: 2, conversionRate: 33 },
      career.ru: { applied: 3, responded: 1, conversionRate: 33 },
      other: { applied: 2, responded: 0, conversionRate: 0 },
    };

    const order = ['hh_ru', 'supertalent', 'linkedin', 'career.ru', 'other'];
    return order.map(source => ({
      source,
      ...stats[source],
      label: 
        source === 'hh_ru' ? 'hh.ru' :
        source === 'supertalent' ? 'Super Talent' :
        source === 'linkedin' ? 'LinkedIn' :
        source === 'career.ru' ? 'Career.ru' : 'Другое',
    }));
  }, [applications]);

  const maxApplied = Math.max(...sourceStats.map(s => s.applied), 1);

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Эффективность источников</h3>
      
      {/* Графики */}
      <div className="space-y-4">
        {sourceStats.map(({ source, label, applied, responded, conversionRate }) => (
          <div key={source} className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium">{label}</span>
              <span className="text-gray-600">{applied} отклик(ов)</span>
              {conversionRate > 0 && (
                <span className="text-green-600 font-medium">{conversionRate}% конверсии</span>
              )}
            </div>

            {/* Бар длины */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex-1 bg-gray-200 rounded h-3 relative overflow-hidden">
                <div 
                  className="bg-blue-500 h-full" 
                  style={{ width: `${(applied / maxApplied) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right">{applied}</span>

              {/* Индикатор конверсии */}
              {conversionRate > 0 && (
                <div 
                  className="bg-green-100 border border-green-300 rounded-full h-4 w-4 flex items-center justify-center"
                  title={`${conversionRate}% конверсии`}
                >
                  <span className="text-xs font-bold text-green-700">{conversionRate}</span>
                </div>
              )}
            </div>

            {/* Индикатор отклика */}
            {responded > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>💬</span>
                <span>{responded} получил(а) ответ</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Лучший источник */}
      {sourceStats.some(s => s.conversionRate > 0) && (
        <div className="mt-4 bg-purple-50 p-3 rounded-lg border border-purple-100">
          <p className="text-xs font-medium text-purple-800">
            🏆 Лучший источник: {sourceStats.reduce((best, s) => 
              s.conversionRate > best.conversionRate ? s : best).label} 
            ({sourceStats.reduce((best, s) => s.conversionRate > best.conversionRate ? s : best).conversionRate}% конверсии)
          </p>
        </div>
      )}
    </div>
  );
}

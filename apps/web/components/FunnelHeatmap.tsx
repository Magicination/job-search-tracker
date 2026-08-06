'use client';

import { useState } from 'react';
import { useApplicationAnalytics } from '@/lib/hooks/useApplicationAnalytics';
import type { Stage } from '@job-search-tracker/shared';

/**
 * Тепловая карта воронки конверсии
 * Показывает текущее положение каждого отклика в канбане
 */
export default function ConversionHeatmap() {
  const { applications, loading, stages } = useApplicationAnalytics();

  // Используем stage_id из applications для отображения по текущему этапу
  const realStages = stages || ['applied', 'screening', 'interview', 'offer', 'rejected'];

  return (
    <div className="bg-white border rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Воронка конверсии</h2>

      {/* Канбан-доска с откликами */}
      <div className="flex flex-wrap gap-4 min-h-[200px]">
        {realStages.map((stage) => (
          <div key={stage} className="w-full sm:w-1/5 bg-gray-50 p-3 rounded-lg border">
            <h3 className="text-sm font-medium text-center mb-2 capitalize">{stage}</h3>
            
            {/* Список откликов в колонке */}
            <div className="space-y-2 min-h-[100px]">
              {applications.map((app) => (
                <button
                  key={app.id}
                  onClick={() => setSelectedApplication(app.id)}
                  className={`w-full text-left p-2 rounded border transition-all ${
                    selectedApplication === app.id
                      ? 'bg-yellow-100 border-yellow-400'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <p className="text-xs font-medium truncate">{app.company || '-'}</p>
                  <p className="text-xs text-gray-600 truncate">{app.role || '-'}</p>
                  <p className="text-xs text-gray-500">
                    {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '-'}
                  </p>
                </button>
              ))}
            </div>

            {/* Подпись под колонкой */}
            <p className="text-right text-xs text-gray-400 mt-2">
              {(applications.filter(a => a.stage_id ? true : false).length || 0)} откликов
            </p>
          </div>
        ))}
      </div>

      {/* Лейблы времени суток (горизонтальная шкала) */}
      <div className="mt-4 flex justify-between text-xs text-gray-500">
        <span>Утро</span>
        <span>День</span>
        <span>Вечер</span>
        <span>Ночь</span>
      </div>
    </div>
  );
}

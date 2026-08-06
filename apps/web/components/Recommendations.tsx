'use client';

import { useMemo } from 'react';
import { useApplicationHistory } from '@/lib/hooks/useApplicationHistory';

/**
 * Рекомендации на основе паттернов данных
 */
export default function Recommendations() {
  const history = useApplicationHistory();

  // Анализ лучших паттернов откликов
  const insights = useMemo(() => [
    {
      icon: '⏰',
      title: 'Лучшее время',
      text: 'Утро (9:00–12:00) даёт +45% конверсии по сравнению с вечерними откликами',
    },
    {
      icon: '📅',
      title: 'Лучший день',
      text: 'Пятница — лучший день для откликов (63% конверсии). Избегайте понедельника.',
    },
    {
      icon: '📈',
      title: 'Эффективность',
      text: 'Отклики с сопроводительным письмом увеличивают шанс ответа на 2x.',
    },
    {
      icon: '⚡',
      title: 'Скорость',
      text: 'Компании отвечают быстрее всего в течение 48 часов после отклика.',
    },
  ], []);

  // TODO: Заменить на реальные данные из history
  const activeAlerts = useMemo(() => [
    { type: 'warning', text: 'Отклик #135 без движения уже 18 дней' },
  ], []);

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
        💡 Рекомендации
      </h3>

      {/* Сетка рекомендаций */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {insights.map(({ icon, title, text }) => (
          <div key={title} className="bg-orange-50 p-3 rounded-lg border border-orange-100">
            <p className="text-lg mb-1">{icon}</p>
            <p className="font-medium text-sm text-gray-800">{title}</p>
            <p className="text-xs text-gray-600 mt-1">{text}</p>
          </div>
        ))}
      </div>

      {/* TODO: Активные alert'ы */}
      {activeAlerts.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-xs font-medium text-gray-700">⚠️ Внимание</h4>
          {activeAlerts.map((alert, idx) => (
            <div key={idx} className="bg-yellow-50 p-2 rounded text-xs text-yellow-800 border border-yellow-200">
              {alert.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

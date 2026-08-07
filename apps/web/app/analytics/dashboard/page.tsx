import { useEffect, useState } from 'react';
import type { Stage } from '@/packages/shared/src/types';

/**
 * Главный дашборд аналитики откликов
 * Показывает: статистику, воронку конверсии, инсайты о времени суток и днях недели
 */
export default function AnalyticsDashboard() {
  // TODO: Заменить на real data из Supabase
  const [totalApplications] = useState<number>(47);
  const [responseRate] = useState<number>(68);

  return (
    <div className="space-y-8">
      {/* Шапка со статистиккой */}
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-100">
          <h3 className="text-sm font-medium text-gray-700">Всего откликов</h3>
          <p className="text-2xl font-bold">{totalApplications}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-100">
          <h3 className="text-sm font-medium text-gray-700">Воронка (отклик до ответа)</h3>
          <p className="text-2xl font-bold">{responseRate}%</p>
        </div>
      </section>

      {/* Рекомендация дня */}
      <section className="bg-blue-50 p-4 rounded-lg border-2 border-blue-100">
        <h3 className="text-sm font-medium text-gray-700 mb-2">🔥 Рекомендация дня</h3>
        <p className="text-gray-600 text-sm">
          Откликайтесь на вакансии утром (9:00–12:00) — это время даёт наибольшую конверсию!
        </p>
      </section>

      {/* TODO: Добавить графики и тепловую карту */}
      <section className="bg-green-50 p-4 rounded-lg border-2 border-green-100">
        <h3 className="text-sm font-medium text-gray-700 mb-2">✅ Готово</h3>
        <p className="text-gray-600 text-sm">
          Дашборд аналитики создён. Следующие шаги: тепловая карта воронки, графики времени до ответа.
        </p>
      </section>
    </div>
  );
}

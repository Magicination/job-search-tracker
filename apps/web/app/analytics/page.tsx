'use client';

import {
  calculateConversionFunnel,
  calculateFunnelFromHistory,
  calculateAverageDaysToFirstResponse,
  calculateConversionByDayOfWeek,
  calculateConversionByTimeOfDay,
  calculateConversionBySource,
  calculateConversionByResumeVersion,
  type GroupedConversion,
  type BadgeVariant,
} from '@job-search-tracker/shared';
import { useApplicationAnalytics } from '../../lib/hooks/useApplicationAnalytics';
import { SkeletonCard } from '../../components/Skeleton';

// Те же CSS-переменные, что и в Badge.tsx — меняются вместе с темой
// (.light в globals.css), в отличие от фиксированного hex.
const VARIANT_TO_CSS_VAR: Record<BadgeVariant, string> = {
  amber: 'var(--accent-amber)',
  teal: 'var(--accent-teal)',
  blue: 'var(--accent-blue)',
  coral: 'var(--accent-coral)',
  neutral: 'var(--text-faint)',
};

function FunnelStage({
  label,
  count,
  percent,
  variant,
}: {
  label: string;
  count: number;
  percent: number;
  variant: BadgeVariant;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-text">{label}</span>
        <span className="text-text-dim tabular-nums">
          {count} ({percent}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-panel-2">
        <div
          className="h-full rounded-full"
          style={{ width: `${percent}%`, backgroundColor: VARIANT_TO_CSS_VAR[variant] }}
        />
      </div>
    </div>
  );
}

function GroupedTable({
  title,
  groups,
  emptyHint,
}: {
  title: string;
  groups: GroupedConversion[];
  emptyHint: string;
}) {
  return (
    <div className="rounded-lg border border-border-soft bg-panel p-4">
      <h2 className="mb-3 text-sm font-medium text-text">{title}</h2>
      {groups.length === 0 ? (
        <p className="text-sm text-text-faint">{emptyHint}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-text-dim">
              <th className="pb-2 font-medium">Группа</th>
              <th className="pb-2 font-medium">Откликов</th>
              <th className="pb-2 font-medium">До интервью+</th>
              <th className="pb-2 font-medium">Конверсия</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.label} className="border-t border-border-soft">
                <td className="py-1.5 text-text">{g.label}</td>
                <td className="py-1.5 text-text-dim tabular-nums">{g.total}</td>
                <td className="py-1.5 text-text-dim tabular-nums">{g.reachedInterviewOrBetter}</td>
                <td className="py-1.5 tabular-nums text-accent-teal">{g.conversionRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const { applications, history, resumeVersions, loading } = useApplicationAnalytics();

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-lg font-semibold text-text">Аналитика</h1>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={2} />
        <div className="grid gap-3 sm:grid-cols-2">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold text-text">Аналитика</h1>
        <p className="py-10 text-center text-sm text-text-dim">
          Пока нет откликов для анализа — добавьте несколько на странице «Отклики»,
          и здесь появится статистика по дням, времени и источникам.
        </p>
      </div>
    );
  }

  const currentFunnel = calculateConversionFunnel(applications);
  const historyFunnel = calculateFunnelFromHistory(history);
  const avgDays = calculateAverageDaysToFirstResponse(history);
  const byDayOfWeek = calculateConversionByDayOfWeek(applications, history);
  const byTimeOfDay = calculateConversionByTimeOfDay(applications, history);
  const bySource = calculateConversionBySource(applications, history);

  const versionNameById = new Map(resumeVersions.map((v) => [v.id, v.name]));
  const byResumeVersion = calculateConversionByResumeVersion(applications, history, versionNameById);

  const pct = (count: number) =>
    historyFunnel.applied ? Math.round((count / historyFunnel.applied) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-text">Аналитика</h1>

      <div className="rounded-lg border border-border-soft bg-panel p-4">
        <h2 className="mb-3 text-sm font-medium text-text">
          Воронка (по истории — учитывает все этапы, через которые прошёл отклик)
        </h2>
        <div className="flex flex-col gap-3">
          <FunnelStage label="Отклик отправлен" count={historyFunnel.applied} percent={100} variant="blue" />
          <FunnelStage
            label="Скрининг"
            count={historyFunnel.screen}
            percent={pct(historyFunnel.screen)}
            variant="amber"
          />
          <FunnelStage
            label="Интервью"
            count={historyFunnel.interview}
            percent={pct(historyFunnel.interview)}
            variant="coral"
          />
          <FunnelStage
            label="Оффер"
            count={historyFunnel.offer}
            percent={pct(historyFunnel.offer)}
            variant="teal"
          />
        </div>
        <p className="mt-3 text-xs text-text-faint">
          Текущие статусы прямо сейчас: отправлено {currentFunnel.applied}, скрининг {currentFunnel.screen},
          интервью {currentFunnel.interview}, оффер {currentFunnel.offer}, отказ {currentFunnel.rejected}.
        </p>
      </div>

      <div className="rounded-lg border border-border-soft bg-panel p-4">
        <h2 className="mb-1 text-sm font-medium text-text">Среднее время до первого ответа</h2>
        <p className="text-2xl font-semibold tabular-nums text-text">
          {avgDays !== null ? `${avgDays} дн.` : '—'}
        </p>
        <p className="mt-1 text-xs text-text-faint">
          {avgDays !== null
            ? 'От момента отклика до первого изменения статуса (скрининг, интервью или отказ).'
            : 'Пока нет ни одного отклика с изменённым статусом — данных недостаточно.'}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <GroupedTable
          title="По дню недели отклика"
          groups={byDayOfWeek}
          emptyHint="Нет данных — у старых откликов не сохранено точное время отправки."
        />
        <GroupedTable
          title="По времени суток отклика"
          groups={byTimeOfDay}
          emptyHint="Нет данных — у старых откликов не сохранено точное время отправки."
        />
        <GroupedTable
          title="По источнику"
          groups={bySource}
          emptyHint="Добавьте источник (hh.ru, LinkedIn и т.д.) в карточках откликов."
        />
        <GroupedTable
          title="По версии резюме"
          groups={byResumeVersion}
          emptyHint="Привяжите отклики к версии резюме на странице «Отклики», чтобы сравнить их эффективность."
        />
      </div>
    </div>
  );
}

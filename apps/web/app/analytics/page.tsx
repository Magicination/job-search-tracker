'use client';

import { useState } from 'react';
import type { Application, GroupedConversion, BadgeVariant } from '@job-search-tracker/shared';
import { APPLICATION_STATUS_LABELS, calculateConversionByResumeVersion } from '@job-search-tracker/shared';
import { useApplicationAnalytics } from '../../lib/hooks/useApplicationAnalytics';
import { SkeletonCard } from '../../components/Skeleton';
import { HourlyChart } from '../../components/HourlyChart';

export default function AnalyticsPage() {
  const { applications, history, resumeVersions, coverLetterVersions, loading } = useApplicationAnalytics();

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
  const byHour = calculateConversionByHour(applications, history);
  const bySource = calculateConversionBySource(applications, history);

  const resumeNameById = new Map(resumeVersions.map((v) => [v.id, v.name]));
  const byResumeVersion = calculateConversionByResumeVersion(applications, history, resumeNameById);

  const coverLetterNameById = new Map(coverLetterVersions.map((v) => [v.id, v.name]));
  const byCoverLetterVersion = calculateConversionByCoverLetterVersion(applications, history, coverLetterNameById);

  const pct = (count: number) =>
    historyFunnel.applied ? Math.round((count / historyFunnel.applied) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-text">Аналитика</h1>

      <CollapsibleSection title="Воронка конверсии" subtitle="По истории — учитывает все этапы, через которые прошёл отклик">
        <div className="flex flex-col gap-3">
          <FunnelStage label="Отклик отправлен" count={historyFunnel.applied} percent={100} variant="blue" />
          <FunnelStage label="Скрининг" count={historyFunnel.screen} percent={pct(historyFunnel.screen)} variant="amber" />
          <FunnelStage label="Интервью" count={historyFunnel.interview} percent={pct(historyFunnel.interview)} variant="coral" />
          <FunnelStage label="Оффер" count={historyFunnel.offer} percent={pct(historyFunnel.offer)} variant="teal" />
          <FunnelStage label="Отказ" count={historyFunnel.rejected} percent={pct(historyFunnel.rejected)} variant="neutral" />
        </div>
        <p className="mt-3 text-xs text-text-faint">
          Текущие статусы прямо сейчас: отправлено {currentFunnel.applied}, скрининг {currentFunnel.screen},
          интервью {currentFunnel.interview}, оффер {currentFunnel.offer}, отказ {currentFunnel.rejected}.
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="Среднее время до первого ответа">
        <p className="text-2xl font-semibold tabular-nums text-text">
          {avgDays !== null ? `${avgDays} дн.` : '—'}
        </p>
        <p className="mt-1 text-xs text-text-faint">
          {avgDays !== null
            ? 'От момента отклика до первого изменения статуса (скрининг, интервью или отказ).'
            : 'Пока нет ни одного отклика с изменённым статусом — данных недостаточно.'}
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="По часу отклика (00–24)" subtitle="Когда вы чаще откликаетесь и насколько это работает">
        <HourlyChart data={byHour} />
      </CollapsibleSection>

      <div className="grid gap-3 sm:grid-cols-1">
        <CollapsibleSection title="По дню недели отклика">
          <GroupedTableBody groups={byDayOfWeek} emptyHint="Нет данных — у старых откликов не сохранено точное время отправки." />
        </CollapsibleSection>
        <CollapsibleSection title="По источнику">
          <GroupedTableBody groups={bySource} emptyHint="Добавьте источник (hh.ru, LinkedIn и т.д.) в карточках откликов." />
        </CollapsibleSection>
        <CollapsibleSection title="По версии резюме">
          <GroupedTableBody
            groups={byResumeVersion}
            emptyHint="Привяжите отклики к версии резюме на странице «Отклики», чтобы сравнить их эффективность."
          />
        </CollapsibleSection>
        <CollapsibleSection title="По версии сопроводительного">
          <GroupedTableBody
            groups={byCoverLetterVersion}
            emptyHint="Привяжите отклики к версии сопроводительного письма на странице «Отклики»."
          />
        </CollapsibleSection>
      </div>
    </div>
  );
}

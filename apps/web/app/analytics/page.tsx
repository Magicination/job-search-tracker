'use client';

import { useState, useEffect } from 'react';
import type { Application, GroupedConversion, BadgeVariant } from '@job-search-tracker/shared';
import {
  APPLICATION_STATUS_LABELS,
  calculateConversionByResumeVersion,
  calculateConversionFunnel,
  calculateFunnelFromHistory,
  calculateAverageDaysToFirstResponse,
  calculateMedianDaysToFirstResponse,
  calculateConversionByDayOfWeek,
  calculateConversionByHour,
  calculateConversionBySource,
  calculateSilentCompanies,
  calculateRepeatCompanies,
} from '@job-search-tracker/shared';
import { useApplicationAnalytics } from '../../lib/hooks/useApplicationAnalytics';
import { SkeletonCard } from '../../components/Skeleton';
import { HourlyChart } from '../../components/HourlyChart';
import { WeekdayChart } from '../../components/WeekdayChart';
import { Modal } from '../../components/Modal';
import { TriangleAlert, Settings } from 'lucide-react';

const SECTION_IDS = [
  'funnel',
  'avgResponse',
  'byHour',
  'byWeekday',
  'bySource',
  'byResume',
  'silent',
  'repeat',
] as const;
type SectionId = (typeof SECTION_IDS)[number];
const SECTION_LABELS: Record<SectionId, string> = {
  funnel: 'Воронка конверсии',
  avgResponse: 'Время до первого ответа',
  byHour: 'По часу отклика',
  byWeekday: 'По дню недели',
  bySource: 'По источнику',
  byResume: 'По версии резюме',
  silent: 'Тишина по компаниям',
  repeat: 'Повторные отклики',
};
const SECTIONS_STORAGE_KEY = 'jt_analytics_visible_sections';

function useVisibleSections() {
  const [visible, setVisible] = useState<Record<SectionId, boolean>>(() =>
    Object.fromEntries(SECTION_IDS.map((id) => [id, true])) as Record<SectionId, boolean>
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SECTIONS_STORAGE_KEY);
      if (saved) {
        setVisible((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch {
      // localStorage недоступен/повреждён — просто оставляем всё видимым
    }
  }, []);

  function toggle(id: SectionId) {
    setVisible((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  return { visible, toggle };
}

type Period = 'week' | 'month' | 'year' | 'all';
const PERIOD_LABELS: Record<Period, string> = { week: 'Неделя', month: 'Месяц', year: 'Год', all: 'Всё время' };
function getPeriodCutoff(period: Period): Date | null {
  if (period === 'all') return null;
  const now = new Date();
  const cutoff = new Date(now);
  if (period === 'week') cutoff.setDate(now.getDate() - 7);
  if (period === 'month') cutoff.setMonth(now.getMonth() - 1);
  if (period === 'year') cutoff.setFullYear(now.getFullYear() - 1);
  return cutoff;
}

function CollapsibleSection({
 title,
 subtitle,
 children,
}: {
 title: string;
 subtitle?: string;
 children: React.ReactNode;
}) {
 const [expanded, setExpanded] = useState(true);
 return (
 <div className="rounded-lg border border-border-soft bg-panel p-4">
 <button
 onClick={() => setExpanded((e) => !e)}
 className="flex w-full items-center justify-between text-left"
 >
 <div>
 <h2 className="text-sm font-semibold text-text">{title}</h2>
 {subtitle && <p className="mt-0.5 text-xs text-text-faint">{subtitle}</p>}
 </div>
 <span className="text-text-faint">{expanded ? '▾' : '▸'}</span>
 </button>
 {expanded && <div className="mt-3">{children}</div>}
 </div>
 );
}

const FUNNEL_BAR_CLASS: Record<BadgeVariant, string> = {
 blue: 'bg-accent-blue',
 amber: 'bg-accent-amber',
 coral: 'bg-accent-coral',
 teal: 'bg-accent-teal',
 neutral: 'bg-text-faint',
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
 <div>
 <div className="flex items-center justify-between text-xs text-text-dim">
 <span>{label}</span>
 <span className="tabular-nums">
 {count} · {percent}%
 </span>
 </div>
 <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-panel-2">
 <div className={`h-full rounded-full ${FUNNEL_BAR_CLASS[variant]}`} style={{ width: `${percent}%` }} />
 </div>
 </div>
 );
}

function GroupedTableBody({
 groups,
 emptyHint,
 highlightLow,
}: {
 groups: GroupedConversion[];
 emptyHint: string;
 highlightLow?: boolean;
}) {
 if (groups.length === 0) {
 return <p className="text-xs text-text-faint">{emptyHint}</p>;
 }
 const withData = groups.filter((g) => g.total >= 3);
 const avgRate =
 withData.length > 0 ? withData.reduce((sum, g) => sum + g.conversionRate, 0) / withData.length : null;

 return (
 <div className="flex flex-col gap-1.5">
 {groups.map((g) => {
 const isLow = highlightLow && avgRate !== null && g.total >= 3 && g.conversionRate < avgRate * 0.5;
 return (
 <div key={g.label} className="flex items-center justify-between text-sm">
 <span className={`flex items-center gap-1 ${isLow ? 'text-accent-coral' : 'text-text-dim'}`}>
   {g.label}
   {isLow && <TriangleAlert className="h-3 w-3" />}
 </span>
 <span className="tabular-nums text-text-faint">
   {g.reachedInterviewOrBetter}/{g.total} · {g.conversionRate}%
 </span>
 </div>
 );
 })}
 </div>
 );
}

export default function AnalyticsPage() {
  const { applications, history, resumeVersions, loading } = useApplicationAnalytics();
  const { visible, toggle } = useVisibleSections();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [period, setPeriod] = useState<Period>('all');
  const cutoff = getPeriodCutoff(period);
  const periodApplications = cutoff ? applications.filter((a) => a.applied_date && new Date(a.applied_date) >= cutoff) : applications;
  const periodIds = new Set(periodApplications.map((a) => a.id));
  const periodHistory = cutoff ? history.filter((h) => periodIds.has(h.application_id)) : history;

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

  const currentFunnel = calculateConversionFunnel(periodApplications);
  const historyFunnel = calculateFunnelFromHistory(periodHistory);
  const avgDays = calculateAverageDaysToFirstResponse(periodHistory);
  const byDayOfWeek = calculateConversionByDayOfWeek(periodApplications, periodHistory);
  const byHour = calculateConversionByHour(periodApplications, periodHistory);
  const bySource = calculateConversionBySource(periodApplications, periodHistory);

  const resumeNameById = new Map(resumeVersions.map((v) => [v.id, v.name]));
  const byResumeVersion = calculateConversionByResumeVersion(periodApplications, periodHistory, resumeNameById);

  const medianDays = calculateMedianDaysToFirstResponse(periodHistory);
  const silentCompanies = calculateSilentCompanies(periodApplications, periodHistory);
  const repeatCompanies = calculateRepeatCompanies(periodApplications);

  const pct = (count: number) =>
    historyFunnel.applied ? Math.round((count / historyFunnel.applied) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-text">Аналитика</h1>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                period === p ? 'border-accent-amber bg-accent-amber/10 text-text' : 'border-border text-text-dim hover:border-border-soft'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-dim transition hover:border-border-soft"
          title="Настроить, какие блоки показывать"
        >
          <Settings className="h-3.5 w-3.5" /> Настроить дашборд
        </button>
      </div>

      {settingsOpen && (
        <Modal onClose={() => setSettingsOpen(false)}>
          <h2 className="mb-3 text-sm font-semibold text-text">Какие блоки показывать</h2>
          <div className="flex flex-col gap-2">
            {SECTION_IDS.map((id) => (
              <label key={id} className="flex items-center gap-2 text-sm text-text-dim">
                <input type="checkbox" checked={visible[id]} onChange={() => toggle(id)} />
                {SECTION_LABELS[id]}
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-text-faint">Настройка сохраняется в этом браузере.</p>
        </Modal>
      )}
      {periodApplications.length === 0 && (
        <p className="text-sm text-text-dim">За выбранный период откликов нет — выберите другой период или «Всё время».</p>
      )}

      {visible.funnel && (
      <CollapsibleSection title="Воронка конверсии" subtitle="По истории — учитывает все этапы, через которые прошёл отклик">
        <div className="flex flex-col gap-3">
          <FunnelStage label="Отклик отправлен" count={historyFunnel.applied} percent={100} variant="blue" />
          <FunnelStage label="Интервью" count={historyFunnel.interview} percent={pct(historyFunnel.interview)} variant="coral" />
          <FunnelStage label="Оффер" count={historyFunnel.offer} percent={pct(historyFunnel.offer)} variant="teal" />
          <FunnelStage label="Отказ" count={historyFunnel.rejected} percent={pct(historyFunnel.rejected)} variant="neutral" />
        </div>
        <p className="mt-3 text-xs text-text-faint">
          Текущие статусы прямо сейчас: отправлено {currentFunnel.applied}, интервью {currentFunnel.interview},
          оффер {currentFunnel.offer}, отказ {currentFunnel.rejected}.
        </p>
      </CollapsibleSection>
      )}

      {visible.avgResponse && (
      <CollapsibleSection title="Время до первого ответа">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-text">
              {avgDays !== null ? `${avgDays} дн.` : '—'}
            </p>
            <p className="text-xs text-text-faint">среднее</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums text-text">
              {medianDays !== null ? `${medianDays} дн.` : '—'}
            </p>
            <p className="text-xs text-text-faint">медиана</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-text-faint">
          {avgDays !== null
            ? 'От момента отклика до первого изменения статуса (интервью или отказ). Медиана устойчивее к редким выбросам — например, одному отклику с ответом через два месяца.'
            : 'Пока нет ни одного отклика с изменённым статусом — данных недостаточно.'}
        </p>
      </CollapsibleSection>
      )}

      {visible.byHour && (
      <CollapsibleSection title="По часу отклика (00–24)" subtitle="Когда вы чаще откликаетесь и насколько это работает">
        <HourlyChart data={byHour} />
      </CollapsibleSection>
      )}

      <div className="grid gap-3 sm:grid-cols-1">
        {visible.byWeekday && (
        <CollapsibleSection title="По дню недели отклика">
          {byDayOfWeek.some((d) => d.total > 0) ? (
            <WeekdayChart data={byDayOfWeek} />
          ) : (
            <p className="text-xs text-text-faint">Нет данных — у старых откликов не сохранено точное время отправки.</p>
          )}
        </CollapsibleSection>
        )}

        <div className="grid gap-3 sm:grid-cols-1">
          {visible.bySource && (
          <CollapsibleSection title="По источнику">
            <GroupedTableBody groups={bySource} emptyHint="Добавьте источник (hh.ru, LinkedIn и т.д.) в карточках откликов." highlightLow />
          </CollapsibleSection>
          )}

          {visible.byResume && (
          <CollapsibleSection title="По версии резюме">
            <GroupedTableBody
              groups={byResumeVersion}
              emptyHint="Привяжите отклики к версии резюме на странице «Отклики», чтобы сравнить их эффективность."
            />
        </CollapsibleSection>
          )}

          {visible.silent && (
          <CollapsibleSection title="Тишина по компаниям" subtitle="Ни разу не ответили за 14+ дней">
            {silentCompanies.length === 0 ? (
              <p className="text-xs text-text-faint">Пока таких нет — либо всё внимательны, либо рано считать.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {silentCompanies.map((s) => (
                  <div key={s.applicationId} className="flex items-center justify-between text-sm">
                    <span className="text-text-dim">{s.company}</span>
                    <span className="tabular-nums text-text-faint">{s.days} дн. тишины</span>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
          )}

          {visible.repeat && (
          <CollapsibleSection title="Повторные отклики" subtitle="Компании, на которые откликались больше одного раза">
            {repeatCompanies.length === 0 ? (
              <p className="text-xs text-text-faint">Повторов пока нет.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {repeatCompanies.map((r) => (
                  <div key={r.company} className="flex items-center justify-between text-sm">
                    <span className="text-text-dim">{r.company}</span>
                    <span className="tabular-nums text-text-faint">{r.count} раза</span>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
}

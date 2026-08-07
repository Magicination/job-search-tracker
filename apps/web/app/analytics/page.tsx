'use client';

import { useState, useEffect } from 'react';
import type { GroupedConversion, Stage, StageBreakdownGroup } from '@job-search-tracker/shared';
import {
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
  calculateSequentialFunnel,
  calculateStageDurations,
  calculateFunnelVelocity,
  calculateWeeklyConversionTrend,
  calculateConversionHeatmap,
  calculateStageBreakdownByGroup,
  calculateConversionBySalaryRange,
  calculateOfferForecast,
  calculateVacancyWordFrequency,
  calculateHealthIndex,
} from '@job-search-tracker/shared';
import { useApplicationAnalytics } from '../../lib/hooks/useApplicationAnalytics';
import { useStages } from '../../lib/hooks/useStages';
import { SkeletonCard } from '../../components/Skeleton';
import { HourlyChart } from '../../components/HourlyChart';
import { WeekdayChart } from '../../components/WeekdayChart';
import { WeeklyTrendChart } from '../../components/WeeklyTrendChart';
import { ConversionHeatmap } from '../../components/ConversionHeatmap';
import { Modal } from '../../components/Modal';
import { TriangleAlert, Settings, Lightbulb } from 'lucide-react';

const SECTION_IDS = [
  'healthIndex',
  'funnel',
  'sequentialFunnel',
  'avgResponse',
  'velocity',
  'stageDurations',
  'weeklyTrend',
  'byHour',
  'byWeekday',
  'heatmap',
  'bySource',
  'byResume',
  'bySalary',
  'forecast',
  'silent',
  'repeat',
  'wordFrequency',
] as const;
type SectionId = (typeof SECTION_IDS)[number];
const SECTION_LABELS: Record<SectionId, string> = {
  healthIndex: 'Индекс здоровья поиска',
  funnel: 'Воронка конверсии (всего)',
  sequentialFunnel: 'Воронка по шагам (drop-off)',
  avgResponse: 'Время до первого ответа',
  velocity: 'Скорость всей воронки',
  stageDurations: 'Время на каждом этапе',
  weeklyTrend: 'Тренд конверсии по неделям',
  byHour: 'По часу отклика',
  byWeekday: 'По дню недели',
  heatmap: 'Тепловая карта день × час',
  bySource: 'По источнику',
  byResume: 'По версии резюме',
  bySalary: 'По зарплатной вилке',
  forecast: 'Прогноз до оффера',
  silent: 'Тишина по компаниям',
  repeat: 'Повторные отклики',
  wordFrequency: 'Слова в вакансиях',
};
const SECTIONS_STORAGE_KEY = 'jt_analytics_visible_sections_v2';

function useVisibleSections() {
  const [visible, setVisible] = useState<Record<SectionId, boolean>>(() =>
    Object.fromEntries(SECTION_IDS.map((id) => [id, true])) as Record<SectionId, boolean>
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SECTIONS_STORAGE_KEY);
      if (saved) setVisible((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch { /* Игнорируем ошибки сохранения */ }
  }, []);

  function toggle(id: SectionId) {
    setVisible((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(next));
        } catch { /* Игнорируем ошибки сохранения */ }
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

function CollapsibleSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="rounded-lg border border-border-soft bg-panel p-4">
      <button onClick={() => setExpanded((e) => !e)} className="flex w-full items-center justify-between text-left">
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

const FUNNEL_BAR_CLASS: Record<Stage['color'], string> = {
  blue: 'bg-accent-blue',
  amber: 'bg-accent-amber',
  coral: 'bg-accent-coral',
  teal: 'bg-accent-teal',
  violet: 'bg-accent-violet',
  rose: 'bg-accent-rose',
  lime: 'bg-accent-lime',
  neutral: 'bg-text-faint',
};

function FunnelStage({ label, count, percent, variant }: { label: string; count: number; percent: number; variant: Stage['color'] }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-text-dim">
        <span>{label}</span>
        <span className="tabular-nums">{count} · {percent}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-panel-2">
        <div className={`h-full rounded-full ${FUNNEL_BAR_CLASS[variant]}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function GroupedTableBody({ groups, emptyHint, highlightLow }: { groups: GroupedConversion[]; emptyHint: string; highlightLow?: boolean }) {
  if (groups.length === 0) return <p className="text-xs text-text-faint">{emptyHint}</p>;
  const withData = groups.filter((g) => g.total >= 3);
  const avgRate = withData.length > 0 ? withData.reduce((sum, g) => sum + g.conversionRate, 0) / withData.length : null;

  return (
    <div className="flex flex-col gap-1.5">
      {groups.map((g) => {
        const isLow = highlightLow && avgRate !== null && g.total >= 3 && g.conversionRate < avgRate * 0.5;
        const lowSample = g.total < 3;
        return (
          <div key={g.label} className="flex items-center justify-between text-sm">
            <span className={`flex items-center gap-1 ${isLow ? 'text-accent-coral' : 'text-text-dim'}`}>
              {g.label}
              {isLow && <TriangleAlert className="h-3 w-3" />}
            </span>
            <span className={`tabular-nums ${lowSample ? 'text-text-faint/60' : 'text-text-faint'}`}>
              {g.reachedInterviewOrBetter}/{g.total} · {g.conversionRate}%
              {lowSample && <span className="ml-1 text-[10px] italic">мало данных</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StageBreakdownTable({ groups, stages, limit = 5 }: { groups: StageBreakdownGroup[]; stages: Stage[]; limit?: number }) {
  const ordered = [...stages].sort((a, b) => a.position - b.position);
  const top = groups.slice(0, limit);
  if (top.length === 0) return null;

  return (
    <div className="mt-3 overflow-x-auto border-t border-border-soft pt-3">
      <table className="w-full min-w-[420px] text-xs">
        <thead>
          <tr className="text-left text-text-faint">
            <th className="pb-1 pr-2 font-normal">Группа</th>
            {ordered.map((s) => (
              <th key={s.id} className="pb-1 px-1 text-right font-normal">{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {top.map((g) => (
            <tr key={g.label} className="border-t border-border-soft">
              <td className="py-1 pr-2 text-text-dim">{g.label}</td>
              {ordered.map((s) => (
                <td key={s.id} className="py-1 px-1 text-right tabular-nums text-text-faint">
                  {g.stageCounts[s.id] ?? 0}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[10px] text-text-faint">Число — сколько откликов из группы хотя бы раз дошли до этого этапа.</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { applications, history, resumeVersions, loading } = useApplicationAnalytics();
  const { stages, loading: stagesLoading } = useStages();
  const { visible, toggle } = useVisibleSections();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [period, setPeriod] = useState<Period>('all');
  const cutoff = getPeriodCutoff(period);
  const periodApplications = cutoff ? applications.filter((a) => a.applied_date && new Date(a.applied_date) >= cutoff) : applications;
  const periodIds = new Set(periodApplications.map((a) => a.id));
  const periodHistory = cutoff ? history.filter((h) => periodIds.has(h.application_id)) : history;

  if (loading || stagesLoading) {
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

  const orderedStages = [...stages].sort((a, b) => a.position - b.position);

  const currentFunnel = calculateConversionFunnel(periodApplications, stages);
  const historyFunnel = calculateFunnelFromHistory(periodHistory, stages);
  const avgDays = calculateAverageDaysToFirstResponse(periodHistory);
  const medianDays = calculateMedianDaysToFirstResponse(periodHistory);
  const byDayOfWeek = calculateConversionByDayOfWeek(periodApplications, periodHistory, stages);
  const byHour = calculateConversionByHour(periodApplications, periodHistory, stages);
  const bySource = calculateConversionBySource(periodApplications, periodHistory, stages);
  const bySalary = calculateConversionBySalaryRange(periodApplications, periodHistory, stages);

  const resumeNameById = new Map(resumeVersions.map((v) => [v.id, v.name]));
  const byResumeVersion = calculateConversionByResumeVersion(periodApplications, periodHistory, stages, resumeNameById);

  const silentCompanies = calculateSilentCompanies(periodApplications, periodHistory, stages);
  const repeatCompanies = calculateRepeatCompanies(periodApplications);

  const sequentialFunnel = calculateSequentialFunnel(periodHistory, stages);
  const stageDurations = calculateStageDurations(periodHistory, stages);
  const velocity = calculateFunnelVelocity(periodHistory, stages);
  const weeklyTrend = calculateWeeklyConversionTrend(periodApplications, periodHistory, stages);
  const heatmap = calculateConversionHeatmap(periodApplications, periodHistory, stages);
  const forecast = calculateOfferForecast(periodApplications, periodHistory, stages);
  const wordFrequency = calculateVacancyWordFrequency(periodApplications, periodHistory, stages);
  const healthIndex = calculateHealthIndex(periodApplications, periodHistory, stages);

  const bySourceBreakdown = calculateStageBreakdownByGroup(periodApplications, periodHistory, stages, (app) =>
    app.source.trim() ? app.source.trim() : null
  );
  const byResumeBreakdown = calculateStageBreakdownByGroup(periodApplications, periodHistory, stages, (app) =>
    app.resume_version_id ? resumeNameById.get(app.resume_version_id) ?? null : null
  );

  const firstStage = orderedStages[0];
  const firstStageTotal = firstStage ? historyFunnel[firstStage.id] ?? 0 : 0;
  const pct = (count: number) => (firstStageTotal ? Math.round((count / firstStageTotal) * 100) : 0);

  // Автоинсайт: лучшая по конверсии комбинация среди источников/резюме/дней/часов с достаточной выборкой.
  const insightCandidates = [
    ...bySource.filter((g) => g.total >= 3).map((g) => ({ dimension: 'источник', ...g })),
    ...byResumeVersion.filter((g) => g.total >= 3).map((g) => ({ dimension: 'версия резюме', ...g })),
    ...byDayOfWeek.filter((g) => g.total >= 3).map((g) => ({ dimension: 'день недели', ...g })),
  ];
  const bestInsight = insightCandidates.length > 0 ? insightCandidates.reduce((best, g) => (g.conversionRate > best.conversionRate ? g : best)) : null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-text">Аналитика</h1>

      {bestInsight && (
        <div className="flex items-start gap-2 rounded-lg border border-accent-amber/30 bg-accent-amber/5 p-3 text-sm text-text-dim">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent-amber" />
          <span>
            Лучше всего сейчас работает <strong className="text-text">{bestInsight.dimension} «{bestInsight.label}»</strong>{' '}
            — конверсия {bestInsight.conversionRate}% на {bestInsight.total} откликах.
          </span>
        </div>
      )}

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
        >
          <Settings className="h-3.5 w-3.5" /> Настроить дашборд
        </button>
      </div>

      {settingsOpen && (
        <Modal onClose={() => setSettingsOpen(false)}>
          <h2 className="mb-3 text-sm font-semibold text-text">Какие блоки показывать</h2>
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
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

      {visible.healthIndex && healthIndex && (
        <CollapsibleSection title="Индекс здоровья поиска" subtitle="Сводный ориентир 0–100 из трёх компонентов ниже — не строгая наука, просто чтобы видеть «лучше или хуже, чем было»">
          <div className="flex items-center gap-4">
            <p className="text-3xl font-semibold tabular-nums text-text">{healthIndex.score}</p>
            <div className="flex-1 space-y-1.5">
              {healthIndex.components.map((c) => (
                <div key={c.label} className="flex items-center justify-between text-xs text-text-faint">
                  <span>{c.label}</span>
                  <span className="tabular-nums">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleSection>
      )}

      {visible.funnel && (
        <CollapsibleSection title="Воронка конверсии (всего)" subtitle="Сколько когда-либо дошло до каждого этапа — по истории, не только текущий срез">
          <div className="flex flex-col gap-3">
            {orderedStages.map((stage, i) => (
              <FunnelStage
                key={stage.id}
                label={stage.name}
                count={historyFunnel[stage.id] ?? 0}
                percent={i === 0 ? 100 : pct(historyFunnel[stage.id] ?? 0)}
                variant={stage.color}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-text-faint">
            Текущие статусы прямо сейчас:{' '}
            {orderedStages.map((s, i) => (
              <span key={s.id}>
                {i > 0 && ', '}
                {s.name.toLowerCase()} {currentFunnel.counts[s.id] ?? 0}
              </span>
            ))}
            .
          </p>
        </CollapsibleSection>
      )}

      {visible.sequentialFunnel && (
        <CollapsibleSection title="Воронка по шагам" subtitle="Из тех, кто дошёл до этапа — сколько пошли дальше, а не просто «сколько всего когда-либо доходило»">
          {sequentialFunnel.length === 0 ? (
            <p className="text-xs text-text-faint">Нужно минимум 2 обычных (не «проигрышных») этапа, чтобы построить пошаговую воронку.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sequentialFunnel.map((step) => (
                <div key={`${step.fromStageId}-${step.toStageId}`}>
                  <div className="flex items-center justify-between text-xs text-text-dim">
                    <span>{step.fromLabel} → {step.toLabel}</span>
                    <span className="tabular-nums">
                      {step.toCount}/{step.fromCount} · {step.conversionRate}%
                      {step.dropOffCount > 0 && <span className="text-accent-coral"> (−{step.dropOffCount})</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-panel-2">
                    <div className="h-full rounded-full bg-accent-blue" style={{ width: `${step.conversionRate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      )}

      {visible.avgResponse && (
        <CollapsibleSection title="Время до первого ответа">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold tabular-nums text-text">{avgDays !== null ? `${avgDays} дн.` : '—'}</p>
              <p className="text-xs text-text-faint">среднее</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-text">{medianDays !== null ? `${medianDays} дн.` : '—'}</p>
              <p className="text-xs text-text-faint">медиана</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-text-faint">
            {avgDays !== null
              ? 'От момента отклика до первого изменения этапа. Медиана устойчивее к редким выбросам.'
              : 'Пока нет ни одного отклика с изменённым этапом — данных недостаточно.'}
          </p>
        </CollapsibleSection>
      )}

      {visible.velocity && velocity && (
        <CollapsibleSection title="Скорость всей воронки" subtitle={`От отклика до этапа «${velocity.targetStageName}» целиком, не только до первого ответа`}>
          {velocity.sampleSize === 0 ? (
            <p className="text-xs text-text-faint">Пока ни один отклик не дошёл до этого этапа — данных недостаточно.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-semibold tabular-nums text-text">{velocity.avgDays} дн.</p>
                <p className="text-xs text-text-faint">среднее ({velocity.sampleSize} {velocity.sampleSize === 1 ? 'случай' : 'случаев'})</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums text-text">{velocity.medianDays} дн.</p>
                <p className="text-xs text-text-faint">медиана</p>
              </div>
            </div>
          )}
        </CollapsibleSection>
      )}

      {visible.stageDurations && (
        <CollapsibleSection title="Время на каждом этапе" subtitle="Сколько дней отклик реально проводит на этапе до перехода дальше">
          <div className="flex flex-col gap-2">
            {stageDurations.map((d) => (
              <div key={d.stageId} className="flex items-center justify-between text-sm">
                <span className="text-text-dim">{d.stageName}</span>
                <span className="tabular-nums text-text-faint">
                  {d.sampleSize === 0 ? '—' : `${d.avgDays} дн. (медиана ${d.medianDays})`}
                  {d.sampleSize > 0 && d.sampleSize < 3 && <span className="ml-1 text-[10px] italic">мало данных</span>}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {visible.weeklyTrend && (
        <CollapsibleSection title="Тренд конверсии по неделям" subtitle="Растёт или падает эффективность со временем — последние 12 недель">
          <WeeklyTrendChart data={weeklyTrend} />
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

        {visible.heatmap && (
          <CollapsibleSection title="Тепловая карта день × час" subtitle="Объединяет два графика выше в одну картину">
            <ConversionHeatmap data={heatmap} />
          </CollapsibleSection>
        )}

        <div className="grid gap-3 sm:grid-cols-1">
          {visible.bySource && (
            <CollapsibleSection title="По источнику">
              <GroupedTableBody groups={bySource} emptyHint="Добавьте источник (hh.ru, LinkedIn и т.д.) в карточках откликов." highlightLow />
              <StageBreakdownTable groups={bySourceBreakdown} stages={stages} />
            </CollapsibleSection>
          )}

          {visible.byResume && (
            <CollapsibleSection title="По версии резюме">
              {byResumeVersion.length >= 2 ? (
                <div className="grid grid-cols-2 gap-3">
                  {byResumeVersion.slice(0, 2).map((g) => (
                    <div key={g.label} className="rounded-lg border border-border-soft bg-panel-2 p-2.5">
                      <p className="truncate text-sm text-text" title={g.label}>{g.label}</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums text-text">{g.conversionRate}%</p>
                      <p className="text-xs text-text-faint">{g.reachedInterviewOrBetter}/{g.total} откликов</p>
                    </div>
                  ))}
                </div>
              ) : (
                <GroupedTableBody groups={byResumeVersion} emptyHint="Привяжите отклики к версии резюме на странице «Отклики», чтобы сравнить их эффективность." />
              )}
              {byResumeVersion.length > 2 && (
                <div className="mt-2">
                  <GroupedTableBody groups={byResumeVersion.slice(2)} emptyHint="" />
                </div>
              )}
              <StageBreakdownTable groups={byResumeBreakdown} stages={stages} />
            </CollapsibleSection>
          )}

          {visible.bySalary && (
            <CollapsibleSection title="По зарплатной вилке" subtitle="Не завышены ли ожидания — конверсия по указанной зарплате в отклике">
              <GroupedTableBody groups={bySalary} emptyHint="Не удалось распознать сумму в поле «Зарплата» ни у одного отклика." />
            </CollapsibleSection>
          )}

          {visible.forecast && forecast && (
            <CollapsibleSection title="Прогноз до оффера" subtitle={`При текущей конверсии до этапа «${forecast.targetStageName}»`}>
              <p className="text-2xl font-semibold tabular-nums text-text">
                {forecast.estimatedApplicationsNeeded !== null ? `~${forecast.estimatedApplicationsNeeded} откликов` : '—'}
              </p>
              <p className="mt-1 text-xs text-text-faint">
                {forecast.estimatedApplicationsNeeded !== null
                  ? `в среднем на один такой результат, при текущей конверсии ${forecast.probabilityPercent}%`
                  : 'пока ни разу не дошли до этого этапа — рано считать прогноз'}
              </p>
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

          {visible.wordFrequency && (
            <CollapsibleSection title="Слова в вакансиях" subtitle="Слова, непропорционально частые в описаниях с реальным прогрессом — требует, чтобы текст вакансии сохранился (букмарклет пробует, но не всегда получается)">
              {wordFrequency.length === 0 ? (
                <p className="text-xs text-text-faint">
                  Пока недостаточно сохранённых описаний вакансий для анализа — добавляйте отклики через
                  букмарклет, он старается сохранить текст вакансии автоматически.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {wordFrequency.map((w) => (
                    <div key={w.word} className="flex items-center justify-between text-sm">
                      <span className="text-text-dim">{w.word}</span>
                      <span className="tabular-nums text-text-faint">
                        ×{w.liftScore} ({w.countInGood}/{w.countTotal})
                      </span>
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

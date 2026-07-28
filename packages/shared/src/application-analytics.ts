// Аналитика откликов: воронка конверсии, время до первого ответа, разбивка
// по дню недели/времени суток/источнику. Цель — дать данные для ответа на
// вопрос "когда и как откликаться эффективнее", а не просто хранить статус.
//
// С переходом на собственные этапы канбана (Stage вместо жёсткого enum
// ApplicationStatus) все функции здесь принимают stages: Stage[] и
// работают по stage_id, а не по фиксированным полям applied/interview/
// offer/rejected. "Первый этап" (минимальный position) — это то, во что
// раньше упирался status==='applied': начальная точка воронки, точка
// отсчёта "давно без ответа" и т.д. Все функции по-прежнему чистые, не
// зависят от Supabase.

import type { Application, ApplicationStatusHistoryEntry, Stage } from './types';

function getFirstStage(stages: Stage[]): Stage | null {
  if (stages.length === 0) return null;
  return [...stages].sort((a, b) => a.position - b.position)[0];
}

// ============================================================
// Воронка конверсии
// ============================================================

export interface ConversionFunnel {
  /** Счётчик по каждому этапу — сколько откликов сейчас находится на нём (текущий срез). */
  counts: Record<string, number>;
  total: number;
  /** % от total, кто хотя бы раз покинул первый этап (то есть получил хоть какое-то движение). */
  responseRate: number;
}

/**
 * Считает воронку по ТЕКУЩЕМУ этапу каждого отклика (простой срез "что есть
 * сейчас"). Для понимания "сколько вообще когда-либо доходило до этапа X,
 * даже если потом ушли дальше" используйте calculateFunnelFromHistory — она
 * смотрит на историю переходов, а не только на финальное состояние.
 */
export function calculateConversionFunnel(applications: Application[], stages: Stage[]): ConversionFunnel {
  const total = applications.length;
  const counts: Record<string, number> = {};
  for (const stage of stages) counts[stage.id] = 0;

  for (const app of applications) {
    if (app.stage_id in counts) counts[app.stage_id] += 1;
  }

  const firstStage = getFirstStage(stages);
  const responded = firstStage ? total - (counts[firstStage.id] ?? 0) : 0;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  return { counts, total, responseRate: pct(responded) };
}

/**
 * Воронка на основе истории переходов: считает, сколько откликов хотя бы
 * ОДНАЖДЫ побывали на каждом этапе — отклик, который дошёл до "Интервью"
 * и потом ушёл на "Отклонён", всё равно засчитывается на этапе "Интервью".
 * Это честнее для анализа "что работает", чем срез по текущему этапу.
 */
export function calculateFunnelFromHistory(
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[]
): Record<string, number> {
  const reachedByApplication = new Map<string, Set<string>>();

  for (const entry of history) {
    const set = reachedByApplication.get(entry.application_id) ?? new Set<string>();
    set.add(entry.to_stage_id);
    reachedByApplication.set(entry.application_id, set);
  }

  const counts: Record<string, number> = {};
  for (const stage of stages) counts[stage.id] = 0;

  for (const reached of reachedByApplication.values()) {
    for (const stageId of reached) {
      if (stageId in counts) counts[stageId] += 1;
    }
  }

  return counts;
}

// ============================================================
// Время до ответа
// ============================================================

/**
 * Счётчики по текущему этапу для компактного отображения в шапке —
 * сколько откликов сейчас в каждой стадии.
 */
export type HeaderStageCounts = Record<string, number>;

export function calculateHeaderStageCounts(applications: Application[], stages: Stage[]): HeaderStageCounts {
  const counts: HeaderStageCounts = {};
  for (const stage of stages) counts[stage.id] = 0;
  for (const app of applications) {
    if (app.stage_id in counts) counts[app.stage_id] += 1;
  }
  return counts;
}

/**
 * Среднее/медианное количество дней от подачи отклика до первого
 * изменения этапа (любого). Возвращает null, если данных недостаточно
 * (нет ни одного перехода).
 */
function collectDaysToFirstResponse(history: ApplicationStatusHistoryEntry[]): number[] {
  const byApplication = new Map<string, ApplicationStatusHistoryEntry[]>();
  for (const entry of history) {
    const list = byApplication.get(entry.application_id) ?? [];
    list.push(entry);
    byApplication.set(entry.application_id, list);
  }

  const daysToResponse: number[] = [];

  for (const entries of byApplication.values()) {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    );
    const createdEntry = sorted.find((e) => e.from_stage_id === null);
    const firstResponse = sorted.find((e) => e.from_stage_id !== null);

    if (createdEntry && firstResponse) {
      const days =
        (new Date(firstResponse.changed_at).getTime() - new Date(createdEntry.changed_at).getTime()) /
        (1000 * 60 * 60 * 24);
      daysToResponse.push(days);
    }
  }

  return daysToResponse;
}

export function calculateAverageDaysToFirstResponse(
  history: ApplicationStatusHistoryEntry[]
): number | null {
  const daysToResponse = collectDaysToFirstResponse(history);
  if (daysToResponse.length === 0) return null;
  const avg = daysToResponse.reduce((sum, d) => sum + d, 0) / daysToResponse.length;
  return Math.round(avg * 10) / 10; // округление до 1 знака после запятой
}

/**
 * Медиана дней до первого ответа — устойчивее среднего к редким выбросам
 * (например, один отклик, на который ответили через 2 месяца, сильно
 * искажает среднее, но почти не влияет на медиану).
 */
export function calculateMedianDaysToFirstResponse(
  history: ApplicationStatusHistoryEntry[]
): number | null {
  const daysToResponse = collectDaysToFirstResponse(history).sort((a, b) => a - b);
  if (daysToResponse.length === 0) return null;
  const mid = Math.floor(daysToResponse.length / 2);
  const median =
    daysToResponse.length % 2 !== 0 ? daysToResponse[mid] : (daysToResponse[mid - 1] + daysToResponse[mid]) / 2;
  return Math.round(median * 10) / 10;
}

/**
 * Компании, которые ни разу не ответили: отклик всё ещё на первом этапе
 * (минимальный position среди стадий пользователя), в истории только
 * запись о создании, и прошло больше thresholdDays дней.
 */
export interface SilentCompany {
  company: string;
  days: number;
  applicationId: string;
}

export function calculateSilentCompanies(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[],
  thresholdDays = 14
): SilentCompany[] {
  const firstStage = getFirstStage(stages);
  if (!firstStage) return [];

  const historyCountByApp = new Map<string, number>();
  for (const h of history) {
    historyCountByApp.set(h.application_id, (historyCountByApp.get(h.application_id) ?? 0) + 1);
  }

  const now = new Date();
  const results: SilentCompany[] = [];

  for (const app of applications) {
    if (app.stage_id !== firstStage.id || !app.applied_date) continue;
    const historyCount = historyCountByApp.get(app.id) ?? 0;
    if (historyCount > 1) continue; // был хотя бы один переход этапа — не тишина

    const applied = new Date(app.applied_date);
    const days = Math.floor(
      (now.setHours(0, 0, 0, 0) - applied.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
    );
    if (days >= thresholdDays) {
      results.push({ company: app.company || 'Без названия', days, applicationId: app.id });
    }
  }

  return results.sort((a, b) => b.days - a.days);
}

/** Компании, на которые откликались больше одного раза. */
export interface RepeatCompany {
  company: string;
  count: number;
}

export function calculateRepeatCompanies(applications: Application[]): RepeatCompany[] {
  const counts = new Map<string, number>();
  for (const app of applications) {
    const name = app.company.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count);
}

// ============================================================
// Разбивка по дню недели / времени суток / источнику
// ============================================================

const DAY_OF_WEEK_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

export interface GroupedConversion {
  /** Ключ группы — например "Пн" для дня недели, "Утро" для времени суток, или сам источник */
  label: string;
  total: number;
  reachedInterviewOrBetter: number;
  /** % откликов в этой группе, покинувших первый этап (получивших любое движение) */
  conversionRate: number;
}

/**
 * "Хорошие" этапы — не первый (там все стартуют) и не "проигрышный"
 * (auto_archive). Переиспользуется во всех метриках конверсии ниже, чтобы
 * определение "реального прогресса" было одинаковым везде.
 */
function getGoodStageIds(stages: Stage[]): Set<string> {
  const firstStage = getFirstStage(stages);
  return new Set(stages.filter((s) => (!firstStage || s.id !== firstStage.id) && !s.auto_archive).map((s) => s.id));
}

function buildReachedSetByApplication(history: ApplicationStatusHistoryEntry[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const entry of history) {
    const set = map.get(entry.application_id) ?? new Set<string>();
    set.add(entry.to_stage_id);
    map.set(entry.application_id, set);
  }
  return map;
}

function reachedGenuineProgress(app: Application, reachedSet: Set<string> | undefined, goodStageIds: Set<string>): boolean {
  return (reachedSet && [...reachedSet].some((id) => goodStageIds.has(id))) || goodStageIds.has(app.stage_id);
}

function buildGroupedConversion(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[],
  groupKeyFn: (app: Application) => string | null
): GroupedConversion[] {
  const goodStageIds = getGoodStageIds(stages);
  const reachedSetByApplication = buildReachedSetByApplication(history);

  const groups = new Map<string, { total: number; reached: number }>();

  for (const app of applications) {
    const key = groupKeyFn(app);
    if (key === null) continue;

    const group = groups.get(key) ?? { total: 0, reached: 0 };
    group.total += 1;

    if (reachedGenuineProgress(app, reachedSetByApplication.get(app.id), goodStageIds)) {
      group.reached += 1;
    }

    groups.set(key, group);
  }

  return Array.from(groups.entries())
    .map(([label, { total, reached }]) => ({
      label,
      total,
      reachedInterviewOrBetter: reached,
      conversionRate: total === 0 ? 0 : Math.round((reached / total) * 100),
    }))
    .sort((a, b) => b.total - a.total);
}

/** Парсит applied_at (timestamptz) в день недели по локальной таймзоне (0 = Пн). */
function getDayOfWeekLabel(appliedAt: string): string {
  const date = new Date(appliedAt);
  const jsDay = date.getDay(); // 0 = Sun ... 6 = Sat
  const mondayFirst = (jsDay + 6) % 7;
  return DAY_OF_WEEK_LABELS[mondayFirst];
}

/**
 * Конверсия по дню недели отклика. Использует applied_at (точное время) —
 * если для какого-то отклика оно не заполнено (старые записи до введения
 * этого поля), такой отклик пропускается, а не считается ошибочно.
 */
export function calculateConversionByDayOfWeek(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[]
): GroupedConversion[] {
  return buildGroupedConversion(applications, history, stages, (app) =>
    app.applied_at ? getDayOfWeekLabel(app.applied_at) : null
  );
}

/**
 * Конверсия по часу отклика (0–23, локальное время устройства на момент
 * подачи). Возвращает все 24 часа, даже если откликов в какой-то час не
 * было (total=0) — это нужно, чтобы UI мог нарисовать полный график 00–24,
 * а не только часы, где что-то произошло.
 */
export function calculateConversionByHour(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[]
): GroupedConversion[] {
  const grouped = buildGroupedConversion(applications, history, stages, (app) =>
    app.applied_at ? String(new Date(app.applied_at).getHours()).padStart(2, '0') : null
  );

  const byHour = new Map(grouped.map((g) => [g.label, g]));
  const allHours: GroupedConversion[] = [];
  for (let h = 0; h < 24; h++) {
    const label = String(h).padStart(2, '0');
    allHours.push(byHour.get(label) ?? { label, total: 0, reachedInterviewOrBetter: 0, conversionRate: 0 });
  }
  return allHours;
}

/** Конверсия по источнику отклика (hh.ru, LinkedIn и т.д.). Пустой source пропускается. */
export function calculateConversionBySource(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[]
): GroupedConversion[] {
  return buildGroupedConversion(applications, history, stages, (app) =>
    app.source.trim() ? app.source.trim() : null
  );
}

/** Конверсия по использованной версии резюме (resume_version_id). Без версии — пропускается. */
export function calculateConversionByResumeVersion(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[],
  versionNameById: Map<string, string>
): GroupedConversion[] {
  return buildGroupedConversion(applications, history, stages, (app) =>
    app.resume_version_id ? versionNameById.get(app.resume_version_id) ?? null : null
  );
}

// ============================================================
// Пошаговая воронка, время на этапах, скорость, тренд, тепловая карта,
// разбивка по этапам, зарплатные вилки, прогноз, частотность слов
// ============================================================

/** "Путевые" этапы — то есть обычная линейная последовательность без "проигрышных" (auto_archive) веток. */
function getPathStages(stages: Stage[]): Stage[] {
  return [...stages].filter((s) => !s.auto_archive).sort((a, b) => a.position - b.position);
}

export interface SequentialFunnelStep {
  fromStageId: string;
  toStageId: string;
  fromLabel: string;
  toLabel: string;
  fromCount: number;
  toCount: number;
  conversionRate: number;
  dropOffCount: number;
}

/**
 * В отличие от calculateFunnelFromHistory (сколько ВСЕГО когда-либо
 * дошло до каждого этапа от общего числа), здесь — честный шаг за шагом
 * drop-off: из тех, кто дошёл до этапа N, сколько пошли дальше до N+1.
 * Считаем только по "путевым" этапам (без auto_archive) — проигрышные
 * этапы это не следующий шаг воронки, а выход из неё.
 */
export function calculateSequentialFunnel(
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[]
): SequentialFunnelStep[] {
  const pathStages = getPathStages(stages);
  if (pathStages.length < 2) return [];

  const reachedByApplication = buildReachedSetByApplication(history);
  const steps: SequentialFunnelStep[] = [];

  for (let i = 0; i < pathStages.length - 1; i++) {
    const from = pathStages[i];
    const to = pathStages[i + 1];

    let fromCount = 0;
    let toCount = 0;
    for (const reached of reachedByApplication.values()) {
      if (reached.has(from.id)) {
        fromCount += 1;
        if (reached.has(to.id)) toCount += 1;
      }
    }

    steps.push({
      fromStageId: from.id,
      toStageId: to.id,
      fromLabel: from.name,
      toLabel: to.name,
      fromCount,
      toCount,
      conversionRate: fromCount === 0 ? 0 : Math.round((toCount / fromCount) * 100),
      dropOffCount: fromCount - toCount,
    });
  }

  return steps;
}

export interface StageDuration {
  stageId: string;
  stageName: string;
  avgDays: number | null;
  medianDays: number | null;
  sampleSize: number;
}

/**
 * Сколько дней отклик реально провёл на каждом этапе до перехода дальше.
 * Считаем только ЗАВЕРШЁННЫЕ пребывания (есть следующий переход) — те,
 * что ещё висят на этапе прямо сейчас, не включаем: их длительность
 * ещё не известна, включение занизило бы честную статистику.
 */
export function calculateStageDurations(
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[]
): StageDuration[] {
  const byApplication = new Map<string, ApplicationStatusHistoryEntry[]>();
  for (const entry of history) {
    const list = byApplication.get(entry.application_id) ?? [];
    list.push(entry);
    byApplication.set(entry.application_id, list);
  }

  const durationsByStage = new Map<string, number[]>();

  for (const entries of byApplication.values()) {
    const sorted = [...entries].sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
    for (let i = 0; i < sorted.length - 1; i++) {
      const stageId = sorted[i].to_stage_id;
      const days =
        (new Date(sorted[i + 1].changed_at).getTime() - new Date(sorted[i].changed_at).getTime()) /
        (1000 * 60 * 60 * 24);
      const list = durationsByStage.get(stageId) ?? [];
      list.push(days);
      durationsByStage.set(stageId, list);
    }
  }

  return stages.map((stage) => {
    const list = (durationsByStage.get(stage.id) ?? []).sort((a, b) => a - b);
    if (list.length === 0) {
      return { stageId: stage.id, stageName: stage.name, avgDays: null, medianDays: null, sampleSize: 0 };
    }
    const avg = list.reduce((sum, d) => sum + d, 0) / list.length;
    const mid = Math.floor(list.length / 2);
    const median = list.length % 2 !== 0 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
    return {
      stageId: stage.id,
      stageName: stage.name,
      avgDays: Math.round(avg * 10) / 10,
      medianDays: Math.round(median * 10) / 10,
      sampleSize: list.length,
    };
  });
}

export interface FunnelVelocity {
  targetStageName: string;
  avgDays: number | null;
  medianDays: number | null;
  sampleSize: number;
}

/**
 * Скорость прохождения всей воронки целиком — от подачи отклика до
 * последнего "путевого" этапа (обычно "Оффер", если пользователь не
 * переименовал/не переставил этапы). Не про отдельный этап, а про весь
 * путь целиком.
 */
export function calculateFunnelVelocity(
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[]
): FunnelVelocity | null {
  const pathStages = getPathStages(stages);
  const target = pathStages[pathStages.length - 1];
  if (!target) return null;

  const byApplication = new Map<string, ApplicationStatusHistoryEntry[]>();
  for (const entry of history) {
    const list = byApplication.get(entry.application_id) ?? [];
    list.push(entry);
    byApplication.set(entry.application_id, list);
  }

  const days: number[] = [];
  for (const entries of byApplication.values()) {
    const sorted = [...entries].sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
    const created = sorted.find((e) => e.from_stage_id === null);
    const reachedTarget = sorted.find((e) => e.to_stage_id === target.id);
    if (created && reachedTarget) {
      days.push(
        (new Date(reachedTarget.changed_at).getTime() - new Date(created.changed_at).getTime()) / (1000 * 60 * 60 * 24)
      );
    }
  }

  if (days.length === 0) return { targetStageName: target.name, avgDays: null, medianDays: null, sampleSize: 0 };

  const sorted = [...days].sort((a, b) => a - b);
  const avg = sorted.reduce((sum, d) => sum + d, 0) / sorted.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return {
    targetStageName: target.name,
    avgDays: Math.round(avg * 10) / 10,
    medianDays: Math.round(median * 10) / 10,
    sampleSize: sorted.length,
  };
}

function getIsoWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export interface WeeklyTrendPoint {
  weekLabel: string;
  total: number;
  conversionRate: number;
}

/** Динамика конверсии по неделям — растёт или падает эффективность со временем, не только срез "за весь период". */
export function calculateWeeklyConversionTrend(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[]
): WeeklyTrendPoint[] {
  const goodStageIds = getGoodStageIds(stages);
  const reachedSetByApplication = buildReachedSetByApplication(history);

  const buckets = new Map<string, { total: number; reached: number }>();
  for (const app of applications) {
    if (!app.applied_date) continue;
    const key = getIsoWeekKey(app.applied_date);
    const bucket = buckets.get(key) ?? { total: 0, reached: 0 };
    bucket.total += 1;
    if (reachedGenuineProgress(app, reachedSetByApplication.get(app.id), goodStageIds)) bucket.reached += 1;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekLabel, { total, reached }]) => ({
      weekLabel,
      total,
      conversionRate: total === 0 ? 0 : Math.round((reached / total) * 100),
    }));
}

export interface HeatmapCell {
  day: string;
  hour: string;
  total: number;
  conversionRate: number;
}

const HEATMAP_DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

/** Сетка день недели × час отклика — объединяет то, что раньше было двумя отдельными графиками, в одну картину. */
export function calculateConversionHeatmap(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[]
): HeatmapCell[] {
  const goodStageIds = getGoodStageIds(stages);
  const reachedSetByApplication = buildReachedSetByApplication(history);

  const cells = new Map<string, { total: number; reached: number }>();
  for (const app of applications) {
    if (!app.applied_at) continue;
    const date = new Date(app.applied_at);
    const day = HEATMAP_DAY_LABELS[(date.getDay() + 6) % 7];
    const hour = String(date.getHours()).padStart(2, '0');
    const key = `${day}|${hour}`;
    const cell = cells.get(key) ?? { total: 0, reached: 0 };
    cell.total += 1;
    if (reachedGenuineProgress(app, reachedSetByApplication.get(app.id), goodStageIds)) cell.reached += 1;
    cells.set(key, cell);
  }

  const result: HeatmapCell[] = [];
  for (const day of HEATMAP_DAY_LABELS) {
    for (let h = 0; h < 24; h++) {
      const hour = String(h).padStart(2, '0');
      const cell = cells.get(`${day}|${hour}`) ?? { total: 0, reached: 0 };
      result.push({
        day,
        hour,
        total: cell.total,
        conversionRate: cell.total === 0 ? 0 : Math.round((cell.reached / cell.total) * 100),
      });
    }
  }
  return result;
}

export interface StageBreakdownGroup {
  label: string;
  total: number;
  stageCounts: Record<string, number>; // stageId -> сколько раз откликов из этой группы ХОТЯ БЫ РАЗ дошли до этого этапа
}

/**
 * Мини-воронка внутри каждой группы (источника/версии резюме) — не одно
 * число "конверсия", а сколько дошло до КАЖДОГО этапа отдельно. Так видно,
 * например, что источник А даёт много интервью, но мало офферов, а
 * источник Б — наоборот, реже доходит до интервью, зато почти всегда
 * закрывается оффером после него.
 */
export function calculateStageBreakdownByGroup(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[],
  groupKeyFn: (app: Application) => string | null
): StageBreakdownGroup[] {
  const reachedSetByApplication = buildReachedSetByApplication(history);
  const groups = new Map<string, { total: number; stageCounts: Record<string, number> }>();

  for (const app of applications) {
    const key = groupKeyFn(app);
    if (key === null) continue;

    const group = groups.get(key) ?? { total: 0, stageCounts: Object.fromEntries(stages.map((s) => [s.id, 0])) };
    group.total += 1;

    const reachedSet = reachedSetByApplication.get(app.id) ?? new Set<string>();
    const everReached = new Set([...reachedSet, app.stage_id]);
    for (const stageId of everReached) {
      if (stageId in group.stageCounts) group.stageCounts[stageId] += 1;
    }

    groups.set(key, group);
  }

  return Array.from(groups.entries())
    .map(([label, { total, stageCounts }]) => ({ label, total, stageCounts }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Грубый парсер зарплаты из свободного текста ("150 000 ₽ за месяц",
 * "from 100 000 up to 150 000 ₽ per month", "напр. 150-200к"). Берёт все
 * похожие на зарплату числа (10 000–10 000 000) и усредняет диапазон, если
 * их несколько. Не идеально для всех форматов — просто лучшее разумное
 * приближение по тексту, который реально встречается в отклике.
 */
function parseSalaryValue(salary: string): number | null {
  const normalized = salary.replace(/(\d)\s(?=\d)/g, '$1'); // "150 000" -> "150000"
  const matches = normalized.match(/\d{4,8}/g);
  if (!matches) return null;
  const numbers = matches.map((n) => parseInt(n, 10)).filter((n) => n >= 10000 && n <= 10000000);
  if (numbers.length === 0) return null;
  if (numbers.length === 1) return numbers[0];
  return Math.round((Math.min(...numbers) + Math.max(...numbers)) / 2);
}

const SALARY_BUCKETS = [
  { max: 100000, label: 'до 100к' },
  { max: 150000, label: '100–150к' },
  { max: 200000, label: '150–200к' },
  { max: 300000, label: '200–300к' },
  { max: Infinity, label: '300к+' },
];

/** Конверсия по зарплатной вилке в отклике — не завышены ли ожидания. Считает, что валюта — рубли (самый частый случай для этого трекера). */
export function calculateConversionBySalaryRange(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[]
): GroupedConversion[] {
  const grouped = buildGroupedConversion(applications, history, stages, (app) => {
    const value = parseSalaryValue(app.salary);
    if (value === null) return null;
    return SALARY_BUCKETS.find((b) => value <= b.max)?.label ?? null;
  });

  const order = SALARY_BUCKETS.map((b) => b.label);
  return [...grouped].sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
}

export interface OfferForecast {
  targetStageName: string;
  probabilityPercent: number;
  estimatedApplicationsNeeded: number | null;
}

/** При текущей конверсии до финального этапа — сколько в среднем откликов нужно на один такой результат. */
export function calculateOfferForecast(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[]
): OfferForecast | null {
  const pathStages = getPathStages(stages);
  const target = pathStages[pathStages.length - 1];
  if (!target || applications.length === 0) return null;

  const funnelHistory = calculateFunnelFromHistory(history, stages);
  const reachedTarget = funnelHistory[target.id] ?? 0;
  const probability = reachedTarget / applications.length;

  return {
    targetStageName: target.name,
    probabilityPercent: Math.round(probability * 100),
    estimatedApplicationsNeeded: probability > 0 ? Math.ceil(1 / probability) : null,
  };
}

const RU_STOP_WORDS = new Set([
  'и', 'в', 'во', 'на', 'с', 'со', 'по', 'для', 'от', 'до', 'из', 'за', 'о', 'об', 'к', 'ко', 'у', 'а', 'но', 'или',
  'что', 'как', 'это', 'этот', 'эта', 'эти', 'то', 'вы', 'мы', 'он', 'она', 'они', 'вас', 'нас', 'их', 'его', 'её',
  'быть', 'будет', 'будут', 'может', 'можно', 'нужно', 'также', 'при', 'если', 'уже', 'все', 'весь', 'вся', 'более',
  'наш', 'наша', 'наши', 'ваш', 'который', 'которые', 'которая', 'года', 'год', 'лет', '的',
  'the', 'and', 'for', 'with', 'you', 'your', 'are', 'this', 'that', 'will', 'from', 'have', 'has',
]);

function tokenizeVacancyText(text: string): string[] {
  return text.toLowerCase().match(/[а-яёa-z]{3,}/g) ?? [];
}

export interface WordFrequencyEntry {
  word: string;
  countInGood: number;
  countTotal: number;
  /** Во сколько раз слово встречается в "успешных" описаниях чаще, чем в среднем по всем — 1.0 = как в среднем, 2.0 = вдвое чаще. */
  liftScore: number;
}

/**
 * Частотность слов в текстах вакансий — какие слова/навыки непропорционально
 * часто встречаются у откликов, где был реальный прогресс (интервью/оффер),
 * по сравнению со средней частотой по всем вакансиям. Требует, чтобы текст
 * описания реально сохранился (vacancy_description) — букмарклет пробует
 * его вытащить, но получается не всегда (например, если открыть страницу
 * не через букмарклет, а вручную ввести отклик).
 */
export function calculateVacancyWordFrequency(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[],
  minOccurrences = 3
): WordFrequencyEntry[] {
  const goodStageIds = getGoodStageIds(stages);
  const reachedSetByApplication = buildReachedSetByApplication(history);

  const withDescription = applications.filter((a) => a.vacancy_description && a.vacancy_description.trim());
  if (withDescription.length < 5) return []; // недостаточно описаний, чтобы делать выводы

  let goodDocs = 0;
  const countAll = new Map<string, number>();
  const countGood = new Map<string, number>();

  for (const app of withDescription) {
    const isGood = reachedGenuineProgress(app, reachedSetByApplication.get(app.id), goodStageIds);
    if (isGood) goodDocs += 1;

    const uniqueWords = new Set(
      tokenizeVacancyText(app.vacancy_description as string).filter((w) => !RU_STOP_WORDS.has(w))
    );
    for (const word of uniqueWords) {
      countAll.set(word, (countAll.get(word) ?? 0) + 1);
      if (isGood) countGood.set(word, (countGood.get(word) ?? 0) + 1);
    }
  }

  if (goodDocs === 0) return [];

  const totalDocs = withDescription.length;
  const results: WordFrequencyEntry[] = [];

  for (const [word, total] of countAll) {
    if (total < minOccurrences) continue;
    const good = countGood.get(word) ?? 0;
    const rateInGood = good / goodDocs;
    const rateOverall = total / totalDocs;
    const liftScore = rateOverall > 0 ? Math.round((rateInGood / rateOverall) * 100) / 100 : 0;
    results.push({ word, countInGood: good, countTotal: total, liftScore });
  }

  return results.sort((a, b) => b.liftScore - a.liftScore).slice(0, 20);
}

export interface HealthIndexResult {
  score: number;
  components: { label: string; value: number }[];
}

/**
 * Один составной показатель 0–100 — свод из трёх компонентов, каждый
 * виден отдельно рядом (не "чёрный ящик"): доля откликов с любым движением,
 * доля с реальным прогрессом, и грубая оценка скорости первого ответа
 * (эвристика: чем быстрее в среднем отвечают, тем выше балл — условная
 * шкала, не научный стандарт, просто ориентир "лучше/хуже, чем было").
 */
export function calculateHealthIndex(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[]
): HealthIndexResult | null {
  if (applications.length === 0) return null;

  const funnel = calculateConversionFunnel(applications, stages);
  const goodStageIds = getGoodStageIds(stages);
  const reachedSetByApplication = buildReachedSetByApplication(history);

  let genuineCount = 0;
  for (const app of applications) {
    if (reachedGenuineProgress(app, reachedSetByApplication.get(app.id), goodStageIds)) genuineCount += 1;
  }
  const genuineRate = Math.round((genuineCount / applications.length) * 100);

  const avgDays = calculateAverageDaysToFirstResponse(history);
  const timeScore = avgDays === null ? 50 : Math.max(0, Math.min(100, Math.round(100 - avgDays * 5)));

  const score = Math.round(funnel.responseRate * 0.4 + genuineRate * 0.4 + timeScore * 0.2);

  return {
    score,
    components: [
      { label: 'Доля откликов с любым движением', value: funnel.responseRate },
      { label: 'Доля с реальным прогрессом', value: genuineRate },
      { label: 'Скорость первого ответа (условная шкала)', value: timeScore },
    ],
  };
}

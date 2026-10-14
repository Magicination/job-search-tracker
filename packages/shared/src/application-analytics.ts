// Аналитика откликов: пошаговая воронка (drop-off), время на каждом этапе,
// разбивка по источнику и версии резюме. Цель — дать данные для ответа на
// вопрос "что реально работает", а не просто хранить статус.
//
// С переходом на собственные этапы канбана (Stage вместо жёсткого enum
// ApplicationStatus) все функции здесь принимают stages: Stage[] и
// работают по stage_id, а не по фиксированным полям applied/interview/
// offer/rejected. "Первый этап" (минимальный position) — это то, во что
// раньше упирался status==='applied': начальная точка воронки. Все функции
// по-прежнему чистые, не зависят от Supabase.

import type { Application, ApplicationStatusHistoryEntry, Stage } from './types';

function getFirstStage(stages: Stage[]): Stage | null {
  if (stages.length === 0) return null;
  return [...stages].sort((a, b) => a.position - b.position)[0];
}

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

// ============================================================
// Разбивка по источнику / версии резюме
// ============================================================

export interface GroupedConversion {
  /** Ключ группы — сам источник или название версии резюме */
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
// Пошаговая воронка и время на этапах
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
 * Честный шаг за шагом drop-off: из тех, кто дошёл до этапа N, сколько
 * пошли дальше до N+1 (а не "сколько всего когда-либо доходило до этапа").
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

// ============================================================
// Мини-воронка внутри группы
// ============================================================

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

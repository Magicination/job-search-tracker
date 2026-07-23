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

function buildGroupedConversion(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[],
  stages: Stage[],
  groupKeyFn: (app: Application) => string | null
): GroupedConversion[] {
  const firstStage = getFirstStage(stages);

  const reachedSetByApplication = new Map<string, Set<string>>();
  for (const entry of history) {
    const set = reachedSetByApplication.get(entry.application_id) ?? new Set<string>();
    set.add(entry.to_stage_id);
    reachedSetByApplication.set(entry.application_id, set);
  }

  const groups = new Map<string, { total: number; reached: number }>();

  for (const app of applications) {
    const key = groupKeyFn(app);
    if (key === null) continue;

    const group = groups.get(key) ?? { total: 0, reached: 0 };
    group.total += 1;

    const reachedSet = reachedSetByApplication.get(app.id);
    const movedBeyondFirstStage =
      (firstStage &&
        ((reachedSet && [...reachedSet].some((id) => id !== firstStage.id)) || app.stage_id !== firstStage.id)) ??
      false;
    if (movedBeyondFirstStage) {
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

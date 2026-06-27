// Аналитика откликов: воронка конверсии, время до первого ответа, разбивка
// по дню недели/времени суток/источнику. Цель — дать данные для ответа на
// вопрос "когда и как откликаться эффективнее", а не просто хранить статус.
//
// Все функции — чистые, принимают сырые записи applications +
// application_status_history и возвращают агрегаты. Не зависят от Supabase —
// можно покрыть тестами без БД.

import type { Application, ApplicationStatus, ApplicationStatusHistoryEntry } from './types';

// ============================================================
// Воронка конверсии
// ============================================================

export interface ConversionFunnel {
  applied: number;
  screen: number;
  interview: number;
  offer: number;
  rejected: number;
  /** % от applied, кто хотя бы раз дошёл до screen (включая тех, кто потом отклонён) */
  screenRate: number;
  /** % от applied, кто хотя бы раз дошёл до interview */
  interviewRate: number;
  /** % от applied, кто получил offer */
  offerRate: number;
}

/**
 * Считает воронку по ТЕКУЩЕМУ статусу каждого отклика (простой срез "что есть сейчас").
 * Для понимания "сколько вообще доходило до интервью, даже если потом отказали"
 * используйте calculateFunnelFromHistory — она смотрит на историю переходов,
 * а не только на финальное состояние.
 */
export function calculateConversionFunnel(applications: Application[]): ConversionFunnel {
  const total = applications.length;
  const counts: Record<ApplicationStatus, number> = {
    applied: 0,
    screen: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
  };
  for (const app of applications) {
    counts[app.status] += 1;
  }

  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  return {
    ...counts,
    screenRate: pct(counts.screen + counts.interview + counts.offer),
    interviewRate: pct(counts.interview + counts.offer),
    offerRate: pct(counts.offer),
  };
}

/**
 * Воронка на основе истории переходов: считает, сколько откликов хотя бы
 * ОДНАЖДЫ побывали в каждом статусе — отклик, который дошёл до interview
 * и потом был rejected, всё равно засчитывается в interview-этапе.
 * Это честнее для анализа "что работает", чем срез по текущему статусу,
 * где такой отклик выглядел бы просто как "rejected" без следа того,
 * что он реально дошёл до интервью.
 */
export function calculateFunnelFromHistory(
  history: ApplicationStatusHistoryEntry[]
): Record<ApplicationStatus, number> {
  const reachedByApplication = new Map<string, Set<ApplicationStatus>>();

  for (const entry of history) {
    const set = reachedByApplication.get(entry.application_id) ?? new Set<ApplicationStatus>();
    set.add(entry.to_status);
    reachedByApplication.set(entry.application_id, set);
  }

  const counts: Record<ApplicationStatus, number> = {
    applied: 0,
    screen: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
  };

  for (const reached of reachedByApplication.values()) {
    for (const status of reached) {
      counts[status] += 1;
    }
  }

  return counts;
}

// ============================================================
// Время до ответа
// ============================================================

/**
 * Среднее количество дней от подачи отклика (статус 'applied') до первого
 * изменения статуса (любого — screen/interview/rejected). Возвращает null,
 * если данных недостаточно (нет ни одного перехода).
 */
export function calculateAverageDaysToFirstResponse(
  history: ApplicationStatusHistoryEntry[]
): number | null {
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
    const appliedEntry = sorted.find((e) => e.from_status === null);
    const firstResponse = sorted.find((e) => e.from_status !== null);

    if (appliedEntry && firstResponse) {
      const days =
        (new Date(firstResponse.changed_at).getTime() - new Date(appliedEntry.changed_at).getTime()) /
        (1000 * 60 * 60 * 24);
      daysToResponse.push(days);
    }
  }

  if (daysToResponse.length === 0) return null;
  const avg = daysToResponse.reduce((sum, d) => sum + d, 0) / daysToResponse.length;
  return Math.round(avg * 10) / 10; // округление до 1 знака после запятой
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
  /** % откликов в этой группе, дошедших до интервью или дальше */
  conversionRate: number;
}

function buildGroupedConversion(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[],
  groupKeyFn: (app: Application) => string | null
): GroupedConversion[] {
  const reachedSetByApplication = new Map<string, Set<ApplicationStatus>>();
  for (const entry of history) {
    const set = reachedSetByApplication.get(entry.application_id) ?? new Set<ApplicationStatus>();
    set.add(entry.to_status);
    reachedSetByApplication.set(entry.application_id, set);
  }

  const groups = new Map<string, { total: number; reached: number }>();

  for (const app of applications) {
    const key = groupKeyFn(app);
    if (key === null) continue;

    const group = groups.get(key) ?? { total: 0, reached: 0 };
    group.total += 1;

    const reachedSet = reachedSetByApplication.get(app.id);
    const reachedGoodStage =
      reachedSet?.has('interview') ||
      reachedSet?.has('offer') ||
      app.status === 'interview' ||
      app.status === 'offer';
    if (reachedGoodStage) {
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
  history: ApplicationStatusHistoryEntry[]
): GroupedConversion[] {
  return buildGroupedConversion(applications, history, (app) =>
    app.applied_at ? getDayOfWeekLabel(app.applied_at) : null
  );
}

export type TimeOfDayBucket = 'Утро (6–12)' | 'День (12–18)' | 'Вечер (18–24)' | 'Ночь (0–6)';

function getTimeOfDayBucket(appliedAt: string): TimeOfDayBucket {
  const hour = new Date(appliedAt).getHours();
  if (hour >= 6 && hour < 12) return 'Утро (6–12)';
  if (hour >= 12 && hour < 18) return 'День (12–18)';
  if (hour >= 18 && hour < 24) return 'Вечер (18–24)';
  return 'Ночь (0–6)';
}

/** Конверсия по времени суток отклика. Та же оговорка про applied_at, что выше. */
export function calculateConversionByTimeOfDay(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[]
): GroupedConversion[] {
  return buildGroupedConversion(applications, history, (app) =>
    app.applied_at ? getTimeOfDayBucket(app.applied_at) : null
  );
}

/** Конверсия по источнику отклика (hh.ru, LinkedIn и т.д.). Пустой source пропускается. */
export function calculateConversionBySource(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[]
): GroupedConversion[] {
  return buildGroupedConversion(applications, history, (app) =>
    app.source.trim() ? app.source.trim() : null
  );
}

/** Конверсия по использованной версии резюме (resume_version_id). Без версии — пропускается. */
export function calculateConversionByResumeVersion(
  applications: Application[],
  history: ApplicationStatusHistoryEntry[],
  versionNameById: Map<string, string>
): GroupedConversion[] {
  return buildGroupedConversion(applications, history, (app) =>
    app.resume_version_id ? versionNameById.get(app.resume_version_id) ?? null : null
  );
}

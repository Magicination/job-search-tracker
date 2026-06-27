// Расчёт streak (дней подряд) — см. 04-features-logic.md, раздел "Расчёт streak".
//
// Определение: streak — количество последовательных дней (включая сегодня),
// в каждый из которых пользователь выполнил хотя бы одну задачу.
//
// Нюанс: если на сегодня пока нет отметок в daily_history (или tasks_completed = 0),
// это НЕ должно немедленно обнулять streak — день ещё не закончился.
// MVP-вариант (принятый здесь): считать streak по полностью прошедшим дням + сегодня,
// если сегодня уже есть хотя бы одна отметка. Если на сегодня пока пусто —
// показываем streak за вчера и более ранние дни как "текущий", без обнуления.

import { addDaysToLocalDateString, getTodayLocal } from './date-utils';

export interface DailyHistoryEntry {
  day: string; // YYYY-MM-DD
  tasks_completed: number;
}

/**
 * @param history Записи daily_history пользователя (порядок не важен, ищем по day).
 * @param today Опционально — переопределить "сегодня" (для тестов). По умолчанию текущая локальная дата.
 */
export function calculateStreak(
  history: DailyHistoryEntry[],
  today: string = getTodayLocal()
): number {
  const byDay = new Map<string, number>();
  for (const entry of history) {
    byDay.set(entry.day, entry.tasks_completed);
  }

  let streak = 0;
  let currentDate = today;

  // Если на сегодня пока нет отметок — не наказываем пользователя за то,
  // что день не закончился: пропускаем сегодня и продолжаем счёт с вчера.
  const todayCount = byDay.get(today) ?? 0;
  if (todayCount <= 0) {
    currentDate = addDaysToLocalDateString(today, -1);
  }

  while (true) {
    const count = byDay.get(currentDate);
    if (count !== undefined && count > 0) {
      streak += 1;
      currentDate = addDaysToLocalDateString(currentDate, -1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Сумма выполненных задач за последние 7 календарных дней (включая сегодня),
 * скользящее окно — НЕ привязано к календарным неделям.
 * См. 04-features-logic.md, раздел "Расчёт задач за неделю".
 */
export function calculateWeekTotal(
  history: DailyHistoryEntry[],
  today: string = getTodayLocal()
): number {
  const sixDaysAgo = addDaysToLocalDateString(today, -6);
  return history
    .filter((entry) => entry.day >= sixDaysAgo && entry.day <= today)
    .reduce((sum, entry) => sum + entry.tasks_completed, 0);
}

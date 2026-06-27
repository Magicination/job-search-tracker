// Прогресс по обучению и оценка занятых часов недельного графика.
// См. 04-features-logic.md, разделы "Прогресс-бары обучения" и
// "Расчёт занятых часов в недельном графике".

import type { ScheduleSlot } from './types';

/**
 * Процент прохождения цели обучения, округлённый до целого, ограниченный сверху 100%.
 * Если goal_hours <= 0, возвращает 0 (защита от деления на ноль).
 */
export function calculateProgressPercent(hours: number, goalHours: number): number {
  if (goalHours <= 0) return 0;
  const raw = (hours / goalHours) * 100;
  return Math.round(Math.min(100, raw));
}

/**
 * Безопасное изменение часов на ±1 (или произвольный delta), не позволяющее
 * значению уйти в отрицательное число. Использовать перед отправкой update в Supabase.
 */
export function applyHoursDelta(currentHours: number, delta: number): number {
  return Math.max(0, currentHours + delta);
}

/**
 * Множитель часов на один занятый блок графика (утро/день/вечер).
 * Приближение по умолчанию — один блок ≈ 2.5 часа активной работы.
 * В UI это значение должно быть явно подписано как «≈» (примерно), не как точный расчёт.
 */
export const HOURS_PER_SLOT = 2.5;

/**
 * Оценка занятых часов недели по шаблону графика — чисто информативное число,
 * не привязанное к реальным отметкам выполнения задач.
 */
export function calculateBusyHoursPerWeek(slots: ScheduleSlot[]): number {
  const busySlots = slots.filter(
    (slot) => slot.slot_type !== 'empty' && slot.slot_type !== 'rest'
  );
  return busySlots.length * HOURS_PER_SLOT;
}

import type { Application } from './types';

/** Константы debounce для всех текстовых полей (500ms) */
export const DEBOUNCE_MS = 500;

/**
 * Обновление поля с debounce — универсальный паттерн.
 * 
 * @param id - ID записи
 * @param field - имя поля из keyof Application
 * @param value - новое значение
 * @returns Promise<boolean> — true если сохранение прошло успешно
 */
export async function updateApplicationFieldDebounced(
  id: string,
  field: keyof Application,
  value: Application[keyof Application]
): Promise<boolean> {
  // UI-обновление сразу (оптимистичное)
  console.log(`[debounce] UI update for ${id}.${field}:`, value);

  // Сохранение через delay
  await new Promise((res) => setTimeout(res, DEBOUNCE_MS));

  console.log(`[debounce] Saving to DB for ${id}.${field}:`, value);
  
  // TODO: заменить на реальный supabase call при переносе в hook
  return true;
}

/**
 * Обновление даты отклика — отдельная утилита (дата/время не связаны)
 */
export async function updateAppliedDateDebounced(
  id: string,
  newDate: string | null,
  appliedAt?: string | null
): Promise<boolean> {
  await new Promise((res) => setTimeout(res, 0)); // sync для даты
  console.log(`[date] Saving date for ${id}:`, newDate);
  return true;
}

/**
 * Обновление времени отклика — отдельная утилита
 */
export async function updateAppliedTimeDebounced(
  id: string,
  newTime: string | null
): Promise<boolean> {
  await new Promise((res) => setTimeout(res, DEBOUNCE_MS)); // debounced как текст
  console.log(`[time] Saving time for ${id}:`, newTime);
  return true;
}

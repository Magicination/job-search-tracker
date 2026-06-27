// Работа с датами в ЛОКАЛЬНОЙ таймзоне устройства пользователя.
//
// Важно: НЕ использовать `new Date().toISOString()` для получения "сегодня" —
// эта функция конвертирует в UTC и может "перепрыгнуть" дату вечером
// (например, в 23:00 по Москве toISOString() уже покажет следующий день UTC).
// См. 04-features-logic.md, раздел "Часовые пояса и даты".

/** Форматирует Date в YYYY-MM-DD используя ЛОКАЛЬНЫЕ компоненты даты (не UTC). */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Возвращает сегодняшнюю дату (локальную) в формате YYYY-MM-DD. */
export function getTodayLocal(): string {
  return toLocalDateString(new Date());
}

/** Парсит YYYY-MM-DD в Date-объект с временем 00:00 в локальной таймзоне. */
export function parseLocalDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Сдвигает дату (YYYY-MM-DD) на заданное количество дней (может быть отрицательным). */
export function addDaysToLocalDateString(dateStr: string, days: number): string {
  const date = parseLocalDateString(dateStr);
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}

/**
 * Возвращает индекс дня недели в формате схемы (0=понедельник ... 6=воскресенье),
 * в отличие от стандартного JS Date.getDay() (0=воскресенье ... 6=субота).
 */
export function getDayOfWeekMondayFirst(date: Date = new Date()): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const jsDay = date.getDay(); // 0=Sun ... 6=Sat
  return ((jsDay + 6) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

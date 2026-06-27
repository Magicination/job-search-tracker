// Дефолтные значения для сидирования нового пользователя.
// См. 01-data-model.md, раздел "Сиды (начальные данные при первом запуске пользователя)".
//
// Используется как референс для клиентской функции seedNewUser() и/или
// для сверки с Postgres-триггером в /supabase/migrations.

import type { DayOfWeek, SlotType, TaskCategory, TimeBlock } from './types';

export interface DefaultScheduleSlot {
  day_of_week: DayOfWeek;
  time_block: TimeBlock;
  slot_type: SlotType;
}

// День | Утро | День | Вечер — таблица из 01-data-model.md
export const DEFAULT_SCHEDULE_TEMPLATE: DefaultScheduleSlot[] = [
  { day_of_week: 0, time_block: 'morning', slot_type: 'job' }, // Пн
  { day_of_week: 0, time_block: 'afternoon', slot_type: 'sql' },
  { day_of_week: 0, time_block: 'evening', slot_type: 'eng' },

  { day_of_week: 1, time_block: 'morning', slot_type: 'job' }, // Вт
  { day_of_week: 1, time_block: 'afternoon', slot_type: 'sql' },
  { day_of_week: 1, time_block: 'evening', slot_type: 'rest' },

  { day_of_week: 2, time_block: 'morning', slot_type: 'job' }, // Ср
  { day_of_week: 2, time_block: 'afternoon', slot_type: 'eng' },
  { day_of_week: 2, time_block: 'evening', slot_type: 'case' },

  { day_of_week: 3, time_block: 'morning', slot_type: 'job' }, // Чт
  { day_of_week: 3, time_block: 'afternoon', slot_type: 'sql' },
  { day_of_week: 3, time_block: 'evening', slot_type: 'eng' },

  { day_of_week: 4, time_block: 'morning', slot_type: 'job' }, // Пт
  { day_of_week: 4, time_block: 'afternoon', slot_type: 'case' },
  { day_of_week: 4, time_block: 'evening', slot_type: 'rest' },

  { day_of_week: 5, time_block: 'morning', slot_type: 'eng' }, // Сб
  { day_of_week: 5, time_block: 'afternoon', slot_type: 'rest' },
  { day_of_week: 5, time_block: 'evening', slot_type: 'rest' },

  { day_of_week: 6, time_block: 'morning', slot_type: 'rest' }, // Вс
  { day_of_week: 6, time_block: 'afternoon', slot_type: 'rest' },
  { day_of_week: 6, time_block: 'evening', slot_type: 'rest' },
];

export const DEFAULT_STUDY_GOALS = {
  eng: 200,
  sql: 80,
} as const;

export interface DefaultTaskSeed {
  text: string;
  category: TaskCategory;
}

export const DEFAULT_DAILY_TASKS: DefaultTaskSeed[] = [
  { text: 'Откликнуться на 5 вакансий PM (удалённо)', category: 'job' },
  { text: '30 минут SQL-тренажёра', category: 'study' },
  { text: '20 минут английского (Speaking/listening)', category: 'eng' },
];

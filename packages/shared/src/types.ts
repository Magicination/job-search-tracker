// Типы, зеркалящие схему Supabase/Postgres из /supabase/migrations.
// Эти типы — источник истины для обоих клиентов (web и mobile).
// Если меняется SQL-схема, эти типы нужно обновить синхронно.

export type TaskCategory = 'job' | 'study' | 'eng';

export interface Task {
  id: string;
  user_id: string;
  day: string; // YYYY-MM-DD, локальная дата пользователя
  text: string;
  category: TaskCategory;
  done: boolean;
  created_at: string;
  done_at: string | null;
}

export type TimeBlock = 'morning' | 'afternoon' | 'evening';

export type SlotType = 'empty' | 'job' | 'sql' | 'eng' | 'case' | 'rest';

// 0 = понедельник ... 6 = воскресенье
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ScheduleSlot {
  id: string;
  user_id: string;
  day_of_week: DayOfWeek;
  time_block: TimeBlock;
  slot_type: SlotType;
}

import type { BadgeVariant } from './design-tokens';

/**
 * Этап канбана — раньше был жёсткий enum ApplicationStatus с 4
 * значениями, теперь свой набор строк-этапов на пользователя (название,
 * цвет, порядок). auto_archive=true — этап "проигрышный": отклик
 * остаётся на доске до конца дня, на следующий день лениво уходит в архив.
 */
export interface Stage {
  id: string;
  user_id: string;
  name: string;
  color: BadgeVariant;
  position: number;
  auto_archive: boolean;
  created_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  company: string;
  role: string;
  source: string;
  applied_date: string | null;
  applied_at: string | null; // точное время отклика (timestamptz), для анализа дня недели/времени суток
  stage_id: string;
  note: string;
  vacancy_url: string | null;
  company_id: string | null; // ссылка на запись в companies — заполняется автоматически по названию
  archived: boolean; // отклик скрыт из основной доски (вручную, или лениво — на след. день после auto_archive-этапа)
  rejected_at: string | null; // момент перехода на auto_archive-этап — до конца этого дня отклик ещё виден на доске
  resume_version_id: string | null; // ссылка на использованную версию резюме
  cover_letter_version_id: string | null; // ссылка на использованную версию сопроводительного
  salary: string; // свободный текст — диапазон/валюта вводятся пользователем как есть
  experience_required: string; // требуемый опыт по вакансии, свободный текст
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  user_id: string;
  name: string;
  url: string | null; // сайт компании — не путать с vacancy_url на конкретном отклике
  rating: number | null; // личный рейтинг 1-5, ставит сам пользователь
  note: string;
  created_at: string;
}

export interface ResumeVersion {
  id: string;
  user_id: string;
  name: string; // например "v2 — упор на SQL/аналитику"
  notes: string;
  file_url: string | null; // ручная ссылка (для совместимости со старыми записями)
  file_path: string | null; // путь в Supabase Storage bucket application-documents
  file_name: string; // оригинальное имя загруженного файла, для отображения
  created_at: string;
}

export interface ApplicationStatusHistoryEntry {
  id: string;
  user_id: string;
  application_id: string;
  from_stage_id: string | null; // null для самой первой записи
  to_stage_id: string;
  changed_at: string;
}

/** Тип для отображения истории статусов в мини-таймлайне */
export interface StatusHistoryPoint {
  from_stage_id: string | null;
  to_stage_id: string;
  changed_at: string;
}

export type StudyTrack = 'eng' | 'sql';

export interface StudyHours {
  id: string;
  user_id: string;
  track: StudyTrack;
  hours: number;
  goal_hours: number;
  updated_at: string;
}

export interface DailyNote {
  id: string;
  user_id: string;
  day: string;
  note: string;
  updated_at: string;
}

export interface DailyHistory {
  id: string;
  user_id: string;
  day: string;
  tasks_completed: number;
}

export type SharedResourceCategory =
  | 'job_boards'
  | 'internships'
  | 'sql_analytics'
  | 'english'
  | 'interview_prep'
  | 'other';

export interface SharedResource {
  id: string;
  user_id: string; // автор записи — видно всем, не только автору
  title: string;
  url: string;
  note: string;
  category: SharedResourceCategory;
  created_at: string;
}

export interface NotebookEntry {
  id: string;
  user_id: string;
  content: string;
  url: string | null;
  file_path: string | null;
  file_name: string | null;
  is_shared: boolean;
  created_at: string;
}

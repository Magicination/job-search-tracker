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

export type ApplicationStatus =
  | 'applied'
  | 'screen'
  | 'interview'
  | 'offer'
  | 'rejected';

export interface Application {
  id: string;
  user_id: string;
  company: string;
  role: string;
  source: string;
  applied_date: string | null;
  applied_at: string | null; // точное время отклика (timestamptz), для анализа дня недели/времени суток
  status: ApplicationStatus;
  note: string;
  resume_version_id: string | null; // ссылка на использованную версию резюме
  cover_letter_version_id: string | null; // ссылка на использованную версию сопроводительного
  salary: string; // свободный текст — диапазон/валюта вводятся пользователем как есть
  experience_required: string; // требуемый опыт по вакансии, свободный текст
  created_at: string;
  updated_at: string;
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

export interface CoverLetterVersion {
  id: string;
  user_id: string;
  name: string;
  notes: string;
  body_text: string; // текст письма, введённый напрямую (необязательно вместе с файлом)
  file_path: string | null;
  file_name: string;
  created_at: string;
}

export interface ApplicationStatusHistoryEntry {
  id: string;
  user_id: string;
  application_id: string;
  from_status: ApplicationStatus | null; // null для самой первой записи
  to_status: ApplicationStatus;
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

// Дизайн-токены из 00-overview.md.
// Используются как для генерации Tailwind-конфига (web), так и
// для NativeWind/styled-components (mobile) — единый источник правды.

export const COLORS = {
  bg: '#14181f',
  panel: '#1c222b',
  panel2: '#232a35',
  border: '#2e3744',
  borderSoft: '#262e3a',
  text: '#e7eaef',
  textDim: '#9aa5b3',
  textFaint: '#677084',

  accentAmber: '#e8a33d', // поиск работы / основной акцент / streak
  accentTeal: '#3fb88f', // обучение / SQL-аналитика
  accentBlue: '#5b8fd6', // английский
  accentCoral: '#dd6b4f', // кейсы/собеседования
} as const;

// Цвет акцента по категории задачи (job/study/eng) — для бейджей на "Сегодня".
export const TASK_CATEGORY_COLORS = {
  job: COLORS.accentAmber,
  study: COLORS.accentTeal,
  eng: COLORS.accentBlue,
} as const;

// Цвет по типу блока графика.
export const SLOT_TYPE_COLORS = {
  empty: COLORS.borderSoft,
  job: COLORS.accentAmber,
  sql: COLORS.accentTeal,
  eng: COLORS.accentBlue,
  case: COLORS.accentCoral,
  rest: COLORS.textFaint,
} as const;

// Цвет по статусу отклика — см. 02-screens-web.md, раздел /applications.
export const APPLICATION_STATUS_COLORS = {
  applied: COLORS.accentBlue,
  interview: COLORS.accentAmber,
  offer: COLORS.accentTeal,
  rejected: COLORS.accentCoral,
} as const;

// Вариант темы для компонента Badge — в отличие от *_COLORS выше (фиксированный
// hex для inline-стилей вроде графиков), эти значения резолвятся в CSS-классы,
// завязанные на var(--accent-*), и автоматически меняются между тёмной и
// светлой темой. См. apps/web/components/Badge.tsx.
export type BadgeVariant = 'amber' | 'teal' | 'blue' | 'coral' | 'neutral';

export const TASK_CATEGORY_BADGE_VARIANT: Record<'job' | 'study' | 'eng', BadgeVariant> = {
  job: 'amber',
  study: 'teal',
  eng: 'blue',
};

export const SLOT_TYPE_BADGE_VARIANT: Record<
  'empty' | 'job' | 'sql' | 'eng' | 'case' | 'rest',
  BadgeVariant
> = {
  empty: 'neutral',
  job: 'amber',
  sql: 'teal',
  eng: 'blue',
  case: 'coral',
  rest: 'neutral',
};

export const APPLICATION_STATUS_BADGE_VARIANT: Record<
  'applied' | 'interview' | 'offer' | 'rejected',
  BadgeVariant
> = {
  applied: 'blue',
  interview: 'amber',
  offer: 'teal',
  rejected: 'coral',
};

export const TASK_CATEGORY_LABELS = {
  job: 'Поиск работы',
  study: 'SQL / аналитика',
  eng: 'Английский',
} as const;

export const SLOT_TYPE_LABELS = {
  empty: 'Не назначено',
  job: 'Поиск работы',
  sql: 'SQL / аналитика',
  eng: 'Английский',
  case: 'Кейсы / собеседования',
  rest: 'Отдых',
} as const;

export const APPLICATION_STATUS_LABELS = {
  applied: 'Отправлен',
  interview: 'Интервью',
  offer: 'Оффер',
  rejected: 'Отклонён',
} as const;

export const DAY_OF_WEEK_LABELS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

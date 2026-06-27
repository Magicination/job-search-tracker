// Универсальный цветной бейдж — фон полупрозрачный, текст в цвете акцента,
// без градиентов и теней (приоритет на читаемость, см. 00-overview.md).
//
// Принимает variant (а не сырой hex-цвет) и резолвит его в Tailwind-класс,
// завязанный на CSS-переменную var(--accent-*) — те же переменные, что
// переопределяются в .light в globals.css. Если бы цвет передавался как
// фиксированный hex напрямую (как было раньше), бейдж не менялся бы вместе
// с темой и на светлом фоне становился бы нечитаемо бледным — яркие цвета,
// рассчитанные на тёмный фон, теряют контраст на белом.

import type { BadgeVariant } from '@job-search-tracker/shared';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  amber: 'text-accent-amber bg-accent-amber/15 border-accent-amber/40',
  teal: 'text-accent-teal bg-accent-teal/15 border-accent-teal/40',
  blue: 'text-accent-blue bg-accent-blue/15 border-accent-blue/40',
  coral: 'text-accent-coral bg-accent-coral/15 border-accent-coral/40',
  neutral: 'text-text-faint bg-panel-2 border-border',
};

export function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${VARIANT_CLASSES[variant]}`}
    >
      {label}
    </span>
  );
}

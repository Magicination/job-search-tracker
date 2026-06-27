// Циклическое переключение slot_type при клике на ячейку графика.
// Порядок зафиксирован в 02-screens-web.md, раздел /schedule:
// empty → job → sql → eng → case → rest → empty

import type { SlotType } from './types';

const SLOT_TYPE_CYCLE: SlotType[] = ['empty', 'job', 'sql', 'eng', 'case', 'rest'];

export function getNextSlotType(current: SlotType): SlotType {
  const idx = SLOT_TYPE_CYCLE.indexOf(current);
  const nextIdx = (idx + 1) % SLOT_TYPE_CYCLE.length;
  return SLOT_TYPE_CYCLE[nextIdx];
}

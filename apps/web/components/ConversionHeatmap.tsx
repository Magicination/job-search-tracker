'use client';

import { useState, Fragment } from 'react';
import type { HeatmapCell } from '@job-search-tracker/shared';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;
const HOURS_TO_SHOW = [0, 3, 6, 9, 12, 15, 18, 21]; // подписи через 3 часа, иначе не влезают

export function ConversionHeatmap({ data }: { data: HeatmapCell[] }) {
  const [active, setActive] = useState<HeatmapCell | null>(null);
  const maxTotal = Math.max(1, ...data.map((c) => c.total));

  function cellFor(day: string, hour: number) {
    const hourStr = String(hour).padStart(2, '0');
    return data.find((c) => c.day === day && c.hour === hourStr);
  }

  if (data.every((c) => c.total === 0)) {
    return <p className="text-xs text-text-faint">Нет данных — у откликов не сохранено точное время отправки.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: `28px repeat(24, minmax(10px, 1fr))` }}>
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="text-center text-[8px] text-text-faint">
              {HOURS_TO_SHOW.includes(h) ? h : ''}
            </div>
          ))}
          {DAYS.map((day) => (
            <Fragment key={day}>
              <div key={`${day}-label`} className="flex items-center text-[10px] text-text-faint">
                {day}
              </div>
              {Array.from({ length: 24 }, (_, h) => {
                const cell = cellFor(day, h);
                const total = cell?.total ?? 0;
                const intensity = total === 0 ? 0.06 : 0.15 + (total / maxTotal) * 0.85;
                const isActive = active?.day === day && active?.hour === String(h).padStart(2, '0');
                return (
                  <div
                    key={`${day}-${h}`}
                    onMouseEnter={() => cell && setActive(cell)}
                    onClick={() => setActive((prev) => (cell && prev?.day === cell.day && prev?.hour === cell.hour ? null : cell ?? null))}
                    className={`aspect-square rounded-[2px] ${isActive ? 'ring-1 ring-text' : ''}`}
                    style={{ backgroundColor: `color-mix(in srgb, var(--accent-blue) ${Math.round(intensity * 100)}%, transparent)` }}
                    title={total > 0 ? `${day} ${h}:00 — ${total} откл., конверсия ${cell?.conversionRate}%` : undefined}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-text-dim">
        {active
          ? `${active.day} ${active.hour}:00 — ${active.total} ${active.total === 1 ? 'отклик' : 'откликов'}, конверсия ${active.conversionRate}%`
          : 'Наведите на ячейку для деталей. Насыщенность — сколько откликов отправлено в этот час.'}
      </p>
    </div>
  );
}

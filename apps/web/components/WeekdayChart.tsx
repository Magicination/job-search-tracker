'use client';

import { useState } from 'react';
import type { GroupedConversion } from '@job-search-tracker/shared';

const WIDTH = 720;
const HEIGHT = 160;
const PADDING_BOTTOM = 24;
const BAR_GAP = 6;

export function WeekdayChart({ data }: { data: GroupedConversion[] }) {
  const [activeDay, setActiveDay] = useState<GroupedConversion | null>(null);

  const maxTotal = Math.max(1, ...data.map((d) => d.total));
  const barWidth = (WIDTH - BAR_GAP * (data.length - 1)) / data.length;
  const chartHeight = HEIGHT - PADDING_BOTTOM;

  const withResponses = data.filter((d) => d.total > 0);
  const bestDay =
    withResponses.length > 0
      ? withResponses.reduce((best, d) => (d.conversionRate > best.conversionRate ? d : best))
      : null;

  const displayed = activeDay ?? bestDay;

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Отклики по дню недели"
        onMouseLeave={() => setActiveDay(null)}
      >
        {data.map((day, i) => {
          const barHeight = (day.total / maxTotal) * (chartHeight - 4);
          const x = i * (barWidth + BAR_GAP);
          const y = chartHeight - barHeight;
          const opacity = day.total === 0 ? 0.15 : 0.35 + (day.conversionRate / 100) * 0.65;
          const isActive = activeDay?.label === day.label;

          return (
            <g key={day.label}>
              <rect
                x={x}
                y={day.total === 0 ? chartHeight - 2 : y}
                width={barWidth}
                height={day.total === 0 ? 2 : barHeight}
                fill="var(--accent-blue)"
                opacity={isActive ? 1 : opacity}
                rx={2}
                onMouseEnter={() => setActiveDay(day)}
                onClick={() => setActiveDay((prev) => (prev?.label === day.label ? null : day))}
                style={{ cursor: 'pointer' }}
              />
              <rect
                x={x}
                y={0}
                width={barWidth}
                height={chartHeight}
                fill="transparent"
                onMouseEnter={() => setActiveDay(day)}
                onClick={() => setActiveDay((prev) => (prev?.label === day.label ? null : day))}
                style={{ cursor: 'pointer' }}
              />
              <text x={x + barWidth / 2} y={HEIGHT - 6} textAnchor="middle" fontSize="10" fill="var(--text-faint)">
                {day.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-text-faint">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--accent-blue)', opacity: 0.35 }} />
          низкая конверсия
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--accent-blue)', opacity: 1 }} />
          высокая
        </div>
        {displayed ? (
          <span className="text-text-dim">
            {displayed.label}: {displayed.total} {displayed.total === 1 ? 'отклик' : 'откликов'}, конверсия{' '}
            {displayed.conversionRate}%
            {!activeDay && bestDay && ' (лучший день)'}
          </span>
        ) : (
          <span className="text-text-faint">Наведите или нажмите на столбик для деталей</span>
        )}
      </div>
    </div>
  );
}

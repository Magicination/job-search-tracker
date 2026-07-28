'use client';

import { useState } from 'react';
import type { WeeklyTrendPoint } from '@job-search-tracker/shared';

const WIDTH = 720;
const HEIGHT = 160;
const PADDING_BOTTOM = 24;
const MAX_POINTS = 12; // последние 12 недель — иначе на графике становится тесно

function formatWeekLabel(weekLabel: string): string {
  const match = weekLabel.match(/W(\d+)/);
  return match ? `нед.${match[1]}` : weekLabel;
}

export function WeeklyTrendChart({ data }: { data: WeeklyTrendPoint[] }) {
  const [active, setActive] = useState<WeeklyTrendPoint | null>(null);
  const points = data.slice(-MAX_POINTS);

  if (points.length === 0) {
    return <p className="text-xs text-text-faint">Пока недостаточно данных по неделям.</p>;
  }

  const barGap = 6;
  const barWidth = (WIDTH - barGap * (points.length - 1)) / points.length;
  const chartHeight = HEIGHT - PADDING_BOTTOM;
  const displayed = active ?? points[points.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Конверсия по неделям" onMouseLeave={() => setActive(null)}>
        {points.map((p, i) => {
          const barHeight = (p.conversionRate / 100) * (chartHeight - 4);
          const x = i * (barWidth + barGap);
          const y = chartHeight - barHeight;
          const isActive = active?.weekLabel === p.weekLabel;
          return (
            <g key={p.weekLabel}>
              <rect
                x={x}
                y={p.total === 0 ? chartHeight - 2 : y}
                width={barWidth}
                height={p.total === 0 ? 2 : Math.max(barHeight, 2)}
                fill="var(--accent-blue)"
                opacity={isActive ? 1 : 0.55}
                rx={2}
                onMouseEnter={() => setActive(p)}
                onClick={() => setActive((prev) => (prev?.weekLabel === p.weekLabel ? null : p))}
                style={{ cursor: 'pointer' }}
              />
              <rect x={x} y={0} width={barWidth} height={chartHeight} fill="transparent" onMouseEnter={() => setActive(p)} style={{ cursor: 'pointer' }} />
              <text x={x + barWidth / 2} y={HEIGHT - 6} textAnchor="middle" fontSize="9" fill="var(--text-faint)">
                {formatWeekLabel(p.weekLabel)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-xs text-text-dim">
        {formatWeekLabel(displayed.weekLabel)}: {displayed.total} {displayed.total === 1 ? 'отклик' : 'откликов'}, конверсия {displayed.conversionRate}%
      </p>
    </div>
  );
}

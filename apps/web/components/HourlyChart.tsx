'use client';

// Почасовая гистограмма (00–24) для страницы аналитики. Высота столбика —
// количество откликов в этот час, цвет — доля дошедших до интервью+ (от
// приглушённого нейтрального до яркого teal). Простой inline-SVG, не через
// Visualizer-инструмент, так как это постоянный элемент страницы, а не
// одноразовая иллюстрация к ответу.

import type { GroupedConversion } from '@job-search-tracker/shared';

const WIDTH = 720;
const HEIGHT = 160;
const PADDING_BOTTOM = 24;
const BAR_GAP = 2;

export function HourlyChart({ data }: { data: GroupedConversion[] }) {
  const maxTotal = Math.max(1, ...data.map((d) => d.total));
  const barWidth = (WIDTH - BAR_GAP * (data.length - 1)) / data.length;
  const chartHeight = HEIGHT - PADDING_BOTTOM;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Отклики по часу дня">
      {data.map((hour, i) => {
        const barHeight = (hour.total / maxTotal) * (chartHeight - 4);
        const x = i * (barWidth + BAR_GAP);
        const y = chartHeight - barHeight;

        // Цвет столбика по конверсии: 0% — приглушённый нейтральный,
        // 100% — насыщенный teal. Используем CSS-переменные темы, не hex.
        const opacity = hour.total === 0 ? 0.15 : 0.35 + (hour.conversionRate / 100) * 0.65;

        return (
          <g key={hour.label}>
            <rect
              x={x}
              y={hour.total === 0 ? chartHeight - 2 : y}
              width={barWidth}
              height={hour.total === 0 ? 2 : barHeight}
              fill="var(--accent-teal)"
              opacity={opacity}
              rx={1.5}
            >
              <title>
                {hour.label}:00 — {hour.total} откл., конверсия {hour.conversionRate}%
              </title>
            </rect>
            {i % 3 === 0 && (
              <text
                x={x + barWidth / 2}
                y={HEIGHT - 6}
                textAnchor="middle"
                fontSize="9"
                fill="var(--text-faint)"
              >
                {hour.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

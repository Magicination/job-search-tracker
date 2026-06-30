'use client';

// Почасовая гистограмма (00–24) для страницы аналитики. Высота столбика —
// количество откликов в этот час, цвет — доля дошедших до интервью+ (от
// приглушённого нейтрального до яркого teal). Простой inline-SVG, не через
// Visualizer-инструмент, так как это постоянный элемент страницы, а не
// одноразовая иллюстрация к ответу.
//
// В отличие от первой версии — подсказка по часу теперь явно отображается
// под графиком при клике/наведении (не только через нативный title, который
// плохо обнаруживается и не работает на мобильных без долгого тапа), плюс
// есть легенда цвета и сводка "лучший час".

import { useState } from 'react';
import type { GroupedConversion } from '@job-search-tracker/shared';

const WIDTH = 720;
const HEIGHT = 160;
const PADDING_BOTTOM = 24;
const BAR_GAP = 2;

export function HourlyChart({ data }: { data: GroupedConversion[] }) {
  const [activeHour, setActiveHour] = useState<GroupedConversion | null>(null);

  const maxTotal = Math.max(1, ...data.map((d) => d.total));
  const barWidth = (WIDTH - BAR_GAP * (data.length - 1)) / data.length;
  const chartHeight = HEIGHT - PADDING_BOTTOM;

  const withResponses = data.filter((d) => d.total > 0);
  const bestHour =
    withResponses.length > 0
      ? withResponses.reduce((best, d) => (d.conversionRate > best.conversionRate ? d : best))
      : null;

  const displayed = activeHour ?? bestHour;

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Отклики по часу дня"
        onMouseLeave={() => setActiveHour(null)}
      >
        {data.map((hour, i) => {
          const barHeight = (hour.total / maxTotal) * (chartHeight - 4);
          const x = i * (barWidth + BAR_GAP);
          const y = chartHeight - barHeight;
          const opacity = hour.total === 0 ? 0.15 : 0.35 + (hour.conversionRate / 100) * 0.65;
          const isActive = activeHour?.label === hour.label;

          return (
            <g key={hour.label}>
              <rect
                x={x}
                y={hour.total === 0 ? chartHeight - 2 : y}
                width={barWidth}
                height={hour.total === 0 ? 2 : barHeight}
                fill="var(--accent-teal)"
                opacity={isActive ? 1 : opacity}
                rx={1.5}
                onMouseEnter={() => setActiveHour(hour)}
                onClick={() => setActiveHour((prev) => (prev?.label === hour.label ? null : hour))}
                style={{ cursor: 'pointer' }}
              />
              {/* Невидимая широкая полоса по всей высоте графика — упрощает
                  попадание курсором/тапом в тонкие столбики с малым total. */}
              <rect
                x={x}
                y={0}
                width={barWidth}
                height={chartHeight}
                fill="transparent"
                onMouseEnter={() => setActiveHour(hour)}
                onClick={() => setActiveHour((prev) => (prev?.label === hour.label ? null : hour))}
                style={{ cursor: 'pointer' }}
              />
              {i % 2 === 0 && (
                <text x={x + barWidth / 2} y={HEIGHT - 6} textAnchor="middle" fontSize="9" fill="var(--text-faint)">
                  {hour.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-text-faint">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--accent-teal)', opacity: 0.35 }} />
          низкая конверсия
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--accent-teal)', opacity: 1 }} />
          высокая
        </div>
        {displayed ? (
          <span className="text-text-dim">
            {displayed.label}:00 — {displayed.total} {displayed.total === 1 ? 'отклик' : 'откликов'}, конверсия{' '}
            {displayed.conversionRate}%
            {!activeHour && bestHour && ' (лучший час)'}
          </span>
        ) : (
          <span className="text-text-faint">Наведите или нажмите на столбик для деталей</span>
        )}
      </div>
    </div>
  );
}

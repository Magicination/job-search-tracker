'use client';

import { useState } from 'react';
import type { Stage } from '@job-search-tracker/shared';
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';

const COLOR_OPTIONS: Stage['color'][] = ['blue', 'amber', 'teal', 'coral', 'neutral'];
const COLOR_DOT_CLASS: Record<Stage['color'], string> = {
  blue: 'bg-accent-blue',
  amber: 'bg-accent-amber',
  teal: 'bg-accent-teal',
  coral: 'bg-accent-coral',
  neutral: 'bg-text-faint',
};

export function StagesManager({
  stages,
  onAddStage,
  onUpdateStage,
  onSwapStages,
  onDeleteStage,
}: {
  stages: Stage[];
  onAddStage: (name: string, color: Stage['color']) => void;
  onUpdateStage: (id: string, fields: Partial<Pick<Stage, 'name' | 'color' | 'auto_archive'>>) => void;
  onSwapStages: (idA: string, idB: string) => void;
  onDeleteStage: (id: string) => void;
}) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<Stage['color']>('blue');

  const ordered = [...stages].sort((a, b) => a.position - b.position);

  function handleAdd() {
    if (!newName.trim()) return;
    onAddStage(newName, newColor);
    setNewName('');
  }

  return (
    <div>
      <h2 className="mb-1 text-sm font-semibold text-text">Свои этапы канбана</h2>
      <p className="mb-3 text-xs text-text-faint">
        Порядок этапов слева направо задаёт порядок колонок на доске. «Проигрышный» этап (например, «Отклонён») —
        отклик остаётся на доске до конца дня, затем уходит в архив автоматически.
      </p>

      <div className="flex flex-col gap-2">
        {ordered.map((stage, i) => (
          <div key={stage.id} className="flex items-center gap-2 rounded-lg border border-border-soft bg-panel-2 p-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_DOT_CLASS[stage.color]}`} />
            <input
              defaultValue={stage.name}
              onBlur={(e) => e.target.value.trim() && e.target.value !== stage.name && onUpdateStage(stage.id, { name: e.target.value.trim() })}
              className="min-w-0 flex-1 rounded-md border border-border bg-panel px-2 py-1 text-sm text-text outline-none focus-visible:border-accent-blue"
            />
            <select
              value={stage.color}
              onChange={(e) => onUpdateStage(stage.id, { color: e.target.value as Stage['color'] })}
              className="rounded-md border border-border bg-panel px-1.5 py-1 text-xs text-text-dim outline-none focus-visible:border-accent-blue"
            >
              {COLOR_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label className="flex shrink-0 items-center gap-1 text-xs text-text-faint" title="Отклик на этом этапе автоматически уйдёт в архив на следующий день">
              <input
                type="checkbox"
                checked={stage.auto_archive}
                onChange={(e) => onUpdateStage(stage.id, { auto_archive: e.target.checked })}
              />
              архив
            </label>
            <button
              disabled={i === 0}
              onClick={() => onSwapStages(stage.id, ordered[i - 1].id)}
              className="text-text-faint hover:text-text disabled:opacity-20"
              title="Сдвинуть влево"
            >
              <ArrowUp className="h-3.5 w-3.5 rotate-[-90deg]" />
            </button>
            <button
              disabled={i === ordered.length - 1}
              onClick={() => onSwapStages(stage.id, ordered[i + 1].id)}
              className="text-text-faint hover:text-text disabled:opacity-20"
              title="Сдвинуть вправо"
            >
              <ArrowDown className="h-3.5 w-3.5 rotate-[-90deg]" />
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Удалить этап «${stage.name}»? Возможно только если на нём сейчас нет откликов.`)) {
                  onDeleteStage(stage.id);
                }
              }}
              className="text-text-faint hover:text-accent-coral"
              title="Удалить этап"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-border-soft pt-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Название нового этапа"
          className="min-w-0 flex-1 rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text outline-none focus-visible:border-accent-blue"
        />
        <select
          value={newColor}
          onChange={(e) => setNewColor(e.target.value as Stage['color'])}
          className="rounded-md border border-border bg-panel-2 px-1.5 py-1.5 text-xs text-text-dim outline-none focus-visible:border-accent-blue"
        >
          {COLOR_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 rounded-lg bg-accent-amber px-3 py-1.5 text-xs font-medium text-bg hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Добавить
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { Stage } from '@job-search-tracker/shared';
import { Trash2, Plus, GripVertical } from 'lucide-react';

const COLOR_OPTIONS: Stage['color'][] = ['blue', 'amber', 'teal', 'coral', 'violet', 'rose', 'lime', 'neutral'];
const COLOR_DOT_CLASS: Record<Stage['color'], string> = {
  blue: 'bg-accent-blue',
  amber: 'bg-accent-amber',
  teal: 'bg-accent-teal',
  coral: 'bg-accent-coral',
  violet: 'bg-accent-violet',
  rose: 'bg-accent-rose',
  lime: 'bg-accent-lime',
  neutral: 'bg-text-faint',
};

function ColorSwatches({ value, onChange }: { value: Stage['color']; onChange: (c: Stage['color']) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {COLOR_OPTIONS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          title={c}
          className={`h-5 w-5 rounded-full ${COLOR_DOT_CLASS[c]} ${
            value === c ? 'ring-2 ring-offset-2 ring-offset-panel-2 ring-text' : 'opacity-70 hover:opacity-100'
          }`}
        />
      ))}
    </div>
  );
}

export function StagesManager({
  stages,
  onAddStage,
  onUpdateStage,
  onReorderStages,
  onDeleteStage,
}: {
  stages: Stage[];
  onAddStage: (name: string, color: Stage['color']) => void;
  onUpdateStage: (id: string, fields: Partial<Pick<Stage, 'name' | 'color' | 'auto_archive'>>) => void;
  onReorderStages: (orderedIds: string[]) => void;
  onDeleteStage: (id: string) => void;
}) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<Stage['color']>('blue');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const ordered = [...stages].sort((a, b) => a.position - b.position);

  function handleAdd() {
    if (!newName.trim()) return;
    onAddStage(newName, newColor);
    setNewName('');
  }

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    const ids = ordered.map((s) => s.id);
    const fromIdx = ids.indexOf(draggingId);
    const toIdx = ids.indexOf(targetId);
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, draggingId);
    onReorderStages(ids);
    setDraggingId(null);
    setDragOverId(null);
  }

  return (
    <div>
      <h2 className="mb-1 text-sm font-semibold text-text">Свои этапы канбана</h2>
      <p className="mb-3 text-xs text-text-faint">
        Перетащите за ⠿, чтобы поменять порядок колонок на доске. «Проигрышный» этап (например, «Отклонён») —
        отклик остаётся на доске до конца дня, затем уходит в архив автоматически.
      </p>

      <div className="flex flex-col gap-2">
        {ordered.map((stage) => (
          <div
            key={stage.id}
            draggable
            onDragStart={() => setDraggingId(stage.id)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverId(stage.id);
            }}
            onDragLeave={() => setDragOverId((id) => (id === stage.id ? null : id))}
            onDrop={() => handleDrop(stage.id)}
            onDragEnd={() => {
              setDraggingId(null);
              setDragOverId(null);
            }}
            className={`flex flex-wrap items-center gap-2 rounded-lg border bg-panel-2 p-2 transition ${
              dragOverId === stage.id ? 'border-accent-amber' : 'border-border-soft'
            } ${draggingId === stage.id ? 'opacity-40' : ''}`}
          >
            <span className="cursor-grab text-text-faint active:cursor-grabbing" title="Перетащить">
              <GripVertical className="h-4 w-4" />
            </span>
            <input
              defaultValue={stage.name}
              onBlur={(e) => e.target.value.trim() && e.target.value !== stage.name && onUpdateStage(stage.id, { name: e.target.value.trim() })}
              className="min-w-0 flex-1 rounded-md border border-border bg-panel px-2 py-1 text-sm text-text outline-none focus-visible:border-accent-blue"
            />
            <ColorSwatches value={stage.color} onChange={(color) => onUpdateStage(stage.id, { color })} />
            <label className="flex shrink-0 items-center gap-1 text-xs text-text-faint" title="Отклик на этом этапе автоматически уйдёт в архив на следующий день">
              <input
                type="checkbox"
                checked={stage.auto_archive}
                onChange={(e) => onUpdateStage(stage.id, { auto_archive: e.target.checked })}
              />
              архив
            </label>
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

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-soft pt-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Название нового этапа"
          className="min-w-0 flex-1 rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm text-text outline-none focus-visible:border-accent-blue"
        />
        <ColorSwatches value={newColor} onChange={setNewColor} />
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

'use client';

import { useState, type FormEvent } from 'react';
import type { TaskCategory, Task } from '@job-search-tracker/shared';
import { TASK_CATEGORY_BADGE_VARIANT, TASK_CATEGORY_LABELS } from '@job-search-tracker/shared';
import { useTodayTasks } from '../../lib/hooks/useTodayTasks';
import { useDailyNote } from '../../lib/hooks/useDailyNote';
import { Badge } from '../../components/Badge';
import { SkeletonList } from '../../components/Skeleton';

const CATEGORY_OPTIONS: TaskCategory[] = ['job', 'study', 'eng'];

function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border-soft bg-panel px-3 py-2.5">
      <button
        onClick={onToggle}
        aria-label={task.done ? 'Снять отметку выполнения' : 'Отметить выполненной'}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
          task.done ? 'border-accent-teal bg-accent-teal' : 'border-text-faint'
        }`}
      >
        {task.done && (
          <svg viewBox="0 0 16 16" className="h-3 w-3 text-bg" fill="currentColor">
            <path d="M13.7 3.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L6 9.6l6.3-6.3a1 1 0 0 1 1.4 0Z" />
          </svg>
        )}
      </button>
      <span className={`flex-1 text-sm ${task.done ? 'text-text-faint line-through' : 'text-text'}`}>
        {task.text}
      </span>
      <Badge label={TASK_CATEGORY_LABELS[task.category]} variant={TASK_CATEGORY_BADGE_VARIANT[task.category]} />
      <button
        onClick={onDelete}
        aria-label="Удалить задачу"
        className="text-text-faint opacity-0 transition group-hover:opacity-100 hover:text-accent-coral"
      >
        ✕
      </button>
    </div>
  );
}

function AddTaskForm({ onAdd }: { onAdd: (text: string, category: TaskCategory) => void }) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<TaskCategory>('job');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim(), category);
    setText('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 rounded-lg border border-border-soft bg-panel p-3">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Новая задача…"
        className="min-w-[160px] flex-1 rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none focus-visible:border-accent-blue"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as TaskCategory)}
        className="rounded-lg border border-border bg-panel-2 px-2 py-2 text-sm text-text outline-none focus-visible:border-accent-blue"
      >
        {CATEGORY_OPTIONS.map((c) => (
          <option key={c} value={c}>
            {TASK_CATEGORY_LABELS[c]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-lg bg-accent-amber px-4 py-2 text-sm font-medium text-bg"
      >
        Добавить
      </button>
    </form>
  );
}

export default function TodayPage() {
  const { tasks, loading, toggleTask, addTask, deleteTask } = useTodayTasks();
  const { note, setNote, saveNote, saving } = useDailyNote();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-4 text-lg font-semibold text-text">Сегодня</h1>

        {loading ? (
          <SkeletonList rows={3} />
        ) : tasks.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-dim">
            На сегодня пока нет задач — добавьте первую ниже.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() => toggleTask(task)}
                onDelete={() => deleteTask(task.id)}
              />
            ))}
          </div>
        )}

        <div className="mt-3">
          <AddTaskForm onAdd={addTask} />
        </div>
      </div>

      <div className="rounded-lg border border-border-soft bg-panel p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-text">Заметка дня / рефлексия</h2>
          {saving && <span className="text-xs text-text-faint">Сохранение…</span>}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          rows={4}
          placeholder="Как прошёл день? Что получилось, что было сложно?"
          className="w-full resize-none rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none focus-visible:border-accent-blue"
        />
      </div>
    </div>
  );
}

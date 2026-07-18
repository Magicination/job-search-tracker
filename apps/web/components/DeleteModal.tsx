'use client';

import { Modal } from './Modal';
import type { Application } from '@job-search-tracker/shared';

interface DeleteModalProps {
  application: Pick<Application, 'company' | 'role'>;
  onConfirm: () => void;
}

export function DeleteModal({ application, onConfirm }: DeleteModalProps) {
  const companyName = application.company || application.role || 'отклик';
  const title = companyName === 'отклик' ? 'Удалить отклик' : `Удалить отклик к ${companyName}`;

  return (
    <Modal onClose={onConfirm}>
      <h2 className="text-base font-semibold text-text mb-3">{title}</h2>
      <div className="mb-4 text-sm text-text-dim">
        Этот отклик будет удалён навсегда. Восстановить его будет невозможно.
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onConfirm}
          className="rounded-lg border border-accent-coral bg-bg px-4 py-2 text-sm font-medium text-accent-coral hover:bg-panel transition"
        >
          Удалить
        </button>
        <button
          onClick={() => onConfirm()} // cancel by default for simplicity
          className="rounded-lg border border-border bg-panel-2 px-4 py-2 text-sm text-text-dim hover:text-text transition"
        >
          Отмена
        </button>
      </div>
    </Modal>
  );
}

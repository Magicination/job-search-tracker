'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10 sm:pt-16" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-border bg-bg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end p-2">
          <button onClick={onClose} aria-label="Закрыть" className="rounded-md px-2 py-1 text-text-faint hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}

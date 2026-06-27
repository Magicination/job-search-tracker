'use client';

// Единый механизм показа уведомлений (в первую очередь — об ошибках сохранения).
// До этого хуки молча проглатывали ошибки Supabase (update/insert/delete без
// проверки error) — пользователь мог решить, что данные сохранились, хотя
// запрос на самом деле упал (потеря сети, истёкшая сессия и т.д.). Теперь
// каждый хук, в котором это критично, вызывает showError() при сбое.

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface Toast {
  id: number;
  message: string;
  variant: 'error' | 'info';
}

interface ToastContextValue {
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showError: () => {},
  showInfo: () => {},
});

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: Toast['variant']) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      // Автоматически скрываем через 6 секунд — достаточно, чтобы прочитать,
      // не достаточно, чтобы накапливались десятки уведомлений за сессию.
      setTimeout(() => dismiss(id), 6000);
    },
    [dismiss]
  );

  const showError = useCallback((message: string) => push(message, 'error'), [push]);
  const showInfo = useCallback((message: string) => push(message, 'info'), [push]);

  return (
    <ToastContext.Provider value={{ showError, showInfo }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
              toast.variant === 'error'
                ? 'border-accent-coral/40 bg-panel text-text'
                : 'border-accent-teal/40 bg-panel text-text'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Закрыть уведомление"
              className="text-text-faint hover:text-text"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

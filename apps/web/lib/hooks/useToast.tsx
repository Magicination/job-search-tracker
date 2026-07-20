'use client';

// Единый механизм показа уведомлений (в первую очередь — об ошибках и успехах).
// До этого хуки молча проглатывали ошибки Supabase (update/insert/delete без
// проверки error) — пользователь мог решить, что данные сохранились, хотя
// запрос на самом деле упал. Теперь каждый хук, в котором это критично, вызывает
// showError() или showSuccess() при завершении.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // milliseconds, 0 for permanent
}

interface ToastContextValue {
  showToast: (message: string, type: ToastType, duration?: number) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  showError: () => {},
  showSuccess: () => {},
  showInfo: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType, duration: number = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, message, type, duration };
      
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  const showError = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const showInfo = useCallback((message: string) => showToast(message, 'info'), [showToast]);

  useEffect(() => {
    // Автоматически скрываем постоянные тоasty через 4 секунды если duration не задана
    toasts.forEach(toast => {
      if (toast.duration === undefined && toast.type !== 'success') {
        const timer = setTimeout(() => dismiss(toast.id), 4000);
        return () => clearTimeout(timer);
      }
    });
  }, [toasts, dismiss]);

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess, showInfo }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
              toast.type === 'error'
                ? 'border-accent-coral/40 bg-panel text-text'
                : toast.type === 'success'
                ? 'border-accent-teal/40 bg-panel text-text'
                : 'border-accent-blue/40 bg-panel text-text'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' && (
                <svg className="h-5 w-5 flex-shrink-0 text-accent-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg className="h-5 w-5 flex-shrink-0 text-accent-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {toast.type === 'info' && (
                <svg className="h-5 w-5 flex-shrink-0 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Закрыть уведомление"
              className="text-text-faint hover:text-text transition-colors"
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

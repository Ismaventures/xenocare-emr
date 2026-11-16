import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 5000 }: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-start gap-3 min-w-[300px] max-w-md p-4 rounded-lg shadow-lg border transition-all transform translate-y-0 opacity-100
              ${
                toast.type === 'success'
                  ? 'bg-white border-green-200 text-gray-800'
                  : toast.type === 'error'
                    ? 'bg-white border-red-200 text-gray-800'
                    : toast.type === 'warning'
                      ? 'bg-white border-yellow-200 text-gray-800'
                      : 'bg-white border-blue-200 text-gray-800'
              }
            `}
            role="alert"
          >
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'success' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {toast.type === 'error' && (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              {toast.type === 'warning' && (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              {toast.type === 'info' && (
                <Info className="h-5 w-5 text-blue-500" />
              )}
            </div>
            <div className="flex-1">
              {toast.title && (
                <h3 className="font-medium text-sm mb-1">{toast.title}</h3>
              )}
              <p className="text-sm text-gray-600">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

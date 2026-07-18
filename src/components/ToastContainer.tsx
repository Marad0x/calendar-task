import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div id="toast-container" className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';

          return (
            <motion.div
              key={toast.id}
              id={`toast-${toast.id}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-colors duration-200 ${
                isSuccess
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/95 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : isError
                  ? 'bg-rose-50/90 dark:bg-rose-950/95 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  : 'bg-blue-50/90 dark:bg-blue-950/95 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : isError ? (
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                ) : (
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div className="flex-1 text-sm font-medium leading-tight">
                {toast.message}
              </div>
              <button
                id={`toast-close-${toast.id}`}
                onClick={() => removeToast(toast.id)}
                className="shrink-0 rounded-lg p-0.5 hover:bg-black/5 dark:hover:bg-white/10 text-current/60 hover:text-current transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

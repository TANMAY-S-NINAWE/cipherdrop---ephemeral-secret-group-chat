import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export const NotificationModal: React.FC = () => {
  const { errorNotification, clearError } = useSocket();

  if (!errorNotification) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl p-5 text-neutral-100">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/40 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 pr-6">
            <h4 className="text-sm font-bold tracking-tight text-neutral-100">
              Notice
            </h4>
            <p className="text-xs text-neutral-300 mt-1 leading-relaxed font-medium">
              {errorNotification.message}
            </p>
          </div>
          <button
            type="button"
            onClick={clearError}
            aria-label="Dismiss alert"
            className="absolute top-4 right-4 w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={clearError}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-900 transition-colors cursor-pointer"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export const GroupDeletedModal: React.FC = () => {
  const { groupDeletedMessage, clearGroupDeleted } = useSocket();

  if (!groupDeletedMessage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl p-6 text-neutral-100">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold tracking-tight text-neutral-100">Group Session Terminated</h3>
          
          <p className="text-sm text-neutral-300 mt-2.5 leading-relaxed font-medium">
            {groupDeletedMessage}
          </p>

          <p className="text-xs text-neutral-400 mt-3">
            In-memory records, active connections, and temporary credentials have been wiped from active server RAM.
          </p>

          <button
            type="button"
            onClick={clearGroupDeleted}
            className="mt-6 w-full py-2.5 px-4 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-900 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Return to Home</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

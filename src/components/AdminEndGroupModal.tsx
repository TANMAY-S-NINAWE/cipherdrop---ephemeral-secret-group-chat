import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

interface AdminEndGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminEndGroupModal: React.FC<AdminEndGroupModalProps> = ({ isOpen, onClose }) => {
  const { endGroup } = useSocket();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirmEnd = async () => {
    setIsDeleting(true);
    await endGroup();
    setIsDeleting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-md rounded-xl border border-red-900/60 bg-neutral-900 shadow-2xl p-6 text-neutral-100">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-950/60 text-red-400 border border-red-800/40 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-neutral-100">End Group Session</h3>
            <p className="text-sm text-neutral-300 mt-2 leading-relaxed">
              End this group for everyone? All members will be disconnected, and the temporary group data will be permanently deleted.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmEnd}
            disabled={isDeleting}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? 'Terminating & Wiping...' : 'End Group for Everyone'}
          </button>
        </div>
      </div>
    </div>
  );
};

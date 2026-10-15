import React, { useState } from 'react';
import {
  X,
  Key,
  Copy,
  Check,
  Share2,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';

interface AdminCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  groupPassword?: string;
}

export const AdminCredentialsModal: React.FC<AdminCredentialsModalProps> = ({
  isOpen,
  onClose,
  groupName,
  groupPassword,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerFeedback = (msg: string) => {
    setCopyFeedback(msg);
    setTimeout(() => {
      setCopyFeedback(null);
    }, 2500);
  };

  const handleCopyName = async () => {
    try {
      await navigator.clipboard.writeText(groupName);
      triggerFeedback('Group name copied to clipboard');
    } catch {
      triggerFeedback('Failed to copy');
    }
  };

  const handleCopyPassword = async () => {
    if (!groupPassword) return;
    try {
      await navigator.clipboard.writeText(groupPassword);
      triggerFeedback('Password copied to clipboard');
    } catch {
      triggerFeedback('Failed to copy');
    }
  };

  const handleCopyBoth = async () => {
    const textToCopy = `CipherDrop Secret Group:\nGroup Name: ${groupName}\nPassword: ${groupPassword || '[Hidden]'}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      triggerFeedback('Both credentials copied to clipboard');
    } catch {
      triggerFeedback('Failed to copy');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'CipherDrop Secret Group Invitation',
      text: `Join our temporary secret group on CipherDrop:\nGroup Name: ${groupName}\nPassword: ${groupPassword || ''}`,
      url: typeof window !== 'undefined' ? window.location.origin : undefined,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        triggerFeedback('Shared successfully');
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          await handleCopyBoth();
        }
      }
    } else {
      await handleCopyBoth();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl p-6 text-neutral-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 text-emerald-400 flex items-center justify-center border border-emerald-800/40">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-neutral-100">Admin Group Credentials</h2>
              <p className="text-[11px] text-neutral-400">
                Visible only to the administrator. Never exposed to members.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {copyFeedback && (
          <div className="mt-4 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{copyFeedback}</span>
          </div>
        )}

        <div className="mt-5 space-y-4">
          {/* Group Name Display & Copy */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Group Name
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3.5 py-2.5 rounded-lg border border-neutral-800 bg-neutral-800/80 text-neutral-100 text-xs sm:text-sm font-mono truncate select-all">
                {groupName}
              </div>
              <button
                type="button"
                onClick={handleCopyName}
                title="Copy Group Name"
                className="px-3 py-2.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </button>
            </div>
          </div>

          {/* Group Password Display & Copy */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Group Password
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3.5 py-2.5 rounded-lg border border-neutral-800 bg-neutral-800/80 text-neutral-100 text-xs sm:text-sm font-mono flex items-center justify-between">
                <span className="select-all truncate mr-2">
                  {showPassword ? groupPassword || '[Protected]' : '••••••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="text-neutral-400 hover:text-neutral-200 p-0.5 cursor-pointer shrink-0"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleCopyPassword}
                disabled={!groupPassword}
                title="Copy Password"
                className="px-3 py-2.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </button>
            </div>
          </div>

          {/* Action Buttons: Copy Both & Share Group */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleCopyBoth}
              className="w-full py-2.5 px-3.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Both Credentials</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="w-full py-2.5 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Group Invite</span>
            </button>
          </div>

          <div className="p-3 rounded-lg bg-neutral-800/60 border border-neutral-700/60 text-[11px] text-neutral-400 leading-relaxed flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              These credentials are only held in your browser session RAM. When you terminate or leave this group, all server records will be permanently deleted.
            </span>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-neutral-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-900 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

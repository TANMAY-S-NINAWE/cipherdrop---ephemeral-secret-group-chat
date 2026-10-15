import React from 'react';
import { X, ShieldCheck, Key, Lock, Zap, Server } from 'lucide-react';

interface SecuritySpecsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecuritySpecsModal: React.FC<SecuritySpecsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-2xl rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl p-6 text-neutral-100 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-800/40 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-neutral-100">
                Cryptographic & Engineering Specifications
              </h2>
              <p className="text-xs text-neutral-400">
                Authoritative security parameters and capacity enforcement
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

        <div className="mt-5 space-y-4 text-xs text-neutral-300 leading-relaxed">
          <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-800/50">
            <h4 className="text-xs font-bold text-neutral-100 flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              Password Verification Material
            </h4>
            <p className="mt-1 text-[11px] text-neutral-400">
              Passphrases are salted with 16 cryptographically secure random bytes and hashed using Node.js native <code className="font-mono text-emerald-400">scryptSync</code>. Verification uses constant-time <code className="font-mono text-emerald-400">crypto.timingSafeEqual</code> to mitigate timing side-channel attacks. Password hashes exist solely in RAM and are never revealed over WebSockets.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-800/50">
            <h4 className="text-xs font-bold text-neutral-100 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              Unpredictable Internal Group Identifiers
            </h4>
            <p className="mt-1 text-[11px] text-neutral-400">
              Groups are indexed internally by high-entropy UUIDv4 identifiers rather than predictable human room names. This prevents room enumeration attacks and isolates socket channels.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-800/50">
            <h4 className="text-xs font-bold text-neutral-100 flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-amber-400" />
              Strict Atomic Capacity Enforcement
            </h4>
            <p className="mt-1 text-[11px] text-neutral-400">
              The server strictly enforces a maximum of 50 simultaneous active groups globally and 50 simultaneous connected members per group. Any attempt to exceed these boundaries is rejected atomically with precise standard error messages.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-800/50">
            <h4 className="text-xs font-bold text-neutral-100 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              Rate Limiting & Input Sanitization
            </h4>
            <p className="mt-1 text-[11px] text-neutral-400">
              In-memory sliding window counters restrict creation and join attempts per client to thwart brute-force password guessing. Message size is capped at 2,000 characters, and control characters are stripped prior to sequencing and broadcast.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-900 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

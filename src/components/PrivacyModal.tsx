import React from 'react';
import { X, Shield, Server, Trash2, EyeOff, AlertCircle } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-2xl rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl p-6 text-neutral-100 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-neutral-100">
                Zero-Retention Architecture & Privacy Notice
              </h2>
              <p className="text-xs text-neutral-400">
                Technical implementation details and transparent retention limits
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

        <div className="mt-5 space-y-6 text-xs text-neutral-300 leading-relaxed">
          {/* Section 1: In-Memory Storage */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-500 shrink-0" />
              1. In-Memory Ephemeral Storage
            </h3>
            <p className="mt-1.5 text-neutral-400 leading-relaxed">
              CipherDrop maintains active groups strictly in server process memory (RAM). We do not run a SQL or NoSQL database, disk database, or message queue. All message payloads, active participant rosters, and verification hashes are mapped in volatile memory only. If the server process restarts or encounters an unhandled exception, all active groups are immediately wiped.
            </p>
          </div>

          {/* Section 2: Automated Group Destruction */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
              2. Administrator-Controlled Group Termination
            </h3>
            <p className="mt-1.5 text-neutral-400 leading-relaxed">
              The group creator retains sole administrative termination authority:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-neutral-400">
              <li>
                <strong className="text-neutral-200">Explicit End Group:</strong> Clicking "End Group" immediately marks the group status as terminating, disconnects all active WebSocket client rooms, emits a <code className="px-1.5 py-0.5 rounded bg-neutral-800 font-mono text-[11px] text-emerald-400">GROUP_DELETED</code> broadcast, and wipes the group object from RAM.
              </li>
              <li>
                <strong className="text-neutral-200">Administrator Disconnect Detection:</strong> In the event the creator closes their browser, experiences a network drop, or goes offline, an automated 60-second grace period is triggered. If the creator does not reconnect within 60 seconds, the server terminates the group and purges all data.
              </li>
            </ul>
          </div>

          {/* Section 3: Non-Persistent Logging */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-cyan-500 shrink-0" />
              3. Redacted Telemetry & Non-Persistent Logging
            </h3>
            <p className="mt-1.5 text-neutral-400 leading-relaxed">
              Server console logs are non-persistent and strictly audit high-level lifecycle events. Chat message contents, user passwords, and credential hashes are never piped into application logs, error monitoring tools, or external analytics.
            </p>
          </div>

          {/* Section 4: Honest Privacy Boundaries */}
          <div className="p-3.5 rounded-lg border border-amber-900/60 bg-amber-950/20 text-neutral-200">
            <h3 className="text-xs font-bold text-amber-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Critical Privacy Disclosure & System Limits
            </h3>
            <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-amber-200/90">
              <p>
                <strong className="text-amber-300">Shared Password vs. E2EE:</strong> A shared group password controls authorization to join the room. This is transport-encrypted via TLS/WSS. It is not peer-to-peer end-to-end encryption with double ratcheting.
              </p>
              <p>
                <strong className="text-amber-300">Client-Side Traces:</strong> While the server wipes all data on termination, we cannot guarantee that traces do not linger in client environments outside our control, including: operating system RAM, browser display caches, physical screenshots captured by participants, keyboard loggers, or upstream proxy network inspection.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-900 transition-colors cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

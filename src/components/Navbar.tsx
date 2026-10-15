import React from 'react';
import { Lock } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

interface NavbarProps {
  onOpenPrivacy: () => void;
  onOpenSecurity: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenPrivacy, onOpenSecurity }) => {
  const { isConnected, serverStats } = useSocket();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark (single element) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-emerald-400 border border-neutral-800 flex items-center justify-center shadow-xs">
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-base font-bold tracking-tight text-neutral-100 whitespace-nowrap">
            CipherDrop
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
          <a
            href="#overview"
            className="hover:text-neutral-100 transition-colors whitespace-nowrap"
          >
            Overview
          </a>
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="hover:text-neutral-100 transition-colors whitespace-nowrap cursor-pointer text-left"
          >
            Zero-Retention Model
          </button>
          <button
            type="button"
            onClick={onOpenSecurity}
            className="hover:text-neutral-100 transition-colors whitespace-nowrap cursor-pointer text-left"
          >
            Security Architecture
          </button>
        </nav>

        {/* Zone 3: 1 Primary Telemetry Indicator */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Real live connection indicator */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border border-neutral-800 bg-neutral-900 text-neutral-300"
            title={isConnected ? 'Connected to Ephemeral Server' : 'Connecting to Server...'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="hidden sm:inline">
              {isConnected ? 'Server Online' : 'Connecting...'}
            </span>
            <span className="text-neutral-500 tabular-nums font-mono text-[11px]">
              {serverStats.activeGroups}/50
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

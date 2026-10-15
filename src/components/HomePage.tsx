import React from 'react';
import {
  Shield,
  PlusCircle,
  LogIn,
  Users,
  Activity,
  Cpu,
  Lock,
  Trash2,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import heroMeshImg from '../assets/images/ephemeral_mesh_hero_1791974525151.jpg';

interface HomePageProps {
  onCreateGroup: () => void;
  onJoinGroup: () => void;
  onOpenPrivacy: () => void;
  onOpenSecurity: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onCreateGroup,
  onJoinGroup,
  onOpenPrivacy,
  onOpenSecurity,
}) => {
  const { serverStats, isConnected } = useSocket();

  const isServerFull = serverStats.activeGroups >= serverStats.maxGroups;

  return (
    <div className="min-w-0 flex-1 bg-neutral-950 text-neutral-100">
      {/* 1. Hero Section */}
      <section id="overview" className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headline and Call-to-Actions */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-4 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/60">
                <Shield className="w-3.5 h-3.5" />
                <span>Zero-Retention Ephemeral Communication</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-100 leading-[1.1] text-balance">
                Private conversations. <br className="hidden sm:inline" />
                <span className="text-emerald-400">
                  No lasting traces.
                </span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-neutral-400 max-w-xl leading-relaxed">
                Temporary group chat rooms held entirely in volatile server memory. When the administrator terminates the session or disconnects, all messages, credentials, and member records are permanently wiped.
              </p>

              {/* Two Primary Choices */}
              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  type="button"
                  onClick={onCreateGroup}
                  disabled={isServerFull}
                  className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create a New Group</span>
                </button>

                <button
                  type="button"
                  onClick={onJoinGroup}
                  className="px-6 py-3.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-100 font-semibold text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Join an Existing Group</span>
                </button>
              </div>

              {isServerFull && (
                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  <span>The server is currently full (50/50 active groups). New group creation is temporarily paused.</span>
                </div>
              )}
            </div>

            {/* Right Column: Hero Visual Graphic */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-2xl aspect-16/10">
                <img
                  src={heroMeshImg}
                  alt="CipherDrop Ephemeral Cryptographic Architecture"
                  className="w-full h-full object-cover transition-opacity duration-300"
                  referrerPolicy="no-referrer"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-transparent to-transparent flex items-end p-5">
                  <div className="text-white">
                    <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">
                      Authoritative Ephemeral Architecture
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      Pure volatile memory state. Zero storage on disk.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Live Server Dashboard */}
      <section className="py-12 bg-neutral-900/50 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-neutral-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                Live Server Status Dashboard
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Real-time aggregated telemetry streamed from server memory
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              <span className="text-neutral-300">
                {isConnected ? 'LIVE WEBSOCKET STREAM' : 'RECONNECTING...'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Live Groups */}
            <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900 shadow-xs">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                Live Groups
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-neutral-100 font-mono tabular-nums">
                  {serverStats.activeGroups}
                </span>
                <span className="text-xs font-mono text-neutral-500">/ 50 limit</span>
              </div>
              <p className="mt-2 text-[11px] text-neutral-400">
                {50 - serverStats.activeGroups} global group slots open
              </p>
            </div>

            {/* Metric 2: Connected Users */}
            <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900 shadow-xs">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                Total Connected Users
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-neutral-100 font-mono tabular-nums">
                  {serverStats.totalConnectedUsers}
                </span>
                <Users className="w-4 h-4 text-neutral-400" />
              </div>
              <p className="mt-2 text-[11px] text-neutral-400">
                Up to 50 simultaneous members per room
              </p>
            </div>

            {/* Metric 3: Group Creation Status */}
            <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900 shadow-xs">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                Group Creation Availability
              </span>
              <div className="mt-2 flex items-center gap-2">
                {serverStats.canCreateGroup ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="text-base font-bold text-emerald-400">
                      Available
                    </span>
                  </>
                ) : (
                  <>
                    <AlertOctagon className="w-5 h-5 text-red-500" />
                    <span className="text-base font-bold text-red-400">
                      The server is full
                    </span>
                  </>
                )}
              </div>
              <p className="mt-2 text-[11px] text-neutral-400">
                Enforced atomically by backend store
              </p>
            </div>

            {/* Metric 4: Volatile RAM Uptime */}
            <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900 shadow-xs">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                Memory Process Uptime
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-neutral-100 font-mono tabular-nums">
                  {Math.floor(serverStats.uptimeSeconds / 60)}m {serverStats.uptimeSeconds % 60}s
                </span>
                <Cpu className="w-4 h-4 text-neutral-400" />
              </div>
              <p className="mt-2 text-[11px] text-neutral-400">
                Process restart destroys all active memory
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Principles & Architecture Grid */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100">
            Engineered for genuine secrecy.
          </h2>
          <p className="mt-3 text-sm text-neutral-400 leading-relaxed">
            Unlike standard messaging platforms that save your chats forever in cloud databases, CipherDrop is designed around intentional ephemerality and non-retention.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Pillar 1 */}
          <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900">
            <div className="w-10 h-10 rounded-lg bg-emerald-950/60 text-emerald-400 flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-100">
              1. Zero Disk Storage
            </h3>
            <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
              No database, disk tables, or persistent file stores are connected to the chat engine. Messages exist solely in volatile Node.js RAM while the group session is open.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900">
            <div className="w-10 h-10 rounded-lg bg-rose-950/60 text-rose-400 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-100">
              2. Admin-Triggered Wipe
            </h3>
            <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
              The group creator retains master deletion control. Ending the group triggers an atomic server memory flush, disconnects all participants, and redirects them home.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/60 text-cyan-400 flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-100">
              3. Graceful Disconnect Guard
            </h3>
            <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
              If an administrator loses connection or closes their tab, a 60-second recovery grace timer runs. If the admin does not reconnect, the group self-destructs automatically.
            </p>
          </div>
        </div>

        <div className="mt-12 p-6 rounded-xl border border-neutral-800 bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-neutral-100">
              Review Our Complete Threat Model & Privacy Guarantees
            </h4>
            <p className="text-xs text-neutral-400 mt-1">
              Read our transparent explanation of in-memory lifetimes and client-side device constraints.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-900 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <span>Read Disclosure</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 4. Footer */}
      <footer className="border-t border-neutral-800 py-8 bg-neutral-950 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-semibold text-neutral-300">CipherDrop</span>
            <span>·</span>
            <span>Ephemeral Secret Chat Engine</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="hover:text-neutral-200 cursor-pointer"
            >
              Zero-Retention Policy
            </button>
            <button
              type="button"
              onClick={onOpenSecurity}
              className="hover:text-neutral-200 cursor-pointer"
            >
              Security Specs
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

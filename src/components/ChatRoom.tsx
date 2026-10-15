import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  Send,
  LogOut,
  Trash2,
  Shield,
  Key,
  Copy,
  Check,
  Share2,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  Radio,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { AdminEndGroupModal } from './AdminEndGroupModal';
import { AdminCredentialsModal } from './AdminCredentialsModal';
import { getContrastTextColor } from '../utils/colors';

export const ChatRoom: React.FC = () => {
  const {
    currentSession,
    members,
    messages,
    sendMessage,
    leaveGroup,
    isConnected,
    adminGraceSeconds,
    adminGraceMessage,
  } = useSocket();

  const [inputContent, setInputContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showCredentialsBanner, setShowCredentialsBanner] = useState(true);
  const [showBannerPassword, setShowBannerPassword] = useState(false);
  const [bannerFeedback, setBannerFeedback] = useState<string | null>(null);
  const [rateLimitNotice, setRateLimitNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto scroll to latest message
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, []);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages.length]);

  if (!currentSession) return null;

  const triggerBannerFeedback = (text: string) => {
    setBannerFeedback(text);
    setTimeout(() => {
      setBannerFeedback(null);
    }, 2500);
  };

  const handleCopyName = async () => {
    try {
      await navigator.clipboard.writeText(currentSession.groupName);
      triggerBannerFeedback('Group name copied!');
    } catch {
      triggerBannerFeedback('Failed to copy');
    }
  };

  const handleCopyPassword = async () => {
    if (!currentSession.groupPassword) return;
    try {
      await navigator.clipboard.writeText(currentSession.groupPassword);
      triggerBannerFeedback('Password copied!');
    } catch {
      triggerBannerFeedback('Failed to copy');
    }
  };

  const handleCopyBoth = async () => {
    const textToCopy = `CipherDrop Secret Group:\nGroup Name: ${currentSession.groupName}\nPassword: ${currentSession.groupPassword || '[Protected]'}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      triggerBannerFeedback('Both credentials copied!');
    } catch {
      triggerBannerFeedback('Failed to copy');
    }
  };

  const handleShareGroup = async () => {
    const shareData = {
      title: 'CipherDrop Secret Group Invitation',
      text: `Join secret group: ${currentSession.groupName}\nPassword: ${currentSession.groupPassword || ''}`,
      url: typeof window !== 'undefined' ? window.location.origin : undefined,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        triggerBannerFeedback('Invite shared!');
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          await handleCopyBoth();
        }
      }
    } else {
      await handleCopyBoth();
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputContent.trim();
    if (!content || isSending) return;

    if (content.length > 2000) {
      setRateLimitNotice('Message exceeds the 2,000 character limit.');
      return;
    }

    setRateLimitNotice(null);
    setIsSending(true);

    const res = await sendMessage(content);
    setIsSending(false);

    if (res.success) {
      setInputContent('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.focus();
      }
    } else if (res.error) {
      setRateLimitNotice(res.error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-7xl mx-auto w-full bg-neutral-950 border-x border-neutral-800 shadow-sm relative overflow-hidden text-neutral-100">
      {/* 1. Chat Header */}
      <div className="h-16 px-4 sm:px-6 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-md flex items-center justify-between gap-4 shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border border-white/20"
            style={{
              backgroundColor: currentSession.color,
              color: getContrastTextColor(currentSession.color),
            }}
          >
            {currentSession.groupName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-neutral-100 truncate">
                {currentSession.groupName}
              </h1>
              {currentSession.isAdmin && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                  <Shield className="w-2.5 h-2.5" />
                  Admin
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span className="font-mono tabular-nums font-medium text-emerald-400">
                {members.length} / 50 members
              </span>
              <span>·</span>
              <span className="hidden sm:inline">RAM Ephemeral</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Admin-Only Credentials / Share Button */}
          {currentSession.isAdmin && (
            <button
              type="button"
              onClick={() => setShowAdminModal(true)}
              aria-label="View admin credentials and share"
              title="Admin Credentials & Share"
              className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-emerald-800/80 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Credentials & Share</span>
              <span className="md:hidden">Share</span>
            </button>
          )}

          {/* Members Toggle Button */}
          <button
            type="button"
            onClick={() => setShowMembersDrawer((prev) => !prev)}
            aria-label="View online members"
            className="px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono tabular-nums">{members.length}</span>
          </button>

          {/* Leave Group Button */}
          <button
            type="button"
            onClick={leaveGroup}
            aria-label="Leave group"
            className="px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave</span>
          </button>

          {/* End Group Button (Admin Only) */}
          {currentSession.isAdmin && (
            <button
              type="button"
              onClick={() => setShowEndConfirm(true)}
              aria-label="End group for everyone"
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">End Group</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Admin Grace Disconnect Alert Banner */}
      {adminGraceSeconds !== null && (
        <div className="bg-amber-500 text-neutral-950 px-4 py-2 text-xs font-semibold flex items-center justify-between gap-3 shrink-0 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {adminGraceMessage ||
                'Administrator disconnected. Session will terminate if they do not reconnect.'}
            </span>
          </div>
          <div className="font-mono tabular-nums text-sm bg-neutral-950 text-amber-400 px-2 py-0.5 rounded font-bold">
            {adminGraceSeconds}s
          </div>
        </div>
      )}

      {/* 3. Main Chat Viewport + Members Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Messages Feed */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3.5">
            {/* Admin-Only Credentials Card Banner (Visible only to creator) */}
            {currentSession.isAdmin && showCredentialsBanner && (
              <div className="mb-4 p-4 rounded-xl border border-emerald-900/60 bg-emerald-950/20 text-neutral-100 shadow-xs relative transition-all">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-emerald-900/40">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <h2 className="text-xs font-bold tracking-tight text-emerald-300">
                        Admin Group Credentials
                      </h2>
                      <p className="text-[11px] text-neutral-400">
                        Only you can see these credentials. Share with members to let them join.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCredentialsBanner(false)}
                    aria-label="Dismiss credentials banner"
                    className="w-6 h-6 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {bannerFeedback && (
                  <div className="mt-2.5 p-2 rounded bg-emerald-900/60 text-emerald-200 text-xs flex items-center gap-1.5 font-medium">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{bannerFeedback}</span>
                  </div>
                )}

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Name */}
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-emerald-900/50 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 block">Group Name</span>
                      <span className="font-mono font-semibold text-neutral-100">{currentSession.groupName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyName}
                      className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer text-neutral-200"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>

                  {/* Password */}
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-emerald-900/50 flex items-center justify-between gap-2">
                    <div className="truncate mr-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 block">Password</span>
                      <span className="font-mono font-semibold text-neutral-100">
                        {showBannerPassword ? currentSession.groupPassword || '[Protected]' : '••••••••'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowBannerPassword((prev) => !prev)}
                        aria-label={showBannerPassword ? 'Hide password' : 'Show password'}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-200 cursor-pointer"
                      >
                        {showBannerPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        disabled={!currentSession.groupPassword}
                        className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-40 text-neutral-200"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyBoth}
                    className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-neutral-200"
                  >
                    <Copy className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Copy Both Credentials</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareGroup}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Group</span>
                  </button>
                </div>
              </div>
            )}

            {/* Ephemeral Notice at Start */}
            <div className="text-center py-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 text-[11px]">
                <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                <span>Zero-disk in-memory channel. History begins at room creation.</span>
              </div>
            </div>

            {messages.map((msg) => {
              // System Messages
              if (msg.isSystem) {
                return (
                  <div key={msg.id} className="text-center my-2">
                    <span className="inline-block text-[11px] text-neutral-400 font-medium px-3 py-1 rounded-md bg-neutral-900 border border-neutral-800">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              const isOwnMessage = msg.sender.toLowerCase() === currentSession.username.toLowerCase();

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 max-w-[85%] sm:max-w-[70%] ${
                    isOwnMessage ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  {/* Sender Avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 shadow-xs border border-white/20"
                    style={{
                      backgroundColor: msg.color,
                      color: getContrastTextColor(msg.color),
                    }}
                    title={msg.sender}
                  >
                    {msg.sender.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm shadow-xs ${
                      isOwnMessage
                        ? 'bg-neutral-800 text-white border border-neutral-700 rounded-tr-xs'
                        : 'bg-neutral-900 text-neutral-100 border border-neutral-800 rounded-tl-xs'
                    }`}
                  >
                    {/* Header info */}
                    <div
                      className={`flex items-center gap-2 mb-1 text-[11px] ${
                        isOwnMessage ? 'text-neutral-400 justify-end' : 'justify-start'
                      }`}
                    >
                      <span
                        className="font-bold truncate max-w-[140px]"
                        style={{ color: isOwnMessage ? undefined : msg.color }}
                      >
                        {msg.sender}
                      </span>
                      {msg.isAdmin && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold uppercase">
                          Admin
                        </span>
                      )}
                      <span className="font-mono tabular-nums text-[10px] opacity-75">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>

                    {/* Message Body */}
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Rate limit feedback if triggered */}
          {rateLimitNotice && (
            <div className="px-4 py-1.5 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs px-6 font-medium">
              {rateLimitNotice}
            </div>
          )}

          {/* 4. Chat Input Bar */}
          <div className="p-3 sm:p-4 border-t border-neutral-800 bg-neutral-900/90 shrink-0">
            <form onSubmit={handleSend} className="relative flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={inputContent}
                  onChange={(e) => {
                    setInputContent(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={`Send a secret message as ${currentSession.username}... (Enter to send)`}
                  maxLength={2000}
                  className="w-full resize-none rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-100 px-3.5 py-2.5 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition-colors pr-14 leading-normal"
                />
                <span className="absolute bottom-2.5 right-3 text-[10px] font-mono tabular-nums text-neutral-500 pointer-events-none">
                  {inputContent.length}/2000
                </span>
              </div>

              <button
                type="submit"
                disabled={!inputContent.trim() || isSending || !isConnected}
                aria-label="Send message"
                className="h-10 w-10 sm:w-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* 5. Online Members Sidebar / Drawer */}
        <aside
          className={`absolute sm:relative inset-y-0 right-0 z-30 w-64 bg-neutral-900 border-l border-neutral-800 flex flex-col transition-transform duration-200 ease-in-out ${
            showMembersDrawer
              ? 'translate-x-0'
              : 'translate-x-full sm:translate-x-0 sm:w-56 lg:w-64'
          }`}
        >
          <div className="h-12 px-4 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-400" />
              <span className="text-xs font-bold text-neutral-100 uppercase tracking-wider">
                Connected ({members.length})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowMembersDrawer(false)}
              className="sm:hidden w-6 h-6 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {members.map((m) => {
              const isSelf = m.username.toLowerCase() === currentSession.username.toLowerCase();
              return (
                <div
                  key={m.socketId}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                    isSelf
                      ? 'bg-neutral-800 font-semibold text-neutral-100'
                      : 'hover:bg-neutral-800/50 text-neutral-300'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 border border-white/20"
                    style={{
                      backgroundColor: m.color,
                      color: getContrastTextColor(m.color),
                    }}
                  >
                    {m.username.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 truncate">
                    <span>{m.username}</span>
                    {isSelf && <span className="text-[10px] text-neutral-400 ml-1">(you)</span>}
                  </div>
                  {m.isAdmin && (
                    <span className="text-[9px] font-bold text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded bg-emerald-500/10">
                      ADMIN
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 border-t border-neutral-800 text-[11px] text-neutral-500 leading-normal">
            Members drop automatically when disconnecting or window closes.
          </div>
        </aside>
      </div>

      {/* Admin End Group Confirmation Dialog */}
      <AdminEndGroupModal
        isOpen={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
      />

      {/* Admin Credentials & Sharing Modal */}
      {currentSession.isAdmin && (
        <AdminCredentialsModal
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          groupName={currentSession.groupName}
          groupPassword={currentSession.groupPassword}
        />
      )}
    </div>
  );
};

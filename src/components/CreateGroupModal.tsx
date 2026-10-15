import React, { useState } from 'react';
import { X, ShieldAlert, Check, Eye, EyeOff } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { PRESET_CHAT_COLORS, getContrastTextColor } from '../utils/colors';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose }) => {
  const { createGroup, serverStats } = useSocket();

  const [username, setUsername] = useState('');
  const [groupName, setGroupName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PRESET_CHAT_COLORS[0].hex);
  const [customHex, setCustomHex] = useState('');
  const [useCustomHex, setUseCustomHex] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate global server capacity
    if (serverStats.activeGroups >= serverStats.maxGroups) {
      setError('The server is full');
      return;
    }

    const trimmedUser = username.trim();
    const trimmedGroup = groupName.trim();

    if (trimmedUser.length < 2 || trimmedUser.length > 30) {
      setError('Admin username must be between 2 and 30 characters.');
      return;
    }

    if (trimmedGroup.length < 3 || trimmedGroup.length > 40) {
      setError('Group name must be between 3 and 40 characters.');
      return;
    }

    if (password.length < 4) {
      setError('Group password must be at least 4 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    const activeColor = useCustomHex && /^#[0-9A-Fa-f]{6}$/.test(customHex) ? customHex : selectedColor;

    setIsSubmitting(true);

    const result = await createGroup({
      username: trimmedUser,
      groupName: trimmedGroup,
      password,
      color: activeColor,
    });

    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to create group');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl p-6 text-neutral-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-neutral-100">Create a New Group</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Initiate an ephemeral, in-memory secret room
            </p>
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

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/40 border border-red-900/60 text-red-400 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-medium">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Admin Username
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={30}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. SentinelOne"
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition-colors"
            />
            <span className="text-[11px] text-neutral-500 mt-1 block">
              You will be granted administrator controls for this room.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Group Name
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={40}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Project-Omega"
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition-colors"
            />
            <span className="text-[11px] text-neutral-500 mt-1 block">
              Must be unique among currently active groups.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Group Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={4}
                  maxLength={64}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Shared secret"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 p-1 cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={4}
                  maxLength={64}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type secret"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 p-1 cursor-pointer transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Chat Accent Color
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_CHAT_COLORS.map((c) => {
                const isSelected = !useCustomHex && selectedColor === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => {
                      setSelectedColor(c.hex);
                      setUseCustomHex(false);
                    }}
                    style={{ backgroundColor: c.hex }}
                    aria-label={`Select ${c.name}`}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-xs border border-white/20"
                  >
                    {isSelected && (
                      <Check
                        className="w-3.5 h-3.5"
                        style={{ color: getContrastTextColor(c.hex) }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="color"
                value={customHex || selectedColor}
                onChange={(e) => {
                  setCustomHex(e.target.value);
                  setUseCustomHex(true);
                }}
                className="w-7 h-7 rounded cursor-pointer border border-neutral-700 p-0"
              />
              <span className="text-xs text-neutral-400">
                {useCustomHex ? `Custom: ${customHex.toUpperCase()}` : 'Pick custom color'}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? 'Creating Ephemeral Group...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

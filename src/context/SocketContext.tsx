import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ChatMessage,
  GroupMember,
  ServerStats,
  CreateGroupPayload,
  JoinGroupPayload,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types.js';

interface ActiveSession {
  groupId: string;
  groupName: string;
  username: string;
  color: string;
  isAdmin: boolean;
  adminToken?: string;
  groupPassword?: string;
}

interface SocketContextType {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  serverStats: ServerStats;
  currentSession: ActiveSession | null;
  members: GroupMember[];
  messages: ChatMessage[];
  adminGraceSeconds: number | null;
  adminGraceMessage: string | null;
  errorNotification: { code: string; message: string } | null;
  groupDeletedMessage: string | null;
  createGroup: (payload: CreateGroupPayload) => Promise<{ success: boolean; error?: string }>;
  joinGroup: (payload: JoinGroupPayload) => Promise<{ success: boolean; error?: string }>;
  sendMessage: (content: string) => Promise<{ success: boolean; error?: string }>;
  leaveGroup: () => void;
  endGroup: () => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  clearGroupDeleted: () => void;
}

const defaultStats: ServerStats = {
  activeGroups: 0,
  maxGroups: 50,
  totalConnectedUsers: 0,
  canCreateGroup: true,
  uptimeSeconds: 0,
};

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [serverStats, setServerStats] = useState<ServerStats>(defaultStats);
  const [currentSession, setCurrentSession] = useState<ActiveSession | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [adminGraceSeconds, setAdminGraceSeconds] = useState<number | null>(null);
  const [adminGraceMessage, setAdminGraceMessage] = useState<string | null>(null);
  const [errorNotification, setErrorNotification] = useState<{ code: string; message: string } | null>(null);
  const [groupDeletedMessage, setGroupDeletedMessage] = useState<string | null>(null);

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const graceCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const pendingAdminPasswordRef = useRef<string | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('SUBSCRIBE_STATS');

      // Check if we need to reconnect as admin if previously stored in memory
      const savedSession = sessionStorage.getItem('cipherdrop_session');
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          if (parsed.groupId && parsed.adminToken) {
            if (parsed.groupPassword) {
              pendingAdminPasswordRef.current = parsed.groupPassword;
            }
            socket.emit('RECONNECT_ADMIN', {
              groupId: parsed.groupId,
              adminToken: parsed.adminToken,
              username: parsed.username,
              color: parsed.color,
            });
          }
        } catch {
          sessionStorage.removeItem('cipherdrop_session');
        }
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('SERVER_STATS', (stats) => {
      setServerStats(stats);
    });

    socket.on('GROUP_CREATED', (data) => {
      const adminPassword = pendingAdminPasswordRef.current || undefined;
      const session: ActiveSession = {
        groupId: data.groupId,
        groupName: data.groupName,
        username: data.username,
        color: data.color,
        isAdmin: true,
        adminToken: data.adminToken,
        groupPassword: adminPassword,
      };
      setCurrentSession(session);
      setMembers(data.members);
      setMessages(data.messages);
      setAdminGraceSeconds(null);
      setAdminGraceMessage(null);

      // Save admin recovery token strictly in temporary sessionStorage for tab refresh within grace period
      sessionStorage.setItem('cipherdrop_session', JSON.stringify(session));
    });

    socket.on('GROUP_JOINED', (data) => {
      const session: ActiveSession = {
        groupId: data.groupId,
        groupName: data.groupName,
        username: data.username,
        color: data.color,
        isAdmin: false,
      };
      setCurrentSession(session);
      setMembers(data.members);
      setMessages(data.messages);
      setAdminGraceSeconds(null);
      setAdminGraceMessage(null);
    });

    socket.on('NEW_MESSAGE', (msg) => {
      setMessages((prev) => {
        // Prevent duplicate messages
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('MESSAGE_HISTORY', (hist) => {
      setMessages(hist);
    });

    socket.on('MEMBER_JOINED', ({ member }) => {
      setMembers((prev) => {
        if (prev.some((m) => m.socketId === member.socketId)) return prev;
        return [...prev, member];
      });
    });

    socket.on('MEMBER_LEFT', ({ socketId }) => {
      setMembers((prev) => prev.filter((m) => m.socketId !== socketId));
    });

    socket.on('GROUP_DELETED', ({ message }) => {
      // Group was ended by admin or destroyed
      setCurrentSession(null);
      setMembers([]);
      setMessages([]);
      setAdminGraceSeconds(null);
      setAdminGraceMessage(null);
      pendingAdminPasswordRef.current = null;
      sessionStorage.removeItem('cipherdrop_session');
      setGroupDeletedMessage(message);
    });

    socket.on('ADMIN_DISCONNECT_WARNING', ({ gracePeriodSecondsRemaining, message }) => {
      setAdminGraceSeconds(gracePeriodSecondsRemaining);
      setAdminGraceMessage(message);

      if (graceCountdownRef.current) clearInterval(graceCountdownRef.current);
      graceCountdownRef.current = setInterval(() => {
        setAdminGraceSeconds((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(graceCountdownRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    socket.on('ADMIN_RECONNECTED', () => {
      setAdminGraceSeconds(null);
      setAdminGraceMessage(null);
      if (graceCountdownRef.current) {
        clearInterval(graceCountdownRef.current);
        graceCountdownRef.current = null;
      }
    });

    socket.on('ERROR', (err) => {
      setErrorNotification(err);
    });

    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      if (graceCountdownRef.current) clearInterval(graceCountdownRef.current);
      socket.disconnect();
    };
  }, []);

  // Admin heartbeat sender
  useEffect(() => {
    if (currentSession?.isAdmin && currentSession.adminToken && socketRef.current) {
      heartbeatTimerRef.current = setInterval(() => {
        socketRef.current?.emit('ADMIN_HEARTBEAT', {
          adminToken: currentSession.adminToken!,
        });
      }, 15000);
    } else {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    }

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
    };
  }, [currentSession]);

  const createGroup = useCallback(
    (payload: CreateGroupPayload): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current || !isConnected) {
          resolve({ success: false, error: 'Server not connected' });
          return;
        }

        // Store password in memory strictly for the admin
        pendingAdminPasswordRef.current = payload.password;

        socketRef.current.emit('CREATE_GROUP', payload, (res) => {
          if (!res.success) {
            pendingAdminPasswordRef.current = null;
            if (res.error) {
              setErrorNotification({ code: 'CREATION_FAILED', message: res.error });
            }
          }
          resolve(res);
        });
      });
    },
    [isConnected]
  );

  const joinGroup = useCallback(
    (payload: JoinGroupPayload): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current || !isConnected) {
          resolve({ success: false, error: 'Server not connected' });
          return;
        }

        socketRef.current.emit('JOIN_GROUP', payload, (res) => {
          if (!res.success && res.error) {
            setErrorNotification({ code: 'JOIN_FAILED', message: res.error });
          }
          resolve(res);
        });
      });
    },
    [isConnected]
  );

  const sendMessage = useCallback(
    (content: string): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current || !isConnected) {
          resolve({ success: false, error: 'Server disconnected' });
          return;
        }

        socketRef.current.emit('SEND_MESSAGE', { content }, (res) => {
          resolve(res);
        });
      });
    },
    [isConnected]
  );

  const leaveGroup = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('LEAVE_GROUP');
    }
    setCurrentSession(null);
    setMembers([]);
    setMessages([]);
    setAdminGraceSeconds(null);
    setAdminGraceMessage(null);
    sessionStorage.removeItem('cipherdrop_session');
  }, []);

  const endGroup = useCallback((): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socketRef.current || !currentSession?.isAdmin) {
        resolve({ success: false, error: 'Unauthorized' });
        return;
      }

      socketRef.current.emit('END_GROUP', { adminToken: currentSession.adminToken }, (res) => {
        if (res.success) {
          setCurrentSession(null);
          setMembers([]);
          setMessages([]);
          sessionStorage.removeItem('cipherdrop_session');
        }
        resolve(res);
      });
    });
  }, [currentSession]);

  const clearError = useCallback(() => {
    setErrorNotification(null);
  }, []);

  const clearGroupDeleted = useCallback(() => {
    setGroupDeletedMessage(null);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        serverStats,
        currentSession,
        members,
        messages,
        adminGraceSeconds,
        adminGraceMessage,
        errorNotification,
        groupDeletedMessage,
        createGroup,
        joinGroup,
        sendMessage,
        leaveGroup,
        endGroup,
        clearError,
        clearGroupDeleted,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

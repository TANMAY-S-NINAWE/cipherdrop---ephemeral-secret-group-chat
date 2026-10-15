export interface ChatMessage {
  id: string;
  sequence: number;
  sender: string;
  color: string;
  content: string;
  timestamp: number;
  isSystem?: boolean;
  isAdmin?: boolean;
}

export interface GroupMember {
  socketId: string;
  username: string;
  color: string;
  isAdmin: boolean;
  joinedAt: number;
}

export interface ServerStats {
  activeGroups: number;
  maxGroups: number;
  totalConnectedUsers: number;
  canCreateGroup: boolean;
  uptimeSeconds: number;
}

export interface CreateGroupPayload {
  username: string;
  groupName: string;
  password: string;
  color: string;
}

export interface JoinGroupPayload {
  username: string;
  groupName: string;
  password: string;
  color: string;
}

export interface GroupSessionData {
  groupId: string;
  groupName: string;
  username: string;
  color: string;
  isAdmin: boolean;
  adminToken?: string;
  groupPassword?: string;
}

export interface ServerToClientEvents {
  GROUP_CREATED: (data: {
    groupId: string;
    groupName: string;
    adminToken: string;
    username: string;
    color: string;
    members: GroupMember[];
    messages: ChatMessage[];
  }) => void;

  GROUP_JOINED: (data: {
    groupId: string;
    groupName: string;
    username: string;
    color: string;
    isAdmin: boolean;
    members: GroupMember[];
    messages: ChatMessage[];
  }) => void;

  NEW_MESSAGE: (message: ChatMessage) => void;
  MESSAGE_HISTORY: (messages: ChatMessage[]) => void;
  MEMBER_JOINED: (data: { member: GroupMember; memberCount: number }) => void;
  MEMBER_LEFT: (data: { username: string; socketId: string; memberCount: number }) => void;
  MEMBER_COUNT_UPDATED: (data: { memberCount: number; maxMembers: number }) => void;
  
  GROUP_DELETED: (data: { message: string }) => void;
  
  ADMIN_DISCONNECT_WARNING: (data: {
    gracePeriodSecondsRemaining: number;
    message: string;
  }) => void;
  ADMIN_RECONNECTED: (data: { message: string }) => void;

  SERVER_STATS: (stats: ServerStats) => void;

  ERROR: (data: {
    code: 'SERVER_FULL' | 'GROUP_FULL' | 'INVALID_CREDENTIALS' | 'GROUP_NOT_FOUND' | 'NAME_TAKEN' | 'VALIDATION_ERROR' | 'UNAUTHORIZED';
    message: string;
  }) => void;
}

export interface ClientToServerEvents {
  CREATE_GROUP: (
    payload: CreateGroupPayload,
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  JOIN_GROUP: (
    payload: JoinGroupPayload,
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  RECONNECT_ADMIN: (
    payload: { groupId: string; adminToken: string; username: string; color: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  SEND_MESSAGE: (
    payload: { content: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  LEAVE_GROUP: () => void;

  END_GROUP: (
    payload: { adminToken?: string },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  ADMIN_HEARTBEAT: (payload: { adminToken: string }) => void;

  REQUEST_HISTORY: () => void;

  SUBSCRIBE_STATS: () => void;
}

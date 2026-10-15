import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  ChatMessage,
  GroupMember,
  ServerStats,
  CreateGroupPayload,
  JoinGroupPayload,
  ServerToClientEvents,
  ClientToServerEvents,
} from './src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const MAX_ACTIVE_GROUPS = 50;
const MAX_MEMBERS_PER_GROUP = 50;
const ADMIN_GRACE_PERIOD_MS = 60000; // 60 seconds
const MAX_MESSAGE_LENGTH = 2000;

interface ActiveGroup {
  id: string; // Secure random UUID
  name: string;
  salt: string;
  passwordHash: string;
  adminToken: string;
  adminUsername: string;
  adminColor: string;
  adminSocketId: string | null;
  adminDisconnectTimeout: NodeJS.Timeout | null;
  adminDisconnectTimestamp: number | null;
  createdAt: number;
  status: 'active' | 'terminating';
  members: Map<string, GroupMember>; // socketId -> GroupMember
  messages: ChatMessage[];
  sequenceCounter: number;
}

// authorative in-memory storage (zero disk persistence)
const activeGroups = new Map<string, ActiveGroup>();
const groupNameToId = new Map<string, string>(); // lowercased group name -> groupId

// Socket to group mapping
const socketSessionMap = new Map<string, { groupId: string; username: string; isAdmin: boolean }>();

// Simple rate limit trackers
const messageRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const authAttemptRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(map: Map<string, { count: number; resetAt: number }>, key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) {
    return false;
  }
  entry.count += 1;
  return true;
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const computed = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHash, 'hex');
    if (computed.length !== expected.length) return false;
    return crypto.timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}

function sanitizeInput(str: string): string {
  return str.trim().replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '');
}

function getServerStats(): ServerStats {
  let totalConnectedUsers = 0;
  for (const group of activeGroups.values()) {
    if (group.status === 'active') {
      totalConnectedUsers += group.members.size;
    }
  }

  return {
    activeGroups: activeGroups.size,
    maxGroups: MAX_ACTIVE_GROUPS,
    totalConnectedUsers,
    canCreateGroup: activeGroups.size < MAX_ACTIVE_GROUPS,
    uptimeSeconds: Math.floor(process.uptime()),
  };
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  app.use(express.json());

  // Aggregate public server telemetry endpoint
  app.get('/api/stats', (_req, res) => {
    res.json(getServerStats());
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      memory: process.memoryUsage().rss,
      activeGroups: activeGroups.size,
    });
  });

  function broadcastServerStats() {
    const stats = getServerStats();
    io.emit('SERVER_STATS', stats);
  }

  function destroyGroup(
    group: ActiveGroup,
    reason: string = 'This group has been deleted by the administrator. All group messages and temporary session data have been removed.'
  ) {
    if (group.status === 'terminating') return;
    group.status = 'terminating';

    // Clear any pending admin disconnect timer
    if (group.adminDisconnectTimeout) {
      clearTimeout(group.adminDisconnectTimeout);
      group.adminDisconnectTimeout = null;
    }

    const groupId = group.id;
    const lowerName = group.name.toLowerCase();

    // Immediately remove from maps so no one can join or search
    activeGroups.delete(groupId);
    groupNameToId.delete(lowerName);

    // Notify all members
    io.to(groupId).emit('GROUP_DELETED', { message: reason });

    // Disconnect and clean all member socket associations
    for (const [socketId] of group.members) {
      socketSessionMap.delete(socketId);
      const memberSocket = io.sockets.sockets.get(socketId);
      if (memberSocket) {
        memberSocket.leave(groupId);
      }
    }

    // Zero out memory records explicitly
    group.members.clear();
    group.messages = [];
    group.passwordHash = '';
    group.adminToken = '';

    // Update global telemetry
    broadcastServerStats();
  }

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    // Send current server stats immediately to the connecting client
    socket.emit('SERVER_STATS', getServerStats());

    socket.on('SUBSCRIBE_STATS', () => {
      socket.emit('SERVER_STATS', getServerStats());
    });

    // 1. CREATE GROUP
    socket.on('CREATE_GROUP', (payload: CreateGroupPayload, callback) => {
      const clientIp = socket.handshake.address || socket.id;
      if (!checkRateLimit(authAttemptRateLimitMap, `create_${clientIp}`, 10, 60000)) {
        socket.emit('ERROR', { code: 'VALIDATION_ERROR', message: 'Rate limit exceeded. Please wait a moment.' });
        callback?.({ success: false, error: 'Rate limit exceeded' });
        return;
      }

      // Check global server capacity limit
      if (activeGroups.size >= MAX_ACTIVE_GROUPS) {
        socket.emit('ERROR', { code: 'SERVER_FULL', message: 'The server is full' });
        callback?.({ success: false, error: 'The server is full' });
        return;
      }

      const username = sanitizeInput(payload.username || '');
      const groupName = sanitizeInput(payload.groupName || '');
      const password = payload.password || '';
      const color = payload.color || '#10b981';

      if (!username || username.length < 2 || username.length > 30) {
        socket.emit('ERROR', { code: 'VALIDATION_ERROR', message: 'Username must be between 2 and 30 characters.' });
        callback?.({ success: false, error: 'Invalid username' });
        return;
      }

      if (!groupName || groupName.length < 3 || groupName.length > 40) {
        socket.emit('ERROR', { code: 'VALIDATION_ERROR', message: 'Group name must be between 3 and 40 characters.' });
        callback?.({ success: false, error: 'Invalid group name' });
        return;
      }

      if (!password || password.length < 4 || password.length > 64) {
        socket.emit('ERROR', { code: 'VALIDATION_ERROR', message: 'Password must be between 4 and 64 characters.' });
        callback?.({ success: false, error: 'Invalid password' });
        return;
      }

      const lowerName = groupName.toLowerCase();
      if (groupNameToId.has(lowerName)) {
        socket.emit('ERROR', { code: 'NAME_TAKEN', message: 'A group with this name already exists. Choose another name.' });
        callback?.({ success: false, error: 'Group name already in use' });
        return;
      }

      // Generate unpredictable internal ID and admin token
      const groupId = crypto.randomUUID();
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(password, salt);
      const adminToken = crypto.randomBytes(32).toString('hex');

      const adminMember: GroupMember = {
        socketId: socket.id,
        username,
        color,
        isAdmin: true,
        joinedAt: Date.now(),
      };

      const systemWelcomeMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sequence: 1,
        sender: 'System',
        color: '#64748b',
        content: `Secret group "${groupName}" created. Messages exist in RAM only and are wiped upon administrator closure.`,
        timestamp: Date.now(),
        isSystem: true,
      };

      const newGroup: ActiveGroup = {
        id: groupId,
        name: groupName,
        salt,
        passwordHash,
        adminToken,
        adminUsername: username,
        adminColor: color,
        adminSocketId: socket.id,
        adminDisconnectTimeout: null,
        adminDisconnectTimestamp: null,
        createdAt: Date.now(),
        status: 'active',
        members: new Map([[socket.id, adminMember]]),
        messages: [systemWelcomeMessage],
        sequenceCounter: 1,
      };

      activeGroups.set(groupId, newGroup);
      groupNameToId.set(lowerName, groupId);
      socketSessionMap.set(socket.id, { groupId, username, isAdmin: true });

      socket.join(groupId);

      socket.emit('GROUP_CREATED', {
        groupId,
        groupName,
        adminToken,
        username,
        color,
        members: [adminMember],
        messages: [systemWelcomeMessage],
      });

      callback?.({ success: true });
      broadcastServerStats();
    });

    // 2. JOIN GROUP
    socket.on('JOIN_GROUP', (payload: JoinGroupPayload, callback) => {
      const clientIp = socket.handshake.address || socket.id;
      if (!checkRateLimit(authAttemptRateLimitMap, `join_${clientIp}`, 15, 60000)) {
        socket.emit('ERROR', { code: 'VALIDATION_ERROR', message: 'Too many join attempts. Please slow down.' });
        callback?.({ success: false, error: 'Rate limit exceeded' });
        return;
      }

      const username = sanitizeInput(payload.username || '');
      const groupName = sanitizeInput(payload.groupName || '');
      const password = payload.password || '';
      const color = payload.color || '#38bdf8';

      if (!username || username.length < 2 || username.length > 30) {
        socket.emit('ERROR', { code: 'VALIDATION_ERROR', message: 'Username must be between 2 and 30 characters.' });
        callback?.({ success: false, error: 'Invalid username' });
        return;
      }

      const lowerName = groupName.toLowerCase();
      const groupId = groupNameToId.get(lowerName);

      if (!groupId || !activeGroups.has(groupId)) {
        socket.emit('ERROR', { code: 'GROUP_NOT_FOUND', message: 'This group no longer exists.' });
        callback?.({ success: false, error: 'This group no longer exists.' });
        return;
      }

      const group = activeGroups.get(groupId)!;
      if (group.status !== 'active') {
        socket.emit('ERROR', { code: 'GROUP_NOT_FOUND', message: 'This group no longer exists.' });
        callback?.({ success: false, error: 'This group no longer exists.' });
        return;
      }

      // Verify password securely
      const passwordValid = verifyPassword(password, group.salt, group.passwordHash);
      if (!passwordValid) {
        socket.emit('ERROR', { code: 'INVALID_CREDENTIALS', message: 'Invalid group name or password.' });
        callback?.({ success: false, error: 'Invalid group name or password.' });
        return;
      }

      // Enforce 50-member group capacity atomically
      if (group.members.size >= MAX_MEMBERS_PER_GROUP) {
        socket.emit('ERROR', { code: 'GROUP_FULL', message: 'This group is full.' });
        callback?.({ success: false, error: 'This group is full.' });
        return;
      }

      // Check unique username within active group members
      for (const member of group.members.values()) {
        if (member.username.toLowerCase() === username.toLowerCase()) {
          socket.emit('ERROR', {
            code: 'VALIDATION_ERROR',
            message: `The username "${username}" is currently in use in this group. Please choose another username.`,
          });
          callback?.({ success: false, error: 'Username in use in group' });
          return;
        }
      }

      const newMember: GroupMember = {
        socketId: socket.id,
        username,
        color,
        isAdmin: false,
        joinedAt: Date.now(),
      };

      group.members.set(socket.id, newMember);
      socketSessionMap.set(socket.id, { groupId: group.id, username, isAdmin: false });

      socket.join(group.id);

      // System notification for join
      group.sequenceCounter += 1;
      const joinMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sequence: group.sequenceCounter,
        sender: 'System',
        color: '#64748b',
        content: `${username} joined the group.`,
        timestamp: Date.now(),
        isSystem: true,
      };
      group.messages.push(joinMsg);

      // Send group state & complete message history to newly authorized user
      socket.emit('GROUP_JOINED', {
        groupId: group.id,
        groupName: group.name,
        username,
        color,
        isAdmin: false,
        members: Array.from(group.members.values()),
        messages: group.messages,
      });

      // Broadcast join event and system message to all existing members
      socket.to(group.id).emit('MEMBER_JOINED', {
        member: newMember,
        memberCount: group.members.size,
      });
      socket.to(group.id).emit('NEW_MESSAGE', joinMsg);
      io.to(group.id).emit('MEMBER_COUNT_UPDATED', {
        memberCount: group.members.size,
        maxMembers: MAX_MEMBERS_PER_GROUP,
      });

      callback?.({ success: true });
      broadcastServerStats();
    });

    // 3. RECONNECT ADMIN (handles reconnection during grace period)
    socket.on('RECONNECT_ADMIN', (payload, callback) => {
      const { groupId, adminToken, username, color } = payload;
      const group = activeGroups.get(groupId);

      if (!group || group.status !== 'active') {
        socket.emit('ERROR', { code: 'GROUP_NOT_FOUND', message: 'This group no longer exists.' });
        callback?.({ success: false, error: 'Group no longer exists' });
        return;
      }

      if (group.adminToken !== adminToken) {
        socket.emit('ERROR', { code: 'UNAUTHORIZED', message: 'Invalid administrative token.' });
        callback?.({ success: false, error: 'Invalid admin token' });
        return;
      }

      // Cancel pending destruction timer
      if (group.adminDisconnectTimeout) {
        clearTimeout(group.adminDisconnectTimeout);
        group.adminDisconnectTimeout = null;
        group.adminDisconnectTimestamp = null;
      }

      group.adminSocketId = socket.id;

      const adminMember: GroupMember = {
        socketId: socket.id,
        username: username || group.adminUsername,
        color: color || group.adminColor,
        isAdmin: true,
        joinedAt: Date.now(),
      };

      group.members.set(socket.id, adminMember);
      socketSessionMap.set(socket.id, { groupId: group.id, username: adminMember.username, isAdmin: true });

      socket.join(group.id);

      socket.emit('GROUP_CREATED', {
        groupId: group.id,
        groupName: group.name,
        adminToken: group.adminToken,
        username: adminMember.username,
        color: adminMember.color,
        members: Array.from(group.members.values()),
        messages: group.messages,
      });

      // Broadcast to other members that the administrator has reconnected
      io.to(group.id).emit('ADMIN_RECONNECTED', {
        message: 'The group administrator reconnected. Session is preserved.',
      });

      io.to(group.id).emit('MEMBER_COUNT_UPDATED', {
        memberCount: group.members.size,
        maxMembers: MAX_MEMBERS_PER_GROUP,
      });

      callback?.({ success: true });
      broadcastServerStats();
    });

    // 4. SEND MESSAGE
    socket.on('SEND_MESSAGE', (payload, callback) => {
      const session = socketSessionMap.get(socket.id);
      if (!session) {
        socket.emit('ERROR', { code: 'UNAUTHORIZED', message: 'You are not in an active group.' });
        callback?.({ success: false, error: 'Not authorized' });
        return;
      }

      const group = activeGroups.get(session.groupId);
      if (!group || group.status !== 'active') {
        socket.emit('ERROR', { code: 'GROUP_NOT_FOUND', message: 'This group no longer exists.' });
        callback?.({ success: false, error: 'Group closed' });
        return;
      }

      // Per-socket message rate limit (max 5 messages in 2 seconds)
      if (!checkRateLimit(messageRateLimitMap, `msg_${socket.id}`, 5, 2000)) {
        socket.emit('ERROR', { code: 'VALIDATION_ERROR', message: 'Sending messages too rapidly. Please pause.' });
        callback?.({ success: false, error: 'Rate limit' });
        return;
      }

      const rawContent = payload.content || '';
      const content = sanitizeInput(rawContent);

      if (!content || content.length === 0) {
        callback?.({ success: false, error: 'Message cannot be empty' });
        return;
      }

      if (content.length > MAX_MESSAGE_LENGTH) {
        socket.emit('ERROR', { code: 'VALIDATION_ERROR', message: `Message exceeds maximum limit of ${MAX_MESSAGE_LENGTH} characters.` });
        callback?.({ success: false, error: 'Message too long' });
        return;
      }

      const member = group.members.get(socket.id);
      const senderName = member ? member.username : session.username;
      const senderColor = member ? member.color : '#94a3b8';

      group.sequenceCounter += 1;
      const message: ChatMessage = {
        id: crypto.randomUUID(),
        sequence: group.sequenceCounter,
        sender: senderName,
        color: senderColor,
        content,
        timestamp: Date.now(),
        isAdmin: session.isAdmin,
      };

      group.messages.push(message);

      // Broadcast to all connected group members instantly
      io.to(group.id).emit('NEW_MESSAGE', message);
      callback?.({ success: true });
    });

    // 5. REQUEST FULL HISTORY
    socket.on('REQUEST_HISTORY', () => {
      const session = socketSessionMap.get(socket.id);
      if (!session) return;
      const group = activeGroups.get(session.groupId);
      if (group && group.status === 'active') {
        socket.emit('MESSAGE_HISTORY', group.messages);
      }
    });

    // 6. ADMIN HEARTBEAT
    socket.on('ADMIN_HEARTBEAT', (payload) => {
      const session = socketSessionMap.get(socket.id);
      if (!session || !session.isAdmin) return;
      const group = activeGroups.get(session.groupId);
      if (group && group.adminToken === payload.adminToken) {
        // Heartbeat confirmed
        if (group.adminDisconnectTimeout) {
          clearTimeout(group.adminDisconnectTimeout);
          group.adminDisconnectTimeout = null;
          group.adminDisconnectTimestamp = null;
        }
      }
    });

    // 7. EXPLICIT END GROUP (Admin action)
    socket.on('END_GROUP', (payload, callback) => {
      const session = socketSessionMap.get(socket.id);
      if (!session) {
        socket.emit('ERROR', { code: 'UNAUTHORIZED', message: 'You are not in an active group.' });
        callback?.({ success: false, error: 'Not authorized' });
        return;
      }

      const group = activeGroups.get(session.groupId);
      if (!group) {
        callback?.({ success: false, error: 'Group already closed' });
        return;
      }

      // Check admin authorization
      const isAuthorizedAdmin = session.isAdmin || (payload?.adminToken && group.adminToken === payload.adminToken);
      if (!isAuthorizedAdmin) {
        socket.emit('ERROR', { code: 'UNAUTHORIZED', message: 'Only the group administrator can end this group.' });
        callback?.({ success: false, error: 'Unauthorized' });
        return;
      }

      callback?.({ success: true });
      destroyGroup(
        group,
        'This group has been deleted by the administrator. All group messages and temporary session data have been removed.'
      );
    });

    // 8. LEAVE GROUP (Voluntary member departure)
    socket.on('LEAVE_GROUP', () => {
      handleSocketLeave(socket);
    });

    // 9. DISCONNECT (Grace period handling for admin, standard leave for members)
    socket.on('disconnect', () => {
      handleSocketLeave(socket);
    });
  });

  function handleSocketLeave(socket: Socket) {
    const session = socketSessionMap.get(socket.id);
    if (!session) return;

    socketSessionMap.delete(socket.id);
    const group = activeGroups.get(session.groupId);
    if (!group || group.status !== 'active') return;

    group.members.delete(socket.id);
    socket.leave(group.id);

    // If the disconnecting socket is the administrator
    if (session.isAdmin) {
      group.adminSocketId = null;
      group.adminDisconnectTimestamp = Date.now();

      // Start grace period countdown timer
      if (!group.adminDisconnectTimeout) {
        io.to(group.id).emit('ADMIN_DISCONNECT_WARNING', {
          gracePeriodSecondsRemaining: Math.floor(ADMIN_GRACE_PERIOD_MS / 1000),
          message: 'The administrator disconnected. If they do not reconnect within 60 seconds, this group will be destroyed.',
        });

        group.adminDisconnectTimeout = setTimeout(() => {
          // If still disconnected after grace period, terminate group permanently
          const currentGroup = activeGroups.get(group.id);
          if (currentGroup && currentGroup.adminSocketId === null) {
            destroyGroup(
              currentGroup,
              'The administrator disconnected and did not return within the grace period. All temporary group data has been removed.'
            );
          }
        }, ADMIN_GRACE_PERIOD_MS);
      }
    } else {
      // Standard member left
      group.sequenceCounter += 1;
      const leaveMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sequence: group.sequenceCounter,
        sender: 'System',
        color: '#64748b',
        content: `${session.username} left the group.`,
        timestamp: Date.now(),
        isSystem: true,
      };
      group.messages.push(leaveMsg);

      io.to(group.id).emit('MEMBER_LEFT', {
        username: session.username,
        socketId: socket.id,
        memberCount: group.members.size,
      });
      io.to(group.id).emit('NEW_MESSAGE', leaveMsg);
      io.to(group.id).emit('MEMBER_COUNT_UPDATED', {
        memberCount: group.members.size,
        maxMembers: MAX_MEMBERS_PER_GROUP,
      });
    }

    broadcastServerStats();
  }

  // Mount Vite middleware in development mode, or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.use(express.static(path.resolve(__dirname, 'public')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    // Non-persistent minimal server start notice
    console.log(`[CipherDrop] Temporary group chat server online on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[CipherDrop] Server startup failure:', err);
  process.exit(1);
});

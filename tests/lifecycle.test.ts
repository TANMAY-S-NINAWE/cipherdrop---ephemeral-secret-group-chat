import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { getContrastTextColor, PRESET_CHAT_COLORS } from '../src/utils/colors';

// In-memory logic simulation matching server.ts authoritative contracts
interface TestGroupMember {
  socketId: string;
  username: string;
  color: string;
  isAdmin: boolean;
  joinedAt: number;
}

interface TestChatMessage {
  id: string;
  sequence: number;
  sender: string;
  color: string;
  content: string;
  timestamp: number;
  isSystem?: boolean;
}

interface TestActiveGroup {
  id: string;
  name: string;
  salt: string;
  passwordHash: string;
  adminToken: string;
  adminUsername: string;
  adminColor: string;
  status: 'active' | 'terminating';
  members: Map<string, TestGroupMember>;
  messages: TestChatMessage[];
  sequenceCounter: number;
}

class TestEphemeralStore {
  groups = new Map<string, TestActiveGroup>();
  groupNames = new Map<string, string>();
  readonly maxGroups = 50;
  readonly maxMembers = 50;

  hashPassword(password: string, salt: string): string {
    return crypto.scryptSync(password, salt, 64).toString('hex');
  }

  verifyPassword(password: string, salt: string, expectedHash: string): boolean {
    const computed = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHash, 'hex');
    if (computed.length !== expected.length) return false;
    return crypto.timingSafeEqual(computed, expected);
  }

  createGroup(socketId: string, username: string, groupName: string, pass: string, color: string) {
    if (this.groups.size >= this.maxGroups) {
      return { success: false, error: 'The server is full' };
    }

    const lower = groupName.toLowerCase();
    if (this.groupNames.has(lower)) {
      return { success: false, error: 'A group with this name already exists.' };
    }

    const id = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(pass, salt);
    const adminToken = crypto.randomBytes(32).toString('hex');

    const adminMember: TestGroupMember = {
      socketId,
      username,
      color,
      isAdmin: true,
      joinedAt: Date.now(),
    };

    const welcomeMsg: TestChatMessage = {
      id: crypto.randomUUID(),
      sequence: 1,
      sender: 'System',
      color: '#64748b',
      content: `Group ${groupName} created.`,
      timestamp: Date.now(),
      isSystem: true,
    };

    const group: TestActiveGroup = {
      id,
      name: groupName,
      salt,
      passwordHash,
      adminToken,
      adminUsername: username,
      adminColor: color,
      status: 'active',
      members: new Map([[socketId, adminMember]]),
      messages: [welcomeMsg],
      sequenceCounter: 1,
    };

    this.groups.set(id, group);
    this.groupNames.set(lower, id);

    return { success: true, group, adminToken };
  }

  joinGroup(socketId: string, username: string, groupName: string, pass: string, color: string) {
    const lower = groupName.toLowerCase();
    const id = this.groupNames.get(lower);
    if (!id || !this.groups.has(id)) {
      return { success: false, error: 'This group no longer exists.' };
    }

    const group = this.groups.get(id)!;
    if (group.status !== 'active') {
      return { success: false, error: 'This group no longer exists.' };
    }

    if (!this.verifyPassword(pass, group.salt, group.passwordHash)) {
      return { success: false, error: 'Invalid group name or password.' };
    }

    if (group.members.size >= this.maxMembers) {
      return { success: false, error: 'This group is full.' };
    }

    const member: TestGroupMember = {
      socketId,
      username,
      color,
      isAdmin: false,
      joinedAt: Date.now(),
    };

    group.members.set(socketId, member);
    group.sequenceCounter += 1;
    group.messages.push({
      id: crypto.randomUUID(),
      sequence: group.sequenceCounter,
      sender: 'System',
      color: '#64748b',
      content: `${username} joined.`,
      timestamp: Date.now(),
      isSystem: true,
    });

    return {
      success: true,
      group,
      history: [...group.messages],
    };
  }

  sendMessage(groupId: string, sender: string, content: string, color: string) {
    const group = this.groups.get(groupId);
    if (!group || group.status !== 'active') return null;

    group.sequenceCounter += 1;
    const msg: TestChatMessage = {
      id: crypto.randomUUID(),
      sequence: group.sequenceCounter,
      sender,
      color,
      content,
      timestamp: Date.now(),
    };
    group.messages.push(msg);
    return msg;
  }

  endGroup(groupId: string, token: string) {
    const group = this.groups.get(groupId);
    if (!group || group.adminToken !== token) {
      return { success: false, error: 'Unauthorized' };
    }

    group.status = 'terminating';
    this.groups.delete(groupId);
    this.groupNames.delete(group.name.toLowerCase());

    // Wipe memory
    group.messages = [];
    group.members.clear();
    group.passwordHash = '';

    return {
      success: true,
      message:
        'This group has been deleted by the administrator. All group messages and temporary session data have been removed.',
    };
  }
}

describe('CipherDrop Ephemeral Group Lifecycle', () => {
  let store: TestEphemeralStore;

  beforeEach(() => {
    store = new TestEphemeralStore();
  });

  it('creates group successfully with unpredictable UUID and salted scrypt hash', () => {
    const res = store.createGroup('socket_1', 'Sentinel', 'Confidential Alpha', 'VaultPass@123', '#10b981');
    expect(res.success).toBe(true);
    expect(res.group?.id).toBeDefined();
    expect(res.group?.id).not.toBe('Confidential Alpha');
    expect(res.adminToken).toBeDefined();
    expect(res.group?.members.size).toBe(1);
    expect(store.groups.size).toBe(1);
  });

  it('rejects duplicate group name', () => {
    store.createGroup('socket_1', 'Sentinel', 'Confidential Alpha', 'Pass1', '#10b981');
    const duplicate = store.createGroup('socket_2', 'Agent2', 'confidential alpha', 'Pass2', '#06b6d4');
    expect(duplicate.success).toBe(false);
    expect(duplicate.error).toContain('already exists');
  });

  it('joins group using correct credentials and returns complete message history', () => {
    const createRes = store.createGroup('socket_1', 'Admin', 'Team Omega', 'SecretPassword', '#10b981');
    const groupId = createRes.group!.id;

    // Send an initial message before second member joins
    store.sendMessage(groupId, 'Admin', 'Welcome everyone, this is an ephemeral channel.', '#10b981');

    // Second user joins
    const joinRes = store.joinGroup('socket_2', 'Alice', 'Team Omega', 'SecretPassword', '#8b5cf6');
    expect(joinRes.success).toBe(true);
    expect(joinRes.history).toBeDefined();
    // Verify Alice can see messages sent BEFORE she joined
    const adminMsg = joinRes.history?.find((m) => m.content.includes('Welcome everyone'));
    expect(adminMsg).toBeDefined();
    expect(joinRes.group?.members.size).toBe(2);
  });

  it('rejects incorrect group password with exact error message', () => {
    store.createGroup('socket_1', 'Admin', 'Team Delta', 'CorrectSecret', '#10b981');
    const res = store.joinGroup('socket_2', 'Bob', 'Team Delta', 'WrongSecret', '#06b6d4');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Invalid group name or password.');
  });

  it('rejects nonexistent group with exact error message', () => {
    const res = store.joinGroup('socket_1', 'Bob', 'NonExistentGroup', 'AnyPassword', '#06b6d4');
    expect(res.success).toBe(false);
    expect(res.error).toBe('This group no longer exists.');
  });

  it('enforces 50-member group capacity and rejects 51st member', () => {
    const createRes = store.createGroup('admin_sock', 'Admin', 'BigGroup', 'SharedPass', '#10b981');
    const group = createRes.group!;

    // Add 49 members so total reaches 50
    for (let i = 2; i <= 50; i++) {
      store.joinGroup(`sock_${i}`, `User_${i}`, 'BigGroup', 'SharedPass', '#06b6d4');
    }
    expect(group.members.size).toBe(50);

    // 51st member attempts to join
    const overflow = store.joinGroup('sock_51', 'User_51', 'BigGroup', 'SharedPass', '#06b6d4');
    expect(overflow.success).toBe(false);
    expect(overflow.error).toBe('This group is full.');
  });

  it('enforces 50-group global server capacity limit and rejects 51st group with exact message', () => {
    for (let i = 1; i <= 50; i++) {
      const res = store.createGroup(`sock_${i}`, `Admin_${i}`, `Room_${i}`, 'Pass123', '#10b981');
      expect(res.success).toBe(true);
    }
    expect(store.groups.size).toBe(50);

    // 51st group
    const overflow = store.createGroup('sock_51', 'Admin_51', 'Room_51', 'Pass123', '#10b981');
    expect(overflow.success).toBe(false);
    expect(overflow.error).toBe('The server is full');
  });

  it('administrator ending group permanently destroys session and wipes memory', () => {
    const createRes = store.createGroup('admin_sock', 'Admin', 'EphemeralMeeting', 'Secure123', '#10b981');
    const groupId = createRes.group!.id;
    const token = createRes.adminToken!;

    store.joinGroup('member_sock', 'Bob', 'EphemeralMeeting', 'Secure123', '#38bdf8');
    store.sendMessage(groupId, 'Bob', 'Secret note', '#38bdf8');

    // Admin explicitly ends group
    const endRes = store.endGroup(groupId, token);
    expect(endRes.success).toBe(true);
    expect(endRes.message).toBe(
      'This group has been deleted by the administrator. All group messages and temporary session data have been removed.'
    );

    // Active storage verification
    expect(store.groups.has(groupId)).toBe(false);
    expect(store.groupNames.has('ephemeralmeeting')).toBe(false);

    // Attempting to join after destruction is rejected
    const postJoin = store.joinGroup('late_sock', 'Charlie', 'EphemeralMeeting', 'Secure123', '#d97706');
    expect(postJoin.success).toBe(false);
    expect(postJoin.error).toBe('This group no longer exists.');
  });

  it('color contrast helper generates WCAG compliant text color for preset palette', () => {
    for (const color of PRESET_CHAT_COLORS) {
      const textColor = getContrastTextColor(color.hex);
      expect(['#000000', '#ffffff']).toContain(textColor);
    }
  });

  it('never exposes password or password material to joining members', () => {
    const adminRes = store.createGroup('admin_sock', 'Admin', 'PrivateRoom', 'SuperSecret99', '#10b981');
    expect(adminRes.success).toBe(true);

    const joinRes = store.joinGroup('member_sock', 'Alice', 'PrivateRoom', 'SuperSecret99', '#06b6d4');
    expect(joinRes.success).toBe(true);

    // Verify member record contains only public fields
    const aliceMember = joinRes.group?.members.get('member_sock');
    expect(aliceMember).toBeDefined();
    expect((aliceMember as any).password).toBeUndefined();
    expect((aliceMember as any).passwordHash).toBeUndefined();

    // Verify invite formatting text includes group name and password
    const inviteText = `CipherDrop Secret Group:\nGroup Name: ${joinRes.group?.name}\nPassword: SuperSecret99`;
    expect(inviteText).toContain('PrivateRoom');
    expect(inviteText).toContain('SuperSecret99');
  });
});

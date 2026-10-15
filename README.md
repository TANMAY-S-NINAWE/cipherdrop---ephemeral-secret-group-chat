<<<<<<< HEAD
# cipherdrop---ephemeral-secret-group-chat
cipherdrop---ephemeral-secret-group-chat  chating
=======
# CipherDrop - Ephemeral Secret Group Chat

CipherDrop is a browser-based temporary, real-time group chat web application engineered around zero data retention, volatile server-side memory storage, and automated session destruction.

---

## Core Architecture & Security Model

1. **Pure In-Memory Ephemeral Storage**:
   - All active group states, password verification digests, member rosters, and message histories exist solely in server process RAM.
   - No SQL, NoSQL, disk tables, or persistent caches are attached.
   - Any server restart or process termination irrevocably destroys all active groups.

2. **Administrator Session Lifecycle & Destruction**:
   - The user who creates a group is designated as the administrator.
   - **Explicit Destruction**: When the administrator selects "End Group", the server marks the group as terminating, notifies all connected members via `GROUP_DELETED`, disconnects the sockets, and wipes all group records from memory.
   - **Administrator Disconnect Grace Period**: If an administrator disconnects (due to browser close, network drop, or device sleep), the server initiates a 60-second grace timer and alerts group members. If the administrator does not reconnect within 60 seconds, the group self-destructs automatically.

3. **Cryptographic Integrity & Capacity Rules**:
   - Internal group IDs are generated using unpredictable UUIDv4 strings (`crypto.randomUUID()`), completely decoupled from user-facing group names.
   - Passphrases are hashed with a 16-byte cryptographically secure random salt using Node.js `scryptSync` and verified using constant-time `crypto.timingSafeEqual`.
   - Global server capacity is capped at **50 active groups**. When 50 groups are active, group creation is rejected with `"The server is full"`.
   - Each group supports a maximum of **50 simultaneous connected members**. The 51st member is rejected with `"This group is full."`.

4. **Real-Time Synchronization**:
   - Built on Socket.IO over WebSockets with server-assigned monotonic sequence numbers and millisecond timestamps.
   - Authorized joining members immediately receive the full chronological message history from the moment of group creation.

5. **Admin-Only Credentials & Seamless Sharing**:
   - Only the group administrator can see the plaintext group credentials (group name and password) within their local RAM session.
   - One-click copy buttons for Group Name, Password, and Both Credentials together (formatted with clear label text).
   - Native browser Share button (`navigator.share`) that initiates the device's share sheet on demand, with transparent clipboard fallback.
   - Credentials and password verification materials are never exposed to other members over APIs or WebSockets.

6. **Interactive Usability & Theme Memory**:
   - Eye/EyeOff toggle buttons on all password input fields allow users to reveal or conceal passwords without deleting input.
   - Light/Dark theme system automatically synchronizes with device preference initially and remembers manual toggle overrides via `localStorage`.

7. **Honest Privacy Disclosure**:
   - A shared group password provides room access control; it is transport-encrypted via TLS/WSS.
   - Server memory wipes cannot guarantee the elimination of client-side traces outside server control (e.g., OS RAM, browser rendering caches, or user-taken screenshots).

---

## Server & Socket.IO Protocol

### Client to Server Events

| Event | Payload | Description |
|---|---|---|
| `CREATE_GROUP` | `{ username, groupName, password, color }` | Creates a new ephemeral group if capacity allows. |
| `JOIN_GROUP` | `{ username, groupName, password, color }` | Authenticates against salted scrypt hash and syncs full history. |
| `SEND_MESSAGE` | `{ content }` | Sends a message to the group (capped at 2,000 characters). |
| `RECONNECT_ADMIN` | `{ groupId, adminToken, username, color }` | Reconnects administrator during the 60-second grace period. |
| `ADMIN_HEARTBEAT`| `{ adminToken }` | Periodic heartbeat from active administrator session. |
| `END_GROUP` | `{ adminToken }` | Explicitly terminates and wipes the group from RAM. |
| `LEAVE_GROUP` | None | Voluntary departure of a group member. |
| `SUBSCRIBE_STATS`| None | Requests current aggregate server telemetry. |

### Server to Client Events

| Event | Payload | Description |
|---|---|---|
| `GROUP_CREATED` | `{ groupId, groupName, adminToken, username, color, members, messages }` | Returned to creator upon room initialization. |
| `GROUP_JOINED` | `{ groupId, groupName, username, color, isAdmin, members, messages }` | Returned to joining member with complete chat history. |
| `NEW_MESSAGE` | `ChatMessage` object | Broadcast to all group members in real time. |
| `MEMBER_JOINED` | `{ member, memberCount }` | Broadcast when a new member joins. |
| `MEMBER_LEFT` | `{ username, socketId, memberCount }` | Broadcast when a member departs. |
| `MEMBER_COUNT_UPDATED` | `{ memberCount, maxMembers }` | Real-time member count sync. |
| `ADMIN_DISCONNECT_WARNING` | `{ gracePeriodSecondsRemaining, message }` | Broadcast if administrator drops offline. |
| `ADMIN_RECONNECTED` | `{ message }` | Broadcast when administrator reconnects within grace period. |
| `GROUP_DELETED` | `{ message }` | Broadcast upon administrator termination or grace expiry. |
| `SERVER_STATS` | `ServerStats` object | Live telemetry stream of active groups and users. |
| `ERROR` | `{ code, message }` | Authoritative rejection notices (`SERVER_FULL`, etc.). |

---

## Local Development & Setup

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
```
The application will launch on `http://localhost:3000`.

### Running Automated Test Suite
```bash
npm run test
```
Executes the Vitest suite covering group creation, scrypt verification, 50-member capacity limits, 50-group server capacity limits, admin termination, and historical message synchronization.

### Production Build & Deployment
```bash
npm run build
npm start
```
Runs the Express production server serving pre-compiled static assets and the live WebSocket gateway on port 3000.
>>>>>>> 576dfc7 (update 1)

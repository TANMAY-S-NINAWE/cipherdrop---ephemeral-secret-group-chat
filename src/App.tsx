import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { Navbar } from './components/Navbar';
import { HomePage } from './components/HomePage';
import { ChatRoom } from './components/ChatRoom';
import { CreateGroupModal } from './components/CreateGroupModal';
import { JoinGroupModal } from './components/JoinGroupModal';
import { GroupDeletedModal } from './components/GroupDeletedModal';
import { NotificationModal } from './components/NotificationModal';
import { PrivacyModal } from './components/PrivacyModal';
import { SecuritySpecsModal } from './components/SecuritySpecsModal';

function MainContent() {
  const { currentSession } = useSocket();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 transition-colors">
      <Navbar
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenSecurity={() => setIsSecurityOpen(true)}
      />

      <main className="flex-1 flex flex-col">
        {currentSession ? (
          <ChatRoom />
        ) : (
          <HomePage
            onCreateGroup={() => setIsCreateOpen(true)}
            onJoinGroup={() => setIsJoinOpen(true)}
            onOpenPrivacy={() => setIsPrivacyOpen(true)}
            onOpenSecurity={() => setIsSecurityOpen(true)}
          />
        )}
      </main>

      {/* Interactive Modals */}
      <CreateGroupModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <JoinGroupModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
      />

      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />

      <SecuritySpecsModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
      />

      {/* Global Alerts & Notifications */}
      <GroupDeletedModal />
      <NotificationModal />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <MainContent />
      </SocketProvider>
    </ThemeProvider>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FaPaperPlane, FaUser, FaUserPlus } from 'react-icons/fa';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy,
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  Timestamp,
  doc,
  updateDoc,
  arrayUnion,
  getDoc
} from 'firebase/firestore';

interface Message {
  id: string;
  text: string;
  sender: {
    uid: string;
    email: string;
  };
  timestamp: Date;
  channel: string;
  workspaceId: string;
}

const MainPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [message, setMessage] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!workspaceId) {
      navigate('/');
      return;
    }

    // Subscribe to messages collection for this workspace
    const messagesRef = collection(db, 'messages');
    const messagesQuery = query(
      messagesRef,
      where('workspaceId', '==', workspaceId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        text: doc.data().text,
        sender: doc.data().sender,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
        channel: doc.data().channel,
        workspaceId: doc.data().workspaceId
      }));
      setMessages(messagesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [workspaceId, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !auth.currentUser || !workspaceId) return;

    try {
      const messagesRef = collection(db, 'messages');
      await addDoc(messagesRef, {
        text: message.trim(),
        sender: {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email
        },
        timestamp: serverTimestamp(),
        channel: selectedChannel,
        workspaceId
      });
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const shouldShowHeader = (currentMsg: Message, index: number, messages: Message[]) => {
    if (index === 0) return true;
    const prevMsg = messages[index - 1];
    return prevMsg.sender.uid !== currentMsg.sender.uid;
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !workspaceId || !auth.currentUser) return;

    setIsInviting(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
        setInviteError('Please enter a valid email address');
        return;
      }

      const workspaceRef = doc(db, 'workspaces', workspaceId);
      const workspaceSnap = await getDoc(workspaceRef);

      if (!workspaceSnap.exists()) {
        setInviteError('Workspace not found');
        return;
      }

      const workspaceData = workspaceSnap.data();
      
      // Check if user is already a member
      if (workspaceData.members.includes(inviteEmail.trim())) {
        setInviteError('User is already a member of this workspace');
        return;
      }

      // Check if user is already invited
      if (workspaceData.invitedEmails?.includes(inviteEmail.trim())) {
        setInviteError('User has already been invited');
        return;
      }

      // Add email to invited list
      await updateDoc(workspaceRef, {
        invitedEmails: arrayUnion(inviteEmail.trim())
      });

      setInviteSuccess('Invitation sent successfully');
      setInviteEmail('');
      
      // Close modal after a short delay
      setTimeout(() => {
        const modal = document.getElementById('invite-modal') as HTMLDialogElement;
        if (modal) modal.close();
        setInviteSuccess('');
      }, 2000);

    } catch (error) {
      console.error('Error inviting user:', error);
      setInviteError('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="drawer lg:drawer-open h-screen w-screen">
      <input id="main-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col bg-base-200 w-full">
        {/* Navbar */}
        <div className="navbar bg-base-300 w-full">
          <div className="flex-none lg:hidden">
            <label htmlFor="main-drawer" className="btn btn-square btn-ghost drawer-button">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-5 h-5 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </label>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">#{selectedChannel}</h1>
          </div>
          <div className="flex-none gap-2">
            <button 
              className="btn btn-ghost btn-circle"
              onClick={() => {
                const modal = document.getElementById('invite-modal') as HTMLDialogElement;
                if (modal) modal.showModal();
              }}
            >
              <FaUserPlus className="w-5 h-5" />
            </button>
            <button className="btn btn-ghost" onClick={handleSignOut}>Sign Out</button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : messages.filter(m => m.channel === selectedChannel).length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center opacity-50">
                <div className="text-lg font-semibold">No messages yet</div>
                <div className="text-sm">Send the first message in #{selectedChannel}</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-2">
              {messages
                .filter(m => m.channel === selectedChannel)
                .map((msg, index, filteredMessages) => (
                  <div key={msg.id} className="flex pl-4">
                    <div className="w-10 flex-shrink-0">
                      {shouldShowHeader(msg, index, filteredMessages) && (
                        <div className="avatar placeholder">
                          <div className="bg-neutral text-neutral-content rounded-full w-10">
                            <FaUser className="w-6 h-6" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 ml-4">
                      {shouldShowHeader(msg, index, filteredMessages) && (
                        <div className="flex items-baseline mb-1">
                          <span className="font-bold">{msg.sender.email}</span>
                          <time className="text-xs opacity-50 ml-2">{formatTime(msg.timestamp)}</time>
                        </div>
                      )}
                      <div className="text-base-content">{msg.text}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="bg-base-300 p-4 w-full">
          <form onSubmit={handleSendMessage} className="join w-full">
            <button type="submit" className="btn btn-primary join-item">
              <FaPaperPlane />
            </button>
            <input
              type="text"
              placeholder={`Message #${selectedChannel}`}
              className="input input-bordered join-item flex-1 focus:outline-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </form>
        </div>

        {/* Invite Modal */}
        <dialog id="invite-modal" className="modal">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Invite to Workspace</h3>
            <form onSubmit={handleInviteUser}>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Email Address</span>
                </label>
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  className="input input-bordered w-full"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setInviteError('');
                    setInviteSuccess('');
                  }}
                  required
                />
              </div>
              
              {inviteError && (
                <div className="alert alert-error mt-4">
                  <span>{inviteError}</span>
                </div>
              )}
              
              {inviteSuccess && (
                <div className="alert alert-success mt-4">
                  <span>{inviteSuccess}</span>
                </div>
              )}

              <div className="modal-action">
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => {
                    const modal = document.getElementById('invite-modal') as HTMLDialogElement;
                    if (modal) modal.close();
                    setInviteEmail('');
                    setInviteError('');
                    setInviteSuccess('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`btn btn-primary ${isInviting ? 'loading' : ''}`}
                  disabled={isInviting || !inviteEmail.trim()}
                >
                  {isInviting ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button>close</button>
          </form>
        </dialog>
      </div>

      {/* Sidebar */}
      <div className="drawer-side">
        <label htmlFor="main-drawer" className="drawer-overlay"></label>
        <Sidebar onChannelSelect={setSelectedChannel} workspaceId={workspaceId || ''} />
      </div>
    </div>
  );
};

export default MainPage;

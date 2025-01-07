import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FaPaperPlane, FaUser, FaUsers, FaChevronDown, FaChevronRight, FaBuilding, FaCog, FaUserCircle, FaCamera } from 'react-icons/fa';
import { signOut, updateProfile } from 'firebase/auth';
import { auth, db, storage } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy,
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  setDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface Message {
  id: string;
  text: string;
  sender: {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
  };
  timestamp: Date;
  channel: string;
  workspaceId: string;
}

interface UserData {
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

interface ChannelMember {
  uid: string;
  email: string;
  isCurrentUser: boolean;
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
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isInvitedUsersExpanded, setIsInvitedUsersExpanded] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<string[]>([]);
  const [channelMembers, setChannelMembers] = useState<ChannelMember[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [usersCache, setUsersCache] = useState<Record<string, UserData>>({});

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

  useEffect(() => {
    if (!workspaceId) return;

    // Fetch invited users
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const unsubscribe = onSnapshot(workspaceRef, (doc) => {
      if (doc.exists()) {
        setInvitedUsers(doc.data().invitedEmails || []);
      }
    });

    return () => unsubscribe();
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || !selectedChannel || !auth.currentUser?.email) return;

    // Fetch channel members
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const unsubscribe = onSnapshot(workspaceRef, (doc) => {
      if (doc.exists()) {
        const workspaceData = doc.data();
        const allMembers = workspaceData.members || [];
        // Convert member emails to ChannelMember objects
        const members: ChannelMember[] = allMembers.map((email: string) => ({
          uid: email, // Using email as uid for now
          email: email,
          isCurrentUser: email === auth.currentUser?.email
        }));
        setChannelMembers(members);
      }
    });

    return () => unsubscribe();
  }, [workspaceId, selectedChannel, auth.currentUser?.email]);

  useEffect(() => {
    if (auth.currentUser) {
      setDisplayName(auth.currentUser.displayName || '');
    }
  }, []);

  useEffect(() => {
    const userIds = new Set(messages.map(msg => msg.sender.uid));
    
    userIds.forEach(async (uid) => {
      if (!usersCache[uid]) {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUsersCache(prev => ({
            ...prev,
            [uid]: userSnap.data() as UserData
          }));
        }
      }
    });
  }, [messages]);

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
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName,
          photoURL: auth.currentUser.photoURL
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

  const isDirectMessage = (channelName: string) => {
    return ['Alice', 'Bob', 'Charlie', 'David'].includes(channelName);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsUpdatingProfile(true);
    setProfileError('');

    try {
      let photoURL = auth.currentUser.photoURL;

      // Upload new profile picture if selected
      if (profilePicture) {
        const storageRef = ref(storage, `profile_pictures/${auth.currentUser.uid}`);
        const uploadResult = await uploadBytes(storageRef, profilePicture);
        photoURL = await getDownloadURL(uploadResult.ref);
      }

      // Update Auth profile
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim() || null,
        photoURL
      });

      // Update or create user document in Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, {
        email: auth.currentUser.email,
        displayName: displayName.trim() || null,
        photoURL,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Update all messages from this user
      const messagesRef = collection(db, 'messages');
      const userMessagesQuery = query(
        messagesRef,
        where('sender.uid', '==', auth.currentUser.uid)
      );

      const snapshot = await getDocs(userMessagesQuery);
      const batch = writeBatch(db);

      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          'sender.displayName': displayName.trim() || null,
          'sender.photoURL': photoURL
        });
      });

      await batch.commit();

      // Close modal
      const modal = document.getElementById('profile-modal') as HTMLDialogElement;
      if (modal) modal.close();
      
      setProfilePicture(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileError('Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const getUserDisplayName = (senderId: string, senderEmail: string, senderDisplayName?: string) => {
    if (usersCache[senderId]?.displayName) {
      return usersCache[senderId].displayName;
    }
    return senderDisplayName || senderEmail;
  };

  const getUserPhotoURL = (senderId: string, senderPhotoURL?: string) => {
    if (usersCache[senderId]?.photoURL) {
      return usersCache[senderId].photoURL;
    }
    return senderPhotoURL;
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
            <h1 className="text-2xl font-bold">{isDirectMessage(selectedChannel) ? '@' : '#'}{selectedChannel}</h1>
          </div>
          <div className="flex-none gap-2">
            <button 
              className="btn btn-ghost btn-circle"
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            >
              <FaBuilding className="w-5 h-5" />
            </button>
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle">
                <FaUserCircle className="w-6 h-6" />
              </label>
              <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-200 rounded-box w-52">
                <li>
                  <a onClick={() => {
                    const modal = document.getElementById('profile-modal') as HTMLDialogElement;
                    if (modal) modal.showModal();
                  }}>Profile</a>
                </li>
                <li><a>Account Settings</a></li>
                <li><a onClick={handleSignOut} className="text-error">Sign out</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main Content with Right Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 p-4 overflow-y-auto">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              ) : messages.filter(m => m.channel === selectedChannel).length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center opacity-50">
                    <div className="text-lg font-semibold">No messages yet</div>
                    <div className="text-sm">Send the first message to {isDirectMessage(selectedChannel) ? '@' : '#'}{selectedChannel}</div>
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
                            <div className="avatar">
                              {getUserPhotoURL(msg.sender.uid, msg.sender.photoURL) ? (
                                <div className="w-10 rounded-full">
                                  <img src={getUserPhotoURL(msg.sender.uid, msg.sender.photoURL) || ''} alt="Profile" />
                                </div>
                              ) : (
                                <div className="placeholder">
                                  <div className="bg-neutral text-neutral-content rounded-full w-10">
                                    <FaUser className="w-6 h-6" />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 ml-4">
                          {shouldShowHeader(msg, index, filteredMessages) && (
                            <div className="flex items-baseline mb-1">
                              <span className="font-bold">
                                {getUserDisplayName(msg.sender.uid, msg.sender.email, msg.sender.displayName)}
                              </span>
                              <time className="text-xs opacity-50 ml-2">
                                {formatTime(msg.timestamp)}
                              </time>
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
                  placeholder={`Message ${isDirectMessage(selectedChannel) ? '@' : '#'}${selectedChannel}`}
                  className="input input-bordered join-item flex-1 focus:outline-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </form>
            </div>
          </div>

          {/* Right Sidebar */}
          {isRightSidebarOpen && (
            <div className="w-80 bg-base-300 flex flex-col h-full border-l border-base-content/10">
              {/* Add User Widget */}
              <div className="p-4 border-b border-base-content/10">
                <button 
                  className="btn btn-primary w-full"
                  onClick={() => {
                    const modal = document.getElementById('invite-modal') as HTMLDialogElement;
                    if (modal) modal.showModal();
                  }}
                >
                  <FaUser className="w-4 h-4 mr-2" />
                  Add User
                </button>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Channel Members */}
                <div className="mb-6">
                  <h3 className="font-bold mb-4">Channel Members</h3>
                  <div className="space-y-2">
                    {channelMembers.length === 0 ? (
                      <div className="text-sm opacity-50">No members in this channel</div>
                    ) : (
                      channelMembers.map((member) => (
                        <div key={member.uid} className="flex items-center gap-2">
                          <div className="avatar placeholder">
                            <div className="bg-neutral text-neutral-content rounded-full w-8">
                              <FaUser className="w-4 h-4" />
                            </div>
                          </div>
                          <span>
                            {member.email}
                            {member.isCurrentUser && " (you)"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Invited Users Collapse */}
                <div className="border-t border-base-content/10 pt-4">
                  <button
                    className="w-full py-2 flex items-center justify-between hover:bg-base-200 rounded-lg px-2"
                    onClick={() => setIsInvitedUsersExpanded(!isInvitedUsersExpanded)}
                  >
                    <span className="font-bold">Invited Users</span>
                    {isInvitedUsersExpanded ? <FaChevronDown /> : <FaChevronRight />}
                  </button>
                  {isInvitedUsersExpanded && (
                    <div className="mt-2 space-y-2">
                      {invitedUsers.length === 0 ? (
                        <div className="text-sm opacity-50">No pending invites</div>
                      ) : (
                        invitedUsers.map((email, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="avatar placeholder">
                              <div className="bg-neutral text-neutral-content rounded-full w-8">
                                <FaUser className="w-4 h-4" />
                              </div>
                            </div>
                            <span>{email}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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

        {/* Profile Modal */}
        <dialog id="profile-modal" className="modal">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Edit Profile</h3>
            <form onSubmit={handleProfileUpdate}>
              <div className="form-control mb-4">
                <div className="flex flex-col items-center mb-4">
                  <div className="avatar placeholder cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="bg-neutral text-neutral-content rounded-full w-24 relative">
                      {profilePicture ? (
                        <img
                          src={URL.createObjectURL(profilePicture)}
                          alt="Profile preview"
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : auth.currentUser?.photoURL ? (
                        <img
                          src={auth.currentUser.photoURL}
                          alt="Current profile"
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <FaUser className="w-12 h-12" />
                      )}
                      <div className="absolute bottom-0 right-0 bg-base-100 rounded-full p-2">
                        <FaCamera className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setProfilePicture(file);
                    }}
                  />
                </div>

                <label className="label">
                  <span className="label-text">Display Name</span>
                </label>
                <input
                  type="text"
                  placeholder="Your name"
                  className="input input-bordered w-full"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              
              {profileError && (
                <div className="alert alert-error mb-4">
                  <span>{profileError}</span>
                </div>
              )}

              <div className="modal-action">
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => {
                    const modal = document.getElementById('profile-modal') as HTMLDialogElement;
                    if (modal) modal.close();
                    setProfilePicture(null);
                    setProfileError('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`btn btn-primary ${isUpdatingProfile ? 'loading' : ''}`}
                  disabled={isUpdatingProfile}
                >
                  {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
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
        <Sidebar 
          onChannelSelect={setSelectedChannel} 
          workspaceId={workspaceId || ''} 
          selectedChannel={selectedChannel}
        />
      </div>
    </div>
  );
};

export default MainPage;

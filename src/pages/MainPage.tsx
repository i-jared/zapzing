import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MessageInput from '../components/MessageInput';
import FileListModal from '../components/FileListModal';
import MessageList from '../components/MessageList';
import InviteModal from '../components/InviteModal';
import ProfileModal from '../components/ProfileModal';
import AccountModal from '../components/AccountModal';
import FileUploadModal from '../components/FileUploadModal';
import WorkspaceSidebar from '../components/WorkspaceSidebar';
import { FaUserCircle, FaBuilding } from 'react-icons/fa';
import { signOut } from 'firebase/auth';
import { auth, db, storage } from '../firebase';
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
  getDocs,
  limit,
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Message, UserData, ChannelMember } from '../types/chat';
import { formatTime, shouldShowHeader, isDirectMessage, formatFileSize, getFileIcon } from '../utils/chat';
import { getUserDisplayName, getUserPhotoURL } from '../utils/user';
import { handleProfileUpdate, handleEmailUpdate, handlePasswordUpdate, handleResendVerification } from '../utils/auth';

const COMMON_EMOJIS = ['👍', '❤️', '😂', '🎉', '🚀'];

const MainPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [message, setMessage] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitedUsers, setInvitedUsers] = useState<string[]>([]);
  const navigate = useNavigate();
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isInvitedUsersExpanded, setIsInvitedUsersExpanded] = useState(false);
  const [channelMembers, setChannelMembers] = useState<ChannelMember[]>([]);
  const [usersCache, setUsersCache] = useState<Record<string, UserData>>({});
  const [typingUsers, setTypingUsers] = useState<{[key: string]: {displayName: string | null, email: string}}>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [dmUserInfo, setDmUserInfo] = useState<{displayName: string | null, email: string} | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollHeightRef = useRef<number>(0);
  const lastScrollTopRef = useRef<number>(0);
  const [replyingTo, setReplyingTo] = useState<{
    messageId: string;
    senderName: string;
  } | null>(null);

  const isEmailVerified = auth.currentUser?.emailVerified ?? false;

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
        workspaceId: doc.data().workspaceId,
        reactions: doc.data().reactions || {},
        attachment: doc.data().attachment || null
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
    const unsubscribe = onSnapshot(workspaceRef, async (doc) => {
      if (doc.exists()) {
        const workspaceData = doc.data();
        const allMembers = workspaceData.members || [];
        
        // Fetch user data for each member
        const memberPromises = allMembers.map(async (email: string) => {
          const usersQuery = query(
            collection(db, 'users'),
            where('email', '==', email),
            limit(1)
          );
          const userSnapshot = await getDocs(usersQuery);
          const userData = userSnapshot.docs[0]?.data();
          
          return {
            uid: email,
            email: email,
            isCurrentUser: email === auth.currentUser?.email,
            displayName: userData?.displayName || null,
            photoURL: userData?.photoURL || null
          };
        });

        const members = await Promise.all(memberPromises);
        setChannelMembers(members);
      }
    });

    return () => unsubscribe();
  }, [workspaceId, selectedChannel, auth.currentUser?.email]);

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

  // Add effect to track user activity
  useEffect(() => {
    if (!auth.currentUser) return;

    const userActivityRef = doc(db, 'userActivity', auth.currentUser.uid);
    
    // Update last active timestamp
    const updateLastActive = async () => {
      await setDoc(userActivityRef, {
        lastActive: serverTimestamp(),
        email: auth.currentUser?.email,
        displayName: auth.currentUser?.displayName
      }, { merge: true });
    };

    // Update initially
    updateLastActive();

    // Update every 5 minutes if the window is active
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateLastActive();
      }
    }, 5 * 60 * 1000);

    // Update on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateLastActive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Add effect to listen for typing users
  useEffect(() => {
    if (!workspaceId || !selectedChannel) return;

    const typingRef = collection(db, 'typing');
    const q = query(
      typingRef,
      where('workspaceId', '==', workspaceId),
      where('channel', '==', selectedChannel)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const typingData: {[key: string]: {displayName: string | null, email: string}} = {};
      const now = new Date();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Only show typing indicator if timestamp is within last 10 seconds
        const timestamp = data.timestamp?.toDate();
        if (
          doc.id !== auth.currentUser?.uid && 
          data.isTyping && 
          timestamp && 
          (now.getTime() - timestamp.getTime() < 10000)
        ) {
          typingData[doc.id] = {
            displayName: data.displayName,
            email: data.email
          };
        }
      });
      
      setTypingUsers(typingData);
    });

    return () => unsubscribe();
  }, [workspaceId, selectedChannel]);

  // Add function to handle typing status
  const handleTypingStatus = useCallback(async () => {
    if (!auth.currentUser || !workspaceId || !selectedChannel) return;

    const typingRef = doc(db, 'typing', auth.currentUser.uid);
    const userActivityRef = doc(db, 'userActivity', auth.currentUser.uid);

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update both typing status and user activity
    await Promise.all([
      setDoc(typingRef, {
        isTyping: true,
        channel: selectedChannel,
        workspaceId,
        timestamp: serverTimestamp(),
        displayName: auth.currentUser.displayName,
        email: auth.currentUser.email
      }),
      setDoc(userActivityRef, {
        lastActive: serverTimestamp(),
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName
      }, { merge: true })
    ]);

    // Set timeout to clear typing status after 5 seconds
    typingTimeoutRef.current = setTimeout(async () => {
      if (!auth.currentUser) return;
      
      await setDoc(typingRef, {
        isTyping: false,
        channel: selectedChannel,
        workspaceId,
        timestamp: serverTimestamp(),
        displayName: auth.currentUser?.displayName || null,
        email: auth.currentUser?.email || null
      });
    }, 5000);
  }, [workspaceId, selectedChannel]);

  // Update message input handler to use debounced typing status
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    handleTypingStatus();
  }, [handleTypingStatus]);

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
    if (!message.trim() || !auth.currentUser || !workspaceId || !isEmailVerified) return;

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

  const handleInviteUser = async (email: string) => {
    if (!workspaceId || !auth.currentUser || !isEmailVerified) return;

      // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new Error('Please enter a valid email address');
      }

      const workspaceRef = doc(db, 'workspaces', workspaceId);
      const workspaceSnap = await getDoc(workspaceRef);

      if (!workspaceSnap.exists()) {
      throw new Error('Workspace not found');
      }

      const workspaceData = workspaceSnap.data();
      
      // Check if user is already a member
    if (workspaceData.members.includes(email.trim())) {
      throw new Error('User is already a member of this workspace');
      }

      // Check if user is already invited
    if (workspaceData.invitedEmails?.includes(email.trim())) {
      throw new Error('User has already been invited');
      }

      // Add email to invited list
      await updateDoc(workspaceRef, {
      invitedEmails: arrayUnion(email.trim())
    });
  };

  const handleFileUpload = async (file: File) => {
    if (!auth.currentUser || !workspaceId) return;

    try {
      // Upload file to Firebase Storage
      const storageRef = ref(storage, `attachments/${workspaceId}/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // Create message with attachment
      const messagesRef = collection(db, 'messages');
      await addDoc(messagesRef, {
        text: '',
        sender: {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName,
          photoURL: auth.currentUser.photoURL
        },
        timestamp: serverTimestamp(),
        channel: selectedChannel,
        workspaceId,
        attachment: {
          type: 'file',
          url: downloadURL,
          name: file.name,
          size: file.size,
          contentType: file.type
        }
      });

      setSelectedFile(null);
      const modal = document.getElementById('file-upload-modal') as HTMLDialogElement;
      if (modal) modal.close();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  // Function to preserve scroll position when content changes
  const preserveScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const scrollDelta = container.scrollHeight - lastScrollHeightRef.current;
    if (scrollDelta > 0 && container.scrollTop === lastScrollTopRef.current) {
      container.scrollTop += scrollDelta;
    }
    
    lastScrollHeightRef.current = container.scrollHeight;
    lastScrollTopRef.current = container.scrollTop;
  }, []);

  // Add effect to handle image loads
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Store initial scroll values
    lastScrollHeightRef.current = container.scrollHeight;
    lastScrollTopRef.current = container.scrollTop;

    // Find all images in messages
    const images = container.getElementsByTagName('img');
    
    const handleImageLoad = () => {
      preserveScroll();
    };

    // Add load event listeners to all images
    Array.from(images).forEach(img => {
      if (!img.complete) {
        img.addEventListener('load', handleImageLoad);
      }
    });

    return () => {
      Array.from(images).forEach(img => {
        img.removeEventListener('load', handleImageLoad);
      });
    };
  }, [messages, preserveScroll]);

  // Initialize scroll position
  useEffect(() => {
    if (!loading) {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
        lastScrollHeightRef.current = container.scrollHeight;
        lastScrollTopRef.current = container.scrollTop;
      }
    }
  }, [loading]);

  // Add effect to fetch DM user info
  useEffect(() => {
    if (!selectedChannel || !isDirectMessage(selectedChannel)) {
      setDmUserInfo(null);
      return;
    }

    const fetchUserInfo = async () => {
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', selectedChannel),
        limit(1)
      );
      const userSnapshot = await getDocs(usersQuery);
      
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        setDmUserInfo({
          displayName: userData.displayName,
          email: selectedChannel
        });
      } else {
        setDmUserInfo({
          displayName: null,
          email: selectedChannel
        });
      }
    };

    fetchUserInfo();
  }, [selectedChannel]);

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!auth.currentUser || !workspaceId) return;

    const messageRef = doc(db, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) return;

    const currentReactions = messageDoc.data().reactions || {};
    const currentReaction = currentReactions[emoji] || { emoji, users: [] };
    const userIndex = currentReaction.users.indexOf(auth.currentUser.uid);

    if (userIndex === -1) {
      // Add reaction
      await updateDoc(messageRef, {
        [`reactions.${emoji}`]: {
          emoji,
          users: [...currentReaction.users, auth.currentUser.uid]
        }
      });
    } else {
      // Remove reaction
      const updatedUsers = currentReaction.users.filter(uid => uid !== auth.currentUser?.uid);
      if (updatedUsers.length === 0) {
        // Remove the entire emoji entry if no users left
        const { [emoji]: removed, ...remainingReactions } = currentReactions;
        await updateDoc(messageRef, {
          reactions: remainingReactions
        });
      } else {
        await updateDoc(messageRef, {
          [`reactions.${emoji}`]: {
            emoji,
            users: updatedUsers
          }
        });
      }
    }
  };

  const handleReply = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const senderName = getUserDisplayName(
      message.sender.uid,
      message.sender.email,
      usersCache,
      message.sender.displayName
    );
    
    setReplyingTo({
      messageId,
      senderName
    });
    
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (input) {
      input.focus();
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
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
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold">
                {isDirectMessage(selectedChannel) ? (
                  <>@{dmUserInfo?.displayName || selectedChannel}</>
                ) : (
                  <>#{selectedChannel}</>
                )}
              </h1>
            </div>
          </div>
          <div className="flex-none gap-2">
            <button 
              className="btn btn-ghost btn-circle"
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              disabled={!isEmailVerified}
              title={!isEmailVerified ? "Please verify your email to access workspace settings" : ""}
            >
              <FaBuilding className="w-5 h-5" />
            </button>
            <div className="dropdown dropdown-end">
              <div className="indicator">
                <label tabIndex={0} className="btn btn-ghost btn-circle relative">
                  <FaUserCircle className="w-6 h-6" />
                  {!isEmailVerified && (
                    <span className="absolute -top-1 -right-1 badge badge-error badge-xs w-3 h-3 p-0"></span>
                  )}
                </label>
              </div>
              <ul tabIndex={0} className="mt-3 z-[100] p-2 shadow menu menu-sm dropdown-content bg-base-200 rounded-box w-52">
                <li>
                  <a onClick={() => {
                    const modal = document.getElementById('profile-modal') as HTMLDialogElement;
                    if (modal) modal.showModal();
                  }}>Profile</a>
                </li>
                <li>
                  <a onClick={() => {
                    if (auth.currentUser?.email) {
                    const modal = document.getElementById('account-modal') as HTMLDialogElement;
                    if (modal) modal.showModal();
                    }
                  }} className="relative">
                    Account
                    {!isEmailVerified && (
                      <span className="badge badge-error badge-sm">!</span>
                    )}
                  </a>
                </li>
                <li><a onClick={handleSignOut} className="text-error">Sign out</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main Content with Right Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Messages Area with Fixed Input */}
          <div className="flex-1 relative flex flex-col">
            {/* Scrollable Messages Container */}
            <div 
              ref={messagesContainerRef}
              className="absolute inset-0 overflow-y-auto flex flex-col-reverse" 
              style={{ paddingBottom: '130px' }}
            >
              <MessageList 
                messages={messages.filter(m => m.channel === selectedChannel)}
                loading={loading}
                isDirectMessage={isDirectMessage(selectedChannel)}
                channelName={selectedChannel}
                getUserDisplayName={(senderId, email, displayName) => getUserDisplayName(senderId, email, usersCache, displayName)}
                getUserPhotoURL={(senderId, photoURL) => getUserPhotoURL(senderId, usersCache, photoURL)}
                shouldShowHeader={(msg, index, msgs) => shouldShowHeader(msg.sender.uid, index, msgs.map(m => m.sender.uid))}
                formatTime={formatTime}
                handleAddReaction={handleAddReaction}
                formatFileSize={formatFileSize}
                getFileIcon={getFileIcon}
                commonEmojis={COMMON_EMOJIS}
                onReply={handleReply}
                replyingToId={replyingTo?.messageId}
              />
            </div>

            {/* Fixed Message Input */}
            <div className="absolute bottom-0 left-0 right-0 bg-base-200 p-4">
              <MessageInput 
                message={message}
                isEmailVerified={isEmailVerified}
                typingUsers={typingUsers}
                isDirectMessage={isDirectMessage(selectedChannel)}
                channelName={selectedChannel}
                displayName={dmUserInfo?.displayName || null}
                onMessageChange={handleMessageChange}
                onSubmit={handleSendMessage}
                onFileClick={() => {
                  const modal = document.getElementById('file-upload-modal') as HTMLDialogElement;
                  if (modal) modal.showModal();
                }}
                replyTo={replyingTo ? {
                  senderName: replyingTo.senderName,
                  onCancel: handleCancelReply
                } : undefined}
              />
            </div>
          </div>

          {/* Right Sidebar */}
          {isRightSidebarOpen && (
            <WorkspaceSidebar
              isEmailVerified={isEmailVerified}
              channelMembers={channelMembers}
              invitedUsers={invitedUsers}
              isInvitedUsersExpanded={isInvitedUsersExpanded}
              onInviteClick={() => {
                      const modal = document.getElementById('invite-modal') as HTMLDialogElement;
                      if (modal) modal.showModal();
                    }}
              onToggleInvitedUsers={() => setIsInvitedUsersExpanded(!isInvitedUsersExpanded)}
            />
          )}
                </div>

        {/* Modals */}
        <InviteModal onInvite={handleInviteUser} />
        <ProfileModal 
          user={auth.currentUser} 
          onUpdateProfile={(displayName, profilePicture) => handleProfileUpdate(auth.currentUser!, displayName, profilePicture, setUsersCache)} 
        />
        <AccountModal 
          user={auth.currentUser}
          isEmailVerified={isEmailVerified}
          onUpdateEmail={(newEmail, currentPassword) => {
            if (!auth.currentUser) return Promise.reject(new Error('No user logged in'));
            return handleEmailUpdate(auth.currentUser, newEmail, currentPassword);
          }}
          onUpdatePassword={(newPassword, currentPassword) => {
            if (!auth.currentUser) return Promise.reject(new Error('No user logged in'));
            return handlePasswordUpdate(auth.currentUser, newPassword, currentPassword);
          }}
          onResendVerification={() => {
            if (!auth.currentUser) return Promise.reject(new Error('No user logged in'));
            return handleResendVerification(auth.currentUser);
          }}
        />
        <FileUploadModal
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
          onFileUpload={handleFileUpload}
          onClose={() => {
            const modal = document.getElementById('file-upload-modal') as HTMLDialogElement;
                    if (modal) modal.close();
            setSelectedFile(null);
          }}
        />

        {/* Files Modal */}
        <FileListModal 
          messages={messages.filter(m => m.channel === selectedChannel && m.attachment)}
          fileSearchQuery={fileSearchQuery}
          onSearchChange={(query) => setFileSearchQuery(query)}
          getUserDisplayName={(senderId, email, displayName) => getUserDisplayName(senderId, email, usersCache, displayName)}
        />
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

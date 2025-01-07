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
import { FaUserCircle, FaBuilding, FaFolder, FaLink } from 'react-icons/fa';
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
import { getUserDisplayName, getUserPhotoURL, setGlobalUsersCache } from '../utils/user';
import { handleProfileUpdate, handleEmailUpdate, handlePasswordUpdate, handleResendVerification } from '../utils/auth';
import LinkListModal from '../components/LinkListModal';

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
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollHeightRef = useRef<number>(0);
  const lastScrollTopRef = useRef<number>(0);
  const [replyingTo, setReplyingTo] = useState<{
    messageId: string;
    senderName: string;
  } | null>(null);
  const [selectedThread, setSelectedThread] = useState<{
    messageId: string;
    replies: Message[];
  } | null>(null);
  const [threadMessage, setThreadMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    message: Message;
    preview: string;
    context: string;
  }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const messageToScrollToRef = useRef<string | null>(null);
  const [dmDisplayName, setDmDisplayName] = useState<string | undefined>();
  const [workspaceName, setWorkspaceName] = useState('Workspace');

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
      const messagesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
        id: doc.id,
          text: data.text,
          sender: data.sender,
          timestamp: data.timestamp?.toDate() || new Date(),
          channel: data.channel,
          workspaceId: data.workspaceId,
          reactions: data.reactions || {},
          attachment: data.attachment || null,
          replyTo: data.replyTo || null,
          // Count replies for this message
          replyCount: snapshot.docs.filter(m => 
            m.data().replyTo?.messageId === doc.id
          ).length
        };
      });
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

  // Update global users cache whenever local cache changes
  useEffect(() => {
    setGlobalUsersCache(usersCache);
  }, [usersCache]);

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
      const messageData = {
        text: message.trim(),
        sender: {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName,
          photoURL: auth.currentUser.photoURL
        },
        timestamp: serverTimestamp(),
        channel: selectedChannel,
        workspaceId,
        // Add reply metadata if replying to a message
        ...(replyingTo ? {
          replyTo: {
            messageId: replyingTo.messageId,
            threadId: replyingTo.messageId, // Use original message as thread ID
            senderName: replyingTo.senderName
          }
        } : {})
      };

      const docRef = await addDoc(messagesRef, messageData);
      
      // Create a new message object with the sent data
      const newMessage: Message = {
        id: docRef.id,
        text: messageData.text,
        sender: {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email || '',
          displayName: auth.currentUser.displayName || undefined,
          photoURL: auth.currentUser.photoURL || undefined
        },
        timestamp: new Date(), // Use current time for immediate display
        channel: messageData.channel,
        workspaceId: messageData.workspaceId,
        replyTo: messageData.replyTo
      };

      // Update the thread's replies immediately
      setSelectedThread(current => current ? {
        ...current,
        replies: [...current.replies, newMessage]
      } : null);

      setMessage('');
      setReplyingTo(null);
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
    // If clicking on the same message that's being replied to, cancel the reply
    if (replyingTo?.messageId === messageId) {
      setReplyingTo(null);
      return;
    }

    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    // If message has replies, open the thread view
    if ((message.replyCount ?? 0) > 0) {
      handleOpenThread(messageId);
      return;
    }

    const senderName = getUserDisplayName(
      message.sender.uid,
      message.sender.email,
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

  // Add function to handle thread opening
  const handleOpenThread = async (messageId: string) => {
    // Get all replies for this message
      const messagesRef = collection(db, 'messages');
    const repliesQuery = query(
      messagesRef,
      where('workspaceId', '==', workspaceId),
      where('replyTo.messageId', '==', messageId),
      orderBy('timestamp', 'asc')
    );

    const repliesSnapshot = await getDocs(repliesQuery);
    const replies = repliesSnapshot.docs.map(doc => ({
      id: doc.id,
      text: doc.data().text,
      sender: doc.data().sender,
      timestamp: doc.data().timestamp?.toDate() || new Date(),
      channel: doc.data().channel,
      workspaceId: doc.data().workspaceId,
      reactions: doc.data().reactions || {},
      attachment: doc.data().attachment || null,
      replyTo: doc.data().replyTo || null
    }));

    setSelectedThread({
      messageId,
      replies
    });
  };

  // Add function to close thread
  const handleCloseThread = () => {
    setSelectedThread(null);
  };

  // Add wrapper functions to match MessageList prop types
  const getDisplayNameForMessage = (senderId: string, senderEmail: string, senderDisplayName?: string) => {
    return getUserDisplayName(senderId, senderEmail, senderDisplayName);
  };

  const getPhotoURLForMessage = (senderId: string, senderPhotoURL?: string) => {
    return getUserPhotoURL(senderId, senderPhotoURL);
  };

  const shouldShowHeaderForMessage = (msg: Message, index: number, messages: Message[]) => {
    return shouldShowHeader(msg.sender.uid, index, messages.map(m => m.sender.uid));
  };

  const handleThreadMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setThreadMessage(e.target.value);
    handleTypingStatus();
  }, [handleTypingStatus]);

  const handleThreadSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadMessage.trim() || !auth.currentUser || !workspaceId || !isEmailVerified || !selectedThread) return;

    try {
      const messagesRef = collection(db, 'messages');
      const messageData = {
        text: threadMessage.trim(),
        sender: {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName,
          photoURL: auth.currentUser.photoURL
        },
        timestamp: serverTimestamp(),
        channel: selectedChannel,
        workspaceId,
        replyTo: {
          messageId: selectedThread.messageId,
          threadId: selectedThread.messageId,
          senderName: getUserDisplayName(
            messages.find(m => m.id === selectedThread.messageId)?.sender.uid || '',
            messages.find(m => m.id === selectedThread.messageId)?.sender.email || '',
            messages.find(m => m.id === selectedThread.messageId)?.sender.displayName
          )
        }
      };

      const docRef = await addDoc(messagesRef, messageData);
      
      // Create a new message object with the sent data
      const newMessage: Message = {
        id: docRef.id,
        text: messageData.text,
        sender: {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email || '',
          displayName: auth.currentUser.displayName || undefined,
          photoURL: auth.currentUser.photoURL || undefined
        },
        timestamp: new Date(), // Use current time for immediate display
        channel: messageData.channel,
        workspaceId: messageData.workspaceId,
        replyTo: messageData.replyTo
      };

      // Update the thread's replies immediately
      setSelectedThread(current => current ? {
        ...current,
        replies: [...current.replies, newMessage]
      } : null);

      setThreadMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Add debounced search function
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setIsSearching(true);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search for 300ms
    searchTimeoutRef.current = setTimeout(() => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      // Search through messages
      const results = messages
        .filter(msg => {
          const searchText = msg.text.toLowerCase();
          const searchTerms = query.toLowerCase().split(' ');
          return searchTerms.every(term => searchText.includes(term));
        })
        .map(msg => ({
          message: msg,
          preview: msg.text.length > 100 ? msg.text.slice(0, 100) + '...' : msg.text,
          context: isDirectMessage(msg.channel) ? 
            `DM with ${getUserDisplayName(msg.sender.uid, msg.sender.email, msg.sender.displayName)}` : 
            `#${msg.channel}${msg.replyTo ? ' (in thread)' : ''}`
        }))
        .slice(0, 5); // Limit to 5 results

      setSearchResults(results);
      setIsSearching(false);
    }, 300);
  }, [messages, usersCache]);

  // Add effect to handle scrolling to message
  useEffect(() => {
    if (messageToScrollToRef.current) {
      const messageElement = document.getElementById(`message-${messageToScrollToRef.current}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.classList.add('bg-primary/10');
        setTimeout(() => {
          messageElement.classList.remove('bg-primary/10');
        }, 2000);
        messageToScrollToRef.current = null;
      }
    }
  }, [messages, selectedChannel, selectedThread]); // Re-run when messages, channel, or thread changes

  // Update search result handling
  const handleSearchResultClick = useCallback(async (result: { message: Message; preview: string; context: string }) => {
    // Switch to the correct channel
    setSelectedChannel(result.message.channel);
    
    // If it's in a thread
    if (result.message.replyTo) {
      // Open the parent thread
      await handleOpenThread(result.message.replyTo.threadId);
    } else if (result.message.replyCount && result.message.replyCount > 0) {
      // If the message has replies, open its thread
      await handleOpenThread(result.message.id);
    }
    
    // Set the message to scroll to
    messageToScrollToRef.current = result.message.id;
    
    // Clear search
    setSearchQuery('');
    setSearchResults([]);
  }, [setSelectedChannel, handleOpenThread]);

  const handleChannelSelect = (channel: string, displayName?: string) => {
    setSelectedChannel(channel);
    setDmDisplayName(displayName);
  };

  // Add effect to fetch workspace data
  useEffect(() => {
    if (!workspaceId) return;

    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const unsubscribe = onSnapshot(workspaceRef, (doc) => {
      if (doc.exists()) {
        setWorkspaceName(doc.data().name);
      }
    });

    return () => unsubscribe();
  }, [workspaceId]);

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
                  <>@{dmDisplayName || selectedChannel}</>
                ) : (
                  <>#{selectedChannel}</>
                )}
              </h1>
              <div className="flex gap-1">
                <button
                  className="btn btn-ghost btn-xs btn-square w-fit"
                  onClick={() => {
                    const modal = document.getElementById('files-modal') as HTMLDialogElement;
                    if (modal) modal.showModal();
                  }}
                  title="Browse files"
                >
                  <FaFolder className="w-6 h-3" />
                </button>
                <button
                  className="btn btn-ghost btn-xs btn-square w-fit"
                  onClick={() => {
                    const modal = document.getElementById('links-modal') as HTMLDialogElement;
                    if (modal) modal.showModal();
                  }}
                  title="Browse links"
                >
                  <FaLink className="w-6 h-3" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="flex-none dropdown dropdown-bottom dropdown-end w-96 mx-4">
            <input
              type="text"
              placeholder="Search messages..."
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {(searchResults.length > 0 || isSearching) && (
              <div className="dropdown-content z-[100] menu bg-base-200 w-full mt-2 p-2 shadow-lg rounded-box">
                {isSearching ? (
                  <div className="flex items-center justify-center p-4">
                    <span className="loading loading-spinner loading-md"></span>
                  </div>
                ) : (
                  searchResults.map((result) => (
                    <div
                      key={result.message.id}
                      onClick={() => handleSearchResultClick(result)}
                      className="p-2 hover:bg-base-300 rounded-lg cursor-pointer"
                    >
                      <div className="text-sm font-medium">{result.preview}</div>
                      <div className="text-xs opacity-70">{result.context}</div>
              </div>
                  ))
                )}
            </div>
            )}
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
                messages={messages.filter(m => 
                  m.channel === selectedChannel && 
                  !m.replyTo // Only show messages that aren't replies
                )}
                loading={loading}
                isDirectMessage={isDirectMessage(selectedChannel)}
                channelName={selectedChannel}
                getUserDisplayName={getDisplayNameForMessage}
                getUserPhotoURL={getPhotoURLForMessage}
                handleAddReaction={handleAddReaction}
                shouldShowHeader={shouldShowHeaderForMessage}
                formatTime={formatTime}
                formatFileSize={formatFileSize}
                getFileIcon={getFileIcon}
                commonEmojis={COMMON_EMOJIS}
                onReply={handleReply}
                replyingToId={replyingTo?.messageId}
                onOpenThread={handleOpenThread}
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
              workspaceName={workspaceName}
              onSwitchWorkspace={() => navigate('/')}
            />
          )}

          {/* Thread Drawer */}
          {selectedThread && (
            <div className="fixed inset-0 z-20">
              {/* Backdrop */}
              <div 
                className="absolute inset-0 bg-black/30" 
                onClick={handleCloseThread}
              />
              {/* Drawer Content */}
              <div className="absolute right-0 top-0 bottom-0 w-[480px] bg-base-200 shadow-xl transition-transform flex flex-col">
                {/* Thread Header */}
                <div className="navbar bg-base-300">
                  <div className="flex-1">
                    <span className="text-lg font-semibold">Thread</span>
                              </div>
                  <div className="flex-none">
                  <button
                      className="btn btn-ghost btn-sm"
                      onClick={handleCloseThread}
                  >
                      ✕
                  </button>
                              </div>
        </div>

                {/* Thread Content */}
                <div className="overflow-y-auto flex-1">
                  <div className="p-4">
                    {/* Original Message */}
                    <MessageList
                      messages={[messages.find(m => m.id === selectedThread.messageId)!]}
                      loading={false}
                      isDirectMessage={isDirectMessage(selectedChannel)}
                      channelName={selectedChannel}
                      getUserDisplayName={getDisplayNameForMessage}
                      getUserPhotoURL={getPhotoURLForMessage}
                      shouldShowHeader={() => true}
                      formatTime={formatTime}
                      handleAddReaction={handleAddReaction}
                      formatFileSize={formatFileSize}
                      getFileIcon={getFileIcon}
                      commonEmojis={COMMON_EMOJIS}
                      hideReplyButton={true}
                    />

                    {/* Divider */}
                    <div className="divider">Replies</div>

                    {/* Reply Messages */}
                    <MessageList
                      messages={selectedThread.replies}
                      loading={false}
                      isDirectMessage={isDirectMessage(selectedChannel)}
                      channelName={selectedChannel}
                      getUserDisplayName={getDisplayNameForMessage}
                      getUserPhotoURL={getPhotoURLForMessage}
                      shouldShowHeader={() => true}
                      formatTime={formatTime}
                      handleAddReaction={handleAddReaction}
                      formatFileSize={formatFileSize}
                      getFileIcon={getFileIcon}
                      commonEmojis={COMMON_EMOJIS}
                      hideReplyButton={true}
                    />
                      </div>
                </div>

                {/* Thread Input */}
                <div className="p-4 bg-base-200 border-t border-base-300">
                  <MessageInput 
                    message={threadMessage}
                    isEmailVerified={isEmailVerified}
                    typingUsers={typingUsers}
                    isDirectMessage={isDirectMessage(selectedChannel)}
                    channelName={selectedChannel}
                    displayName={dmUserInfo?.displayName || null}
                    onMessageChange={handleThreadMessageChange}
                    onSubmit={handleThreadSendMessage}
                    onFileClick={() => {
                      const modal = document.getElementById('file-upload-modal') as HTMLDialogElement;
                      if (modal) modal.showModal();
                    }}
                    replyTo={{
                      senderName: getUserDisplayName(
                        messages.find(m => m.id === selectedThread.messageId)?.sender.uid || '',
                        messages.find(m => m.id === selectedThread.messageId)?.sender.email || '',
                        messages.find(m => m.id === selectedThread.messageId)?.sender.displayName
                      ),
                      onCancel: handleCloseThread
                    }}
                  />
            </div>
              </div>
              </div>
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
        getUserDisplayName={getDisplayNameForMessage}
      />

      {/* Links Modal */}
      <LinkListModal 
        messages={messages.filter(m => m.channel === selectedChannel)}
        linkSearchQuery={linkSearchQuery}
        onSearchChange={(query) => setLinkSearchQuery(query)}
        getUserDisplayName={getDisplayNameForMessage}
      />
      </div>

      {/* Sidebar */}
      <div className="drawer-side z-40">
        <label htmlFor="main-drawer" className="drawer-overlay"></label>
        <Sidebar 
          onChannelSelect={handleChannelSelect} 
          workspaceId={workspaceId || ''} 
          selectedChannel={selectedChannel}
          usersCache={usersCache}
        />
      </div>
    </div>
  );
};

export default MainPage;

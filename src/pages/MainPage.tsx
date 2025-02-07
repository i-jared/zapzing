import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import MessageInput from "../components/MessageInput";
import FileListModal from "../components/FileListModal";
import MessageList from "../components/MessageList";
import InviteModal from "../components/InviteModal";
import ProfileModal from "../components/ProfileModal";
import AccountModal from "../components/AccountModal";
import FileUploadModal from "../components/FileUploadModal";
import WorkspaceSidebar from "../components/WorkspaceSidebar";
import {
  FaUserCircle,
  FaBuilding,
  FaFolder,
  FaLink,
  FaAt,
} from "react-icons/fa";
import { signOut } from "firebase/auth";
import { auth, db, storage, messaging, getFCMToken } from "../firebase";
import { onMessage } from "firebase/messaging";
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
  arrayRemove,
  getDoc,
  getDocs,
  limit,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Message,
  UserData,
  ChannelMember,
  Channel,
  FirestoreChannel,
  MovieData,
  ActiveMovies,
} from "../types/chat";
import {
  formatTime,
  shouldShowHeader,
  isDirectMessage,
  formatFileSize,
  getFileIcon,
  updateLastSeen,
  getImagePath,
} from "../utils/chat";
import {
  getUserDisplayName,
  getUserPhotoURL,
  setGlobalUsersCache,
} from "../utils/user";
import {
  handleProfileUpdate,
  handleEmailUpdate,
  handlePasswordUpdate,
  handleResendVerification,
} from "../utils/auth";
import LinkListModal from "../components/LinkListModal";
import MessageText from "../components/MessageText";
import { MessageListRef } from "../components/MessageList";

const COMMON_EMOJIS = ["👍", "❤️", "😂", "🎉", "🚀"];

const MainPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [message, setMessage] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitedUsers, setInvitedUsers] = useState<string[]>([]);
  const navigate = useNavigate();
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isInvitedUsersExpanded, setIsInvitedUsersExpanded] = useState(false);
  const [channelMembers, setChannelMembers] = useState<ChannelMember[]>([]);
  const [usersCache, setUsersCache] = useState<Record<string, UserData>>({});
  const [typingUsers, setTypingUsers] = useState<{
    [key: string]: { displayName: string | null; email: string };
  }>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
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
    loading?: boolean;
  } | null>(null);
  const [threadMessage, setThreadMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    {
      message: Message;
      preview: string;
      context: string;
    }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const messageToScrollToRef = useRef<string | null>(null);
  const [dmDisplayName, setDmDisplayName] = useState<string | undefined>();
  const [workspaceName, setWorkspaceName] = useState("Workspace");
  const [mentions, setMentions] = useState<
    Array<{
      message: Message;
      mentionedName: string;
    }>
  >([]);
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });
  const threadMessagesEndRef = useRef<HTMLDivElement>(null);
  const mainMessageListRef = useRef<MessageListRef>(null);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [currentUserStatus, setCurrentUserStatus] = useState<string | null>(null);

  const isEmailVerified = auth.currentUser?.emailVerified ?? false;

  // Effect to request notification permission and set up FCM
  useEffect(() => {
    const setupFCM = async () => {
      try {
        // Request notification permission first
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
          // Get FCM token
          const token = await getFCMToken();
          if (token) {
            // Here you could save the token to your user's document in Firestore
            if (auth.currentUser) {
              const userRef = doc(db, "users", auth.currentUser.uid);
              await updateDoc(userRef, {
                fcmToken: token,
              });
            }
          }

          // Listen for foreground messages
          const unsubscribe = onMessage(messaging, (payload) => {
            const { channelId } = payload.data || {};

            // Only display if channelId != selectedChannel.id
            if (channelId && channelId !== selectedChannel?.id) {
              // if (true) {
              // Display a browser notification
              new Notification(payload.notification?.title ?? "New Message", {
                body: payload.notification?.body ?? "",
                icon: "/assets/logo_light.png",
              });

              // Play notification sound
              const audio = new Audio("/assets/notif-sound.wav");
              audio.play().catch((error) => {
                console.log("Error playing notification sound:", error);
              });
            }
          });

          return unsubscribe;
        }
      } catch (error) {
        console.error("Error setting up FCM:", error);
      }
    };

    const unsubscribePromise = setupFCM();

    // Cleanup subscription on unmount
    return () => {
      unsubscribePromise.then((unsubscribe) => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, [selectedChannel, auth.currentUser]);

  // Effect to apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", currentTheme);
    localStorage.setItem("theme", currentTheme);
  }, [currentTheme]);

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
  };

  useEffect(() => {
    if (!workspaceId) {
      navigate("/");
      return;
    }

    // Only set initial channel if no channel is selected
    if (selectedChannel) return;

    // Set initial channel to 'general'
    const channelsRef = collection(db, "channels");
    const generalChannelQuery = query(
      channelsRef,
      where("workspaceId", "==", workspaceId),
      where("name", "==", "general"),
      limit(1)
    );

    getDocs(generalChannelQuery).then((snapshot) => {
      if (!snapshot.empty) {
        const generalChannel = snapshot.docs[0];
        const data = generalChannel.data() as FirestoreChannel;
        const createdAt =
          "toDate" in data.createdAt
            ? data.createdAt.toDate()
            : new Date(data.createdAt.seconds * 1000);
        setSelectedChannel({
          id: generalChannel.id,
          name: data.name,
          workspaceId: data.workspaceId,
          createdAt,
          dm: data.dm,
          activeMovies: data.activeMovies,
        });
      }
    });

    return () => {};
  }, [workspaceId, navigate, selectedChannel]);

  useEffect(() => {
    if (!workspaceId) return;

    // Fetch invited users
    const workspaceRef = doc(db, "workspaces", workspaceId);
    const unsubscribe = onSnapshot(workspaceRef, (doc) => {
      if (doc.exists()) {
        setInvitedUsers(doc.data().invitedEmails || []);
      }
    });

    return () => unsubscribe();
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || !auth.currentUser?.email) return;

    // Subscribe to all messages in the workspace
    const messagesRef = collection(db, "messages");
    const allMessagesQuery = query(
      messagesRef,
      where("workspaceId", "==", workspaceId),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(
      allMessagesQuery,
      (snapshot) => {
        const messagesData = snapshot.docs.map((doc) => {
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
            replyCount: snapshot.docs.filter(
              (m) => m.data().replyTo?.messageId === doc.id
            ).length,
            isSystem: data.isSystem || false,
            isBot: data.isBot || false,
            movieData: data.movieData || null,
          };
        });

        setAllMessages(messagesData);

        // If we have a selected channel, update the filtered messages
        if (selectedChannel) {
          const channelMessages = messagesData.filter(
            (msg) => msg.channel === selectedChannel.id
          );
          setMessages(channelMessages);
        }

        setLoading(false);
      },
      (error) => {
        console.error("Error fetching messages:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [workspaceId, auth.currentUser?.email]);

  // Update effect to set messages when channel changes
  useEffect(() => {
    if (selectedChannel) {
      const channelMessages = allMessages.filter(
        (msg) => msg.channel === selectedChannel.id
      );
      setMessages(channelMessages);
    } else {
      setMessages([]);
    }
  }, [selectedChannel, allMessages]);

  useEffect(() => {
    if (!workspaceId || !auth.currentUser?.email) return;

    // Subscribe to workspace document to get member list
    const workspaceRef = doc(db, "workspaces", workspaceId);
    const unsubscribeWorkspace = onSnapshot(workspaceRef, async (docSnapshot) => {
      if (!docSnapshot.exists()) return;

      const memberUids = docSnapshot.data().members || [];
      
      // Create real-time listeners for each user
      const unsubscribeUsers = memberUids.map((uid: string) => {
        const userRef = doc(db, "users", uid);
        return onSnapshot(userRef, (userDoc) => {
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserData;
            if (!userData.email) {
              console.error('User data missing email:', uid);
              return;
            }
            setUsersCache(prev => ({
              ...prev,
              [uid]: {
                ...prev[uid],  // Preserve any existing data
                ...userData,   // Update with new data
                // Ensure critical fields are never null
                email: userData.email,
                displayName: userData.displayName || null,
                photoURL: userData.photoURL || null,
                status: userData.status || null,
                blockedUsers: userData.blockedUsers || [],
                mutedChannels: userData.mutedChannels || [],
                mutedDMs: userData.mutedDMs || []
              }
            }));
          }
        });
      });

      // Cleanup user listeners when workspace members change
      return () => {
        unsubscribeUsers.forEach(unsubscribe => unsubscribe());
      };
    });

    return () => {
      unsubscribeWorkspace();
    };
  }, [workspaceId, auth.currentUser?.email]);

  // Add effect to track user activity
  useEffect(() => {
    if (!auth.currentUser) return;

    const userActivityRef = doc(db, "userActivity", auth.currentUser.uid);

    // Update last active timestamp
    const updateLastActive = async () => {
      await setDoc(
        userActivityRef,
        {
          lastActive: serverTimestamp(),
        },
        { merge: true }
      );
    };

    // Update initially
    updateLastActive();

    // Update every 5 minutes if the window is active
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        updateLastActive();
      }
    }, 5 * 60 * 1000);

    // Update on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateLastActive();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Add effect to listen for typing users
  useEffect(() => {
    if (!workspaceId || !selectedChannel?.id || !auth.currentUser?.email)
      return;

    // Subscribe to typing status
    const typingRef = collection(db, "typing");
    const q = query(
      typingRef,
      where("workspaceId", "==", workspaceId),
      where("channel", "==", selectedChannel.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const typingData: {
        [key: string]: { displayName: string | null; email: string };
      } = {};
      const now = new Date();

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        // Only show typing indicator if timestamp is within last 10 seconds
        const timestamp = data.timestamp?.toDate();
        if (
          doc.id !== auth.currentUser?.uid &&
          data.isTyping &&
          timestamp &&
          now.getTime() - timestamp.getTime() < 10000
        ) {
          typingData[doc.id] = {
            displayName: data.displayName,
            email: data.email,
          };
        }
      });

      setTypingUsers(typingData);
    });

    return () => unsubscribe();
  }, [workspaceId, selectedChannel?.id, auth.currentUser?.uid]);

  // Add function to handle typing status
  const handleTypingStatus = useCallback(async () => {
    if (!auth.currentUser || !workspaceId || !selectedChannel?.id) return;

    const typingRef = doc(db, "typing", auth.currentUser.uid);
    const userActivityRef = doc(db, "userActivity", auth.currentUser.uid);

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update both typing status and user activity
    await Promise.all([
      setDoc(typingRef, {
        isTyping: true,
        channel: selectedChannel.id,
        workspaceId,
        timestamp: serverTimestamp(),
        uid: auth.currentUser?.uid || "",
        displayName: auth.currentUser?.displayName || "",
        email: auth.currentUser?.email || "",
      }),
      setDoc(
        userActivityRef,
        {
          lastActive: serverTimestamp(),
          uid: auth.currentUser?.uid || "",
        },
        { merge: true }
      ),
    ]);

    // Set timeout to clear typing status after 5 seconds
    typingTimeoutRef.current = setTimeout(async () => {
      if (!auth.currentUser) return;

      await setDoc(typingRef, {
        isTyping: false,
        channel: selectedChannel.id,
        workspaceId,
        timestamp: serverTimestamp(),
        uid: auth.currentUser?.uid || "",
        displayName: auth.currentUser?.displayName || "",
        email: auth.currentUser?.email || "",
      });
    }, 5000);
  }, [workspaceId, selectedChannel?.id]);

  // Update message input handler to use debounced typing status
  const handleMessageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMessage(e.target.value);
      handleTypingStatus();
    },
    [handleTypingStatus]
  );

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !message.trim() ||
      !auth.currentUser ||
      !workspaceId ||
      !selectedChannel ||
      !isEmailVerified
    )
      return;

    try {
      const messagesRef = collection(db, "messages");
      let channelId = selectedChannel.id;

      // If this is a temporary DM channel, create the real channel first
      if (selectedChannel.id.startsWith("temp_dm_")) {
        const channelsRef = collection(db, "channels");
        const dmDoc = await addDoc(channelsRef, {
          name: selectedChannel.name,
          workspaceId,
          createdAt: serverTimestamp(),
          dm: selectedChannel.dm,
          activeMovies: selectedChannel.activeMovies,
        });
        channelId = dmDoc.id;

        // Update the selected channel with the real channel ID
        setSelectedChannel({
          ...selectedChannel,
          id: channelId,
        });
      }

      const messageData = {
        text: message.trim(),
        sender: {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName,
          photoURL: auth.currentUser.photoURL,
        },
        timestamp: serverTimestamp(),
        channel: channelId,
        workspaceId,
        ...(replyingTo
          ? {
              replyTo: {
                messageId: replyingTo.messageId,
                threadId: replyingTo.messageId,
                senderName: replyingTo.senderName,
              },
            }
          : {}),
      };

      await addDoc(messagesRef, messageData);
      setMessage("");
      setReplyingTo(null);

      // Add scroll after sending
      setTimeout(() => {
        mainMessageListRef.current?.scrollToBottom();
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleInviteUser = async (email: string) => {
    if (!workspaceId || !auth.currentUser || !isEmailVerified) return;

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new Error("Please enter a valid email address");
    }

    const workspaceRef = doc(db, "workspaces", workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);

    if (!workspaceSnap.exists()) {
      throw new Error("Workspace not found");
    }

    const workspaceData = workspaceSnap.data();

    // Check if user is already a member
    if (workspaceData.members.includes(email.trim())) {
      throw new Error("User is already a member of this workspace");
    }

    // Check if user is already invited
    if (workspaceData.invitedEmails?.includes(email.trim())) {
      throw new Error("User has already been invited");
    }

    // Add email to invited list
    await updateDoc(workspaceRef, {
      invitedEmails: arrayUnion(email.trim()),
    });
  };

  const handleFileUpload = async (file: File) => {
    if (!auth.currentUser || !workspaceId || !selectedChannel) return;

    try {
      // Upload file to Firebase Storage
      const storageRef = ref(
        storage,
        `attachments/${workspaceId}/${Date.now()}_${file.name}`
      );
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // Create message with attachment
      const messagesRef = collection(db, "messages");
      await addDoc(messagesRef, {
        text: "",
        sender: {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName,
          photoURL: auth.currentUser.photoURL,
        },
        timestamp: serverTimestamp(),
        channel: selectedChannel.id,
        workspaceId,
        attachment: {
          type: "file",
          url: downloadURL,
          name: file.name,
          size: file.size,
          contentType: file.type,
        },
      });

      setSelectedFile(null);
      const modal = document.getElementById(
        "file-upload-modal"
      ) as HTMLDialogElement;
      if (modal) modal.close();
    } catch (error) {
      console.error("Error uploading file:", error);
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
    const images = container.getElementsByTagName("img");

    const handleImageLoad = () => {
      preserveScroll();
    };

    // Add load event listeners to all images
    Array.from(images).forEach((img) => {
      if (!img.complete) {
        img.addEventListener("load", handleImageLoad);
      }
    });

    return () => {
      Array.from(images).forEach((img) => {
        img.removeEventListener("load", handleImageLoad);
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
      return;
    }
  }, [selectedChannel]);

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!auth.currentUser || !workspaceId || !selectedChannel?.id) return;

    const messageRef = doc(db, "messages", messageId);
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
          users: [...currentReaction.users, auth.currentUser.uid],
        },
      });
    } else {
      // Remove reaction
      const updatedUsers = currentReaction.users.filter(
        (uid) => uid !== auth.currentUser?.uid
      );
      if (updatedUsers.length === 0) {
        // Remove the entire emoji entry if no users left
        const { [emoji]: removed, ...remainingReactions } = currentReactions;
        await updateDoc(messageRef, {
          reactions: remainingReactions,
        });
      } else {
        await updateDoc(messageRef, {
          [`reactions.${emoji}`]: {
            emoji,
            users: updatedUsers,
          },
        });
      }
    }
  };

  const handleReply = async (messageId: string) => {
    // If clicking on the same message that's being replied to, cancel the reply
    if (replyingTo?.messageId === messageId) {
      setReplyingTo(null);
      return;
    }

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    // If message has replies, open the thread view
    if ((message.replyCount ?? 0) > 0) {
      handleOpenThread(messageId);
      return;
    }

    const senderName = getUserDisplayName(
      message.sender.uid,
      message.sender.email || "",
      message.sender.displayName
    );

    setReplyingTo({
      messageId,
      senderName,
    });

    const input = document.querySelector(
      'input[type="text"]'
    ) as HTMLInputElement;
    if (input) {
      input.focus();
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Add function to handle thread opening
  const handleOpenThread = async (messageId: string) => {
    if (!workspaceId || !selectedChannel?.id) return;

    // Set initial loading state
    setSelectedThread({
      messageId,
      replies: [],
      loading: true,
    });

    // Set up real-time subscription for thread replies
    const messagesRef = collection(db, "messages");
    const repliesQuery = query(
      messagesRef,
      where("workspaceId", "==", workspaceId),
      where("channel", "==", selectedChannel.id),
      where("replyTo.messageId", "==", messageId),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(repliesQuery, (snapshot) => {
      const replies = snapshot.docs.map((doc) => ({
        id: doc.id,
        text: doc.data().text,
        sender: doc.data().sender,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
        channel: doc.data().channel,
        workspaceId: doc.data().workspaceId,
        reactions: doc.data().reactions || {},
        attachment: doc.data().attachment || null,
        replyTo: doc.data().replyTo || null,
      }));

      setSelectedThread((current) =>
        current?.messageId === messageId
          ? {
              messageId,
              replies,
              loading: false,
            }
          : current
      );
    });

    // Clean up subscription when thread is closed
    const currentUnsubscribe = unsubscribe;
    return () => currentUnsubscribe();
  };

  // Add function to close thread
  const handleCloseThread = () => {
    setSelectedThread(null);
  };

  // Add wrapper functions to match MessageList prop types
  const getDisplayNameForMessage = (
    senderId: string,
    senderEmail: string,
    senderDisplayName?: string
  ) => {
    return getUserDisplayName(senderId, senderEmail, senderDisplayName);
  };

  const getPhotoURLForMessage = (senderId: string, senderPhotoURL?: string, isBot?: boolean) => {
    if (isBot) {
      return getImagePath(senderPhotoURL ?? '');
    }
    return getUserPhotoURL(senderId, senderPhotoURL);
  };

  const shouldShowHeaderForMessage = (
    msg: Message,
    index: number,
    messages: Message[]
  ) => {
    return shouldShowHeader(
      msg.sender.uid,
      index,
      messages.map((m) => m.sender.uid)
    );
  };

  const handleThreadMessageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setThreadMessage(e.target.value);
      handleTypingStatus();
    },
    [handleTypingStatus]
  );

  const scrollThreadToBottom = () => {
    if (threadMessagesEndRef.current) {
      threadMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleThreadSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !threadMessage.trim() ||
      !auth.currentUser ||
      !workspaceId ||
      !isEmailVerified ||
      !selectedThread ||
      !selectedChannel
    )
      return;

    try {
      const messagesRef = collection(db, "messages");
      const messageData = {
        text: threadMessage.trim(),
        sender: {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName,
          photoURL: auth.currentUser.photoURL,
        },
        timestamp: serverTimestamp(),
        channel: selectedChannel.id,
        workspaceId,
        replyTo: {
          messageId: selectedThread.messageId,
          threadId: selectedThread.messageId,
          senderName: getUserDisplayName(
            messages.find((m) => m.id === selectedThread.messageId)?.sender.uid || "",
            messages.find((m) => m.id === selectedThread.messageId)?.sender.email || "",
            messages.find((m) => m.id === selectedThread.messageId)?.sender.displayName
          ),
        },
      };

      await addDoc(messagesRef, messageData);
      setThreadMessage("");
      setTimeout(scrollThreadToBottom, 100);
    } catch (error) {
      console.error("Error sending thread message:", error);
    }
  };

  // Add debounced search function
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setIsSearching(true);

      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Debounce search for 300ms
      searchTimeoutRef.current = setTimeout(async () => {
        if (!query.trim()) {
          setSearchResults([]);
          setIsSearching(false);
          return;
        }

        try {
          // Get all active channels first
          const channelsRef = collection(db, "channels");
          const channelsSnapshot = await getDocs(channelsRef);
          const activeChannels = new Set(
            channelsSnapshot.docs.map((doc) => doc.id)
          );

          // Filter messages
          const results = allMessages
            .filter((msg) => {
              // Basic text search
              const searchText = msg.text.toLowerCase();
              const searchTerms = query.toLowerCase().split(" ");
              const textMatches = searchTerms.every((term) =>
                searchText.includes(term)
              );

              // Only include if channel still exists
              const channelExists = activeChannels.has(msg.channel);

              return textMatches && channelExists;
            })
            .map(async (msg) => {
              try {
                // Get channel info for context
                const channelDoc = await getDoc(doc(channelsRef, msg.channel));

                if (!channelDoc.exists()) {
                  return null; // Skip if channel doesn't exist
                }

                const channelData = channelDoc.data() as FirestoreChannel;

                // For DM channels, verify both users still exist
                if (channelData.dm) {
                  const otherUserId = channelData.dm.find(
                    (id) => id !== auth.currentUser?.uid
                  );
                  if (otherUserId) {
                    const userDoc = await getDoc(doc(db, "users", otherUserId));
                    if (!userDoc.exists()) {
                      return null; // Skip if other user doesn't exist
                    }
                  }
                }

                let context = "Unknown Channel";
                if (channelData) {
                  context = channelData.dm
                    ? `DM with ${channelData.name}`
                    : `#${channelData.name}`;
                }

                return {
                  message: msg,
                  preview:
                    msg.text.length > 100
                      ? msg.text.slice(0, 100) + "..."
                      : msg.text,
                  context: `${context}${msg.replyTo ? " (in thread)" : ""}`,
                };
              } catch (error) {
                console.error("Error getting channel data:", error);
                return null;
              }
            });

          // Resolve all channel lookups and filter out null results
          const resolvedResults = (await Promise.all(results)).filter(
            (result) => result !== null
          );

          setSearchResults(resolvedResults.slice(0, 5)); // Limit to 5 results
        } catch (error) {
          console.error("Error during search:", error);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [allMessages]
  );

  // Add effect to handle scrolling to message
  useEffect(() => {
    if (messageToScrollToRef.current) {
      const messageElement = document.getElementById(
        `message-${messageToScrollToRef.current}`
      );
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
        messageElement.classList.add("bg-primary/10");
        setTimeout(() => {
          messageElement.classList.remove("bg-primary/10");
        }, 2000);
        messageToScrollToRef.current = null;
      }
    }
  }, [messages, selectedChannel, selectedThread]); // Re-run when messages, channel, or thread changes

  const handleChannelSelect = async (channel: Channel) => {
    // Update last seen before changing the channel
    if (auth.currentUser) {
      const channelMessages = messages.filter((m) => m.channel === channel.id);
      if (channelMessages.length > 0) {
        const latestMessage = channelMessages[channelMessages.length - 1];
        await updateLastSeen(
          auth.currentUser.uid,
          channel.id,
          latestMessage.id
        );
      }
    }
    
    // Only set the selected channel after lastSeen is updated
    setSelectedChannel(channel);
  };

  // Update search result handling
  const handleSearchResultClick = useCallback(
    async (result: { message: Message; preview: string; context: string }) => {
      try {
        // Clear search first
        setSearchQuery("");
        setSearchResults([]);

        // Find and set the channel for this message
        const channelsRef = collection(db, "channels");
        const channelDoc = await getDoc(
          doc(channelsRef, result.message.channel)
        );

        if (channelDoc.exists()) {
          const data = channelDoc.data() as FirestoreChannel;
          const createdAt =
            "toDate" in data.createdAt
              ? data.createdAt.toDate()
              : new Date(data.createdAt.seconds * 1000);

          if (data.dm) {
            // For DM channels, we need to get the other user's info
            const otherUserId = data.dm.find(
              (id) => id !== auth.currentUser?.uid
            );
            if (otherUserId) {
              const userDoc = await getDoc(doc(db, "users", otherUserId));
              const userData = userDoc.exists()
                ? (userDoc.data() as UserData)
                : null;

              const channel = {
                id: channelDoc.id,
                name:
                  userData?.displayName || userData?.email || "Unknown User",
                workspaceId: data.workspaceId,
                createdAt,
                dm: data.dm,
                activeMovies: data.activeMovies,
              };
              await handleChannelSelect(channel);
            }
          } else {
            // For regular channels
            const channel = {
              id: channelDoc.id,
              name: data.name,
              workspaceId: data.workspaceId,
              createdAt,
              dm: data.dm,
              activeMovies: data.activeMovies,
            };
            await handleChannelSelect(channel);
          }

          // Handle thread logic after a short delay to ensure channel switch is complete
          setTimeout(async () => {
            if (result.message.replyTo) {
              // If message is a reply, open its parent thread
              await handleOpenThread(result.message.replyTo.threadId);
            } else if (
              result.message.replyCount &&
              result.message.replyCount > 0
            ) {
              // If message has replies, open its own thread
              await handleOpenThread(result.message.id);
            }

            // Set the message to scroll to
            messageToScrollToRef.current = result.message.id;
            const messageElement = document.getElementById(
              `message-${result.message.id}`
            );
            if (messageElement) {
              messageElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
              messageElement.classList.add("bg-primary/10");
              setTimeout(() => {
                messageElement.classList.remove("bg-primary/10");
              }, 2000);
            }
          }, 100);
        } else {
          console.error(
            "Channel not found for search result:",
            result.message.channel
          );
        }
      } catch (error) {
        console.error("Error handling search result click:", error);
      }
    },
    [handleChannelSelect, handleOpenThread]
  );

  // Add effect to fetch workspace data
  useEffect(() => {
    if (!workspaceId) return;

    const workspaceRef = doc(db, "workspaces", workspaceId);
    const unsubscribe = onSnapshot(workspaceRef, (doc) => {
      if (doc.exists()) {
        setWorkspaceName(doc.data().name);
      }
    });

    return () => unsubscribe();
  }, [workspaceId]);

  // Add effect to update last seen when viewing messages
  useEffect(() => {
    if (!auth.currentUser || !selectedChannel || !messages.length) return;

    const channelMessages = messages.filter(
      (m) => m.channel === selectedChannel.id
    );
    if (channelMessages.length > 0) {
      const latestMessage = channelMessages[channelMessages.length - 1];
      updateLastSeen(
        auth.currentUser.uid,
        selectedChannel.id,
        latestMessage.id
      ).catch((error) => console.error("Error updating last seen:", error));
    }
  }, [selectedChannel, messages]);

  // Add this effect to find mentions when messages change
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser?.email || !selectedChannel) return;

    const currentUserName = currentUser.displayName;
    const namePattern = (currentUserName || currentUser.email).replace(
      /\s+/g,
      "[\\s_]"
    );
    const mentionRegex = new RegExp(`@(${namePattern})(?:\\s|$)`, "g");

    const newMentions = messages
      .filter((msg) => {
        mentionRegex.lastIndex = 0;
        return (
          selectedChannel &&
          msg.channel === selectedChannel.id &&
          mentionRegex.test(msg.text)
        );
      })
      .map((msg) => ({
        message: msg,
        mentionedName: currentUserName || currentUser.email || "",
      }));

    setMentions(newMentions);
  }, [messages, auth.currentUser, selectedChannel]);

  useEffect(() => {
    if (!workspaceId || !selectedChannel?.id || !auth.currentUser?.email) return;

    // Fetch channel members
    const workspaceRef = doc(db, "workspaces", workspaceId);
    const unsubscribe = onSnapshot(workspaceRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const workspaceData = docSnapshot.data();
        const memberUids = workspaceData.members || [];

        // Convert member UIDs to channel members using usersCache
        const members = memberUids.map(uid => {
          const userData = usersCache[uid];
          return {
            uid,
            email: userData?.email || "",
            isCurrentUser: uid === auth.currentUser?.uid,
            displayName: userData?.displayName || null,
            photoURL: userData?.photoURL || null,
            status: userData?.status || null
          };
        }).sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));

        setChannelMembers(members);
      }
    });

    return () => unsubscribe();
  }, [workspaceId, selectedChannel?.id, auth.currentUser?.email, usersCache]);

  const handleDeleteChannel = async (channelId: string) => {
    try {
      await deleteDoc(doc(db, "channels", channelId));
      // Only clear selected channel if we're deleting the currently selected one
      if (selectedChannel?.id === channelId) {
        setSelectedChannel(null);
      }
      const modal = document.getElementById(
        "delete-channel-modal"
      ) as HTMLDialogElement;
      if (modal) modal.close();
    } catch (error) {
      console.error("Error deleting channel:", error);
    }
  };

  // Add this function to handle canceling invites
  const handleCancelInvite = async (email: string) => {
    if (!workspaceId) return;

    try {
      const workspaceRef = doc(db, "workspaces", workspaceId);
      const workspaceDoc = await getDoc(workspaceRef);

      if (!workspaceDoc.exists()) return;

      const currentInvites = workspaceDoc.data().invitedEmails || [];
      await updateDoc(workspaceRef, {
        invitedEmails: currentInvites.filter((e: string) => e !== email),
      });
    } catch (error) {
      console.error("Error canceling invitation:", error);
    }
  };

  // Add status listener
  useEffect(() => {
    if (!auth.currentUser) return;

    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setCurrentUserStatus(doc.data()?.status || null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLeaveWorkspace = async () => {
    if (!workspaceId || !auth.currentUser) return;

    try {
      const workspaceRef = doc(db, "workspaces", workspaceId);
      await updateDoc(workspaceRef, {
        members: arrayRemove(auth.currentUser.uid)
      });
      navigate("/");
    } catch (error) {
      console.error("Error leaving workspace:", error);
    }
  };

  return (
    <div className="drawer lg:drawer-open h-screen w-screen">
      <input id="main-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col bg-base-200 w-full">
        {/* Navbar */}
        <div className="z-10 navbar bg-base-200 w-full">
          {!isMobileSearchActive ? (
            // Regular navbar content - shown when not searching
            <>
              <div className="flex-none lg:hidden">
                <label
                  htmlFor="main-drawer"
                  className="btn btn-square btn-ghost text-base-content"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="inline-block w-6 h-6 stroke-current"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    ></path>
                  </svg>
                </label>
              </div>

              <div className="flex-1">
                <div className="flex flex-col">
                  <h1 className="text-2xl font-bold text-base-content">
                    {selectedChannel?.dm ? (
                      <>@{selectedChannel.name}</>
                    ) : (
                      <>#{selectedChannel?.name}</>
                    )}
                  </h1>
                  <div className="flex gap-1">
                    <button
                      className="btn btn-ghost btn-xs btn-square w-fit text-base-content"
                      onClick={() => {
                        const modal = document.getElementById(
                          "files-modal"
                        ) as HTMLDialogElement;
                        if (modal) modal.showModal();
                      }}
                      title="Browse files"
                    >
                      <FaFolder className="w-6 h-3" />
                    </button>
                    <button
                      className="btn btn-ghost btn-xs btn-square w-fit text-base-content"
                      onClick={() => {
                        const modal = document.getElementById(
                          "links-modal"
                        ) as HTMLDialogElement;
                        if (modal) modal.showModal();
                      }}
                      title="Browse links"
                    >
                      <FaLink className="w-6 h-3" />
                    </button>
                    <button
                      className="btn btn-ghost btn-xs btn-square w-fit text-base-content"
                      onClick={() => {
                        const modal = document.getElementById(
                          "mentions-modal"
                        ) as HTMLDialogElement;
                        if (modal) modal.showModal();
                      }}
                      title="View mentions"
                    >
                      <FaAt className="w-6 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Bar - Modified for mobile */}
              <div className="flex-none relative">
                {/* Mobile Search Button */}
                <button
                  className="btn btn-ghost btn-circle lg:hidden text-base-content"
                  onClick={() => setIsMobileSearchActive(true)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>

                {/* Desktop Search - visible only on lg screens */}
                <div className="hidden lg:block w-96 mx-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search messages..."
                      className="input input-bordered w-full text-base-content placeholder:text-base-content/60"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                    />

                    {(searchResults.length > 0 || isSearching) && (
                      <div
                        className="absolute z-[100] bg-base-200 w-full shadow-lg rounded-box"
                        style={{ top: "calc(100% + 0.5rem)" }}
                      >
                        {isSearching ? (
                          <div className="flex items-center justify-center p-4">
                            <span className="loading loading-spinner loading-md text-base-content"></span>
                          </div>
                        ) : (
                          searchResults.map((result) => (
                            <div
                              key={result.message.id}
                              onClick={() => {
                                handleSearchResultClick(result);
                              }}
                              className="p-2 hover:bg-base-300 rounded-lg cursor-pointer"
                            >
                              <div className="text-sm font-medium text-base-content">
                                {result.preview}
                              </div>
                              <div className="text-xs text-base-content/70">
                                {result.context}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-none gap-2">
                <button
                  className={`btn btn-ghost btn-circle text-base-content ${
                    isRightSidebarOpen ? "btn-active bg-base-300" : ""
                  }`}
                  onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                  disabled={!isEmailVerified}
                  title={
                    !isEmailVerified
                      ? "Please verify your email to access workspace settings"
                      : ""
                  }
                >
                  <FaBuilding className="w-5 h-5" />
                </button>
                <div className="dropdown dropdown-end">
                  <div className="indicator">
                    <label
                      tabIndex={0}
                      className="btn btn-ghost btn-circle relative text-base-content"
                    >
                      <FaUserCircle className="w-6 h-6" />
                      {!isEmailVerified && (
                        <span className="absolute -top-1 -right-1 badge badge-error badge-xs w-3 h-3 p-0"></span>
                      )}
                    </label>
                  </div>
                  <ul
                    tabIndex={0}
                    className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
                  >
                    <li key="profile">
                      <a
                        onClick={() => {
                          const modal = document.getElementById(
                            "profile-modal"
                          ) as HTMLDialogElement;
                          if (modal) modal.showModal();
                        }}
                        className="hover:bg-base-200 active:bg-base-300 px-4 py-2 rounded-lg text-base-content"
                      >
                        Profile
                      </a>
                    </li>
                    <li key="account">
                      <a
                        onClick={() => {
                          if (auth.currentUser?.email) {
                            const modal = document.getElementById(
                              "account-modal"
                            ) as HTMLDialogElement;
                            if (modal) modal.showModal();
                          }
                        }}
                        className="hover:bg-base-200 active:bg-base-300 px-4 py-2 rounded-lg text-base-content relative"
                      >
                        Account
                        {!isEmailVerified && (
                          <span className="badge badge-error badge-sm">!</span>
                        )}
                      </a>
                    </li>
                    <li key="sign-out">
                      <a
                        onClick={handleSignOut}
                        className="hover:bg-base-200 active:bg-base-300 px-4 py-2 rounded-lg text-error"
                      >
                        Sign out
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            // Mobile Search View - shown when searching on mobile
            <div className="w-full flex items-center gap-2 px-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search messages..."
                  className="input input-bordered w-full text-base-content placeholder:text-base-content/60"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                />
                {(searchResults.length > 0 || isSearching) && (
                  <div
                    className="absolute z-[100] bg-base-200 w-full shadow-lg rounded-box"
                    style={{ top: "calc(100% + 0.5rem)" }}
                  >
                    {isSearching ? (
                      <div className="flex items-center justify-center p-4">
                        <span className="loading loading-spinner loading-md text-base-content"></span>
                      </div>
                    ) : (
                      searchResults.map((result) => (
                        <div
                          key={result.message.id}
                          onClick={() => {
                            handleSearchResultClick(result);
                            setIsMobileSearchActive(false);
                          }}
                          className="p-2 hover:bg-base-300 rounded-lg cursor-pointer"
                        >
                          <div className="text-sm font-medium text-base-content">
                            {result.preview}
                          </div>
                          <div className="text-xs text-base-content/70">
                            {result.context}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button
                className="btn btn-ghost text-base-content"
                onClick={() => {
                  setSearchQuery("");
                  setIsMobileSearchActive(false);
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Main Content with Right Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Messages Area with Fixed Input */}
          <div className="flex-1 relative flex flex-col">
            {/* Scrollable Messages Container */}
            <div
              ref={messagesContainerRef}
              className="absolute inset-0 overflow-y-auto flex flex-col-reverse"
              style={{ paddingBottom: "130px" }}
            >
              <MessageList
                ref={mainMessageListRef}
                messages={messages.filter(
                  (m) =>
                    selectedChannel &&
                    m.channel === selectedChannel.id &&
                    !m.replyTo // Only show messages that aren't replies
                )}
                loading={loading}
                isDirectMessage={!!selectedChannel?.dm}
                channelName={selectedChannel?.name || ""}
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
            <div className="absolute bottom-0 left-0 right-0 bg-base-200 p-0">
              <MessageInput
                message={message}
                isEmailVerified={isEmailVerified}
                typingUsers={typingUsers}
                channel={selectedChannel}
                onMessageChange={handleMessageChange}
                onSubmit={handleSendMessage}
                onFileClick={() => {
                  const modal = document.getElementById(
                    "file-upload-modal"
                  ) as HTMLDialogElement;
                  if (modal) modal.showModal();
                }}
                replyTo={
                  replyingTo
                    ? {
                        senderName: replyingTo.senderName,
                        onCancel: handleCancelReply,
                      }
                    : undefined
                }
                channelMembers={channelMembers.map((member) => ({
                  displayName: member.displayName || null,
                  email: member.email,
                }))}
                currentStatus={currentUserStatus}
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
                const modal = document.getElementById(
                  "invite-modal"
                ) as HTMLDialogElement;
                if (modal) modal.showModal();
              }}
              onToggleInvitedUsers={() =>
                setIsInvitedUsersExpanded(!isInvitedUsersExpanded)
              }
              workspaceName={workspaceName}
              onSwitchWorkspace={() => navigate("/")}
              onCancelInvite={handleCancelInvite}
              workspaceId={workspaceId || ""}
              onLeaveWorkspace={handleLeaveWorkspace}
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
              <div className="absolute right-0 top-0 bottom-0 w-screen md:w-[480px] bg-base-200 shadow-xl transition-transform flex flex-col">
                {/* Thread Header */}
                <div className="navbar bg-base-300">
                  <div className="flex-1">
                    <span className="text-lg font-semibold text-base-content">
                      Thread
                    </span>
                  </div>
                  <div className="flex-none">
                    <button
                      className="btn btn-ghost btn-sm text-base-content"
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
                      isThread={true}
                      messages={[
                        messages.find(
                          (m) => m.id === selectedThread.messageId
                        )!,
                      ]}
                      loading={false}
                      isDirectMessage={!!selectedChannel?.dm}
                      channelName={selectedChannel?.name || ""}
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
                    <div className="divider text-base-content">Replies</div>

                    {/* Reply Messages */}
                    <MessageList
                      isThread={true}
                      messages={selectedThread.replies}
                      loading={selectedThread.loading ?? false}
                      isDirectMessage={!!selectedChannel?.dm}
                      channelName={selectedChannel?.name || ""}
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
                    <div ref={threadMessagesEndRef} />
                  </div>
                </div>

                {/* Thread Input */}
                <div className="p-4 bg-base-200 border-t border-base-300">
                  <MessageInput
                    message={threadMessage}
                    isEmailVerified={isEmailVerified}
                    typingUsers={typingUsers}
                    channel={selectedChannel}
                    onMessageChange={handleThreadMessageChange}
                    onSubmit={handleThreadSendMessage}
                    onFileClick={() => {
                      const modal = document.getElementById(
                        "file-upload-modal"
                      ) as HTMLDialogElement;
                      if (modal) modal.showModal();
                    }}
                    replyTo={{
                      senderName: getUserDisplayName(
                        messages.find((m) => m.id === selectedThread.messageId)
                          ?.sender.uid || "",
                        messages.find((m) => m.id === selectedThread.messageId)
                          ?.sender.email || "",
                        messages.find((m) => m.id === selectedThread.messageId)
                          ?.sender.displayName
                      ),
                      onCancel: handleCloseThread,
                    }}
                    channelMembers={channelMembers.map((member) => ({
                      displayName: member.displayName || null,
                      email: member.email,
                    }))}
                    currentStatus={currentUserStatus}
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
          onUpdateProfile={(displayName, profilePicture) =>
            handleProfileUpdate(
              auth.currentUser!,
              displayName,
              profilePicture,
              setUsersCache
            )
          }
          currentTheme={currentTheme}
          onThemeChange={handleThemeChange}
        />
        <AccountModal
          user={auth.currentUser}
          isEmailVerified={isEmailVerified}
          onUpdateEmail={(newEmail, currentPassword) => {
            if (!auth.currentUser)
              return Promise.reject(new Error("No user logged in"));
            return handleEmailUpdate(
              auth.currentUser,
              newEmail,
              currentPassword
            );
          }}
          onUpdatePassword={(newPassword, currentPassword) => {
            if (!auth.currentUser)
              return Promise.reject(new Error("No user logged in"));
            return handlePasswordUpdate(
              auth.currentUser,
              newPassword,
              currentPassword
            );
          }}
          onResendVerification={() => {
            if (!auth.currentUser)
              return Promise.reject(new Error("No user logged in"));
            return handleResendVerification(auth.currentUser);
          }}
        />
        <FileUploadModal
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
          onFileUpload={handleFileUpload}
          onClose={() => {
            const modal = document.getElementById(
              "file-upload-modal"
            ) as HTMLDialogElement;
            if (modal) modal.close();
            setSelectedFile(null);
          }}
        />

        {/* Files Modal */}
        <FileListModal
          messages={messages.filter(
            (m) =>
              selectedChannel &&
              m.channel === selectedChannel.id &&
              m.attachment
          )}
          fileSearchQuery={fileSearchQuery}
          onSearchChange={(query) => setFileSearchQuery(query)}
          getUserDisplayName={getDisplayNameForMessage}
        />

        {/* Links Modal */}
        <LinkListModal
          messages={messages.filter(
            (m) => selectedChannel && m.channel === selectedChannel.id
          )}
          linkSearchQuery={linkSearchQuery}
          onSearchChange={(query) => setLinkSearchQuery(query)}
          getUserDisplayName={getDisplayNameForMessage}
        />

        {/* Mentions Modal */}
        <dialog id="mentions-modal" className="modal">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-base-content">Mentions</h3>
            <div className="py-4 space-y-4">
              {mentions.length === 0 ? (
                <p className="text-center text-base-content/70">
                  No mentions yet
                </p>
              ) : (
                mentions.map(({ message, mentionedName }) => (
                  <div
                    key={message.id}
                    className="bg-base-100 p-4 rounded-lg cursor-pointer hover:bg-base-200"
                    onClick={async () => {
                      // Close the modal
                      const modal = document.getElementById(
                        "mentions-modal"
                      ) as HTMLDialogElement;
                      if (modal) modal.close();

                      // Use the same navigation logic as search results
                      await handleSearchResultClick({
                        message,
                        preview: message.text,
                        context: message.replyTo ? "(in thread)" : "",
                      });
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="avatar placeholder">
                        <div className="bg-neutral text-neutral-content rounded-full w-8">
                          <span>
                            {
                              (getUserDisplayName(
                                message.sender.uid,
                                message.sender.email || "",
                                message.sender.displayName
                              ) || "?")[0]
                            }
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-base-content">
                          {getUserDisplayName(
                            message.sender.uid,
                            message.sender.email || "",
                            message.sender.displayName
                          ) || "Unknown User"}
                        </span>
                        <span className="text-xs text-base-content/70 ml-2">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                    <div className="text-base-content">
                      <MessageText text={message.text} />
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="modal-action">
              <form method="dialog">
                <button className="btn">Close</button>
              </form>
            </div>
          </div>
          {/* Add this form for the backdrop */}
          <form method="dialog" className="modal-backdrop">
            <button>close</button>
          </form>
        </dialog>

        {/* Channel Delete Confirmation Modal */}
        <dialog id="delete-channel-modal" className="modal">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-base-content">
              Delete Channel
            </h3>
            <p className="py-4 text-base-content/70">
              Are you sure you want to delete this channel? This action cannot
              be undone.
            </p>
            <div className="modal-action">
              <form method="dialog">
                <button className="btn btn-ghost mr-2 text-base-content">
                  Cancel
                </button>
                <button
                  className="btn btn-error text-base-content"
                  onClick={async () => {
                    const modal = document.getElementById(
                      "delete-channel-modal"
                    ) as HTMLDialogElement;
                    const channelId = modal?.getAttribute("data-channel-id");
                    if (channelId) {
                      await handleDeleteChannel(channelId);
                    }
                  }}
                >
                  Delete Channel
                </button>
              </form>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button>close</button>
          </form>
        </dialog>
      </div>

      {/* Sidebar */}
      <div className="drawer-side z-40">
        <label htmlFor="main-drawer" className="drawer-overlay"></label>
        <Sidebar
          onChannelSelect={handleChannelSelect}
          workspaceId={workspaceId || ""}
          selectedChannel={selectedChannel}
          usersCache={usersCache}
          messages={allMessages}
          onDeleteChannel={handleDeleteChannel}
        />
      </div>

      {/* Add this modal for mobile search */}
      <dialog
        id="mobile-search-modal"
        className="modal modal-bottom sm:modal-middle"
      >
        <div className="modal-box p-0">
          <div className="join w-full">
            <input
              type="text"
              placeholder="Search messages..."
              className="input input-bordered join-item w-full text-base-content placeholder:text-base-content/60"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button
              className="btn btn-ghost join-item text-base-content"
              onClick={() => {
                setSearchQuery("");
                const modal = document.getElementById(
                  "mobile-search-modal"
                ) as HTMLDialogElement;
                if (modal) modal.close();
              }}
            >
              Cancel
            </button>
          </div>
          {isSearching && (
            <div className="flex justify-center p-4">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          )}
          {searchResults.length > 0 && (
            <div className="max-h-96 overflow-y-auto p-2">
              {searchResults.map((result) => (
                <div
                  key={result.message.id}
                  className="card bg-base-100 shadow-sm mb-2 cursor-pointer hover:bg-base-200"
                  onClick={() => {
                    messageToScrollToRef.current = result.message.id;
                    setSearchQuery("");
                    const modal = document.getElementById(
                      "mobile-search-modal"
                    ) as HTMLDialogElement;
                    if (modal) modal.close();
                  }}
                >
                  <div className="card-body p-4">
                    <p className="text-sm opacity-70">{result.context}</p>
                    <p className="text-base-content">{result.preview}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
};

export default MainPage;

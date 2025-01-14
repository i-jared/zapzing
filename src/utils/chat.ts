import {
  FaFileImage,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileAlt,
} from "react-icons/fa";
import { IconType } from "react-icons";
import {
  doc,
  getDoc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { UserData, Message, Channel } from "../types/chat";

interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

function isFirestoreTimestamp(value: any): value is FirestoreTimestamp {
  return (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    "nanoseconds" in value
  );
}

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const shouldShowHeader = (
  currentMsgSenderId: string,
  index: number,
  messagesSenderIds: string[]
): boolean => {
  if (index === 0) return true;
  const prevMsgSenderId = messagesSenderIds[index - 1];
  return prevMsgSenderId !== currentMsgSenderId;
};

export const isDirectMessage = (channel: Channel | null): boolean => {
  return !!channel?.dm;
};

export const getFileIcon = (
  fileName: string,
  contentType?: string
): IconType => {
  if (contentType?.startsWith("image/")) return FaFileImage;
  if (contentType?.includes("pdf")) return FaFilePdf;
  if (
    contentType?.includes("word") ||
    fileName.endsWith(".doc") ||
    fileName.endsWith(".docx")
  )
    return FaFileWord;
  if (
    contentType?.includes("excel") ||
    fileName.endsWith(".xls") ||
    fileName.endsWith(".xlsx")
  )
    return FaFileExcel;
  if (
    contentType?.includes("powerpoint") ||
    fileName.endsWith(".ppt") ||
    fileName.endsWith(".pptx")
  )
    return FaFilePowerpoint;
  return FaFileAlt;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export const toggleDMMute = async (
  userUid: string,
  channelId: string
): Promise<void> => {
  const userRef = doc(db, "users", userUid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error("User document not found");
  }

  const userData = userDoc.data() as UserData;
  const mutedDMs = userData.mutedDMs || [];
  const isMuted = mutedDMs.includes(channelId);

  if (isMuted) {
    await updateDoc(userRef, {
      mutedDMs: arrayRemove(channelId),
    });
  } else {
    await updateDoc(userRef, {
      mutedDMs: arrayUnion(channelId),
    });
  }
};

export const toggleChannelMute = async (
  userUid: string,
  channelId: string
): Promise<void> => {
  const userRef = doc(db, "users", userUid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error("User document not found");
  }

  const userData = userDoc.data() as UserData;
  const mutedChannels = userData.mutedChannels || [];
  const isMuted = mutedChannels.includes(channelId);

  if (isMuted) {
    await updateDoc(userRef, {
      mutedChannels: arrayRemove(channelId),
    });
  } else {
    await updateDoc(userRef, {
      mutedChannels: arrayUnion(channelId),
    });
  }
};

export const isDMMuted = (
  userUid: string,
  dmUid: string,
  usersCache: Record<string, UserData>
): boolean => {
  const userData = usersCache[userUid];
  return userData?.mutedDMs?.includes(dmUid) || false;
};

export const isChannelMuted = (
  userUid: string,
  channelName: string,
  usersCache: Record<string, UserData>
): boolean => {
  const userData = usersCache[userUid];
  return userData?.mutedChannels?.includes(channelName) || false;
};

export const updateLastSeen = async (
  userUid: string,
  channelId: string,
  messageId: string
): Promise<void> => {
  const userRef = doc(db, "users", userUid);

  await updateDoc(userRef, {
    [`lastSeen.${channelId}`]: {
      timestamp: serverTimestamp(),
      messageId,
    },
  });
};

export const hasUnseenMessages = (
  channel: Channel | undefined,
  messages: Message[],
  userData: UserData | null,
  selectedChannelId?: string
): boolean => {
  if (!userData?.lastSeen) return false;
  if (!channel) return false;
  if (channel.id === selectedChannelId) return false;

  const channelId = channel.id;
  const lastSeen = userData.lastSeen[channelId];

  const channelMessages = messages.filter((m) => m.channel === channelId);
  if (channelMessages.length === 0) return false;
  if (!lastSeen) return false;
  if (!lastSeen.timestamp) return false;

  const lastMessage = channelMessages[channelMessages.length - 1];
  if (!lastMessage.timestamp) return false;

  let lastSeenDate: Date;
  if (lastSeen.timestamp instanceof Date) {
    lastSeenDate = lastSeen.timestamp;
  } else {
    const firestoreTimestamp = lastSeen.timestamp as { seconds: number };
    lastSeenDate = new Date(
      firestoreTimestamp?.seconds ? firestoreTimestamp.seconds * 1000 : 0
    );
  }

  let lastMessageDate: Date;
  if (lastMessage.timestamp instanceof Date) {
    lastMessageDate = lastMessage.timestamp;
  } else {
    const firestoreTimestamp = lastMessage.timestamp as { seconds: number };
    lastMessageDate = new Date(
      firestoreTimestamp?.seconds ? firestoreTimestamp.seconds * 1000 : 0
    );
  }

  return lastMessageDate > lastSeenDate;
};

export const getImagePath = (path: string) => {
  return `https://firebasestorage.googleapis.com/v0/b/zappzingg.firebasestorage.app/o/${encodeURIComponent(path)}?alt=media`;
};
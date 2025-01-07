export interface Reaction {
  emoji: string;
  users: string[];  // array of user IDs who reacted with this emoji
}

export interface Message {
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
  reactions?: { [key: string]: { emoji: string; users: string[] } };
  attachment?: {
    type: 'file' | 'video' | 'drawing';
    url: string;
    name: string;
    size: number;
    contentType?: string;
  };
  replyTo?: {
    messageId: string;
    threadId: string;
    senderName: string;
  };
  replyCount?: number;
}

export interface UserData {
  email: string;
  displayName: string | null;
  photoURL: string | null;
  mutedDMs?: string[]; // Array of email addresses of muted DMs
  mutedChannels?: string[]; // Array of channel names that are muted
  lastSeen?: {
    [channelOrDM: string]: {
      timestamp: { seconds: number; nanoseconds: number } | Date;
      messageId: string;
    };
  };
}

export interface ChannelMember {
  uid: string;
  email: string;
  isCurrentUser: boolean;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface UserActivity {
  lastActive: Date;
  isTyping: boolean;
  typingIn: string | null;
  displayName: string | null;
} 
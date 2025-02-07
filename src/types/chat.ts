export interface Reaction {
  emoji: string;
  users: string[];  // array of user IDs who reacted with this emoji
}


export interface Message {
  id: string;
  text: string;
  sender: {
    uid: string;
    email: string | null;
    displayName?: string;
    photoURL?: string;
  };
  timestamp: Date;
  channel: string;
  workspaceId: string;
  reactions?: { [key: string]: { emoji: string; users: string[] } };
  attachment?: {
    type: "file" | "video" | "drawing";
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
  isSystem?: boolean;
  isBot?: boolean;
  movieData?: {
    movieId: string;
    imdbId: string;
    title: string;
    posterPath: string;
    characters: {
      name: string;
      actorName: string;
      profilePath: string;
    }[];
  };
}


export interface UserData {
  email: string;
  displayName: string | null;
  photoURL: string | null;
  status?: string | null;  // User's custom status message
  mutedDMs?: string[];  // Array of channel IDs of muted DMs
  mutedChannels?: string[];  // Array of channel IDs that are muted
  blockedUsers?: string[];  // Array of user UIDs that are blocked
  lastSeen?: {
    [channelId: string]: {
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

export interface MovieData {
  imdbId: string;
  title: string;
  posterPath: string;
  activatedAt: {
    seconds: number;
    nanoseconds: number;
  } | {
    toDate: () => Date;
  };
}

export type ActiveMovies = {
  [imdbId: string]: MovieData;
} | undefined;

export interface Channel {
  id: string;
  name: string;
  workspaceId: string;
  createdAt: Date;
  dm?: string[];
  activeMovies?: ActiveMovies;
}

export interface FirestoreChannel {
  name: string;
  workspaceId: string;
  createdAt: any;
  dm?: string[];
  activeMovies?: ActiveMovies;
} 

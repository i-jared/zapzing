import { UserData } from '../types/chat';

let globalUsersCache: Record<string, UserData> = {};

export const setGlobalUsersCache = (cache: Record<string, UserData>) => {
  globalUsersCache = cache;
};

export const getUserDisplayName = (
  senderId: string,
  senderEmail: string,
  senderDisplayName?: string
): string => {
  if (globalUsersCache[senderId]?.displayName) {
    return globalUsersCache[senderId].displayName;
  }
  return senderDisplayName || senderEmail;
};

export const getUserPhotoURL = (
  senderId: string,
  senderPhotoURL?: string
): string | null => {
  if (globalUsersCache[senderId]?.photoURL) {
    return globalUsersCache[senderId].photoURL;
  }
  return senderPhotoURL || null;
}; 
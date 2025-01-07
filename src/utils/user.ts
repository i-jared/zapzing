import { UserData } from '../types/chat';

export const getUserDisplayName = (
  senderId: string,
  senderEmail: string,
  usersCache: Record<string, UserData>,
  senderDisplayName?: string
): string => {
  if (usersCache[senderId]?.displayName) {
    return usersCache[senderId].displayName;
  }
  return senderDisplayName || senderEmail;
};

export const getUserPhotoURL = (
  senderId: string,
  usersCache: Record<string, UserData>,
  senderPhotoURL?: string
): string | null => {
  if (usersCache[senderId]?.photoURL) {
    return usersCache[senderId].photoURL;
  }
  return senderPhotoURL || null;
}; 
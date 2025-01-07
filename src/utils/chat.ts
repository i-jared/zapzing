import { FaFileImage, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileAlt } from 'react-icons/fa';
import { IconType } from 'react-icons';
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { UserData } from '../types/chat';

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

export const shouldShowHeader = (currentMsgSenderId: string, index: number, messagesSenderIds: string[]): boolean => {
  if (index === 0) return true;
  const prevMsgSenderId = messagesSenderIds[index - 1];
  return prevMsgSenderId !== currentMsgSenderId;
};

export const isDirectMessage = (channelName: string): boolean => {
  // A channel name that contains @ is an email address, indicating a DM
  return channelName.includes('@');
};

export const getFileIcon = (fileName: string, contentType?: string): IconType => {
  if (contentType?.startsWith('image/')) return FaFileImage;
  if (contentType?.includes('pdf')) return FaFilePdf;
  if (contentType?.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) return FaFileWord;
  if (contentType?.includes('excel') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return FaFileExcel;
  if (contentType?.includes('powerpoint') || fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) return FaFilePowerpoint;
  return FaFileAlt;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const toggleDMMute = async (userUid: string, dmEmail: string): Promise<void> => {
  const userRef = doc(db, 'users', userUid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    throw new Error('User document not found');
  }

  const userData = userDoc.data() as UserData;
  const mutedDMs = userData.mutedDMs || [];
  const isMuted = mutedDMs.includes(dmEmail);

  if (isMuted) {
    // Unmute: remove from mutedDMs array
    await updateDoc(userRef, {
      mutedDMs: arrayRemove(dmEmail)
    });
  } else {
    // Mute: add to mutedDMs array
    await updateDoc(userRef, {
      mutedDMs: arrayUnion(dmEmail)
    });
  }
};

export const isDMMuted = (userUid: string, dmEmail: string, usersCache: Record<string, UserData>): boolean => {
  const userData = usersCache[userUid];
  return userData?.mutedDMs?.includes(dmEmail) || false;
}; 
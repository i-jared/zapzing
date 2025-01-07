import { FaFileImage, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileAlt } from 'react-icons/fa';
import { IconType } from 'react-icons';

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
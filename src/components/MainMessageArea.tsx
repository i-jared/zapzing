import React, { useRef } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { Message, Channel, ChannelMember } from '../types/chat';
import { IconType } from 'react-icons';
import { MessageListRef } from './MessageList';

interface MainMessageAreaProps {
  messages: Message[];
  loading: boolean;
  selectedChannel: Channel | null;
  message: string;
  isEmailVerified: boolean;
  typingUsers: { [key: string]: { displayName: string | null; email: string } };
  channelMembers: ChannelMember[];
  replyingTo: { messageId: string; senderName: string } | null;
  getUserDisplayName: (uid: string, email: string, displayName?: string) => string;
  getUserPhotoURL: (uid: string, photoURL?: string) => string | null;
  handleAddReaction: (messageId: string, emoji: string) => void;
  shouldShowHeader: (msg: Message, index: number, messages: Message[]) => boolean;
  formatTime: (date: Date) => string;
  formatFileSize: (bytes: number) => string;
  getFileIcon: (fileName: string, contentType?: string) => IconType;
  commonEmojis: string[];
  onReply: (messageId: string) => void;
  onOpenThread: (messageId: string) => void;
  onMessageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onCancelReply: () => void;
}

const MainMessageArea: React.FC<MainMessageAreaProps> = ({
  messages,
  loading,
  selectedChannel,
  message,
  isEmailVerified,
  typingUsers,
  channelMembers,
  replyingTo,
  getUserDisplayName,
  getUserPhotoURL,
  handleAddReaction,
  shouldShowHeader,
  formatTime,
  formatFileSize,
  getFileIcon,
  commonEmojis,
  onReply,
  onOpenThread,
  onMessageChange,
  onSendMessage,
  onCancelReply,
}) => {
  const mainMessageListRef = useRef<MessageListRef>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex-1 relative flex flex-col">
      {/* Scrollable Messages Container */}
      <div
        ref={messagesContainerRef}
        className="absolute inset-0 overflow-y-auto flex flex-col-reverse"
        style={{ paddingBottom: "130px" }}
      >
        <MessageList
          ref={mainMessageListRef}
          messages={messages}
          loading={loading}
          isDirectMessage={!!selectedChannel?.dm}
          channelName={selectedChannel?.name || ""}
          getUserDisplayName={getUserDisplayName}
          getUserPhotoURL={getUserPhotoURL}
          handleAddReaction={handleAddReaction}
          shouldShowHeader={shouldShowHeader}
          formatTime={formatTime}
          formatFileSize={formatFileSize}
          getFileIcon={getFileIcon}
          commonEmojis={commonEmojis}
          onReply={onReply}
          replyingToId={replyingTo?.messageId}
          onOpenThread={onOpenThread}
        />
      </div>

      {/* Fixed Message Input */}
      <div className="absolute bottom-0 left-0 right-0 bg-base-200 p-0">
        <MessageInput
          message={message}
          isEmailVerified={isEmailVerified}
          typingUsers={typingUsers}
          channel={selectedChannel}
          onMessageChange={onMessageChange}
          onSubmit={onSendMessage}
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
                  onCancel: onCancelReply,
                }
              : undefined
          }
          channelMembers={channelMembers.map((member) => ({
            displayName: member.displayName || null,
            email: member.email,
          }))}
        />
      </div>
    </div>
  );
};

export default MainMessageArea; 
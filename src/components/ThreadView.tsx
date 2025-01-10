import React, { useRef } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { Message, ChannelMember, Channel } from '../types/chat';
import { IconType } from 'react-icons';

interface ThreadViewProps {
  selectedThread: {
    messageId: string;
    replies: Message[];
    loading: boolean;
  };
  messages: Message[];
  selectedChannel: Channel | null;
  isEmailVerified: boolean;
  typingUsers: { [key: string]: { displayName: string | null; email: string } };
  channelMembers: ChannelMember[];
  threadMessage: string;
  getUserDisplayName: (uid: string, email: string, displayName?: string) => string;
  getUserPhotoURL: (uid: string, photoURL?: string) => string | null;
  handleAddReaction: (messageId: string, emoji: string) => void;
  formatTime: (date: Date) => string;
  formatFileSize: (bytes: number) => string;
  getFileIcon: (fileName: string, contentType?: string) => IconType;
  commonEmojis: string[];
  handleThreadMessageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleThreadSendMessage: (e: React.FormEvent) => void;
  handleCloseThread: () => void;
}

const ThreadView: React.FC<ThreadViewProps> = ({
  selectedThread,
  messages,
  selectedChannel,
  isEmailVerified,
  typingUsers,
  channelMembers,
  threadMessage,
  getUserDisplayName,
  getUserPhotoURL,
  handleAddReaction,
  formatTime,
  formatFileSize,
  getFileIcon,
  commonEmojis,
  handleThreadMessageChange,
  handleThreadSendMessage,
  handleCloseThread,
}) => {
  const threadMessagesEndRef = useRef<HTMLDivElement>(null);

  return (
    <div className="fixed inset-0 z-20">
      <div className="absolute inset-0 bg-base-200/50 backdrop-blur-sm" />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-base-100 shadow-xl flex flex-col">
        {/* Thread Header */}
        <div className="p-4 border-b border-base-300 flex justify-between items-center">
          <h3 className="font-bold text-lg text-base-content">Thread</h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleCloseThread}
          >
            ×
          </button>
        </div>

        {/* Thread Content */}
        <div className="flex-1 overflow-y-auto">
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
            getUserDisplayName={getUserDisplayName}
            getUserPhotoURL={getUserPhotoURL}
            shouldShowHeader={() => true}
            formatTime={formatTime}
            handleAddReaction={handleAddReaction}
            formatFileSize={formatFileSize}
            getFileIcon={getFileIcon}
            commonEmojis={commonEmojis}
            hideReplyButton={true}
          />

          <div className="divider text-base-content">Replies</div>

          <MessageList
            isThread={true}
            messages={selectedThread.replies}
            loading={selectedThread.loading}
            isDirectMessage={!!selectedChannel?.dm}
            channelName={selectedChannel?.name || ""}
            getUserDisplayName={getUserDisplayName}
            getUserPhotoURL={getUserPhotoURL}
            shouldShowHeader={() => true}
            formatTime={formatTime}
            handleAddReaction={handleAddReaction}
            formatFileSize={formatFileSize}
            getFileIcon={getFileIcon}
            commonEmojis={commonEmojis}
            hideReplyButton={true}
          />
          <div ref={threadMessagesEndRef} />
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
              senderName: (() => {
                const originalMessage = messages.find(
                  (m) => m.id === selectedThread.messageId
                );
                return originalMessage
                  ? getUserDisplayName(
                      originalMessage.senderUid,
                      originalMessage._sender?.email || "",
                      originalMessage._sender?.displayName || undefined
                    )
                  : "Unknown";
              })(),
              onCancel: handleCloseThread,
            }}
            channelMembers={channelMembers.map((member) => ({
              displayName: member.displayName || null,
              email: member.email,
            }))}
          />
        </div>
      </div>
    </div>
  );
};

export default ThreadView; 
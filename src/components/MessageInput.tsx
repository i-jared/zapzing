import React from 'react';
import { FaPaperclip } from 'react-icons/fa';
import { Channel } from '../types/chat';

interface MessageInputProps {
  message: string;
  isEmailVerified: boolean;
  typingUsers: {[key: string]: {displayName: string | null, email: string}};
  channel: Channel | null;
  onMessageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onFileClick: () => void;
  replyTo?: {
    senderName: string;
    onCancel: () => void;
  };
  channelMembers: Array<{
    displayName: string | null;
    email: string;
  }>;
}

const MessageInput: React.FC<MessageInputProps> = ({
  message,
  isEmailVerified,
  typingUsers,
  channel,
  onMessageChange,
  onSubmit,
  onFileClick,
  replyTo,
  channelMembers
}) => {
  const typingUsersArray = Object.values(typingUsers);

  return (
    <div className="flex flex-col">
      {replyTo && (
        <div className="flex items-center gap-2 bg-base-300 p-2 rounded-t-lg">
          <span className="text-sm opacity-70">Replying to {replyTo.senderName}</span>
          <button
            onClick={replyTo.onCancel}
            className="btn btn-ghost btn-xs"
          >
            Cancel
          </button>
        </div>
      )}
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <button
          type="button"
          onClick={onFileClick}
          className="btn btn-ghost btn-circle"
          disabled={!isEmailVerified}
          title={!isEmailVerified ? "Please verify your email to send files" : ""}
        >
          <FaPaperclip className="w-5 h-5" />
        </button>
        <input
          type="text"
          placeholder={
            !isEmailVerified
              ? "Please verify your email to send messages"
              : channel?.dm
              ? `Message ${channel.name}`
              : `Message #${channel?.name}`
          }
          className="input input-bordered flex-1"
          value={message}
          onChange={onMessageChange}
          disabled={!isEmailVerified}
        />
      </form>
      {typingUsersArray.length > 0 && (
        <div className="text-sm opacity-70 mt-1">
          {typingUsersArray.length === 1 ? (
            <>{typingUsersArray[0].displayName || typingUsersArray[0].email} is typing...</>
          ) : typingUsersArray.length === 2 ? (
            <>{typingUsersArray[0].displayName || typingUsersArray[0].email} and {typingUsersArray[1].displayName || typingUsersArray[1].email} are typing...</>
          ) : (
            <>Several people are typing...</>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageInput; 
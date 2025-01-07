import React from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface MessageInputProps {
  message: string;
  isEmailVerified: boolean;
  typingUsers: {[key: string]: {displayName: string | null, email: string}};
  isDirectMessage: boolean;
  channelName: string;
  displayName: string | null;
  onMessageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onFileClick: () => void;
  replyTo?: {
    senderName: string;
    onCancel: () => void;
  };
}

const MessageInput: React.FC<MessageInputProps> = ({
  message,
  isEmailVerified,
  typingUsers,
  isDirectMessage,
  channelName,
  displayName,
  onMessageChange,
  onSubmit,
  onFileClick,
  replyTo
}) => {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && message.trim() && isEmailVerified) {
      e.preventDefault();
      onSubmit(e as any);
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newMessage = message.substring(0, start) + emoji.native + message.substring(end);
      const event = {
        target: {
          value: newMessage
        }
      } as React.ChangeEvent<HTMLInputElement>;
      onMessageChange(event);
      // Set cursor position after the inserted emoji
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = start + emoji.native.length;
        input.focus();
      }, 0);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0">
      <div className="p-4">
        {!isEmailVerified ? (
          <div className="alert alert-warning shadow-lg">
            <span>Please verify your email to send messages.</span>
          </div>
        ) : (
          <>
            <div className="flex flex-col bg-base-200 rounded-lg shadow-lg">
              {/* Typing indicator */}
              {Object.keys(typingUsers).length > 0 && (
                <div className="p-2 bg-base-300 rounded-t-lg">
                  <span className="text-xs opacity-70">
                    {Object.values(typingUsers)
                      .map(user => user.displayName || user.email)
                      .join(', ')}{' '}
                    {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              )}

              {/* Reply badge */}
              {replyTo && (
                <div className="p-2 bg-base-300 rounded-t-lg flex items-center justify-between">
                  <span className="text-sm opacity-70">
                    Replying to {replyTo.senderName}
                  </span>
                  <button 
                    onClick={replyTo.onCancel}
                    className="btn btn-ghost btn-xs"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Main input area */}
              <form onSubmit={onSubmit} className="flex items-center p-2">
                <button 
                  type="submit"
                  className="btn btn-circle btn-primary mr-2" 
                  disabled={!message.trim()}
                >
                  <Send className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  placeholder={`Message ${isDirectMessage ? 
                    `@${displayName || channelName}` : 
                    `#${channelName}`}`}
                  className="input input-bordered flex-grow bg-base-100"
                  value={message}
                  onChange={onMessageChange}
                  onKeyPress={handleKeyPress}
                />
              </form>

              {/* Actions compartment below */}
              <div className="p-2 bg-base-300 rounded-b-lg flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <button 
                    type="button" 
                    className="btn btn-ghost btn-sm"
                    onClick={onFileClick}
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <div className="divider divider-horizontal mx-0"></div>
                  <div className="dropdown dropdown-top">
                    <label tabIndex={0} className="btn btn-ghost btn-sm">
                      <Smile className="w-4 h-4" />
                    </label>
                    <div tabIndex={0} className="dropdown-content z-[50] mb-2 shadow-lg">
                      <Picker 
                        data={data} 
                        onEmojiSelect={handleEmojiSelect}
                        theme="dark"
                        previewPosition="none"
                        skinTonePosition="none"
                        searchPosition="none"
                        navPosition="none"
                        perLine={8}
                        maxFrequentRows={0}
                      />
                    </div>
                  </div>
                </div>
                <span className="text-xs text-base-content/70">Press Enter to send</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageInput; 
import React from 'react';
import { FaUser, FaSmile, FaExternalLinkAlt, FaDownload, FaFileImage, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileAlt } from 'react-icons/fa';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface Message {
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
}

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  isDirectMessage: boolean;
  channelName: string;
  getUserDisplayName: (uid: string, email: string, displayName?: string) => string;
  getUserPhotoURL: (uid: string, photoURL?: string) => string | null;
  handleAddReaction: (messageId: string, emoji: string) => void;
  shouldShowHeader: (msg: Message, index: number, messages: Message[]) => boolean;
  formatTime: (date: Date) => string;
  formatFileSize: (bytes: number) => string;
  getFileIcon: (fileName: string, contentType?: string) => typeof FaFileAlt;
  commonEmojis: string[];
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  loading,
  isDirectMessage,
  channelName,
  getUserDisplayName,
  getUserPhotoURL,
  handleAddReaction,
  shouldShowHeader,
  formatTime,
  formatFileSize,
  getFileIcon,
  commonEmojis
}) => {
  return (
    <div className="p-4">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center opacity-50">
            <div className="text-lg font-semibold">No messages yet</div>
            <div className="text-sm">Send the first message to {isDirectMessage ? '@' : '#'}{channelName}</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col space-y-2">
          {messages.map((msg, index, filteredMessages) => (
            <div key={msg.id} className="flex pl-4 group relative hover:bg-base-300/30 rounded-lg transition-colors">
              <div className="w-10 flex-shrink-0">
                {shouldShowHeader(msg, index, filteredMessages) && (
                  <div className="avatar">
                    {getUserPhotoURL(msg.sender.uid, msg.sender.photoURL) ? (
                      <div className="w-10 rounded-full">
                        <img src={getUserPhotoURL(msg.sender.uid, msg.sender.photoURL) || ''} alt="Profile" />
                      </div>
                    ) : (
                      <div className="placeholder">
                        <div className="bg-neutral text-neutral-content rounded-full w-10 h-10 flex items-center justify-center">
                          <FaUser className="w-6 h-6" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 ml-4">
                {shouldShowHeader(msg, index, filteredMessages) && (
                  <div className="flex items-baseline mb-1">
                    <span className="font-bold">
                      {getUserDisplayName(msg.sender.uid, msg.sender.email, msg.sender.displayName)}
                    </span>
                    <time className="text-xs opacity-50 ml-2">
                      {formatTime(msg.timestamp)}
                    </time>
                  </div>
                )}
                <div className="text-base-content relative">
                  <div className="flex items-start">
                    <div className="flex-1">
                      {msg.text}
                      {msg.attachment && (
                        <div className="mt-2 max-w-2xl">
                          {msg.attachment.contentType?.startsWith('image/') ? (
                            // Image Preview
                            <div className="relative group">
                              <img 
                                src={msg.attachment.url} 
                                alt={msg.attachment.name}
                                className="rounded-lg max-h-96 object-contain bg-base-200"
                              />
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="join">
                                  <a 
                                    href={msg.attachment.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="btn btn-sm join-item"
                                    title="View full size"
                                  >
                                    <FaExternalLinkAlt />
                                  </a>
                                  <a 
                                    href={msg.attachment.url} 
                                    download={msg.attachment.name}
                                    className="btn btn-sm join-item"
                                    title="Download"
                                  >
                                    <FaDownload />
                                  </a>
                                </div>
                              </div>
                              <div className="mt-1 text-sm opacity-70">
                                {msg.attachment.name} • {formatFileSize(msg.attachment.size)}
                              </div>
                            </div>
                          ) : (
                            // File Preview
                            <div className="bg-base-200 rounded-lg p-4 hover:bg-base-300 transition-colors group">
                              <div className="flex items-start gap-4">
                                <div className="text-4xl opacity-70">
                                  {React.createElement(getFileIcon(msg.attachment.name, msg.attachment.contentType))}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{msg.attachment.name}</div>
                                  <div className="text-sm opacity-70">{formatFileSize(msg.attachment.size)}</div>
                                </div>
                                <div className="join opacity-0 group-hover:opacity-100 transition-opacity">
                                  <a 
                                    href={msg.attachment.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="btn btn-sm join-item"
                                    title="View"
                                  >
                                    <FaExternalLinkAlt />
                                  </a>
                                  <a 
                                    href={msg.attachment.url} 
                                    download={msg.attachment.name}
                                    className="btn btn-sm join-item"
                                    title="Download"
                                  >
                                    <FaDownload />
                                  </a>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reaction Menu */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity items-center gap-2 absolute -top-12 right-8 bg-base-200 rounded-full p-2 shadow-lg z-[10] flex">
                    {commonEmojis.map(emoji => (
                      <button
                        key={emoji}
                        className="btn btn-ghost btn-sm px-2 min-h-0 h-8 flex items-center justify-center hover:bg-base-300"
                        onClick={() => handleAddReaction(msg.id, emoji)}
                      >
                        <span className="text-lg leading-none">{emoji}</span>
                      </button>
                    ))}
                    <div className="dropdown dropdown-end">
                      <label tabIndex={0} className="btn btn-ghost btn-sm px-2 min-h-0 h-8 flex items-center justify-center">
                        <FaSmile className="w-5 h-5" />
                      </label>
                      <div tabIndex={0} className="dropdown-content z-[50] shadow-lg">
                        <Picker 
                          data={data} 
                          onEmojiSelect={(emoji: any) => handleAddReaction(msg.id, emoji.native)}
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

                  {/* Display Reactions */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(msg.reactions).map(([emoji, reaction]) => (
                        <button
                          key={emoji}
                          className={`btn btn-ghost !min-h-7 !h-auto py-0.5 gap-1 px-2 flex items-center justify-center ${
                            reaction.users.includes(msg.sender.uid) ? 'bg-base-300 hover:bg-base-400' : ''
                          }`}
                          onClick={() => handleAddReaction(msg.id, emoji)}
                        >
                          <span className="text-base leading-none">{emoji}</span>
                          <span className="text-xs leading-none">{reaction.users.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageList; 
import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Smile, MessageCircle, Film, X } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Channel } from '../types/chat';
import StatusModal from './StatusModal';
import MovieCharactersModal from './MovieCharactersModal';
import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getImagePath } from '../utils/chat';

interface MessageInputProps {
  message: string;
  channel: Channel | null;
  isEmailVerified: boolean;
  typingUsers: {[key: string]: {displayName: string | null, email: string}};
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
  currentStatus?: string | null;
}

// Add this interface for the mention popup
interface MentionPopupProps {
  searchText: string;
  position: { 
    top?: string | number;
    bottom?: string | number;
    left: string | number 
  };
  onSelect: (user: { displayName: string | null; email: string }) => void;
  users: Array<{ displayName: string | null; email: string }>;
}

// Add the MentionPopup component
const MentionPopup: React.FC<MentionPopupProps> = ({ searchText, position, onSelect, users }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const filteredUsers = users.filter(user => {
    const searchLower = searchText.toLowerCase();
    return (
      user.displayName?.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredUsers.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
      } else if (e.key === 'Enter' && filteredUsers[selectedIndex]) {
        e.preventDefault();
        onSelect(filteredUsers[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredUsers, selectedIndex, onSelect]);

  return (
    <div 
      className="absolute z-[100] bg-base-200 rounded-lg shadow-xl border border-base-300"
      style={{ 
        ...position,
        maxHeight: '200px',
        overflowY: 'auto',
        minWidth: '200px'
      }}
    >
      {filteredUsers.map((user, index) => (
        <div
          key={user.email}
          className={`px-4 py-2 hover:bg-base-300 cursor-pointer flex items-center gap-2 ${
            index === selectedIndex ? 'bg-base-300' : ''
          }`}
          onClick={() => onSelect(user)}
        >
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content rounded-full w-8">
              <span>{(user.displayName || user.email)[0].toUpperCase()}</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-medium">{user.displayName || 'Unnamed'}</span>
            <span className="text-xs opacity-70">{user.email}</span>
          </div>
        </div>
      ))}
      {filteredUsers.length === 0 && (
        <div className="px-4 py-2 text-sm opacity-70">
          No users found
        </div>
      )}
    </div>
  );
};

const MessageInput: React.FC<MessageInputProps> = ({
  message,
  isEmailVerified,
  typingUsers,
  onMessageChange,
  onSubmit,
  onFileClick,
  channel,
  replyTo,
  channelMembers,
  currentStatus
}) => {
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionSearchText, setMentionSearchText] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessingMovie, setIsProcessingMovie] = useState(false);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setShowMentionPopup(false);  // Hide popup on Enter
      if (message.trim() && isEmailVerified) {
        e.preventDefault();
        onSubmit(e as any);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const lastAtIndex = newValue.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Get the text after the @ symbol up to the next space or end of string
      const textAfterAt = newValue.slice(lastAtIndex + 1);
      const searchText = textAfterAt.split(' ')[0];
      
      // Only show popup if:
      // 1. @ is preceded by a space or is at the start
      // 2. There's no space after the search text
      // 3. We're still at the same @ mention (cursor position check)
      if ((lastAtIndex === 0 || newValue[lastAtIndex - 1] === ' ') && 
          !searchText.includes(' ') && 
          inputRef.current?.selectionStart && 
          inputRef.current.selectionStart > lastAtIndex && 
          inputRef.current.selectionStart <= lastAtIndex + searchText.length + 1) {
        
        setMentionSearchText(searchText);
        setShowMentionPopup(true);
        
        // Calculate popup position based on input caret
        if (inputRef.current) {
          const inputRect = inputRef.current.getBoundingClientRect();
          const caretPosition = getCaretCoordinates(inputRef.current, lastAtIndex);
          
          setMentionPosition({
            top: inputRect.bottom + window.scrollY + 5,
            left: inputRect.left + caretPosition.left
          });
        }
      } else {
        setShowMentionPopup(false);  // Hide popup if conditions aren't met
      }
    } else {
      setShowMentionPopup(false);
    }
    
    onMessageChange(e);
  };

  const handleMentionSelect = (user: { displayName: string | null; email: string }) => {
    if (!inputRef.current) return;

    const lastAtIndex = message.lastIndexOf('@');
    const userName = (user.displayName || user.email).replace(/\s+/g, '_');  // Replace spaces with underscores
    const newMessage = 
      message.substring(0, lastAtIndex) + 
      `@${userName} ` + 
      message.substring(inputRef.current.selectionStart || message.length);

    const event = {
      target: { value: newMessage }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onMessageChange(event);
    setShowMentionPopup(false);  // Hide popup after selection
  };

  // Helper function to get caret coordinates
  const getCaretCoordinates = (input: HTMLInputElement, position: number) => {
    const clone = input.cloneNode() as HTMLInputElement;
    clone.style.position = 'absolute';
    clone.style.visibility = 'hidden';
    clone.style.width = `${input.offsetWidth}px`;
    clone.value = input.value.slice(0, position);
    document.body.appendChild(clone);
    const rect = clone.getBoundingClientRect();
    document.body.removeChild(clone);
    return { left: rect.width };
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

  const handleStatusClick = () => {
    const modal = document.getElementById('status-modal') as HTMLDialogElement;
    if (modal) modal.showModal();
  };

  const handleMovieCharactersClick = () => {
    const modal = document.getElementById('movie-characters-modal') as HTMLDialogElement;
    if (modal) {
      modal.showModal();
    }
  };

  const handleRemoveMovie = async (movieId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!channel) return;

    try {
      const channelRef = doc(db, 'channels', channel.id);
      const updatedMovies = { ...channel.activeMovies };
      delete updatedMovies[movieId];
      
      await updateDoc(channelRef, {
        activeMovies: updatedMovies
      });
    } catch (error) {
      console.error('Error removing movie:', error);
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
                  <span className="text-sm opacity-70 text-base-content">
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
              <form onSubmit={onSubmit} className="flex items-center p-2 gap-2">
                <button 
                  type="submit"
                  className="btn btn-circle btn-sm btn-primary" 
                  disabled={!message.trim() || !channel}
                >
                  <Send className="w-4 h-4" />
                </button>

                <div className="relative flex-grow">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={channel ? `Message ${channel.name}` : 'Select a channel to start messaging'}
                    className="input input-bordered input-md w-full focus:outline-none focus:border-primary bg-base-100 text-base-content placeholder:text-base-content/50"
                    value={message}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    disabled={!channel}
                  />

                  {showMentionPopup && (
                    <MentionPopup
                      searchText={mentionSearchText}
                      position={{ bottom: 'calc(100% + 5px)', left: 0 }}
                      onSelect={handleMentionSelect}
                      users={channelMembers}
                    />
                  )}
                </div>
              </form>

              {/* Actions compartment below */}
              <div className="px-4 py-2 bg-base-300 rounded-b-lg flex justify-between items-center border-t border-base-content/10">
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    className="btn btn-ghost btn-sm btn-square"
                    onClick={onFileClick}
                    disabled={!channel}
                  >
                    <Paperclip className="w-4 h-4 text-base-content/70 hover:text-base-content" />
                  </button>
                  <div className="dropdown dropdown-top">
                    <label tabIndex={0} className={`btn btn-ghost btn-sm btn-square ${!channel ? 'btn-disabled' : ''}`}>
                      <Smile className="w-4 h-4 text-base-content/70 hover:text-base-content" />
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
                  <button 
                    type="button" 
                    className="btn btn-ghost btn-sm btn-square"
                    onClick={handleStatusClick}
                    disabled={!auth.currentUser}
                  >
                    <MessageCircle className="w-4 h-4 text-base-content/70 hover:text-base-content" />
                  </button>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      className="btn btn-ghost btn-sm btn-square relative"
                      onClick={handleMovieCharactersClick}
                      disabled={!channel || isProcessingMovie}
                    >
                      {isProcessingMovie ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        <Film className="w-4 h-4 text-base-content/70 hover:text-base-content" />
                      )}
                    </button>
                    {channel?.activeMovies && Object.values(channel.activeMovies).map((movie) => (
                      <div key={movie.imdbId} className="relative w-6 h-6">
                        <div className="group relative w-full h-full">
                          <img 
                            src={getImagePath(movie.posterPath)} 
                            alt={movie.title} 
                            className="w-full h-full rounded object-cover"
                            title={movie.title}
                          />
                          {/* Overlay that appears on hover */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded flex items-center justify-center cursor-pointer"
                               onClick={(e) => handleRemoveMovie(movie.imdbId, e)}>
                            <X className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-base-content/50">Press Enter to send</span>
              </div>
            </div>
          </>
        )}
      </div>
      {auth.currentUser && (
        <>
          <StatusModal 
            userId={auth.currentUser.uid} 
            currentStatus={currentStatus || null}
          />
          {channel && <MovieCharactersModal 
            selectedChannel={channel} 
            onProcessingChange={setIsProcessingMovie}
          />}
        </>
      )}
    </div>
  );
};

export default MessageInput; 

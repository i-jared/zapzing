import React, { forwardRef, useImperativeHandle } from 'react';
import { FaUser, FaSmile, FaExternalLinkAlt, FaDownload, FaFileImage, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileAlt, FaReply } from 'react-icons/fa';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import MessageText from './MessageText';
import { auth } from '../firebase';

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
    replyTo?: {
        messageId: string;
        threadId: string;
        senderName: string;
    };
    replyCount?: number;
}

interface MessageListProps {
    messages: Message[];
    loading: boolean;
    isDirectMessage: boolean;
    channelName: string;
    getUserDisplayName: (senderId: string, senderEmail: string, senderDisplayName?: string) => string;
    getUserPhotoURL: (senderId: string, senderPhotoURL?: string) => string | null;
    handleAddReaction: (messageId: string, emoji: string) => void;
    shouldShowHeader: (msg: Message, index: number, messages: Message[]) => boolean;
    formatTime: (date: Date) => string;
    formatFileSize: (bytes: number) => string;
    getFileIcon: (fileName: string, contentType?: string) => typeof FaFileAlt;
    commonEmojis: string[];
    onReply?: (messageId: string) => void;
    replyingToId?: string;
    onOpenThread?: (messageId: string) => void;
    hideReplyButton?: boolean;
    isThread?: boolean;
}

export interface MessageListRef {
    scrollToBottom: () => void;
}

const MessageList = forwardRef<MessageListRef, MessageListProps>(({
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
    commonEmojis,
    onReply,
    replyingToId,
    onOpenThread,
    hideReplyButton,
    isThread = false
}, ref) => {
    useImperativeHandle(ref, () => ({
        scrollToBottom: () => {
            const container = document.querySelector(isThread ? '.thread-messages' : '.main-messages');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }
    }));

    return (
        <div className={`z-0 p-4 min-h-full ${isThread ? '' : 'flex flex-col-reverse overflow-y-auto'} relative ${isThread ? 'thread-messages' : 'main-messages'}`}>
            {/* Base solid background - can be any color or gradient */}
            {!isThread ? (
                // Main chat background (fixed)
                <>
                    <div className="fixed inset-x-0 bottom-0 top-[3.5rem] bg-base-100" />
                    <div 
                        className="fixed inset-x-0 bottom-0 top-[3.5rem] bg-base-200/20" 
                        style={{
                            maskImage: `url("/assets/pattern_dark.png")`,
                            WebkitMaskImage: `url("/assets/pattern_dark.png")`,
                            maskRepeat: 'repeat',
                            WebkitMaskRepeat: 'repeat',
                            maskSize: '200px 200px',
                            WebkitMaskSize: '200px 200px',
                            maskPosition: 'center',
                            WebkitMaskPosition: 'center',
                            WebkitMaskAttachment: 'fixed',
                            opacity: 0.9,
                        }} 
                    />
                </>
            ) : (
                // Thread background (absolute within container)
                <>
                    <div className="absolute inset-0 bg-base-100" />
                    <div 
                        className="absolute inset-0 bg-base-200/20" 
                        style={{
                            maskImage: `url("/assets/pattern_dark.png")`,
                            WebkitMaskImage: `url("/assets/pattern_dark.png")`,
                            maskRepeat: 'repeat',
                            WebkitMaskRepeat: 'repeat',
                            maskSize: '100px 100px',
                            WebkitMaskSize: '100px 100px',
                            maskPosition: 'center',
                            WebkitMaskPosition: 'center',
                            opacity: 0.9,
                        }} 
                    />
                </>
            )}

            {/* Content */}
            <div className="relative">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <span className="loading loading-spinner loading-lg"></span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-center opacity-50">
                            <div className="text-lg font-semibold text-base-content">No messages yet</div>
                            <div className="text-sm text-base-content/70">Send the first message to {isDirectMessage ? '@' : '#'}{channelName}</div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {messages.map((msg, index, filteredMessages) => (
                            <div
                                key={msg.id}
                                id={`message-${msg.id}`}
                                className={`flex pl-4 pt-2 group relative hover:bg-base-300/30 rounded-lg transition-all ${msg.id === replyingToId ?
                                    'bg-primary/5 shadow-[0_0_0_1px_hsl(var(--p))] before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-primary before:rounded-l-lg' :
                                    ''
                                    }`}
                            >
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
                                            <span className={`font-bold ${msg.sender.uid === auth.currentUser?.uid ? 'text-primary' : 'text-secondary'}`}>
                                                {getUserDisplayName(msg.sender.uid, msg.sender.email, msg.sender.displayName)}
                                            </span>
                                            <time className="text-xs opacity-50 ml-2 text-base-content/50">
                                                {formatTime(msg.timestamp)}
                                            </time>
                                        </div>
                                    )}
                                    <div className="text-base-content relative">
                                        <div className="flex items-start">
                                            <div className="flex-1">
                                                <MessageText text={msg.text} />
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
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity items-center gap-2 absolute -top-12 right-8 bg-base-200 rounded-full p-2 shadow-lg z-[10] flex pointer-events-none group-hover:pointer-events-auto">
                                            {!hideReplyButton && (
                                                <>
                                                    <button
                                                        className={`btn btn-sm px-2 min-h-0 h-8 flex items-center justify-center ${msg.id === replyingToId
                                                            ? 'btn-error hover:btn-error'
                                                            : 'btn-ghost hover:bg-base-300'
                                                            }`}
                                                        onClick={() => msg.id === replyingToId ? onReply?.(replyingToId) : onReply?.(msg.id)}
                                                        title={msg.id === replyingToId ? "Cancel reply" : "Reply"}
                                                    >
                                                        <FaReply className={`w-4 h-4 ${msg.id === replyingToId ? 'rotate-180' : ''
                                                            }`} />
                                                    </button>
                                                    <div className="w-px h-6 bg-base-content/20"></div>
                                                </>
                                            )}
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
                                                        className={`btn btn-ghost !min-h-7 !h-auto py-0.5 gap-1 px-2 flex items-center justify-center ${reaction.users.includes(msg.sender.uid) ? 'bg-base-300 hover:bg-base-400' : ''
                                                            }`}
                                                        onClick={() => handleAddReaction(msg.id, emoji)}
                                                    >
                                                        <span className="text-base leading-none">{emoji}</span>
                                                        <span className="text-xs leading-none">{reaction.users.length}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Add reply count at the bottom */}
                                        {(msg.replyCount ?? 0) > 0 && (
                                            <div className="mt-1 ml-14">
                                                <button
                                                    onClick={() => onOpenThread?.(msg.id)}
                                                    className="btn btn-ghost btn-xs text-primary hover:text-primary-focus"
                                                >
                                                    {msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

export default MessageList; 
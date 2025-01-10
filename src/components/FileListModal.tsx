import React from 'react';
import { FaSearch, FaFile, FaExternalLinkAlt, FaDownload } from 'react-icons/fa';
import { Message } from '../types/chat';

interface FileListModalProps {
  messages: Message[];
  fileSearchQuery: string;
  onSearchChange: (query: string) => void;
  getUserDisplayName: (uid: string, email: string, displayName?: string) => string;
  formatFileSize: (bytes: number) => string;
  getFileIcon: (fileName: string, contentType?: string) => React.ComponentType;
}

const FileListModal: React.FC<FileListModalProps> = ({
  messages,
  fileSearchQuery,
  onSearchChange,
  getUserDisplayName,
  formatFileSize,
  getFileIcon
}) => {
  const filteredMessages = messages.filter(m => {
    if (!fileSearchQuery) return true;
    const searchLower = fileSearchQuery.toLowerCase();
    const fileName = m.attachment?.name.toLowerCase() || '';
    const fileType = m.attachment?.contentType?.toLowerCase() || '';
    const sharedBy = getUserDisplayName(
      m.senderUid,
      m._sender?.email || '',
      m._sender?.displayName || undefined
    ).toLowerCase();
    const date = m.timestamp.toLocaleDateString().toLowerCase();
    return fileName.includes(searchLower) || 
           fileType.includes(searchLower) || 
           sharedBy.includes(searchLower) ||
           date.includes(searchLower);
  });

  return (
    <dialog id="files-modal" className="modal">
      <div className="modal-box max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-base-content">Channel Files</h3>
          <div className="join">
            <input
              type="text"
              placeholder="Search files..."
              className="input input-bordered join-item w-64 text-base-content placeholder:text-base-content/60"
              value={fileSearchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <button className="btn join-item text-base-content">
              <FaSearch className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[50vh]">
            {filteredMessages.map((msg) => (
              <div key={msg.id} className="card bg-base-100">
                <div className="card-body p-4">
                  {msg.attachment?.contentType?.startsWith('image/') ? (
                    // Image Preview
                    <figure className="relative group">
                      <img 
                        src={msg.attachment.url} 
                        alt={msg.attachment.name}
                        className="rounded-lg w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-base-300/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a 
                          href={msg.attachment.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-ghost text-base-content"
                          title="View full size"
                        >
                          <FaExternalLinkAlt />
                        </a>
                        <a 
                          href={msg.attachment.url} 
                          download={msg.attachment.name}
                          className="btn btn-sm btn-ghost text-base-content"
                          title="Download"
                        >
                          <FaDownload />
                        </a>
                      </div>
                    </figure>
                  ) : (
                    // File Preview
                    <div className="flex items-start gap-4">
                      <div className="text-3xl text-base-content/70">
                        {React.createElement(getFileIcon(msg.attachment?.name || '', msg.attachment?.contentType))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-base-content">{msg.attachment?.name}</div>
                        <div className="text-sm text-base-content/70">{formatFileSize(msg.attachment?.size || 0)}</div>
                        <div className="mt-2 flex gap-2">
                          <a 
                            href={msg.attachment?.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-ghost text-base-content"
                            title="View"
                          >
                            <FaExternalLinkAlt />
                          </a>
                          <a 
                            href={msg.attachment?.url} 
                            download={msg.attachment?.name}
                            className="btn btn-sm btn-ghost text-base-content"
                            title="Download"
                          >
                            <FaDownload />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-base-content/70 mt-2">
                    Shared by {getUserDisplayName(
                      msg.senderUid,
                      msg._sender?.email || '',
                      msg._sender?.displayName || undefined
                    )} on {msg.timestamp.toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}

            {messages.length === 0 && (
              <div className="col-span-full flex items-center justify-center h-full">
                <div className="text-center text-base-content/50">
                  <FaFile className="w-12 h-12 mx-auto mb-2" />
                  <div className="text-lg font-semibold">No files shared yet</div>
                  <div className="text-sm">Files shared in this channel will appear here</div>
                </div>
              </div>
            )}

            {messages.length > 0 && filteredMessages.length === 0 && (
              <div className="col-span-full flex items-center justify-center h-full">
                <div className="text-center text-base-content/50">
                  <FaSearch className="w-12 h-12 mx-auto mb-2" />
                  <div className="text-lg font-semibold">No matching files</div>
                  <div className="text-sm">Try adjusting your search terms</div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="modal-action">
          <form method="dialog">
            <button className="btn">Close</button>
          </form>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}

export default FileListModal; 
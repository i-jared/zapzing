import React from 'react';
import { FaSearch, FaFile, FaExternalLinkAlt, FaDownload, FaFileImage, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileAlt } from 'react-icons/fa';

interface FileListModalProps {
  messages: Array<{
    id: string;
    sender: {
      uid: string;
      email: string;
      displayName?: string;
    };
    timestamp: Date;
    attachment?: {
      type: 'file' | 'video' | 'drawing';
      url: string;
      name: string;
      size: number;
      contentType?: string;
    };
  }>;
  fileSearchQuery: string;
  onSearchChange: (query: string) => void;
  getUserDisplayName: (uid: string, email: string, displayName?: string) => string;
}

// Helper function to get file icon
const getFileIcon = (fileName: string, contentType?: string) => {
  if (contentType?.startsWith('image/')) return FaFileImage;
  if (contentType?.includes('pdf')) return FaFilePdf;
  if (contentType?.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) return FaFileWord;
  if (contentType?.includes('excel') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return FaFileExcel;
  if (contentType?.includes('powerpoint') || fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) return FaFilePowerpoint;
  return FaFileAlt;
};

// Helper function to format file size
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const FileListModal: React.FC<FileListModalProps> = ({
  messages,
  fileSearchQuery,
  onSearchChange,
  getUserDisplayName
}) => {
  const filteredMessages = messages.filter(m => {
    if (!fileSearchQuery) return true;
    const searchLower = fileSearchQuery.toLowerCase();
    const fileName = m.attachment?.name.toLowerCase() || '';
    const fileType = m.attachment?.contentType?.toLowerCase() || '';
    const sharedBy = getUserDisplayName(m.sender.uid, m.sender.email, m.sender.displayName).toLowerCase();
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
          <h3 className="font-bold text-lg">Channel Files</h3>
          <div className="join">
            <input
              type="text"
              placeholder="Search files..."
              className="input input-bordered join-item w-64"
              value={fileSearchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <button className="btn join-item">
              <FaSearch className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[50vh]">
            {filteredMessages.map((msg) => (
              <div key={msg.id} className="card bg-base-200">
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
                          className="btn btn-sm btn-ghost"
                          title="View full size"
                        >
                          <FaExternalLinkAlt />
                        </a>
                        <a 
                          href={msg.attachment.url} 
                          download={msg.attachment.name}
                          className="btn btn-sm btn-ghost"
                          title="Download"
                        >
                          <FaDownload />
                        </a>
                      </div>
                    </figure>
                  ) : (
                    // File Preview
                    <div className="flex items-start gap-4">
                      <div className="text-3xl opacity-70">
                        {React.createElement(getFileIcon(msg.attachment?.name || '', msg.attachment?.contentType))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{msg.attachment?.name}</div>
                        <div className="text-sm opacity-70">{formatFileSize(msg.attachment?.size || 0)}</div>
                        <div className="mt-2 flex gap-2">
                          <a 
                            href={msg.attachment?.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-ghost"
                            title="View"
                          >
                            <FaExternalLinkAlt />
                          </a>
                          <a 
                            href={msg.attachment?.url} 
                            download={msg.attachment?.name}
                            className="btn btn-sm btn-ghost"
                            title="Download"
                          >
                            <FaDownload />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="text-xs opacity-70 mt-2">
                    Shared by {getUserDisplayName(msg.sender.uid, msg.sender.email, msg.sender.displayName)} on {msg.timestamp.toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}

            {messages.length === 0 && (
              <div className="col-span-full flex items-center justify-center h-full">
                <div className="text-center opacity-50">
                  <FaFile className="w-12 h-12 mx-auto mb-2" />
                  <div className="text-lg font-semibold">No files shared yet</div>
                  <div className="text-sm">Files shared in this channel will appear here</div>
                </div>
              </div>
            )}

            {messages.length > 0 && filteredMessages.length === 0 && (
              <div className="col-span-full flex items-center justify-center h-full">
                <div className="text-center opacity-50">
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
};

export default FileListModal; 
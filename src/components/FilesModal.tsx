import React from 'react';
import { Message } from '../types/chat';
import { IconType } from 'react-icons';
import MessageText from './MessageText';

interface FilesModalProps {
  files: Array<{
    message: Message;
    fileName: string;
    fileSize: number;
    contentType?: string;
  }>;
  getUserDisplayName: (uid: string, email: string, displayName?: string) => string;
  formatTime: (date: Date) => string;
  formatFileSize: (bytes: number) => string;
  getFileIcon: (fileName: string, contentType?: string) => IconType;
  onFileClick: (message: Message) => void;
}

const FilesModal: React.FC<FilesModalProps> = ({
  files,
  getUserDisplayName,
  formatTime,
  formatFileSize,
  getFileIcon,
  onFileClick,
}) => {
  return (
    <dialog id="files-modal" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg text-base-content">Shared Files</h3>
        <div className="py-4 space-y-4">
          {files.length === 0 ? (
            <p className="text-center text-base-content/70">
              No files shared yet
            </p>
          ) : (
            files.map(({ message, fileName, fileSize, contentType }) => {
              const FileIcon = getFileIcon(fileName, contentType);
              return (
                <div
                  key={message.id}
                  className="bg-base-200 p-4 rounded-lg cursor-pointer hover:bg-base-300"
                  onClick={() => onFileClick(message)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="avatar placeholder">
                      <div className="bg-neutral text-neutral-content rounded-full w-8">
                        <span>
                          {
                            (getUserDisplayName(
                              message.senderUid,
                              message._sender?.email || "",
                              message._sender?.displayName || undefined
                            ) || "?")[0]
                          }
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-base-content">
                        {getUserDisplayName(
                          message.senderUid,
                          message._sender?.email || "",
                          message._sender?.displayName || undefined
                        ) || "Unknown User"}
                      </span>
                      <span className="text-xs text-base-content/70 ml-2">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-base-content">
                    <FileIcon className="w-8 h-8 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{fileName}</div>
                      <div className="text-sm text-base-content/70">
                        {formatFileSize(fileSize)}
                      </div>
                    </div>
                  </div>
                  <div className="text-base-content mt-2">
                    <MessageText text={message.text} />
                  </div>
                </div>
              );
            })
          )}
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

export default FilesModal; 
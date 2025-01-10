import React from 'react';
import { Message } from '../types/chat';
import MessageText from './MessageText';

interface LinksModalProps {
  links: Array<{
    message: Message;
    url: string;
  }>;
  getUserDisplayName: (uid: string, email: string, displayName?: string) => string;
  formatTime: (date: Date) => string;
  onLinkClick: (message: Message) => void;
}

const LinksModal: React.FC<LinksModalProps> = ({
  links,
  getUserDisplayName,
  formatTime,
  onLinkClick,
}) => {
  return (
    <dialog id="links-modal" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg text-base-content">Shared Links</h3>
        <div className="py-4 space-y-4">
          {links.length === 0 ? (
            <p className="text-center text-base-content/70">
              No links shared yet
            </p>
          ) : (
            links.map(({ message, url }) => (
              <div
                key={message.id}
                className="bg-base-200 p-4 rounded-lg cursor-pointer hover:bg-base-300"
                onClick={() => onLinkClick(message)}
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
                <div className="text-base-content">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {url}
                  </a>
                </div>
                <div className="text-base-content mt-2">
                  <MessageText text={message.text} />
                </div>
              </div>
            ))
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

export default LinksModal; 
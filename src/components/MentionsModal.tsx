import React from 'react';
import { Message } from '../types/chat';
import MessageText from './MessageText';

interface MentionsModalProps {
  mentions: Array<{
    message: Message;
    mentionedName: string;
  }>;
  getUserDisplayName: (uid: string, email: string, displayName?: string) => string;
  formatTime: (date: Date) => string;
  onMentionClick: (message: Message) => void;
}

const MentionsModal: React.FC<MentionsModalProps> = ({
  mentions,
  getUserDisplayName,
  formatTime,
  onMentionClick,
}) => {
  return (
    <dialog id="mentions-modal" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg text-base-content">Mentions</h3>
        <div className="py-4 space-y-4">
          {mentions.length === 0 ? (
            <p className="text-center text-base-content/70">
              No mentions yet
            </p>
          ) : (
            mentions.map(({ message, mentionedName }) => (
              <div
                key={message.id}
                className="bg-base-100 p-4 rounded-lg cursor-pointer hover:bg-base-200"
                onClick={() => {
                  // Close the modal
                  const modal = document.getElementById(
                    "mentions-modal"
                  ) as HTMLDialogElement;
                  if (modal) modal.close();

                  onMentionClick(message);
                }}
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

export default MentionsModal; 
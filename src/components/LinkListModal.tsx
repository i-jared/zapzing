import React from 'react';
import { FaSearch, FaLink, FaExternalLinkAlt } from 'react-icons/fa';

interface Message {
  id: string;
  text: string;
  sender: {
    uid: string;
    email: string;
    displayName?: string;
  };
  timestamp: Date;
  channel: string;
  workspaceId: string;
}

interface LinkListModalProps {
  messages: Message[];
  linkSearchQuery: string;
  onSearchChange: (query: string) => void;
  getUserDisplayName: (uid: string, email: string, displayName?: string) => string;
}

// Updated regex to catch more URL patterns
const URL_REGEX = /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

const LinkListModal: React.FC<LinkListModalProps> = ({
  messages,
  linkSearchQuery,
  onSearchChange,
  getUserDisplayName
}) => {
  // Extract all links from messages
  const allLinks = messages.flatMap(msg => {
    const links = msg.text.match(URL_REGEX) || [];
    return links.map(link => ({
      url: link,
      message: msg
    }));
  });

  const filteredLinks = allLinks.filter(item => {
    if (!linkSearchQuery) return true;
    const searchLower = linkSearchQuery.toLowerCase();
    const url = item.url.toLowerCase();
    const sharedBy = getUserDisplayName(
      item.message.sender.uid,
      item.message.sender.email,
      item.message.sender.displayName
    ).toLowerCase();
    const date = item.message.timestamp.toLocaleDateString().toLowerCase();
    return url.includes(searchLower) || 
           sharedBy.includes(searchLower) ||
           date.includes(searchLower);
  });

  return (
    <dialog id="links-modal" className="modal">
      <div className="modal-box max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-base-content">Channel Links</h3>
          <div className="join">
            <input
              type="text"
              placeholder="Search links..."
              className="input input-bordered join-item w-64 text-base-content placeholder:text-base-content/60"
              value={linkSearchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <button className="btn join-item text-base-content">
              <FaSearch className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 gap-4 min-h-[50vh]">
            {filteredLinks.map((item, index) => (
              <div key={`${item.message.id}-${index}`} className="card bg-base-100">
                <div className="card-body p-4">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl text-base-content/70">
                      <FaLink />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium break-all text-base-content">{item.url}</div>
                      <div className="mt-2">
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-ghost gap-2 text-base-content"
                        >
                          <FaExternalLinkAlt />
                          Open Link
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-base-content/70 mt-2">
                    Shared by {getUserDisplayName(
                      item.message.sender.uid,
                      item.message.sender.email,
                      item.message.sender.displayName
                    )} on {item.message.timestamp.toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}

            {messages.length === 0 && (
              <div className="col-span-full flex items-center justify-center h-full">
                <div className="text-center text-base-content/50">
                  <FaLink className="w-12 h-12 mx-auto mb-2" />
                  <div className="text-lg font-semibold">No links shared yet</div>
                  <div className="text-sm">Links shared in this channel will appear here</div>
                </div>
              </div>
            )}

            {messages.length > 0 && filteredLinks.length === 0 && (
              <div className="col-span-full flex items-center justify-center h-full">
                <div className="text-center text-base-content/50">
                  <FaSearch className="w-12 h-12 mx-auto mb-2" />
                  <div className="text-lg font-semibold">No matching links</div>
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

export default LinkListModal; 
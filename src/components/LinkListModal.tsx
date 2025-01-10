import React, { useState, useEffect } from 'react';
import { FaSearch, FaLink, FaExternalLinkAlt, FaSpinner } from 'react-icons/fa';
import { Message } from '../types/chat';

interface LinkListModalProps {
  messages: Message[];
  linkSearchQuery: string;
  onSearchChange: (query: string) => void;
  getUserDisplayName: (uid: string, email: string, displayName?: string) => string;
}

interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url?: string;
}

// Updated regex to catch more URL patterns
const URL_REGEX = /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

// Link Preview Component
const LinkPreview: React.FC<{ url: string }> = ({ url }) => {
  const [ogData, setOgData] = useState<OpenGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchOGData = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await fetch(`/api/og?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error('Failed to fetch OG data');
        const data = await response.json();
        setOgData(data);
      } catch (err) {
        console.error('Error fetching OG data:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchOGData();
  }, [url]);

  if (loading) {
    return (
      <div className="card bg-base-100">
        <div className="card-body items-center justify-center py-8">
          <FaSpinner className="w-6 h-6 animate-spin text-base-content/50" />
        </div>
      </div>
    );
  }

  if (error || !ogData) {
    return (
      <div className="card bg-base-100">
        <div className="card-body p-4">
          <div className="flex items-start gap-4">
            <div className="text-3xl text-base-content/70">
              <FaLink />
            </div>
            <div className="flex-1 min-w-0">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="link link-hover font-medium truncate block"
              >
                {url}
              </a>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-ghost text-base-content"
            >
              <FaExternalLinkAlt />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100">
      <div className="card-body p-4">
        <div className="flex items-start gap-4">
          {ogData.image && (
            <img
              src={ogData.image}
              alt={ogData.title || 'Link preview'}
              className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <a
              href={ogData.url || url}
              target="_blank"
              rel="noopener noreferrer"
              className="link link-hover font-medium truncate block"
            >
              {ogData.title || url}
            </a>
            {ogData.description && (
              <p className="text-sm text-base-content/70 line-clamp-2 mt-1">
                {ogData.description}
              </p>
            )}
            {ogData.siteName && (
              <div className="text-xs text-base-content/50 mt-1">
                {ogData.siteName}
              </div>
            )}
          </div>
          <a
            href={ogData.url || url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-ghost text-base-content"
          >
            <FaExternalLinkAlt />
          </a>
        </div>
      </div>
    </div>
  );
};

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
      item.message.senderUid,
      item.message._sender?.email || '',
      item.message._sender?.displayName || undefined
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
              <div key={`${item.message.id}-${index}`}>
                <LinkPreview url={item.url} />
                <div className="text-xs text-base-content/70 mt-2 px-4">
                  Shared by {getUserDisplayName(
                    item.message.senderUid,
                    item.message._sender?.email || '',
                    item.message._sender?.displayName || undefined
                  )} on {item.message.timestamp.toLocaleDateString()}
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
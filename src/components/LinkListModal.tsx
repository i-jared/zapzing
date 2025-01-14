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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOgData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Ensure URL has protocol
        const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
        
        // Use a proxy service to avoid CORS issues and fetch OpenGraph data
        const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(urlWithProtocol)}`);
        const data = await response.json();

        if (data.status === 'success') {
          setOgData({
            title: data.data.title,
            description: data.data.description,
            image: data.data.image?.url,
            siteName: data.data.publisher,
            url: urlWithProtocol,
          });
        } else {
          setError('Failed to load preview');
        }
      } catch (err) {
        setError('Failed to load preview');
        console.error('Error fetching OpenGraph data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOgData();
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 bg-base-200 rounded-lg">
        <FaSpinner className="animate-spin text-base-content w-6 h-6" />
      </div>
    );
  }

  if (error || !ogData) {
    return (
      <div className="flex items-center gap-4 p-4 bg-base-200 rounded-lg">
        <FaLink className="text-base-content/70 w-6 h-6" />
        <div className="flex-1 min-w-0">
          <div className="font-medium break-all text-base-content">{url}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200 hover:bg-base-300 transition-colors">
      <div className="p-4">
        <div className="flex gap-4">
          {ogData.image && (
            <div className="flex-shrink-0">
              <img
                src={ogData.image}
                alt={ogData.title || 'Link preview'}
                className="max-w-[200px] max-h-[150px] w-auto h-auto object-contain rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base-content">
              {ogData.title || url}
            </h3>
            {ogData.description && (
              <p className="text-sm text-base-content/70 mt-1 line-clamp-2">
                {ogData.description}
              </p>
            )}
            {ogData.siteName && (
              <p className="text-xs text-base-content/50 mt-2">
                {ogData.siteName}
              </p>
            )}
          </div>
        </div>
        <div className="mt-2">
          <a
            href={ogData.url}
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
      item.message.sender.uid,
      item.message.sender.email || "",
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
              <div key={`${item.message.id}-${index}`}>
                <LinkPreview url={item.url} />
                <div className="text-xs text-base-content/70 mt-2 px-4">
                  Shared by {getUserDisplayName(
                    item.message.sender.uid,
                    item.message.sender.email || "",
                    item.message.sender.displayName
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
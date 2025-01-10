import React from 'react';
import { Message } from '../types/chat';
import MessageText from './MessageText';

interface SearchResult {
  message: Message;
  preview: string;
  context: string;
}

interface SearchResultsViewProps {
  searchResults: SearchResult[];
  searchQuery: string;
  getUserDisplayName: (uid: string, email: string, displayName?: string) => string;
  formatTime: (date: Date) => string;
  onResultClick: (message: Message) => void;
}

const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  searchResults,
  searchQuery,
  getUserDisplayName,
  formatTime,
  onResultClick,
}) => {
  if (!searchQuery) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-base-100 z-10 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-bold mb-4 text-base-content">
          Search Results for "{searchQuery}"
        </h2>
        <div className="space-y-4">
          {searchResults.length === 0 ? (
            <p className="text-center text-base-content/70">
              No messages found
            </p>
          ) : (
            searchResults.map((result) => (
              <div
                key={result.message.id}
                className="bg-base-200 p-4 rounded-lg cursor-pointer hover:bg-base-300"
                onClick={() => onResultClick(result.message)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="avatar placeholder">
                    <div className="bg-neutral text-neutral-content rounded-full w-8">
                      <span>
                        {
                          (getUserDisplayName(
                            result.message.senderUid,
                            result.message._sender?.email || "",
                            result.message._sender?.displayName || undefined
                          ) || "?")[0]
                        }
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-base-content">
                      {getUserDisplayName(
                        result.message.senderUid,
                        result.message._sender?.email || "",
                        result.message._sender?.displayName || undefined
                      ) || "Unknown User"}
                    </span>
                    <span className="text-xs text-base-content/70 ml-2">
                      {formatTime(result.message.timestamp)}
                    </span>
                  </div>
                </div>
                <div className="text-base-content">
                  <p className="text-sm opacity-70">{result.context}</p>
                  <p className="text-base-content">{result.preview}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResultsView; 
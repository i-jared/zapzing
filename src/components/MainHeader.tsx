import React from 'react';
import { FaFolder, FaLink, FaAt, FaSearch } from 'react-icons/fa';
import { Channel } from '../types/chat';

interface MainHeaderProps {
  selectedChannel: Channel | null;
  searchQuery: string;
  isMobileSearchActive: boolean;
  onSearchChange: (query: string) => void;
  onCancelSearch: () => void;
  onToggleMobileSearch: () => void;
}

const MainHeader: React.FC<MainHeaderProps> = ({
  selectedChannel,
  searchQuery,
  isMobileSearchActive,
  onSearchChange,
  onCancelSearch,
  onToggleMobileSearch,
}) => {
  return (
    <div className="bg-base-100 border-b border-base-300 h-14 flex items-center px-4 sticky top-0 z-10">
      {!isMobileSearchActive ? (
        <>
          <h1 className="text-lg font-bold text-base-content flex-1">
            {selectedChannel?.dm ? (
              <>@{selectedChannel?.name}</>
            ) : (
              <>#{selectedChannel?.name}</>
            )}
          </h1>
          <div className="flex gap-1">
            <button
              className="btn btn-ghost btn-xs btn-square w-fit text-base-content"
              onClick={() => {
                const modal = document.getElementById(
                  "files-modal"
                ) as HTMLDialogElement;
                if (modal) modal.showModal();
              }}
              title="Browse files"
            >
              <FaFolder className="w-6 h-3" />
            </button>
            <button
              className="btn btn-ghost btn-xs btn-square w-fit text-base-content"
              onClick={() => {
                const modal = document.getElementById(
                  "links-modal"
                ) as HTMLDialogElement;
                if (modal) modal.showModal();
              }}
              title="Browse links"
            >
              <FaLink className="w-6 h-3" />
            </button>
            <button
              className="btn btn-ghost btn-xs btn-square w-fit text-base-content"
              onClick={() => {
                const modal = document.getElementById(
                  "mentions-modal"
                ) as HTMLDialogElement;
                if (modal) modal.showModal();
              }}
              title="View mentions"
            >
              <FaAt className="w-6 h-3" />
            </button>
            <button
              className="btn btn-ghost btn-xs btn-square w-fit text-base-content lg:hidden"
              onClick={onToggleMobileSearch}
              title="Search"
            >
              <FaSearch className="w-6 h-3" />
            </button>
          </div>
        </>
      ) : (
        // Mobile Search View - shown when searching on mobile
        <div className="w-full flex items-center gap-2 px-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search messages..."
              className="input input-bordered w-full text-base-content placeholder:text-base-content/60"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
            />
          </div>
          <button
            className="btn btn-ghost text-base-content"
            onClick={onCancelSearch}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default MainHeader; 
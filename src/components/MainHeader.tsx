import React from "react";
import {
  FaFolder,
  FaLink,
  FaAt,
  FaSearch,
  FaUserCircle,
  FaSignOutAlt,
  FaBuilding,
  FaCog,
} from "react-icons/fa";
import { Channel, Message } from "../types/chat";

interface MainHeaderProps {
  selectedChannel: Channel | null;
  searchQuery: string;
  isMobileSearchActive: boolean;
  searchResults: Array<{
    message: Message;
    preview: string;
    context: string;
  }>;
  onSearchChange: (query: string) => void;
  onCancelSearch: () => void;
  onToggleMobileSearch: () => void;
  onProfileClick: () => void;
  onAccountClick: () => void;
  onSignOut: () => void;
  onSearchResultClick: (result: {
    message: Message;
    preview: string;
    context: string;
  }) => void;
  onToggleWorkspaceSidebar: () => void;
}

const MainHeader: React.FC<MainHeaderProps> = ({
  selectedChannel,
  searchQuery,
  searchResults,
  isMobileSearchActive,
  onSearchChange,
  onCancelSearch,
  onToggleMobileSearch,
  onProfileClick,
  onAccountClick,
  onSignOut,
  onSearchResultClick,
  onToggleWorkspaceSidebar,
}) => {
  return (
    <div className="bg-base-100 border-b border-base-300 sticky top-0 z-10">
      {/* Top Navbar */}
      <div className="navbar h-14 px-4">
        <div className="navbar-start flex gap-4">
          <label
            htmlFor="main-drawer"
            className="btn btn-ghost btn-sm drawer-button lg:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="inline-block w-5 h-5 stroke-current"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </label>

          {/* Channel Name */}
          <div className="flex flex-col justify-center">
            <h1 className="text-xl font-bold text-base-content leading-none">
              {selectedChannel?.dm ? (
                <>@{selectedChannel?.name}</>
              ) : (
                <>#{selectedChannel?.name}</>
              )}
            </h1>
            {/* Action Buttons */}
            <div className="flex gap-2 mt-1">
              <button
                className="btn btn-ghost btn-xs btn-square text-base-content p-0"
                onClick={() => {
                  const modal = document.getElementById(
                    "files-modal"
                  ) as HTMLDialogElement;
                  if (modal) modal.showModal();
                }}
                title="Browse files"
              >
                <FaFolder className="w-4 h-4" />
              </button>
              <button
                className="btn btn-ghost btn-xs btn-square text-base-content p-0"
                onClick={() => {
                  const modal = document.getElementById(
                    "links-modal"
                  ) as HTMLDialogElement;
                  if (modal) modal.showModal();
                }}
                title="Browse links"
              >
                <FaLink className="w-4 h-4" />
              </button>
              <button
                className="btn btn-ghost btn-xs btn-square text-base-content p-0"
                onClick={() => {
                  const modal = document.getElementById(
                    "mentions-modal"
                  ) as HTMLDialogElement;
                  if (modal) modal.showModal();
                }}
                title="View mentions"
              >
                <FaAt className="w-4 h-4" />
              </button>
              <button
                className="btn btn-ghost btn-xs btn-square lg:hidden p-0"
                onClick={onToggleMobileSearch}
                title="Search"
              >
                <FaSearch className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right side with search and buttons */}
        <div className="navbar-end gap-2">
          {/* Desktop Search - visible only on lg screens */}
          <div className="hidden lg:block w-96 mx-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search messages..."
                className="input input-bordered w-full text-base-content placeholder:text-base-content/60"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />

              {searchResults.length > 0 && (
                <div
                  className="absolute z-[100] bg-base-200 w-full shadow-lg rounded-box"
                  style={{ top: "calc(100% + 0.5rem)" }}
                >
                  {searchResults.map((result) => (
                    <div
                      key={result.message.id}
                      onClick={() => onSearchResultClick(result)}
                      className="p-2 hover:bg-base-300 rounded-lg cursor-pointer"
                    >
                      <div className="text-sm font-medium text-base-content">
                        {result.preview}
                      </div>
                      <div className="text-xs text-base-content/70">
                        {result.context}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onToggleWorkspaceSidebar}
            className="btn btn-ghost btn-md text-base-content"
          >
            <FaBuilding className="w-6 h-6" />
          </button>

          {/* Profile Dropdown */}
          <div className="dropdown dropdown-end">
            <label
              tabIndex={0}
              className="btn btn-ghost btn-md text-base-content"
            >
              <FaUserCircle className="w-6 h-6" />
            </label>
            <ul
              tabIndex={0}
              className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 text-base-content"
            >
              <li>
                <a onClick={onProfileClick}>
                  <FaUserCircle className="w-4 h-4" />
                  Profile
                </a>
              </li>
              <li>
                <a onClick={onAccountClick}>
                  <FaCog className="w-4 h-4" />
                  Account Settings
                </a>
              </li>
              <li>
                <a onClick={onSignOut} className="text-error">
                  <FaSignOutAlt className="w-4 h-4" />
                  Sign Out
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainHeader;

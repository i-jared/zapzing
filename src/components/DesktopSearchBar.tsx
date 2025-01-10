import React from 'react';
import { FaSearch } from 'react-icons/fa';

interface DesktopSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const DesktopSearchBar: React.FC<DesktopSearchBarProps> = ({
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-base-200 rounded-lg">
      <FaSearch className="w-4 h-4 text-base-content/50" />
      <input
        type="text"
        placeholder="Search messages..."
        className="bg-transparent border-none focus:outline-none text-base-content placeholder:text-base-content/50 w-full"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
};

export default DesktopSearchBar; 
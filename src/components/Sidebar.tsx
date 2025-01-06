import React, { useState } from 'react';
import { FaSearch, FaCircle, FaEllipsisV } from 'react-icons/fa';

// Dummy data
const channels = ['general', 'random', 'announcements', 'project-a', 'project-b'];
const users = [
    { name: 'Alice', status: 'online' },
    { name: 'Bob', status: 'offline' },
    { name: 'Charlie', status: 'online' },
    { name: 'David', status: 'offline' },
];

interface SidebarProps {
    onChannelSelect: (channel: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onChannelSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredChannels = channels.filter(channel =>
        channel.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="w-80 min-h-full bg-base-200 text-base-content">
            <div className="navbar bg-base-300">
                <div className="flex-1">
                    <div className="text-xl font-bold px-2">ZapZing</div>
                </div>
            </div>

            <div className="p-4">
                <div className="form-control mb-4">
                    <div className="input-group">
                        <input
                            type="text"
                            placeholder="Search..."
                            className="input input-bordered w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button className="btn btn-square">
                            <FaSearch />
                        </button>
                    </div>
                </div>

                <div className="menu bg-base-200 w-full rounded-box">
                    <div className="menu-title">Channels</div>
                    {filteredChannels.map(channel => (
                        <li key={channel}>
                            <button
                                onClick={() => onChannelSelect(channel)}
                                className="active:bg-base-300"
                            >
                                # {channel}
                            </button>
                        </li>
                    ))}

                    <div className="menu-title mt-4">Direct Messages</div>
                    {filteredUsers.map(user => (
                        <div key={user.name} className="flex items-center px-0 py-2">
                            <button
                                onClick={() => onChannelSelect(user.name)}
                                className="hover:bg-base-300 active:bg-base-300 px-4 py-2 rounded-lg flex-1 text-left"
                            >
                                <div className="flex justify-between">
                                    @ {user.name}
                                    <div className="flex items-center">
                                        <FaCircle className={`text-xs ${user.status === 'online' ? 'text-success' : 'text-base-content text-opacity-20'}`} />
                                        <div className="ml-1 dropdown dropdown-end">
                                            <label tabIndex={0} className="btn btn-ghost btn-xs !h-6 !min-h-0 !w-6 px-0">
                                                <FaEllipsisV className="w-3 h-3" />
                                            </label>
                                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                                                <li><a>View Profile</a></li>
                                                <li><a>Mute Notifications</a></li>
                                                <li><a className="text-error">Block User</a></li>
                                            </ul>
                                        </div>
                                    </div>

                                </div>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;


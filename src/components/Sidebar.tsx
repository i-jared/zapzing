import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FaSearch, FaCircle, FaEllipsisV, FaPlus } from 'react-icons/fa';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface Channel {
    id: string;
    name: string;
    workspaceId: string;
    createdAt: Date;
}

// Dummy data for users until we implement user management
const users = [
    { name: 'Alice', status: 'online' },
    { name: 'Bob', status: 'offline' },
    { name: 'Charlie', status: 'online' },
    { name: 'David', status: 'offline' },
];

interface SidebarProps {
    onChannelSelect: (channel: string) => void;
    workspaceId: string;
}

const Sidebar: React.FC<SidebarProps> = ({ onChannelSelect, workspaceId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [newChannelName, setNewChannelName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (!workspaceId) return;

        // Subscribe to channels for this workspace
        const channelsRef = collection(db, 'channels');
        const channelsQuery = query(
            channelsRef,
            where('workspaceId', '==', workspaceId),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(channelsQuery, (snapshot) => {
            const channelsData = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
                workspaceId: doc.data().workspaceId,
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            }));
            setChannels(channelsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching channels:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [workspaceId]);

    const handleCreateChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChannelName.trim() || !workspaceId) return;

        setIsCreating(true);
        try {
            const channelsRef = collection(db, 'channels');
            await addDoc(channelsRef, {
                name: newChannelName.trim().toLowerCase(),
                workspaceId,
                createdAt: serverTimestamp()
            });
            setNewChannelName('');
            const modal = document.getElementById('create-channel-modal') as HTMLDialogElement;
            if (modal) modal.close();
        } catch (error) {
            console.error('Error creating channel:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const filteredChannels = channels.filter(channel =>
        channel.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="w-80 min-h-full bg-base-100 text-base-content shadow-2xl relative z-30 border-r border-base-300">
            <div className="navbar bg-base-200">
                <div className="flex-1">
                    <div className="text-xl font-bold px-2">ZapZing</div>
                </div>
            </div>

            <div className="p-4">
                <div className="form-control mb-4">
                    <div className="join w-full">
                        <input
                            type="text"
                            placeholder="Search..."
                            className="input input-bordered join-item w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button className="btn join-item">
                            <FaSearch />
                        </button>
                    </div>
                </div>

                <div className="menu bg-base-200 w-full rounded-box">
                    <div className="menu-title flex justify-between items-center">
                        <span>Channels</span>
                        {loading && <span className="loading loading-spinner loading-xs"></span>}
                    </div>
                    {filteredChannels.map(channel => (
                        <li className="px-0 py-1" key={channel.id}>
                            <button
                                onClick={() => onChannelSelect(channel.name)}
                                className="active:bg-base-300"
                            >
                                # {channel.name}
                            </button>
                        </li>
                    ))}
                    
                    <div className="px-0 py-1">
                        <button 
                            onClick={() => {
                                const modal = document.getElementById('create-channel-modal') as HTMLDialogElement;
                                if (modal) modal.showModal();
                            }}
                            className="btn btn-ghost btn-sm justify-start w-full text-base-content/70 hover:text-base-content"
                        >
                            <FaPlus className="w-3 h-3" />
                            <span className="ml-1">Add Channel</span>
                        </button>
                    </div>

                    <div className="menu-title mt-4">Direct Messages</div>
                    {filteredUsers.map(user => (
                        <div key={user.name} className="flex items-center px-0 py-1">
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

            {/* Create Channel Modal */}
            <dialog id="create-channel-modal" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4">Create a Channel</h3>
                    <form onSubmit={handleCreateChannel}>
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Channel Name</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. announcements"
                                className="input input-bordered w-full"
                                value={newChannelName}
                                onChange={(e) => setNewChannelName(e.target.value)}
                                pattern="[a-zA-Z0-9\-_]+"
                                title="Only letters, numbers, hyphens, and underscores are allowed"
                                required
                            />
                            <label className="label">
                                <span className="label-text-alt">
                                    Only letters, numbers, hyphens, and underscores
                                </span>
                            </label>
                        </div>
                        <div className="modal-action">
                            <button 
                                type="button" 
                                className="btn" 
                                onClick={() => {
                                    const modal = document.getElementById('create-channel-modal') as HTMLDialogElement;
                                    if (modal) modal.close();
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className={`btn btn-primary ${isCreating ? 'loading' : ''}`}
                                disabled={isCreating || !newChannelName.trim()}
                            >
                                {isCreating ? 'Creating...' : 'Create Channel'}
                            </button>
                        </div>
                    </form>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </div>
    );
};

export default Sidebar;


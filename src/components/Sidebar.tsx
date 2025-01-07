import React, { useState, useEffect } from 'react';
import { FaSearch, FaCircle, FaEllipsisV, FaPlus } from 'react-icons/fa';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { auth } from '../firebase';
import { toggleDMMute, isDMMuted } from '../utils/chat';
import { UserData } from '../types/chat';

const logoLight = '/assets/logo_light.png';
const logoDark = '/assets/logo_dark.png';

interface Channel {
    id: string;
    name: string;
    workspaceId: string;
    createdAt: Date;
}

interface WorkspaceMember {
    email: string;
    displayName?: string | null;
    photoURL?: string | null;
    isActive?: boolean;
    uid?: string;
}

interface SidebarProps {
    onChannelSelect: (channel: string, displayName?: string) => void;
    workspaceId: string;
    selectedChannel: string;
    usersCache: Record<string, UserData>;
}

const Sidebar: React.FC<SidebarProps> = ({ onChannelSelect, workspaceId, selectedChannel, usersCache }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [newChannelName, setNewChannelName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
    const isEmailVerified = auth.currentUser?.emailVerified ?? false;
    const [activeUsers, setActiveUsers] = useState<Set<string>>(new Set());
    const [currentUserData, setCurrentUserData] = useState<UserData | null>(null);

    // Add effect to listen for current user's data changes
    useEffect(() => {
        if (!auth.currentUser) return;

        const userRef = doc(db, 'users', auth.currentUser.uid);
        const unsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                setCurrentUserData(doc.data() as UserData);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!workspaceId) return;

        // Subscribe to workspace members
        const workspaceRef = doc(db, 'workspaces', workspaceId);
        const unsubscribe = onSnapshot(workspaceRef, async (workspaceDoc) => {
            if (!workspaceDoc.exists()) return;

            const memberEmails = workspaceDoc.data().members || [];

            // First get all user documents to avoid flashing
            const userDocs = await Promise.all(
                memberEmails.map(async (email: string) => {
                    const usersQuery = query(
                        collection(db, 'users'),
                        where('email', '==', email),
                        limit(1)
                    );
                    return getDocs(usersQuery);
                })
            );

            const members = memberEmails.map((email: string, index: number) => {
                const userSnapshot = userDocs[index];
                if (!userSnapshot.empty) {
                    const userData = userSnapshot.docs[0].data();
                    return {
                        email,
                        displayName: userData.displayName,
                        photoURL: userData.photoURL,
                        uid: userData.uid
                    };
                }
                return { email };
            });

            setWorkspaceMembers(members);
        });

        return () => unsubscribe();
    }, [workspaceId]);

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

    // Update effect to track active users
    useEffect(() => {
        if (!workspaceId) return;

        const userActivityRef = collection(db, 'userActivity');
        const tenMinutesAgo = new Date();
        tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

        // Create a real-time query for active users
        const unsubscribe = onSnapshot(
            query(userActivityRef),
            (snapshot) => {
                const activeUserEmails = new Set<string>();

                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const lastActive = data.lastActive?.toDate();

                    // Check if user was active in the last 10 minutes
                    if (lastActive && lastActive > tenMinutesAgo) {
                        activeUserEmails.add(data.email);
                    }
                });

                setActiveUsers(activeUserEmails);
            }
        );

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

    const filteredMembers = workspaceMembers.filter(member =>
        (member.displayName?.toLowerCase() || member.email.toLowerCase())
            .includes(searchTerm.toLowerCase())
    );

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <div
            className="w-80 min-h-full bg-base-100 text-base-content shadow-2xl relative z-30 border-r border-base-300"
            onClick={handleClick}
        >
            <div className="navbar bg-base-200" onClick={handleClick}>
                <div className="flex-1">
                    <img
                        src={logoLight}
                        className="h-14 block dark:hidden"
                        alt="ZapZing Logo"
                    />
                    <img
                        src={logoDark}
                        className="h-8 hidden dark:block"
                        alt="ZapZing Logo"
                    />
                </div>
            </div>

            <div className="p-4" onClick={handleClick}>
                <div className="form-control mb-4">
                    <input
                        type="text"
                        placeholder="Search..."
                        className="input input-bordered w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>

                <div className="menu bg-base-200 w-full rounded-box" onClick={(e) => e.stopPropagation()}>
                    <div className="menu-title flex justify-between items-center">
                        <span>Channels</span>
                        {loading && <span className="loading loading-spinner loading-xs"></span>}
                    </div>
                    {filteredChannels.map(channel => (
                        <li className="flex items-center px-0 py-1" key={channel.id}>
                            <button
                                onClick={() => onChannelSelect(channel.name)}
                                className={`${selectedChannel === channel.name ? 'bg-base-300' : ''} w-full hover:bg-base-300 px-4 py-2 flex`}
                            >
                                <div className="flex justify-between w-full">
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm">#</span>
                                        <span className="text-sm">{channel.name}</span>
                                    </div>

                                    <div className="dropdown dropdown-end ml-4">
                                        <input type="checkbox" className="hidden peer" />
                                        <label tabIndex={0} className="btn btn-ghost btn-sm btn-square peer-checked:btn-active">
                                            <FaEllipsisV />
                                        </label>
                                        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                                            <li>
                                                <a onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!auth.currentUser) return;
                                                    // toggleDMMute(auth.currentUser.uid, member.email);
                                                    // Find and close the dropdown by removing focus
                                                    (e.currentTarget.closest('ul') as HTMLElement)?.blur();
                                                }}>
                                                    {currentUserData?.mutedDMs?.includes('') ? 'Unmute' : 'Mute'} Notifications
                                                </a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </button>
                        </li>
                    ))}

                    <div className="px-0 py-1">
                        {!isEmailVerified ? (
                            <div className="alert alert-warning text-sm">
                                <span>Please verify your email to create channels.</span>
                            </div>
                        ) : (
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
                        )}
                    </div>

                    <div className="menu-title mt-4">Direct Messages</div>
                    {filteredMembers.map(member => (
                        member.email !== auth.currentUser?.email && (
                            <div key={member.email} className="flex items-center px-0 py-1">
                                <button
                                    onClick={() => onChannelSelect(member.email, member.displayName || undefined)}
                                    className={`hover:bg-base-300 active:bg-base-300 px-4 py-2 rounded-lg flex-1 text-left ${selectedChannel === member.email ? 'bg-base-300' : ''
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className={`flex items-center gap-2 ${currentUserData?.mutedDMs?.includes(member.email) ? 'opacity-50' : ''}`}>
                                            <div className="avatar placeholder indicator">
                                                {member.photoURL ? (
                                                    <div className="w-6 h-6 rounded-full">
                                                        <img src={member.photoURL} alt="Profile" />
                                                    </div>
                                                ) : (
                                                    <div className="bg-neutral text-neutral-content rounded-full w-6">
                                                        <span className="text-xs">{member.displayName?.[0] || member.email[0].toUpperCase()}</span>
                                                    </div>
                                                )}
                                                <span className={`indicator-item badge badge-xs ${activeUsers.has(member.email) ? 'badge-success' : 'badge-neutral opacity-40'}`}></span>
                                            </div>
                                            <span>{member.displayName || member.email}</span>
                                        </div>
                                        <div className="dropdown dropdown-end">
                                            <input type="checkbox" className="hidden peer" />
                                            <label tabIndex={0} className="btn btn-ghost btn-sm btn-square peer-checked:btn-active">
                                                <FaEllipsisV />
                                            </label>
                                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                                                <li><a>View Profile</a></li>
                                                <li>
                                                    <a onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!auth.currentUser) return;
                                                        toggleDMMute(auth.currentUser.uid, member.email);
                                                        // Find and close the dropdown by removing focus
                                                        (e.currentTarget.closest('ul') as HTMLElement)?.blur();
                                                    }}>
                                                        {currentUserData?.mutedDMs?.includes(member.email) ? 'Unmute' : 'Mute'} Notifications
                                                    </a>
                                                </li>
                                                <li><a className="text-error">Block User</a></li>
                                            </ul>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        )
                    ))}
                </div>
            </div>

            {/* Create Channel Modal */}
            <dialog id="create-channel-modal" className="modal" onClick={(e) => e.stopPropagation()}>
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


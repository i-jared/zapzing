import React, { useState, useEffect } from "react";
import { FaEllipsisV, FaPlus } from "react-icons/fa";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { auth } from "../firebase";
import {
  toggleDMMute,
  toggleChannelMute,
  hasUnseenMessages,
} from "../utils/chat";
import { UserData, Message, Channel } from "../types/chat";
import ViewProfileModal from "./ViewProfileModal";
import BlockUserModal from "./BlockUserModal";
import UnblockUserModal from "./UnblockUserModal";

const logoLight = "/assets/logo_light.png";
const logoDark = "/assets/logo_dark.png";

interface WorkspaceMember {
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  isActive?: boolean;
  uid: string;
}

interface SidebarProps {
  onChannelSelect: (channel: Channel) => void;
  workspaceId: string;
  selectedChannel: Channel | null;
  usersCache: Record<string, UserData>;
  messages: Message[];
  onDeleteChannel?: (channelId: string) => Promise<void>;
}

const Sidebar: React.FC<SidebarProps> = ({
  onChannelSelect,
  workspaceId,
  selectedChannel,
  usersCache,
  messages,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newChannelName, setNewChannelName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>(
    []
  );
  const isEmailVerified = auth.currentUser?.emailVerified ?? false;
  const [activeUsers, setActiveUsers] = useState<Set<string>>(new Set());
  const [currentUserData, setCurrentUserData] = useState<UserData | null>(null);
  const [selectedMemberForProfile, setSelectedMemberForProfile] =
    useState<WorkspaceMember | null>(null);
  const [selectedMemberForBlock, setSelectedMemberForBlock] =
    useState<WorkspaceMember | null>(null);
  const [selectedMemberForUnblock, setSelectedMemberForUnblock] =
    useState<WorkspaceMember | null>(null);

  // Add effect to listen for current user's data changes
  useEffect(() => {
    if (!auth.currentUser) return;

    const userRef = doc(db, "users", auth.currentUser.uid);
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
    const workspaceRef = doc(db, "workspaces", workspaceId);
    const unsubscribe = onSnapshot(workspaceRef, async (workspaceDoc) => {
      if (!workspaceDoc.exists()) return;

      const memberUids = workspaceDoc.data().members || [];

      // Fetch user data for each member using their UIDs
      const members = await Promise.all(
        memberUids.map(async (uid: string) => {
          const userRef = doc(db, "users", uid);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data() as UserData | undefined;

          return {
            uid,
            email: userData?.email || "",
            displayName: userData?.displayName || null,
            photoURL: userData?.photoURL || null,
          };
        })
      );

      setWorkspaceMembers(members);
    });

    return () => unsubscribe();
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;

    // Subscribe to channels for this workspace
    const channelsRef = collection(db, "channels");
    const channelsQuery = query(
      channelsRef,
      where("workspaceId", "==", workspaceId),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      channelsQuery,
      (snapshot) => {
        const channelsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          workspaceId: doc.data().workspaceId,
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          dm: doc.data().dm,
        }));
        setChannels(channelsData);
        // Select first channel if no channel is selected and there are channels available
        if (!selectedChannel && channelsData.length > 0) {
          const firstNonDMChannel = channelsData.find((channel) => !channel.dm);
          if (firstNonDMChannel) {
            onChannelSelect(firstNonDMChannel);
          }
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching channels:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [workspaceId]);

  // Update effect to track active users
  useEffect(() => {
    if (!workspaceId) return;

    const userActivityRef = collection(db, "userActivity");
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

    // Create a real-time query for active users
    const unsubscribe = onSnapshot(query(userActivityRef), (snapshot) => {
      const activeUserIds = new Set<string>();

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const lastActive = data.lastActive?.toDate();

        // Check if user was active in the last 10 minutes
        if (lastActive && lastActive > tenMinutesAgo) {
          activeUserIds.add(doc.id);
        }
      });

      setActiveUsers(activeUserIds);
    });

    return () => unsubscribe();
  }, [workspaceId]);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !workspaceId) return;

    setIsCreating(true);
    try {
      const channelsRef = collection(db, "channels");
      await addDoc(channelsRef, {
        name: newChannelName.trim().toLowerCase(),
        workspaceId,
        createdAt: serverTimestamp(),
      });
      setNewChannelName("");
      const modal = document.getElementById(
        "create-channel-modal"
      ) as HTMLDialogElement;
      if (modal) modal.close();
    } catch (error) {
      console.error("Error creating channel:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateDM = async (member: WorkspaceMember) => {
    if (!auth.currentUser || !workspaceId || !member.uid) return;
    if (selectedChannel) {
      await onChannelSelect(selectedChannel);
    }

    try {
      // First check if DM already exists
      const channelsRef = collection(db, "channels");

      // Query for DMs where either user is in the dm array
      const dmQuery = query(
        channelsRef,
        where("workspaceId", "==", workspaceId),
        where("dm", "array-contains-any", [auth.currentUser.uid, member.uid])
      );

      const dmSnapshot = await getDocs(dmQuery);

      // Check if DM already exists by looking for a channel that contains both users
      const existingDM = dmSnapshot.docs.find((doc) => {
        const data = doc.data();
        const dmUsers = data.dm || [];
        return (
          dmUsers.includes(auth.currentUser!.uid) &&
          dmUsers.includes(member.uid)
        );
      });

      if (existingDM) {
        // Use existing DM channel
        const data = existingDM.data();
        const createdAt = data.createdAt?.toDate() || new Date();
        const channel = {
          id: existingDM.id,
          name: member.displayName || member.email,
          workspaceId: data.workspaceId,
          createdAt,
          dm: data.dm,
        };
        onChannelSelect(channel);
      } else {
        // Create a temporary channel object for the UI
        const tempChannel = {
          id: `temp_dm_${auth.currentUser.uid}_${member.uid}`,
          name: member.displayName || member.email,
          workspaceId,
          createdAt: new Date(),
          dm: [auth.currentUser.uid, member.uid],
        };
        onChannelSelect(tempChannel);
      }
    } catch (error) {
      console.error("Error handling DM:", error);
    }
  };

  const filteredChannels = channels.filter(
    (channel) =>
      !channel.dm &&
      channel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMembers = workspaceMembers
    .filter(
      (member) =>
        member.uid !== auth.currentUser?.uid &&
        !usersCache[member.uid]?.blockedUsers?.includes(
          auth.currentUser?.uid || ""
        ) &&
        (
          member.displayName?.toLowerCase() || member.email.toLowerCase()
        ).includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const isABlocked =
        currentUserData?.blockedUsers?.includes(a.uid) || false;
      const isBBlocked =
        currentUserData?.blockedUsers?.includes(b.uid) || false;

      // If one is blocked and the other isn't, put blocked at the bottom
      if (isABlocked && !isBBlocked) return 1;
      if (!isABlocked && isBBlocked) return -1;

      // If both are blocked or both are not blocked, sort by name
      return (a.displayName || a.email).localeCompare(b.displayName || b.email);
    });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Add helper function to close drawer
  const closeDrawer = () => {
    const drawer = document.getElementById("main-drawer") as HTMLInputElement;
    if (drawer) {
      drawer.checked = false;
    }
  };

  const handleBlockUser = async (shouldReport: boolean) => {
    if (!selectedMemberForBlock || !auth.currentUser) return;

    try {
      // Example implementation:
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        blockedUsers: arrayUnion(selectedMemberForBlock.uid),
      });

      if (shouldReport) {
        // Add reporting logic here
        const reportsRef = collection(db, "reports");
        await addDoc(reportsRef, {
          reportedUser: selectedMemberForBlock.uid,
          reportedBy: auth.currentUser.uid,
          timestamp: serverTimestamp(),
          type: "user_block",
        });
      }

      setSelectedMemberForBlock(null);
    } catch (error) {
      console.error("Error blocking user:", error);
    }
  };

  const handleUnblockUser = async () => {
    if (!selectedMemberForUnblock || !auth.currentUser) return;

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        blockedUsers: arrayRemove(selectedMemberForUnblock.uid),
      });

      setSelectedMemberForUnblock(null);
    } catch (error) {
      console.error("Error unblocking user:", error);
    }
  };

  return (
    <div
      className="w-80 min-h-full bg-base-100 text-base-content shadow-2xl relative z-30 border-r border-base-300"
      onClick={handleClick}
    >
      <div className="navbar bg-base-200" onClick={handleClick}>
        <div className="flex-1">
          <div className="relative w-60 h-14">
            <div
              className="absolute inset-0 bg-primary"
              style={{
                maskImage: `url(${logoLight})`,
                WebkitMaskImage: `url(${logoLight})`,
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskSize: "auto 100%",
                WebkitMaskSize: "auto 100%",
                maskPosition: "left center",
                WebkitMaskPosition: "left center",
              }}
            />
          </div>
        </div>
      </div>

      <div className="p-4" onClick={handleClick}>
        <div className="form-control mb-4">
          <input
            type="text"
            placeholder="Search..."
            className="input input-bordered w-full text-base-content placeholder:text-base-content/60"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <div
          className="menu bg-base-100 w-full rounded-box"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="menu-title flex justify-between items-center text-base-content"
            key="channels-header"
          >
            <span>Channels</span>
            {loading && (
              <span className="loading loading-spinner loading-xs text-base-content"></span>
            )}
          </div>
          {filteredChannels.map((channel) => (
            <li className="flex items-center px-0 py-1" key={channel.id}>
              <button
                onClick={() => {
                  if (
                    Notification.permission !== "granted" &&
                    Notification.permission !== "denied"
                  ) {
                    Notification.requestPermission();
                  }
                  onChannelSelect(channel);
                  closeDrawer();
                }}
                className={`${
                  selectedChannel?.id === channel.id
                    ? "bg-base-300 border-2 border-primary"
                    : hasUnseenMessages(
                        channel,
                        messages,
                        currentUserData,
                        selectedChannel?.id
                      )
                    ? "bg-accent text-accent-content hover:bg-accent/70 animate-pulse"
                    : "bg-base-100"
                } w-full hover:bg-base-200 px-4 py-2 flex`}
              >
                <div className="flex justify-between w-full">
                  <div
                    className={`flex items-center gap-1 ${
                      currentUserData?.mutedChannels?.includes(channel.id)
                        ? "text-base-content/50"
                        : "text-base-content"
                    }`}
                  >
                    <span className="text-sm">#</span>
                    <span
                      className={`text-sm ${
                        hasUnseenMessages(
                          channel,
                          messages,
                          currentUserData,
                          selectedChannel?.id
                        )
                          ? "font-bold"
                          : ""
                      }`}
                    >
                      {channel.name}
                    </span>
                  </div>

                  <div
                    className="dropdown dropdown-end ml-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input type="checkbox" className="hidden peer" />
                    <label
                      tabIndex={0}
                      className="btn btn-ghost btn-sm btn-square peer-checked:btn-active text-base-content"
                    >
                      <FaEllipsisV />
                    </label>
                    <ul
                      tabIndex={0}
                      className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
                    >
                      <li key="mute-notifications">
                        <a
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!auth.currentUser) return;
                            toggleChannelMute(auth.currentUser.uid, channel.id);
                            (
                              e.currentTarget.closest("ul") as HTMLElement
                            )?.blur();
                          }}
                          className="text-base-content"
                        >
                          {currentUserData?.mutedChannels?.includes(channel.id)
                            ? "Unmute"
                            : "Mute"}{" "}
                          Notifications
                        </a>
                      </li>
                      <li key="delete-channel">
                        <a
                          onClick={async (e) => {
                            e.stopPropagation();
                            const modal = document.getElementById(
                              "delete-channel-modal"
                            ) as HTMLDialogElement;
                            if (modal) {
                              modal.setAttribute("data-channel-id", channel.id);
                              modal.showModal();
                            }
                            (
                              e.currentTarget.closest("ul") as HTMLElement
                            )?.blur();
                          }}
                          className="text-error"
                        >
                          Delete Channel
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </button>
            </li>
          ))}

          <div className="px-0 py-1" key="add-channel">
            {!isEmailVerified ? (
              <div className="alert alert-warning text-sm">
                <span>Please verify your email to create channels.</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  const modal = document.getElementById(
                    "create-channel-modal"
                  ) as HTMLDialogElement;
                  if (modal) modal.showModal();
                }}
                className="btn btn-ghost btn-sm justify-start w-full text-base-content/70 hover:text-base-content"
              >
                <FaPlus className="w-3 h-3" />
                <span className="ml-1">Add Channel</span>
              </button>
            )}
          </div>

          <div className="menu-title mt-4 text-base-content" key="dm-header">
            Direct Messages
          </div>
          {filteredMembers.map((member) => (
            <div key={member.uid} className="flex items-center px-0 py-1">
              <button
                onClick={() => {
                  console.log(currentUserData);
                  handleCreateDM(member);
                  closeDrawer();
                }}
                className={`${
                  hasUnseenMessages(
                    channels.find(
                      (channel) =>
                        channel.dm?.includes(member.uid) &&
                        channel.dm?.includes(auth.currentUser?.uid ?? "")
                    ),
                    messages,
                    currentUserData,
                    selectedChannel?.id
                  )
                    ? "bg-accent text-accent-content hover:bg-accent/70 animate-pulse"
                    : "bg-base-100"
                } hover:bg-base-200 active:bg-base-300 px-4 py-2 rounded-lg flex-1 text-left`}
              >
                <div className="flex justify-between items-center">
                  <div
                    className={`flex items-center gap-2 ${
                      currentUserData?.mutedDMs?.includes(member.uid) ||
                      currentUserData?.blockedUsers?.includes(member.uid)
                        ? "text-base-content/50"
                        : "text-base-content"
                    }`}
                  >
                    <div className="avatar placeholder indicator">
                      {member.photoURL ? (
                        <div className="w-6 h-6 rounded-full">
                          <img src={member.photoURL} alt="Profile" />
                        </div>
                      ) : (
                        <div className="bg-neutral text-neutral-content rounded-full w-6">
                          <span className="text-xs">
                            {member.displayName?.[0] ||
                              member.email[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      {!currentUserData?.blockedUsers?.includes(member.uid) && (
                        <span
                          className={`indicator-item badge badge-xs ${
                            activeUsers.has(member.uid)
                              ? "badge-success"
                              : "badge-neutral opacity-40"
                          }`}
                        ></span>
                      )}
                    </div>
                    <span
                      className={`${
                        channels.some(
                          (channel) =>
                            channel.dm?.includes(member.uid) &&
                            hasUnseenMessages(
                              channel,
                              messages,
                              currentUserData,
                              selectedChannel?.id
                            )
                        )
                          ? "font-bold"
                          : ""
                      } ${
                        currentUserData?.blockedUsers?.includes(member.uid)
                          ? "line-through"
                          : ""
                      }`}
                    >
                      {member.displayName || member.email}
                    </span>
                  </div>
                  <div
                    className="dropdown dropdown-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input type="checkbox" className="hidden peer" />
                    <label
                      tabIndex={0}
                      className="btn btn-ghost btn-sm btn-square peer-checked:btn-active"
                    >
                      <FaEllipsisV />
                    </label>
                    <ul
                      tabIndex={0}
                      className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
                    >
                      {currentUserData?.blockedUsers?.includes(member.uid) ? (
                        <li key="unblock-user">
                          <a
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMemberForUnblock(member);
                              const modal = document.getElementById(
                                "unblock-user-modal"
                              ) as HTMLDialogElement;
                              if (modal) modal.showModal();
                              (
                                e.currentTarget.closest("ul") as HTMLElement
                              )?.blur();
                            }}
                          >
                            Unblock User
                          </a>
                        </li>
                      ) : (
                        <>
                          <li key="view-profile">
                            <a
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMemberForProfile(member);
                                const modal = document.getElementById(
                                  "view-profile-modal"
                                ) as HTMLDialogElement;
                                if (modal) modal.showModal();
                                (
                                  e.currentTarget.closest("ul") as HTMLElement
                                )?.blur();
                              }}
                            >
                              View Profile
                            </a>
                          </li>
                          <li key="mute-notifications">
                            <a
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!auth.currentUser) return;
                                toggleDMMute(auth.currentUser.uid, member.uid);
                                (
                                  e.currentTarget.closest("ul") as HTMLElement
                                )?.blur();
                              }}
                            >
                              {currentUserData?.mutedDMs?.includes(member.uid)
                                ? "Unmute"
                                : "Mute"}{" "}
                              Notifications
                            </a>
                          </li>
                          <li key="block-user">
                            <a
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMemberForBlock(member);
                                const modal = document.getElementById(
                                  "block-user-modal"
                                ) as HTMLDialogElement;
                                if (modal) modal.showModal();
                                (
                                  e.currentTarget.closest("ul") as HTMLElement
                                )?.blur();
                              }}
                              className="text-error"
                            >
                              Block User
                            </a>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Create Channel Modal */}
      <dialog
        id="create-channel-modal"
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
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
                  const modal = document.getElementById(
                    "create-channel-modal"
                  ) as HTMLDialogElement;
                  if (modal) modal.close();
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn btn-primary ${isCreating ? "loading" : ""}`}
                disabled={isCreating || !newChannelName.trim()}
              >
                {isCreating ? "Creating..." : "Create Channel"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Always render modals */}
      <BlockUserModal
        userToBlock={selectedMemberForBlock}
        onBlock={handleBlockUser}
      />
      <ViewProfileModal
        email={selectedMemberForProfile?.email}
        displayName={selectedMemberForProfile?.displayName}
        photoURL={selectedMemberForProfile?.photoURL}
      />
      <UnblockUserModal
        userToUnblock={selectedMemberForUnblock}
        onUnblock={handleUnblockUser}
      />
    </div>
  );
};

export default Sidebar;

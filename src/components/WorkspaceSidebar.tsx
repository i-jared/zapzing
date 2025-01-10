import React from 'react';
import { FaUser, FaChevronDown, FaChevronRight, FaCog } from 'react-icons/fa';

interface ChannelMember {
  uid: string;
  email: string;
  isCurrentUser: boolean;
  displayName?: string | null;
  photoURL?: string | null;
}

interface WorkspaceSidebarProps {
  isEmailVerified: boolean;
  channelMembers: ChannelMember[];
  invitedUsers: string[];
  isInvitedUsersExpanded: boolean;
  onInviteClick: () => void;
  onToggleInvitedUsers: () => void;
  workspaceName: string;
  onSwitchWorkspace: () => void;
  onCancelInvite: (email: string) => void;
  workspaceId: string;
  onLeaveWorkspace?: () => Promise<void>;
}

const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  isEmailVerified,
  channelMembers,
  invitedUsers,
  isInvitedUsersExpanded,
  onInviteClick,
  onToggleInvitedUsers,
  workspaceName,
  onSwitchWorkspace,
  onCancelInvite,
  workspaceId,
  onLeaveWorkspace
}) => {
  const handleCopyId = () => {
    navigator.clipboard.writeText(workspaceId);
  };

  const handleLeaveWorkspace = async () => {
    if (onLeaveWorkspace) {
      await onLeaveWorkspace();
      const modal = document.getElementById('leave-workspace-modal') as HTMLDialogElement;
      if (modal) modal.close();
    }
  };

  return (
    <div className="w-80 bg-base-100 flex flex-col h-full border-l border-base-content/10 overflow-y-auto z-[20] relative">
      {/* Workspace Title */}
      <div className="p-4 border-b border-base-content/10 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-base-content">{workspaceName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs font-mono text-base-content/70 bg-base-200 px-2 py-1 rounded">
              {workspaceId}
            </code>
            <button 
              onClick={handleCopyId}
              className="btn btn-ghost btn-xs !h-7 min-h-0 bg-base-200 hover:bg-base-300 flex items-center justify-center"
              title="Copy workspace ID"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 text-base-content/70"
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-ghost btn-sm btn-square">
            <FaCog className="w-4 h-4" />
          </label>
          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
            <li>
              <a 
                onClick={() => {
                  const modal = document.getElementById('leave-workspace-modal') as HTMLDialogElement;
                  if (modal) modal.showModal();
                }}
                className="text-error"
              >
                Leave Workspace
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Add User Widget */}
      <div className="p-4 border-b border-base-content/10">
        {!isEmailVerified ? (
          <div className="alert alert-warning">
            <span className="text-warning-content">Please verify your email to invite users.</span>
          </div>
        ) : (
          <button 
            className="btn btn-primary w-full"
            onClick={onInviteClick}
          >
            <FaUser className="w-4 h-4 mr-2" />
            Add User
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Channel Members */}
        <div className="mb-6">
          <h3 className="font-bold mb-4 text-base-content">Channel Members</h3>
          <div className="space-y-2">
            {channelMembers.length === 0 ? (
              <div className="text-sm text-base-content/50">No members in this channel</div>
            ) : (
              channelMembers.map((member) => (
                <div key={member.uid} className="flex items-center gap-2">
                  <div className="avatar placeholder">
                    {member.photoURL ? (
                      <div className="w-8 h-8 rounded-full">
                        <img src={member.photoURL} alt="Profile" />
                      </div>
                    ) : (
                      <div className="bg-neutral text-neutral-content rounded-full w-8 h-8 flex items-center justify-center">
                        <FaUser className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-base-content">
                      {member.displayName || member.email}
                      {member.isCurrentUser && " (you)"}
                    </span>
                    {member.displayName && (
                      <span className="text-xs text-base-content/70">{member.email}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invited Users Collapse */}
        <div className="border-t border-base-content/10 pt-4">
          <button
            className="w-full py-2 flex items-center justify-between bg-base-100 hover:bg-base-200 rounded-lg px-2 text-base-content"
            onClick={onToggleInvitedUsers}
          >
            <span className="font-bold">Invited Users</span>
            {isInvitedUsersExpanded ? <FaChevronDown /> : <FaChevronRight />}
          </button>
          {isInvitedUsersExpanded && (
            <div className="mt-2 space-y-2 bg-base-100 rounded-lg p-2">
              {invitedUsers.length === 0 ? (
                <div className="text-sm text-base-content/50">No pending invites</div>
              ) : (
                invitedUsers.map((email, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between hover:bg-base-200 p-2 rounded-lg group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="avatar placeholder">
                        <div className="bg-neutral text-neutral-content rounded-full w-8 h-8 flex items-center justify-center">
                          <FaUser className="w-4 h-4" />
                        </div>
                      </div>
                      <span className="text-base-content">{email}</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancelInvite(email);
                      }}
                      className="btn btn-ghost btn-sm text-base-content opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Cancel invitation"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Switch Workspaces Button */}
      <div className="p-4 border-t border-base-content/10">
        <button 
          className="btn btn-outline w-full"
          onClick={onSwitchWorkspace}
        >
          Switch Workspaces
        </button>
      </div>

      {/* Leave Workspace Modal */}
      <dialog id="leave-workspace-modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg text-base-content">
            Leave Workspace
          </h3>
          <p className="py-4 text-base-content/70">
            Are you sure you want to leave this workspace? You will lose access to all channels and messages.
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-ghost mr-2 text-base-content">
                Cancel
              </button>
              <button
                className="btn btn-error text-base-content"
                onClick={handleLeaveWorkspace}
              >
                Leave Workspace
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
};

export default WorkspaceSidebar; 
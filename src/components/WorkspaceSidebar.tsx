import React from 'react';
import { FaUser, FaChevronDown, FaChevronRight } from 'react-icons/fa';

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
}

const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  isEmailVerified,
  channelMembers,
  invitedUsers,
  isInvitedUsersExpanded,
  onInviteClick,
  onToggleInvitedUsers,
  workspaceName,
  onSwitchWorkspace
}) => {
  return (
    <div className="w-80 bg-base-300 flex flex-col h-full border-l border-base-content/10 overflow-y-auto z-[20] relative">
      {/* Workspace Title */}
      <div className="p-4 border-b border-base-content/10">
        <h2 className="text-xl font-bold">{workspaceName}</h2>
      </div>

      {/* Add User Widget */}
      <div className="p-4 border-b border-base-content/10">
        {!isEmailVerified ? (
          <div className="alert alert-warning">
            <span>Please verify your email to invite users.</span>
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
          <h3 className="font-bold mb-4">Channel Members</h3>
          <div className="space-y-2">
            {channelMembers.length === 0 ? (
              <div className="text-sm opacity-50">No members in this channel</div>
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
                    <span className="font-medium">
                      {member.displayName || member.email}
                      {member.isCurrentUser && " (you)"}
                    </span>
                    {member.displayName && (
                      <span className="text-xs opacity-70">{member.email}</span>
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
            className="w-full py-2 flex items-center justify-between hover:bg-base-200 rounded-lg px-2"
            onClick={onToggleInvitedUsers}
          >
            <span className="font-bold">Invited Users</span>
            {isInvitedUsersExpanded ? <FaChevronDown /> : <FaChevronRight />}
          </button>
          {isInvitedUsersExpanded && (
            <div className="mt-2 space-y-2">
              {invitedUsers.length === 0 ? (
                <div className="text-sm opacity-50">No pending invites</div>
              ) : (
                invitedUsers.map((email, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="avatar placeholder">
                      <div className="bg-neutral text-neutral-content rounded-full w-8 h-8 flex items-center justify-center">
                        <FaUser className="w-4 h-4" />
                      </div>
                    </div>
                    <span>{email}</span>
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
    </div>
  );
};

export default WorkspaceSidebar; 
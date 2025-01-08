import React from "react";

interface UnblockUserModalProps {
  userToUnblock: {
    email: string;
    displayName?: string | null;
  } | null;
  onUnblock: () => Promise<void>;
}

const UnblockUserModal: React.FC<UnblockUserModalProps> = ({
  userToUnblock,
  onUnblock,
}) => {
  const handleUnblock = async () => {
    try {
      await onUnblock();
      const modal = document.getElementById(
        "unblock-user-modal"
      ) as HTMLDialogElement;
      if (modal) modal.close();
    } catch (error) {
      console.error("Error unblocking user:", error);
    }
  };

  return (
    <dialog id="unblock-user-modal" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg text-base-content">Unblock User</h3>
        {userToUnblock && (
          <>
            <p className="py-4 text-base-content/70">
              Are you sure you want to unblock{" "}
              {userToUnblock.displayName || userToUnblock.email}? This user will be able to:
            </p>
            <ul className="list-disc list-inside mb-4 text-base-content/70">
              <li>Send you direct messages</li>
              <li>See your online status</li>
            </ul>
            <div className="modal-action flex gap-2">
              <form method="dialog">
                <button className="btn btn-ghost text-base-content">Cancel</button>
              </form>
              <button
                className="btn btn-primary"
                onClick={handleUnblock}
              >
                Unblock User
              </button>
            </div>
          </>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
};

export default UnblockUserModal; 
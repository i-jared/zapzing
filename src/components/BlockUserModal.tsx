import React from "react";

interface BlockUserModalProps {
  userToBlock: {
    email: string;
    displayName?: string | null;
  } | null;
  onBlock: (shouldReport: boolean) => Promise<void>;
}

const BlockUserModal: React.FC<BlockUserModalProps> = ({
  userToBlock,
  onBlock,
}) => {
  const handleBlock = async (shouldReport: boolean) => {
    try {
      await onBlock(shouldReport);
      const modal = document.getElementById(
        "block-user-modal"
      ) as HTMLDialogElement;
      if (modal) modal.close();
    } catch (error) {
      console.error("Error blocking user:", error);
    }
  };

  return (
    <dialog id="block-user-modal" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg text-base-content">Block User</h3>
        {userToBlock && (
          <>
            <p className="py-4 text-base-content/70">
              Are you sure you want to block{" "}
              {userToBlock.displayName || userToBlock.email}? This user will no
              longer be able to:
            </p>
            <ul className="list-disc list-inside mb-4 text-base-content/70">
              <li>Send you direct messages</li>
              <li>See your online status</li>
              <li>Add you to group channels</li>
            </ul>
            <div className="modal-action flex gap-2">
              <form method="dialog">
                <button className="btn btn-ghost text-base-content">Cancel</button>
              </form>
              <div className="flex gap-2">
                <button
                  className="btn btn-error"
                  onClick={() => handleBlock(false)}
                >
                  Block User
                </button>
                <button className="btn btn-error" onClick={() => handleBlock(true)}>
                  Block & Report
                </button>
              </div>
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

export default BlockUserModal;

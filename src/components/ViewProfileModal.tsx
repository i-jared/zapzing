import React from 'react';
import { FaUser } from 'react-icons/fa';

interface ViewProfileModalProps {
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
}

const ViewProfileModal: React.FC<ViewProfileModalProps> = ({
  email,
  displayName,
  photoURL,
}) => {
  return (
    <dialog id="view-profile-modal" className="modal">
      <div className="modal-box bg-base-100">
        <h3 className="font-bold text-lg mb-6 text-base-content">View Profile</h3>
        <div className="flex flex-col items-center">
          <div className="avatar placeholder mb-4">
            <div className="bg-neutral text-neutral-content rounded-full w-24 h-24 relative flex items-center justify-center">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt="Profile"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <FaUser className="w-12 h-12" />
              )}
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-base-content">
              {displayName || 'Unnamed User'}
            </h2>
            <p className="text-base-content/70 mt-1">{email}</p>
          </div>
        </div>
        <div className="modal-action">
          <form method="dialog">
            <button className="btn">Close</button>
          </form>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
};

export default ViewProfileModal; 
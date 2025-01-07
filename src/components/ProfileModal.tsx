import React, { useState, useRef } from 'react';
import { FaUser, FaCamera } from 'react-icons/fa';
import { User } from 'firebase/auth';

interface ProfileModalProps {
  user: User | null;
  onUpdateProfile: (displayName: string, profilePicture: File | null) => Promise<void>;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onUpdateProfile }) => {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdatingProfile(true);
    setProfileError('');

    try {
      await onUpdateProfile(displayName.trim(), profilePicture);
      const modal = document.getElementById('profile-modal') as HTMLDialogElement;
      if (modal) modal.close();
      setProfilePicture(null);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setProfileError(error.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <dialog id="profile-modal" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Edit Profile</h3>
        <form onSubmit={handleProfileUpdate}>
          <div className="form-control mb-4">
            <div className="flex flex-col items-center mb-4">
              <div className="avatar placeholder cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="bg-neutral text-neutral-content rounded-full w-24 h-24 relative flex items-center justify-center">
                  {profilePicture ? (
                    <img
                      src={URL.createObjectURL(profilePicture)}
                      alt="Profile preview"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Current profile"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <FaUser className="w-12 h-12" />
                  )}
                  <div className="absolute bottom-0 right-0 bg-base-100 rounded-full p-2">
                    <FaCamera className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setProfilePicture(file);
                }}
              />
            </div>

            <label className="label">
              <span className="label-text">Display Name</span>
            </label>
            <input
              type="text"
              placeholder="Your name"
              className="input input-bordered w-full"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          
          {profileError && (
            <div className="alert alert-error mb-4">
              <span>{profileError}</span>
            </div>
          )}

          <div className="modal-action">
            <button 
              type="button" 
              className="btn" 
              onClick={() => {
                const modal = document.getElementById('profile-modal') as HTMLDialogElement;
                if (modal) modal.close();
                setProfilePicture(null);
                setProfileError('');
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={`btn btn-primary ${isUpdatingProfile ? 'loading' : ''}`}
              disabled={isUpdatingProfile}
            >
              {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
};

export default ProfileModal; 
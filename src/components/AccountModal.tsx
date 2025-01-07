import React, { useState } from 'react';
import { User } from 'firebase/auth';

interface AccountModalProps {
  user: User | null;
  isEmailVerified: boolean;
  onUpdateEmail: (newEmail: string, currentPassword: string) => Promise<void>;
  onUpdatePassword: (newPassword: string, currentPassword: string) => Promise<void>;
  onResendVerification: () => Promise<void>;
}

const AccountModal: React.FC<AccountModalProps> = ({
  user,
  isEmailVerified,
  onUpdateEmail,
  onUpdatePassword,
  onResendVerification
}) => {
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [accountError, setAccountError] = useState('');
  const [accountSuccess, setAccountSuccess] = useState('');

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentPassword) return;

    setIsUpdatingEmail(true);
    setAccountError('');
    setAccountSuccess('');

    try {
      await onUpdateEmail(newEmail, currentPassword);
      setAccountSuccess('Email updated successfully');
      setCurrentPassword('');
    } catch (error: any) {
      console.error('Error updating email:', error);
      setAccountError(error.message || 'Failed to update email');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentPassword) return;

    setIsUpdatingPassword(true);
    setAccountError('');
    setAccountSuccess('');

    try {
      await onUpdatePassword(newPassword, currentPassword);
      setAccountSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      setAccountError(error.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResendingVerification(true);
    setAccountError('');
    setAccountSuccess('');
    
    try {
      await onResendVerification();
      setAccountSuccess('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      setAccountError(error.message || 'Failed to send verification email');
    } finally {
      setIsResendingVerification(false);
    }
  };

  return (
    <dialog id="account-modal" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4 text-base-content">Account Settings</h3>
        
        {/* Email Change Section */}
        <div className="form-control mb-6">
          <h4 className="font-semibold mb-2 text-base-content">Email Settings</h4>
          {isEmailVerified ? (
            <form onSubmit={handleEmailUpdate}>
              <input
                type="email"
                placeholder="New Email"
                className="input input-bordered w-full mb-2 text-base-content placeholder:text-base-content/60"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Current Password"
                className="input input-bordered w-full mb-2 text-base-content placeholder:text-base-content/60"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <button 
                type="submit" 
                className={`btn btn-primary w-full ${isUpdatingEmail ? 'loading' : ''}`}
                disabled={isUpdatingEmail || !newEmail.trim() || !currentPassword.trim()}
              >
                Update Email
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="alert alert-warning">
                <span>Your email ({user?.email}) is not verified. Please verify your email before making changes.</span>
              </div>
              <button 
                className={`btn btn-primary w-full ${isResendingVerification ? 'loading' : ''}`}
                onClick={handleResendVerification}
                disabled={isResendingVerification}
              >
                {isResendingVerification ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          )}
        </div>

        {/* Password Change Section */}
        <div className="form-control mb-6">
          <h4 className="font-semibold mb-2 text-base-content">Change Password</h4>
          <form onSubmit={handlePasswordUpdate}>
            <input
              type="password"
              placeholder="New Password"
              className="input input-bordered w-full mb-2 text-base-content placeholder:text-base-content/60"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Current Password"
              className="input input-bordered w-full mb-2 text-base-content placeholder:text-base-content/60"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <button 
              type="submit" 
              className={`btn btn-primary w-full ${isUpdatingPassword ? 'loading' : ''}`}
              disabled={isUpdatingPassword || !newPassword.trim() || !currentPassword.trim()}
            >
              Update Password
            </button>
          </form>
        </div>

        {accountError && (
          <div className="alert alert-error mb-4">
            <span>{accountError}</span>
          </div>
        )}
        
        {accountSuccess && (
          <div className="alert alert-success mb-4">
            <span>{accountSuccess}</span>
          </div>
        )}

        <div className="modal-action">
          <button 
            className="btn" 
            onClick={() => {
              const modal = document.getElementById('account-modal') as HTMLDialogElement;
              if (modal) modal.close();
              setCurrentPassword('');
              setNewPassword('');
              setAccountError('');
              setAccountSuccess('');
            }}
          >
            Close
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
};

export default AccountModal; 
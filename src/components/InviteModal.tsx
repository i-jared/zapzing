import React, { useState } from 'react';

interface InviteModalProps {
  onInvite: (emailOrPattern: string) => Promise<void>;
}

const InviteModal: React.FC<InviteModalProps> = ({ onInvite }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const isValidEmailOrRegex = (input: string): boolean => {
    // Check if it's a valid email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(input)) {
      return true;
    }

    // Check if it's a valid regex pattern
    try {
      new RegExp(input);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !isValidEmailOrRegex(inviteEmail.trim())) {
      setInviteError('Please enter a valid email address or regex pattern');
      return;
    }

    setIsInviting(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      await onInvite(inviteEmail.trim());
      setInviteSuccess('Invitation sent successfully');
      setInviteEmail('');
      
      // Close modal after a short delay
      setTimeout(() => {
        const modal = document.getElementById('invite-modal') as HTMLDialogElement;
        if (modal) modal.close();
        setInviteSuccess('');
      }, 2000);
    } catch (error: any) {
      setInviteError(error.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <dialog id="invite-modal" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg text-base-content">Invite to Workspace</h3>
        <form onSubmit={handleInvite}>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-base-content">Email Address or Regex Pattern</span>
            </label>
            <input
              type="text"
              placeholder="colleague@company.com or regex pattern"
              className="input input-bordered w-full text-base-content placeholder:text-base-content/60"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                setInviteError('');
                setInviteSuccess('');
              }}
              required
            />
          </div>
          
          {inviteError && (
            <div className="alert alert-error mt-4">
              <span className="text-error-content">{inviteError}</span>
            </div>
          )}
          
          {inviteSuccess && (
            <div className="alert alert-success mt-4">
              <span className="text-success-content">{inviteSuccess}</span>
            </div>
          )}

          <div className="modal-action">
            <button 
              type="button" 
              className="btn" 
              onClick={() => {
                const modal = document.getElementById('invite-modal') as HTMLDialogElement;
                if (modal) modal.close();
                setInviteEmail('');
                setInviteError('');
                setInviteSuccess('');
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={`btn btn-primary ${isInviting ? 'loading' : ''}`}
              disabled={isInviting || !inviteEmail.trim()}
            >
              {isInviting ? 'Inviting...' : 'Send Invite'}
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

export default InviteModal; 
import React, { useState } from 'react';

interface InviteModalProps {
  onInvite: (email: string) => Promise<void>;
}

const InviteModal: React.FC<InviteModalProps> = ({ onInvite }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

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
        <h3 className="font-bold text-lg mb-4">Invite to Workspace</h3>
        <form onSubmit={handleInvite}>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Email Address</span>
            </label>
            <input
              type="email"
              placeholder="colleague@company.com"
              className="input input-bordered w-full"
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
              <span>{inviteError}</span>
            </div>
          )}
          
          {inviteSuccess && (
            <div className="alert alert-success mt-4">
              <span>{inviteSuccess}</span>
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
import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface StatusModalProps {
  userId: string;
  currentStatus: string | null;
}

const StatusModal: React.FC<StatusModalProps> = ({ userId, currentStatus }) => {
  const [status, setStatus] = useState(currentStatus || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: status.trim() || null
      });
      
      const modal = document.getElementById('status-modal') as HTMLDialogElement;
      if (modal) modal.close();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleClearStatus = async () => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: null
      });
      
      setStatus('');
      
      const modal = document.getElementById('status-modal') as HTMLDialogElement;
      if (modal) modal.close();
    } catch (error) {
      console.error('Error clearing status:', error);
    }
  };

  return (
    <dialog id="status-modal" className="modal">
      <div className="modal-box bg-base-100">
        <h3 className="font-bold text-lg mb-4 text-base-content">Set Status</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-control">
            <input
              type="text"
              placeholder="What's on your mind?"
              className="input input-bordered w-full text-base-content bg-base-100"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              maxLength={100}
            />
          </div>
          
          <div className="modal-action">
            {currentStatus && (
              <button 
                type="button"
                className="btn btn-ghost text-base-content"
                onClick={handleClearStatus}
              >
                Clear Status
              </button>
            )}
            <button 
              type="button"
              className="btn text-base-content"
              onClick={() => {
                const modal = document.getElementById('status-modal') as HTMLDialogElement;
                if (modal) modal.close();
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Status
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

export default StatusModal; 
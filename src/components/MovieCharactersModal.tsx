import React, { useState } from 'react';
import { Search } from 'lucide-react';

const MovieCharactersModal: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  return (
    <dialog id="movie-characters-modal" className="modal">
      <div className="modal-box bg-base-100">
        <h3 className="font-bold text-2xl mb-2 text-base-content">Talk to movie characters!</h3>
        <p className="text-base-content/70 mb-6">
          Search for a movie to add its characters to your channel.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-control w-full">
            <div className="join w-full">
              <input
                type="text"
                placeholder="Search movies..."
                className="input input-bordered join-item flex-1 text-base-content bg-base-100"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="btn join-item btn-primary">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="modal-action">
            <button 
              type="button"
              className="btn text-base-content"
              onClick={() => {
                const modal = document.getElementById('movie-characters-modal') as HTMLDialogElement;
                if (modal) modal.close();
              }}
            >
              Cancel
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

export default MovieCharactersModal; 
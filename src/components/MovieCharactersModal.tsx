import React, { useState, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import { getFunctions } from 'firebase/functions';
import { httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

interface MovieResult {
  imdbId: string;
  title: string;
  year: string;
}

const MovieCharactersModal: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MovieResult[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const functions = getFunctions(app);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search for 1 second
    searchTimeoutRef.current = setTimeout(async () => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      try {
        const searchMovies = httpsCallable(functions, 'searchMovies');
        const result = await searchMovies({ searchTerm: query });
        const data = result.data as { movies: MovieResult[] };
        setSearchResults(data.movies);
      } catch (error) {
        console.error('Error searching movies:', error);
      } finally {
        setIsSearching(false);
      }
    }, 1000);
  }, [functions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    const modal = document.getElementById('movie-characters-modal') as HTMLDialogElement;
    if (modal) modal.close();
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
                onChange={(e) => handleSearch(e.target.value)}
              />
              <button className="btn join-item btn-primary">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Results */}
          {(searchResults.length > 0 || isSearching) && (
            <div className="mt-4 bg-base-200 rounded-box shadow-lg">
              {isSearching ? (
                <div className="flex items-center justify-center p-4">
                  <span className="loading loading-spinner loading-md text-base-content"></span>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {searchResults.map((movie) => (
                    <div
                      key={movie.imdbId}
                      className="p-2 hover:bg-base-300 cursor-pointer"
                      onClick={() => {
                        // TODO: Handle movie selection
                        console.log('Selected movie:', movie);
                      }}
                    >
                      <div className="text-sm font-medium text-base-content">
                        {movie.title}
                      </div>
                      <div className="text-xs text-base-content/70">
                        {movie.year}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="modal-action">
            <button 
              type="button"
              className="btn text-base-content"
              onClick={handleClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={() => {
          setSearchQuery('');
          setSearchResults([]);
        }}>close</button>
      </form>
    </dialog>
  );
};

export default MovieCharactersModal; 
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

type AuthPage = 'signin' | 'signup' | 'forgot-password';

interface SignInProps {
  onPageChange: (page: AuthPage) => void;
  setLoading: (loading: boolean) => void;
}

const SignIn: React.FC<SignInProps> = ({ onPageChange, setLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem('isAuthenticated', 'true');
      window.dispatchEvent(new Event('authChange'));
      navigate('/');
    } catch (error: any) {
      console.error('Error signing in:', error);
      setError(error.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Sign In</h2>
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Email</span>
          </label>
          <input
            type="email"
            placeholder="email@example.com"
            className="input input-bordered w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text">Password</span>
          </label>
          <input
            type="password"
            placeholder="••••••••"
            className="input input-bordered w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary w-full">
          Sign In
        </button>
      </form>
      <div className="divider">OR</div>
      <div className="flex flex-col gap-2">
        <button 
          className="btn btn-outline w-full"
          onClick={() => onPageChange('signup')}
        >
          Create Account
        </button>
        <button 
          className="btn btn-ghost btn-sm"
          onClick={() => onPageChange('forgot-password')}
        >
          Forgot Password?
        </button>
      </div>
    </div>
  );
};

export default SignIn;


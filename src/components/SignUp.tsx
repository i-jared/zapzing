import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

type AuthPage = 'signin' | 'signup' | 'forgot-password';

interface SignUpProps {
  onPageChange: (page: AuthPage) => void;
}

const SignUp: React.FC<SignUpProps> = ({ onPageChange }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.message || 'Failed to create account');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-base-content">Create Account</h2>
      {error && (
        <div className="alert alert-error mb-4">
          <span className="text-error-content">{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-control">
          <label className="label">
            <span className="label-text text-base-content">Email</span>
          </label>
          <input
            type="email"
            placeholder="email@example.com"
            className="input input-bordered text-base-content placeholder:text-base-content/60"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-control mt-4">
          <label className="label">
            <span className="label-text text-base-content">Password</span>
          </label>
          <input
            type="password"
            placeholder="********"
            className="input input-bordered text-base-content placeholder:text-base-content/60"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-control mt-4">
          <label className="label">
            <span className="label-text text-base-content">Confirm Password</span>
          </label>
          <input
            type="password"
            placeholder="********"
            className="input input-bordered text-base-content placeholder:text-base-content/60"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-control mt-6">
          <button type="submit" className="btn btn-primary">Create Account</button>
        </div>
      </form>
      <div className="divider">OR</div>
      <button 
        className="btn btn-ghost w-full"
        onClick={() => onPageChange('signin')}
      >
        Already have an account? Sign in
      </button>
    </div>
  );
};

export default SignUp;


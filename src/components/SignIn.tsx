import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

interface SignInProps {
  onSignUpClick: () => void;
  onForgotPasswordClick: () => void;
}

const SignIn: React.FC<SignInProps> = ({ onSignUpClick, onForgotPasswordClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.message || 'Failed to sign in');
    }
  };

  return (
    <>
      <h2 className="card-title justify-center mb-4">Sign In</h2>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Email</span>
          </label>
          <input
            type="email"
            placeholder="email@example.com"
            className="input input-bordered"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-control mt-4">
          <label className="label">
            <span className="label-text">Password</span>
          </label>
          <input
            type="password"
            placeholder="********"
            className="input input-bordered"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-control mt-6">
          <button type="submit" className="btn btn-primary">Sign In</button>
        </div>
      </form>
      <div className="divider">OR</div>
      <div className="flex flex-col space-y-2">
        <button className="btn btn-outline btn-sm" onClick={onSignUpClick}>Create an account</button>
        <button className="btn btn-ghost btn-sm" onClick={onForgotPasswordClick}>Forgot password?</button>
      </div>
    </>
  );
};

export default SignIn;


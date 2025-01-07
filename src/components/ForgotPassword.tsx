import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

type AuthPage = 'signin' | 'signup' | 'forgot-password';

interface ForgotPasswordProps {
  onPageChange: (page: AuthPage) => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onPageChange }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      setError(error.message || 'Failed to send reset email');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Reset Password</h2>
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="alert alert-success mb-4">
          <span>{message}</span>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-control mb-6">
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
        <button type="submit" className="btn btn-primary w-full">
          Send Reset Link
        </button>
      </form>
      <div className="divider">OR</div>
      <button 
        className="btn btn-ghost w-full"
        onClick={() => onPageChange('signin')}
      >
        Back to Sign In
      </button>
    </div>
  );
};

export default ForgotPassword;


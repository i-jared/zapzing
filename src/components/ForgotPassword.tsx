import React, { useState } from 'react';
import { sendPasswordResetEmail, AuthError } from 'firebase/auth';
import { auth } from '../firebase';

type AuthPage = 'signin' | 'signup' | 'forgot-password';

interface ForgotPasswordProps {
  onPageChange: (page: AuthPage) => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onPageChange }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const getErrorMessage = (error: AuthError) => {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Invalid email address format';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/too-many-requests':
        return 'Too many password reset attempts. Please try again later';
      default:
        return error.message || 'Failed to send reset email';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Please check your inbox and spam folder.');
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      setError(getErrorMessage(error));
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-base-content">Reset Password</h2>
      {error && (
        <div className="alert alert-error mb-4">
          <span className="text-error-content">{error}</span>
        </div>
      )}
      {message && (
        <div className="alert alert-success mb-4">
          <span className="text-success-content">{message}</span>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text text-base-content">Email</span>
          </label>
          <input
            type="email"
            placeholder="email@example.com"
            className="input input-bordered w-full text-base-content placeholder:text-base-content/60"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary w-full">
          Send Reset Link
        </button>
      </form>
      <div className="divider text-base-content">OR</div>
      <button 
        className="btn btn-ghost w-full text-base-content"
        onClick={() => onPageChange('signin')}
      >
        Back to Sign In
      </button>
    </div>
  );
};

export default ForgotPassword;


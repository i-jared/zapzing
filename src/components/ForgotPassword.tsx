import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { FaCheckCircle, FaExclamationCircle, FaEnvelope } from 'react-icons/fa';

interface ForgotPasswordProps {
  onBackToSignIn: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBackToSignIn }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
      setEmail(''); // Clear email after success
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="alert alert-success shadow-lg mb-8">
          <FaCheckCircle className="w-6 h-6" />
          <div>
            <h3 className="font-bold">Check your inbox!</h3>
            <div className="text-sm">We've sent you a password reset link.</div>
          </div>
        </div>
        
        <div className="card bg-base-200 shadow-xl p-6 mb-8">
          <FaEnvelope className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm opacity-75 mb-4">
            If you don't see the email, check your spam folder or request another link.
          </p>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setSuccess(false)}
          >
            Send another link
          </button>
        </div>

        <button 
          className="btn btn-outline btn-sm w-full"
          onClick={onBackToSignIn}
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <>
      <h2 className="card-title justify-center mb-4">Reset Password</h2>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="alert alert-error shadow-lg mb-4">
            <FaExclamationCircle />
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
          <label className="label">
            <span className="label-text-alt text-base-content/60">
              We'll send you a link to reset your password
            </span>
          </label>
        </div>
        <div className="form-control mt-6">
          <button 
            type="submit" 
            className={`btn btn-primary ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </div>
      </form>
      <div className="divider">OR</div>
      <button 
        className="btn btn-outline btn-sm w-full" 
        onClick={onBackToSignIn}
        disabled={loading}
      >
        Back to Sign In
      </button>
    </>
  );
};

export default ForgotPassword;


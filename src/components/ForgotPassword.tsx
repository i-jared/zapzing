import React, { useState } from 'react';

interface ForgotPasswordProps {
  onBackToSignIn: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBackToSignIn }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement forgot password logic
    console.log('Reset password for:', email);
  };

  return (
    <>
      <h2 className="card-title justify-center mb-4">Forgot Password</h2>
      <form onSubmit={handleSubmit}>
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
        <div className="form-control mt-6">
          <button type="submit" className="btn btn-primary">Reset Password</button>
        </div>
      </form>
      <div className="divider">OR</div>
      <button className="btn btn-outline btn-sm" onClick={onBackToSignIn}>Back to Sign In</button>
    </>
  );
};

export default ForgotPassword;


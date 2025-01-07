import React, { useState } from 'react';
import SignIn from '../components/SignIn';
import SignUp from '../components/SignUp';
import ForgotPassword from '../components/ForgotPassword';

type AuthPage = 'signin' | 'signup' | 'forgot-password';

const Authentication: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<AuthPage>('signin');
  const [loading, setLoading] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'signin':
        return <SignIn onPageChange={setCurrentPage} setLoading={setLoading} />;
      case 'signup':
        return <SignUp onPageChange={setCurrentPage} />;
      case 'forgot-password':
        return <ForgotPassword onPageChange={setCurrentPage} />;
      default:
        return <SignIn onPageChange={setCurrentPage} setLoading={setLoading} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body">
          {renderPage()}
          <div className="divider text-base-content">OR</div>
          <div className="flex flex-col gap-2">
            {currentPage !== 'signin' && (
              <button
                className="btn btn-outline text-base-content"
                onClick={() => setCurrentPage('signin')}
              >
                Sign In
              </button>
            )}
            {currentPage !== 'signup' && (
              <button
                className="btn btn-outline text-base-content"
                onClick={() => setCurrentPage('signup')}
              >
                Create Account
              </button>
            )}
            {currentPage !== 'forgot-password' && (
              <button
                className="btn btn-outline text-base-content"
                onClick={() => setCurrentPage('forgot-password')}
              >
                Forgot Password?
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Authentication;


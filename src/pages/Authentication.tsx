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
      <div className="h-screen w-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body">
          {renderPage()}
        </div>
      </div>
    </div>
  );
};

export default Authentication;


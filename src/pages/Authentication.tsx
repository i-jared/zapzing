import React, { useState } from 'react';
import SignIn from '../components/SignIn';
import SignUp from '../components/SignUp';
import ForgotPassword from '../components/ForgotPassword';

type AuthPage = 'signin' | 'signup' | 'forgot-password';

const Authentication: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<AuthPage>('signin');

  const renderPage = () => {
    switch (currentPage) {
      case 'signin':
        return <SignIn onSignUpClick={() => setCurrentPage('signup')} onForgotPasswordClick={() => setCurrentPage('forgot-password')} />;
      case 'signup':
        return <SignUp onSignInClick={() => setCurrentPage('signin')} />;
      case 'forgot-password':
        return <ForgotPassword onBackToSignIn={() => setCurrentPage('signin')} />;
    }
  };

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


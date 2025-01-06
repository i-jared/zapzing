import React, { useState, useEffect } from 'react';
import Authentication from './pages/Authentication.tsx';
import MainPage from './pages/MainPage.tsx';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const authStatus = localStorage.getItem('isAuthenticated');
      setIsAuthenticated(authStatus === 'true');
    };

    // Check initial auth status
    checkAuth();

    // Listen for storage changes
    window.addEventListener('storage', checkAuth);
    
    // Custom event listener for auth changes
    window.addEventListener('authChange', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('authChange', checkAuth);
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={isAuthenticated ? <Navigate to="/" /> : <Authentication />} />
        <Route path="/" element={isAuthenticated ? <MainPage /> : <Navigate to="/auth" />} />
      </Routes>
    </Router>
  );
};

export default App;

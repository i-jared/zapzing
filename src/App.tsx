import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import Authentication from './pages/Authentication.tsx';
import MainPage from './pages/MainPage.tsx';
import Workspaces from './pages/Workspaces.tsx';
import LandingPage from './pages/LandingPage.tsx';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={isAuthenticated ? <Navigate to="/workspaces" /> : <Authentication />} />
        <Route path="/workspace/:workspaceId" element={isAuthenticated ? <MainPage /> : <Navigate to="/auth" />} />
        <Route path="/workspaces" element={isAuthenticated ? <Workspaces /> : <Navigate to="/auth" />} />
        <Route path="/" element={isAuthenticated ? <Navigate to="/workspaces" /> : <LandingPage />} />
      </Routes>
    </Router>
  );
};

export default App;

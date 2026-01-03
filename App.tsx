import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import AuthCallback from './components/AuthCallback';
import ErrorBoundary from './components/ErrorBoundary';
import { TranslationProvider } from './i18n/TranslationContext';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

const App: React.FC = () => {
  console.log('App: Component Rendering');
  const [view, setView] = useState<'landing' | 'login' | 'dashboard' | 'auth-callback'>('landing');
  const [user, setUser] = useState<User | null>(null);

  // Check for existing session and OAuth callback on mount
  useEffect(() => {
    // Check if this is an OAuth callback
    if (window.location.pathname === '/auth/callback') {
      setView('auth-callback');
      return;
    }

    // Check for existing session
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setView('dashboard');
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  const handleStart = () => {
    setView('login');
  };

  const handleLoginSuccess = () => {
    setView('dashboard');
  };

  const handleAuthSuccess = (authUser: User, token: string) => {
    setUser(authUser);
    // Clear URL params and redirect to dashboard
    window.history.replaceState({}, '', '/');
    setView('dashboard');
  };

  const handleAuthError = (error: string) => {
    console.error('Auth error:', error);
    window.history.replaceState({}, '', '/');
    setView('login');
  };

  const handleBackToLanding = () => {
    setView('landing');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setView('landing');
  };

  return (
    <ErrorBoundary>
      <TranslationProvider>
        {view === 'landing' && <LandingPage onStart={handleStart} />}
        {view === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onBack={handleBackToLanding}
          />
        )}
        {view === 'auth-callback' && (
          <AuthCallback
            onAuthSuccess={handleAuthSuccess}
            onAuthError={handleAuthError}
          />
        )}
        {view === 'dashboard' && <Dashboard user={user} onLogout={handleLogout} />}
      </TranslationProvider>
    </ErrorBoundary>
  );
};

export default App;

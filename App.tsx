
import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import ErrorBoundary from './components/ErrorBoundary';
import { TranslationProvider } from './i18n/TranslationContext';

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'login' | 'dashboard'>('landing');

  const handleStart = () => {
    setView('login');
  };

  const handleLoginSuccess = () => {
    setView('dashboard');
  };

  const handleBackToLanding = () => {
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
        {view === 'dashboard' && <Dashboard />}
      </TranslationProvider>
    </ErrorBoundary>
  );
};

export default App;

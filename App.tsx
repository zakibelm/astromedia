
import React, { useState } from 'react';
// FIX: Corrected import path to be explicit, though the original issue was likely due to the component file being empty.
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import ErrorBoundary from './components/ErrorBoundary';
import { TranslationProvider } from './i18n/TranslationContext';

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');

  const handleStart = () => {
    setView('dashboard');
  };

  return (
    <ErrorBoundary>
      <TranslationProvider>
        {view === 'landing' ? <LandingPage onStart={handleStart} /> : <Dashboard />}
      </TranslationProvider>
    </ErrorBoundary>
  );
};

export default App;

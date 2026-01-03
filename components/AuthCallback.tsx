import React, { useEffect, useState } from 'react';

interface AuthCallbackProps {
  onAuthSuccess: (user: any, token: string) => void;
  onAuthError: (error: string) => void;
}

const AuthCallback: React.FC<AuthCallbackProps> = ({ onAuthSuccess, onAuthError }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const processedRef = React.useRef(false);

  useEffect(() => {
    // If we already processed this callback (even if effect re-runs), do nothing.
    if (processedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userStr = params.get('user');
    const error = params.get('error');

    if (error) {
      setStatus('error');
      onAuthError(error);
      processedRef.current = true;
      return;
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));

        // Store token and user in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        setStatus('success');
        processedRef.current = true;

        // Add a small delay to ensure state updates before parent redirects
        setTimeout(() => {
          onAuthSuccess(user, token);
        }, 50);

      } catch (e) {
        setStatus('error');
        onAuthError('Failed to parse user data');
        processedRef.current = true;
      }
    } else {
      // If no data found, check if we might have already seemingly processed it?
      // Just warn but don't error out immediately to be safe against double-invocations
      console.warn('No token/user found in URL params - skipping processing');
    }
  }, [onAuthSuccess, onAuthError]);

  return (
    <div className="min-h-screen bg-dark-space flex items-center justify-center">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-astro-amber-500 mx-auto mb-4"></div>
            <p className="text-white text-lg">Connexion en cours...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <p className="text-white text-lg">Connexion réussie ! Redirection...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <p className="text-white text-lg">Erreur de connexion</p>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-4 px-6 py-2 bg-astro-amber-500 text-white rounded-lg hover:bg-astro-amber-600"
            >
              Retour à l'accueil
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;

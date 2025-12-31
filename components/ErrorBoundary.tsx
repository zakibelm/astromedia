import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#10051a] to-[#190729] text-white flex items-center justify-center p-6">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-8 max-w-2xl w-full">
            <h1 className="text-2xl font-bold text-red-400 mb-4">🚨 Erreur Application</h1>
            
            <p className="text-gray-300 mb-6">
              Une erreur inattendue s'est produite. L'application s'est arrêtée pour éviter d'autres problèmes.
            </p>

            <div className="bg-black/50 rounded p-4 mb-6 font-mono text-sm">
              <div className="text-red-400 mb-2">Erreur:</div>
              <div className="text-gray-300">{this.state.error?.message}</div>
              
              {this.state.error?.stack && (
                <>
                  <div className="text-red-400 mt-4 mb-2">Stack trace:</div>
                  <div className="text-xs text-gray-400 overflow-auto max-h-40">
                    {this.state.error.stack}
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
              >
                🔄 Recharger l'application
              </button>
              
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined, errorInfo: undefined });
                }}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded transition-colors"
              >
                🔧 Réessayer
              </button>
            </div>

            <div className="mt-6 text-sm text-gray-400">
              <p>💡 <strong>Conseils de dépannage :</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Vérifiez la console du navigateur pour plus de détails</li>
                <li>Assurez-vous que les clés API sont correctement configurées</li>
                <li>Rechargez la page pour recommencer</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
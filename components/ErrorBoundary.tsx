import React, { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

// Generate a unique error ID for tracking
const generateErrorId = (): string => {
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
};

// Error reporting service (can be integrated with Sentry, LogRocket, etc.)
const reportError = async (error: Error, errorInfo: ErrorInfo, errorId: string): Promise<void> => {
  try {
    // Log to console in development
    if (import.meta.env.DEV) {
      console.group(`🚨 Error Boundary [${errorId}]`);
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // Send to backend error tracking endpoint
    await fetch('/api/v1/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Silently fail if error reporting fails
    });
  } catch {
    // Silently fail
  }
};

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorId: generateErrorId() };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorId = this.state.errorId || generateErrorId();
    
    this.setState({ errorInfo, errorId });

    // Report the error
    reportError(error, errorInfo, errorId);

    // Call the optional onError callback
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
    this.props.onReset?.();
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoHome = (): void => {
    window.location.href = '/';
  };

  private copyErrorDetails = (): void => {
    const { error, errorInfo, errorId } = this.state;
    const details = `
Error ID: ${errorId}
Message: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
URL: ${window.location.href}
Time: ${new Date().toISOString()}
    `.trim();

    navigator.clipboard.writeText(details).then(() => {
      alert('Error details copied to clipboard');
    });
  };

  public render(): ReactNode {
    const { hasError, error, errorId } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-[#10051a] to-[#190729] text-white flex items-center justify-center p-6">
          <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
                <p className="text-sm text-gray-400">Error ID: {errorId}</p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6">
              An unexpected error occurred. The application has stopped to prevent further issues.
              Our team has been notified.
            </p>

            {/* Error details (collapsible in production) */}
            {import.meta.env.DEV && error && (
              <details className="mb-6">
                <summary className="cursor-pointer text-red-400 hover:text-red-300 transition-colors">
                  View error details
                </summary>
                <div className="mt-3 bg-black/50 rounded-lg p-4 font-mono text-sm overflow-auto max-h-60">
                  <div className="text-red-400 mb-2 font-semibold">{error.name}:</div>
                  <div className="text-gray-300 mb-4">{error.message}</div>
                  {error.stack && (
                    <pre className="text-xs text-gray-400 whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 min-w-[140px] bg-blue-600 hover:bg-blue-500 px-4 py-3 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                className="flex-1 min-w-[140px] bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reload Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex-1 min-w-[140px] bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Go Home
              </button>
            </div>

            {/* Copy error button */}
            <button
              onClick={this.copyErrorDetails}
              className="mt-4 w-full text-gray-400 hover:text-gray-300 text-sm py-2 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy error details for support
            </button>

            {/* Help text */}
            <div className="mt-6 pt-6 border-t border-gray-700/50 text-sm text-gray-400">
              <p className="font-medium text-gray-300 mb-2">Troubleshooting tips:</p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                  Clear your browser cache and cookies
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                  Check your internet connection
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                  Try using a different browser
                </li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;

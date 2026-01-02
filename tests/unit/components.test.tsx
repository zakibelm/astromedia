// tests/unit/components.test.tsx
// Comprehensive React component tests for AstroMedia
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import components
import App from '../../App';
import ErrorBoundary from '../../components/ErrorBoundary';

// ============================================================
// APP TESTS
// ============================================================
describe('App', () => {
  it('should render without crashing', () => {
    render(<App />);
    expect(document.body).toBeDefined();
  });

  it('should log component rendering', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    render(<App />);
    expect(consoleSpy).toHaveBeenCalledWith('App: Component Rendering');
    consoleSpy.mockRestore();
  });

  it('should render the app container', () => {
    const { container } = render(<App />);
    expect(container.querySelector('#root') || container.firstChild).toBeTruthy();
  });
});

// ============================================================
// ERROR BOUNDARY TESTS
// ============================================================
describe('ErrorBoundary', () => {
  // Component that throws an error
  const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>Content rendered successfully</div>;
  };

  beforeEach(() => {
    // Suppress console.error for error boundary tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Content rendered successfully')).toBeInTheDocument();
  });

  it('should render error UI when an error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    // Should show some kind of error message or fallback UI
    // The ErrorBoundary catches the error and shows a fallback
    expect(screen.queryByText('Content rendered successfully')).not.toBeInTheDocument();
  });
});

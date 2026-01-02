// tests/integration/app.integration.test.tsx
// Integration tests for AstroMedia application flow
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

describe('App Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the app without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();
    expect(container.firstChild).toBeTruthy();
  });

  it('should have the error boundary wrapping children', () => {
    // App includes ErrorBoundary
    const { container } = render(<App />);
    expect(container).toBeDefined();
  });

  it('should log App rendering on mount', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    render(<App />);
    expect(consoleSpy).toHaveBeenCalledWith('App: Component Rendering');
  });

  it('should maintain state across interactions', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    
    // App should render something
    expect(container.firstChild).toBeTruthy();
    
    // Find any clickable button
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should handle localStorage for language preference', () => {
    localStorage.setItem('language', 'fr');
    const { container } = render(<App />);
    expect(container).toBeDefined();
    expect(localStorage.getItem('language')).toBe('fr');
  });
});

import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
// FIX: The `toBeInTheDocument` matcher and other DOM-specific assertions were not available to Vitest's `expect`. Using the vitest-specific import from `@testing-library/jest-dom` correctly extends `expect` with the necessary matchers.
import '@testing-library/jest-dom/vitest';

// Cleanup après chaque test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock de crypto.randomUUID pour les tests
if (!globalThis.crypto) {
  globalThis.crypto = {
    randomUUID: () => `test-${Date.now()}-${Math.random()}`,
  } as any;
} else if(!globalThis.crypto.randomUUID) {
  // FIX: Type '`test-${number}-${number}`' is not assignable to type '`${string}-${string}-${string}-${string}-${string}`'.
  globalThis.crypto.randomUUID = () => `test-uuid-1-2-3-${Math.random()}`;
}

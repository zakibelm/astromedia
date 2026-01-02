// Zustand Auth Store with Secure Token Handling
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  role: 'USER' | 'ADMIN' | 'ENTERPRISE';
  apiQuota: number;
  apiUsed: number;
}

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  csrfToken: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCsrfToken: (token: string) => void;
  
  // Auth operations
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: (credential: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  fetchCsrfToken: () => Promise<void>;
  
  // User operations
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  checkAuth: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  name?: string;
  company?: string;
}

const API_BASE = '/api/v1';

// Helper to make authenticated requests
const authFetch = async (
  url: string,
  options: RequestInit = {},
  csrfToken?: string | null
): Promise<Response> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add CSRF token for non-GET requests
  if (csrfToken && options.method && !['GET', 'HEAD'].includes(options.method)) {
    (headers as Record<string, string>)['x-csrf-token'] = csrfToken;
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Important for cookies
  });
};

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        csrfToken: null,

        // Basic setters
        setUser: (user) => set({ 
          user, 
          isAuthenticated: !!user,
          error: null 
        }),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        setCsrfToken: (csrfToken) => set({ csrfToken }),

        // Fetch CSRF token
        fetchCsrfToken: async () => {
          try {
            const response = await fetch(`${API_BASE}/auth/csrf`);
            if (response.ok) {
              const data = await response.json();
              set({ csrfToken: data.csrfToken });
            }
          } catch (error) {
            console.error('Failed to fetch CSRF token:', error);
          }
        },

        // Login with email/password
        login: async (email, password) => {
          set({ isLoading: true, error: null });

          try {
            const { csrfToken } = get();
            const response = await authFetch(
              `${API_BASE}/auth/login`,
              {
                method: 'POST',
                body: JSON.stringify({ email, password }),
              },
              csrfToken
            );

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Login failed');
            }

            const data = await response.json();
            set({ 
              user: data.user, 
              isAuthenticated: true,
              isLoading: false 
            });

            return true;
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Login failed';
            set({ error: message, isLoading: false });
            return false;
          }
        },

        // Login with Google
        loginWithGoogle: async (credential) => {
          set({ isLoading: true, error: null });

          try {
            const { csrfToken } = get();
            const response = await authFetch(
              `${API_BASE}/auth/google`,
              {
                method: 'POST',
                body: JSON.stringify({ credential }),
              },
              csrfToken
            );

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Google login failed');
            }

            const data = await response.json();
            set({ 
              user: data.user, 
              isAuthenticated: true,
              isLoading: false 
            });

            return true;
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Google login failed';
            set({ error: message, isLoading: false });
            return false;
          }
        },

        // Register new user
        register: async (data) => {
          set({ isLoading: true, error: null });

          try {
            const { csrfToken } = get();
            const response = await authFetch(
              `${API_BASE}/auth/register`,
              {
                method: 'POST',
                body: JSON.stringify(data),
              },
              csrfToken
            );

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Registration failed');
            }

            const responseData = await response.json();
            set({ 
              user: responseData.user, 
              isAuthenticated: true,
              isLoading: false 
            });

            return true;
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Registration failed';
            set({ error: message, isLoading: false });
            return false;
          }
        },

        // Logout
        logout: async () => {
          try {
            const { csrfToken } = get();
            await authFetch(
              `${API_BASE}/auth/logout`,
              { method: 'POST' },
              csrfToken
            );
          } catch (error) {
            console.error('Logout error:', error);
          } finally {
            set({ 
              user: null, 
              isAuthenticated: false,
              error: null 
            });
          }
        },

        // Refresh token
        refreshToken: async () => {
          try {
            const response = await authFetch(`${API_BASE}/auth/refresh`, {
              method: 'POST',
            });

            if (!response.ok) {
              set({ user: null, isAuthenticated: false });
              return false;
            }

            const data = await response.json();
            set({ user: data.user, isAuthenticated: true });
            return true;
          } catch (error) {
            console.error('Token refresh failed:', error);
            set({ user: null, isAuthenticated: false });
            return false;
          }
        },

        // Update user profile
        updateProfile: async (data) => {
          try {
            const { csrfToken } = get();
            const response = await authFetch(
              `${API_BASE}/users/me`,
              {
                method: 'PATCH',
                body: JSON.stringify(data),
              },
              csrfToken
            );

            if (!response.ok) {
              throw new Error('Failed to update profile');
            }

            const updatedUser = await response.json();
            set({ user: updatedUser });
            return true;
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Update failed';
            set({ error: message });
            return false;
          }
        },

        // Check authentication status on app load
        checkAuth: async () => {
          set({ isLoading: true });

          try {
            // First fetch CSRF token
            await get().fetchCsrfToken();

            // Then check auth status
            const response = await authFetch(`${API_BASE}/auth/me`);

            if (response.ok) {
              const data = await response.json();
              set({ 
                user: data.user, 
                isAuthenticated: true,
                isLoading: false 
              });
            } else {
              // Try to refresh token
              const refreshed = await get().refreshToken();
              if (!refreshed) {
                set({ 
                  user: null, 
                  isAuthenticated: false,
                  isLoading: false 
                });
              } else {
                set({ isLoading: false });
              }
            }
          } catch (error) {
            console.error('Auth check failed:', error);
            set({ 
              user: null, 
              isAuthenticated: false,
              isLoading: false 
            });
          }
        },
      }),
      {
        name: 'astromedia-auth',
        storage: createJSONStorage(() => sessionStorage), // Use sessionStorage for security
        partialize: (state) => ({ 
          // Only persist minimal, non-sensitive data
          user: state.user ? {
            id: state.user.id,
            email: state.user.email,
            name: state.user.name,
            role: state.user.role,
          } : null,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
);

// Selector hooks for better performance
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);

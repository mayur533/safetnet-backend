// Import AsyncStorage using the initialization utility
import { getAsyncStorage, getAsyncStorageSync } from '../utils/asyncStorageInit';

// Get AsyncStorage - will be initialized asynchronously
// For synchronous access, we'll use getAsyncStorage() in async functions
let AsyncStorage: any = null;

// Helper to get AsyncStorage (initializes if needed)
const getStorage = async () => {
  if (!AsyncStorage) {
    AsyncStorage = await getAsyncStorage();
  }
  return AsyncStorage;
};

import {create} from 'zustand';
import {User} from '../models/user.types';
import {apiService, LoginResponse} from '../services/apiService';
import {useContactStore} from './contactStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone: string) => Promise<void>;
  loginAsTest: (plan: 'free' | 'premium') => Promise<void>;
  setPlan: (plan: 'free' | 'premium') => Promise<void>;
  logout: () => Promise<void>;
  load: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const resetUserScopedData = () => {
  useContactStore.getState().reset();
};

const convertApiUserToUser = (apiUser: LoginResponse['user']): User => {
  const fullName = apiUser.name || (apiUser.first_name && apiUser.last_name 
    ? `${apiUser.first_name} ${apiUser.last_name}`.trim()
    : apiUser.first_name || apiUser.last_name || apiUser.username || apiUser.email);
  
  return {
    id: apiUser.id.toString(),
    email: apiUser.email,
    name: fullName,
    phone: apiUser.phone || '',
    plan: apiUser.is_premium ? 'premium' : 'free',
  };
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true to prevent showing login screen before auth is checked
  login: async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      
      // Backend returns: {message, user, tokens: {access, refresh}}
      if (response.user && response.tokens) {
        resetUserScopedData();
        const user = convertApiUserToUser(response.user);
        set({user, isAuthenticated: true});
        
        // Store tokens
        if (response.tokens.access && response.tokens.refresh) {
          await apiService.setTokens(response.tokens.access, response.tokens.refresh);
        }
        
        // Update user with plan info from response
        const updatedUser = {
          ...user,
          name: response.user.name || user.name,
          phone: response.user.phone || user.phone,
          plan: response.user.is_premium ? 'premium' : 'free',
        };
        set({user: updatedUser, isAuthenticated: true, isLoading: false});
        const storage = await getStorage();
        await storage.setItem('authState', JSON.stringify({user: updatedUser}));
        console.log('Auth state saved after login');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      throw error;
    }
  },
  register: async (email: string, password: string, name: string, phone: string) => {
    try {
      // Backend expects username, email, password, password_confirm
      const username = email.split('@')[0]; // Use email prefix as username
      const response = await apiService.register({
        username,
        email,
        password,
        password_confirm: password,
        role: 'USER', // Default role
      });
      
      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data?.user) {
        resetUserScopedData();
        const user = convertApiUserToUser(response.data.user);
        set({user, isAuthenticated: true});
        
        if (response.data.access && response.data.refresh) {
          await apiService.setTokens(response.data.access, response.data.refresh);
        }
        
        const storage = await getStorage();
        await storage.setItem('authState', JSON.stringify({user}));
        console.log('Auth state saved after register');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      throw error;
    }
  },
  loginAsTest: async (plan: 'free' | 'premium') => {
    // Test login functionality - can be used for development
    resetUserScopedData();
    const testUser: User = {
      id: plan === 'premium' ? 'premium-test' : 'free-test',
      name: plan === 'premium' ? 'Premium Tester' : 'Free Tester',
      email: plan === 'premium' ? 'premium@test.safetnet.app' : 'free@test.safetnet.app',
      phone: '+1234567890',
      plan,
    };
    set({user: testUser, isAuthenticated: true, isLoading: false});
    const storage = await getStorage();
    await storage.setItem('authState', JSON.stringify({user: testUser}));
    console.log('Auth state saved after test login');
  },
  setPlan: async (plan: 'free' | 'premium') => {
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      const updatedUser = {...currentUser, plan};
      set({user: updatedUser});
      const storage = await getStorage();
      await storage.setItem('authState', JSON.stringify({user: updatedUser}));
    }
  },
  logout: async () => {
    resetUserScopedData();
    await apiService.clearTokens();
    set({user: null, isAuthenticated: false, isLoading: false});
    const storage = await getStorage();
    await storage.removeItem('authState');
    console.log('Auth state cleared after logout');
  },
  load: async () => {
    try {
      console.log('=== Loading auth state ===');
      set({isLoading: true}); // Set loading to true at start
      
      // Ensure AsyncStorage is ready
      const storage = await getStorage();
      
      // Load tokens first - this must complete before checking auth state
      await apiService.loadTokens();
      
      // Check for tokens first - if tokens exist, we should be authenticated
      const accessToken = await storage.getItem('access_token');
      const refreshToken = await storage.getItem('refresh_token');
      
      console.log('Tokens check - access_token exists:', !!accessToken, 'refresh_token exists:', !!refreshToken);
      
      // Load user state from AsyncStorage
      const authStateJson = await storage.getItem('authState');
      
      console.log('Loading auth state, has stored state:', !!authStateJson);
      
      // If we have tokens, try to restore user
      if (accessToken && refreshToken) {
        // If we have authState, use it immediately for faster UI
        if (authStateJson) {
          try {
            const authState = JSON.parse(authStateJson);
            if (authState.user) {
              console.log('Found stored user:', authState.user.email);
              // Restore user state immediately for faster UI
              set({user: authState.user, isAuthenticated: true, isLoading: false});
              
              // Verify tokens are still valid by trying to get profile (in background)
              try {
                const profileResponse = await apiService.getProfile();
                const profileData = profileResponse.data || profileResponse;
                if (profileData && (profileData.id || profileData.email)) {
                  // Tokens are valid, update user with latest profile data
                  const updatedUser = {
                    ...authState.user,
                    name: profileData.name || profileData.first_name || authState.user.name,
                    phone: profileData.phone || authState.user.phone,
                    plan: profileData.is_premium || profileData.plantype === 'premium' ? 'premium' : 'free',
                  };
                  set({user: updatedUser, isAuthenticated: true, isLoading: false});
                  await storage.setItem('authState', JSON.stringify({user: updatedUser}));
                  console.log('Auth state verified and updated');
                } else {
                  console.warn('Profile response format unexpected, keeping cached user');
                }
              } catch (error: any) {
                // If profile fetch fails, check if it's a 401 (unauthorized)
                if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
                  // Tokens expired, clear auth state
                  console.warn('Tokens expired, clearing auth state');
                  await apiService.clearTokens();
                  await storage.removeItem('authState');
                  set({user: null, isAuthenticated: false, isLoading: false});
                } else {
                  // Network error or other issue, keep user logged in with cached data
                  console.warn('Failed to verify tokens, keeping cached user:', error?.message);
                  // Keep the user logged in with cached data - don't change isLoading here
                }
              }
              return; // Exit early if we restored from authState
            }
          } catch (parseError) {
            console.error('Error parsing auth state:', parseError);
            // If parsing fails, try to restore from tokens
          }
        }
        
        // No valid authState, but we have tokens - try to restore from API
        console.log('Found tokens but no valid authState, attempting to restore user from API');
        try {
          const profileResponse = await apiService.getProfile();
          const profileData = profileResponse.data || profileResponse;
          if (profileData && (profileData.id || profileData.email)) {
            const user = convertApiUserToUser(profileData);
            set({user, isAuthenticated: true, isLoading: false});
            await storage.setItem('authState', JSON.stringify({user}));
            console.log('User restored from tokens via API');
            return;
          }
        } catch (error: any) {
          // If profile fetch fails, check if it's a 401 (unauthorized)
          if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
            // Tokens expired, clear auth state
            console.warn('Tokens expired, clearing auth state');
            await apiService.clearTokens();
            await storage.removeItem('authState');
            set({user: null, isAuthenticated: false, isLoading: false});
            return;
          } else {
            // Network error - keep tokens but show as not authenticated
            console.warn('Failed to verify tokens (network error):', error?.message);
            set({user: null, isAuthenticated: false, isLoading: false});
            return;
          }
        }
      }
      
      // No tokens found - user is not authenticated
      console.log('No tokens found, user not authenticated');
      await storage.removeItem('authState'); // Clear any stale authState
      set({user: null, isAuthenticated: false, isLoading: false});
    } catch (error) {
      console.error('Failed to load auth state:', error);
      set({user: null, isAuthenticated: false, isLoading: false});
    }
  },
  refreshProfile: async () => {
    try {
      const profileResponse = await apiService.getProfile();
      const profileData = profileResponse.data || profileResponse;
      if (profileData && (profileData.id || profileData.email)) {
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            name: profileData.name || currentUser.name,
            phone: profileData.phone || currentUser.phone,
            plan: profileData.is_premium || profileData.plantype === 'premium' ? 'premium' : 'free',
          };
          set({user: updatedUser});
          const storage = await getStorage();
        await storage.setItem('authState', JSON.stringify({user: updatedUser}));
        }
      }
    } catch (error) {
      console.warn('Failed to refresh profile:', error);
    }
  },
}));

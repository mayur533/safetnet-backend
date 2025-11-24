// Import AsyncStorage with error handling and debug logging
import { NativeModules, TurboModuleRegistry } from 'react-native';

let AsyncStorage: any;

// Debug: Check what's available
console.log('Checking AsyncStorage availability...');
console.log('TurboModuleRegistry available:', !!TurboModuleRegistry);
console.log('NativeModules available:', !!NativeModules);
if (TurboModuleRegistry) {
  console.log('Trying TurboModuleRegistry.get("RNCAsyncStorage"):', TurboModuleRegistry.get("RNCAsyncStorage"));
}
if (NativeModules) {
  console.log('NativeModules.RNCAsyncStorage:', NativeModules.RNCAsyncStorage);
  console.log('All NativeModules keys:', Object.keys(NativeModules).filter(k => k.includes('Async') || k.includes('Storage')));
}

try {
  const module = require('@react-native-async-storage/async-storage');
  AsyncStorage = module.default || module;
  console.log('AsyncStorage from require:', !!AsyncStorage, typeof AsyncStorage);
  
  // If AsyncStorage is null/undefined, the native module isn't registered
  if (!AsyncStorage) {
    console.warn('AsyncStorage module is null - native module not registered');
    // Try direct access to NativeModules
    const RNCAsyncStorage = NativeModules.RNCAsyncStorage || NativeModules.RNC_AsyncSQLiteDBStorage;
    if (RNCAsyncStorage) {
      console.log('Found AsyncStorage in NativeModules, creating wrapper');
      // Create a wrapper around the native module
      AsyncStorage = {
        getItem: (key: string) => new Promise((resolve, reject) => {
          RNCAsyncStorage.multiGet([key], (errors: any, result: any) => {
            if (errors) {
              reject(errors[0]);
            } else {
              resolve(result && result[0] ? result[0][1] : null);
            }
          });
        }),
        setItem: (key: string, value: string) => new Promise((resolve, reject) => {
          RNCAsyncStorage.multiSet([[key, value]], (errors: any) => {
            if (errors) {
              reject(errors[0]);
            } else {
              resolve();
            }
          });
        }),
        removeItem: (key: string) => new Promise((resolve, reject) => {
          RNCAsyncStorage.multiRemove([key], (errors: any) => {
            if (errors) {
              reject(errors[0]);
            } else {
              resolve();
            }
          });
        }),
        clear: () => new Promise((resolve, reject) => {
          RNCAsyncStorage.clear((error: any) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        }),
      };
    } else {
      throw new Error('AsyncStorage native module not found in TurboModuleRegistry or NativeModules');
    }
  }
} catch (e) {
  console.error('Failed to import AsyncStorage:', e);
  // Create a mock AsyncStorage that won't crash
  AsyncStorage = {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
    clear: async () => {},
  };
}

import {create} from 'zustand';
import {User} from '../models/user.types';
import {apiService, LoginResponse} from '../services/apiService';
import {useContactStore} from './contactStore';
import {useCheckInStore} from './checkInStore';
import {useLiveTrackingStore} from './liveTrackingStore';
import {useIncidentStore} from './incidentStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
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
  useCheckInStore.getState().reset();
  useLiveTrackingStore.getState().reset();
  useIncidentStore.getState().clearIncidents();
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
        set({user: updatedUser, isAuthenticated: true});
        await AsyncStorage.setItem('authState', JSON.stringify({user: updatedUser}));
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
        
        await AsyncStorage.setItem('authState', JSON.stringify({user}));
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
    set({user: testUser, isAuthenticated: true});
    await AsyncStorage.setItem('authState', JSON.stringify({user: testUser}));
  },
  setPlan: async (plan: 'free' | 'premium') => {
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      const updatedUser = {...currentUser, plan};
      set({user: updatedUser});
      await AsyncStorage.setItem('authState', JSON.stringify({user: updatedUser}));
    }
  },
  logout: async () => {
    resetUserScopedData();
    await apiService.clearTokens();
    set({user: null, isAuthenticated: false});
    await AsyncStorage.removeItem('authState');
  },
  load: async () => {
    try {
      // Load tokens first
      await apiService.loadTokens();
      
      // Load user state from AsyncStorage
      const authStateJson = await AsyncStorage.getItem('authState');
      if (authStateJson) {
        const authState = JSON.parse(authStateJson);
        if (authState.user) {
          // Restore user state immediately for faster UI
          set({user: authState.user, isAuthenticated: true});
          
          // Verify tokens are still valid by trying to get profile (in background)
          try {
            const profileResponse = await apiService.getProfile();
            // Profile response can be direct data or wrapped in data property
            const profileData = profileResponse.data || profileResponse;
            if (profileData && (profileData.id || profileData.email)) {
              // Tokens are valid, update user with latest profile data
              const updatedUser = {
                ...authState.user,
                name: profileData.name || authState.user.name,
                phone: profileData.phone || authState.user.phone,
                plan: profileData.is_premium || profileData.plantype === 'premium' ? 'premium' : 'free',
              };
              set({user: updatedUser, isAuthenticated: true});
              await AsyncStorage.setItem('authState', JSON.stringify({user: updatedUser}));
            } else {
              // Profile response invalid, but keep user logged in if tokens exist
              console.warn('Profile response format unexpected, keeping cached user');
            }
          } catch (error: any) {
            // If profile fetch fails, check if it's a 401 (unauthorized)
            if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
              // Tokens expired, clear auth state
              console.warn('Tokens expired, clearing auth state');
              await apiService.clearTokens();
              await AsyncStorage.removeItem('authState');
              set({user: null, isAuthenticated: false});
            } else {
              // Network error or other issue, keep user logged in with cached data
              console.warn('Failed to verify tokens, keeping cached user:', error?.message);
            }
          }
        } else {
          // No user in stored state, check if we have tokens
          const hasTokens = await AsyncStorage.getItem('access_token');
          if (!hasTokens) {
            set({user: null, isAuthenticated: false});
          }
        }
      } else {
        // No stored auth state, check if we have tokens (might be from previous session)
        const hasTokens = await AsyncStorage.getItem('access_token');
        if (hasTokens) {
          // Try to get profile with existing tokens
          try {
            const profileResponse = await apiService.getProfile();
            const profileData = profileResponse.data || profileResponse;
            if (profileData && (profileData.id || profileData.email)) {
              const user = convertApiUserToUser(profileData);
              set({user, isAuthenticated: true});
              await AsyncStorage.setItem('authState', JSON.stringify({user}));
            }
          } catch (error) {
            // Tokens invalid, clear them
            await apiService.clearTokens();
            set({user: null, isAuthenticated: false});
          }
        } else {
          set({user: null, isAuthenticated: false});
        }
      }
    } catch (error) {
      console.warn('Failed to load auth state:', error);
      set({user: null, isAuthenticated: false});
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
          await AsyncStorage.setItem('authState', JSON.stringify({user: updatedUser}));
        }
      }
    } catch (error) {
      console.warn('Failed to refresh profile:', error);
    }
  },
}));

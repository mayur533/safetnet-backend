/**
 * AsyncStorage initialization utility
 * Handles the case where AsyncStorage TurboModule might not be ready immediately
 */

import { NativeModules, TurboModuleRegistry } from 'react-native';

let AsyncStorage: any = null;
let initializationPromise: Promise<any> | null = null;

const MAX_RETRIES = 10;
const RETRY_DELAY = 100; // ms

/**
 * Wait for AsyncStorage to be available
 */
const waitForAsyncStorage = async (retries = 0): Promise<any> => {
  // Try to get the module
  try {
    const module = require('@react-native-async-storage/async-storage');
    const storage = module.default || module;
    
    if (storage && typeof storage.getItem === 'function') {
      // Test if it's actually working (not null)
      try {
        // Try a simple operation to verify it's not a mock
        await storage.getItem('__test__');
        return storage;
      } catch (e) {
        // If test fails, it might still be initializing
      }
    }
  } catch (e) {
    // Module not loaded yet
  }

  // Try NativeModules fallback
  const RNCAsyncStorage = 
    NativeModules?.RNCAsyncStorage || 
    NativeModules?.RNC_AsyncSQLiteDBStorage ||
    (TurboModuleRegistry ? TurboModuleRegistry.get('RNCAsyncStorage') : null);

  if (RNCAsyncStorage) {
    // Create wrapper
    return {
      getItem: (key: string) => new Promise((resolve, reject) => {
        try {
          RNCAsyncStorage.multiGet([key], (errors: any, result: any) => {
            if (errors && errors[0]) {
              reject(errors[0]);
            } else {
              resolve(result && result[0] ? result[0][1] : null);
            }
          });
        } catch (e) {
          reject(e);
        }
      }),
      setItem: (key: string, value: string) => new Promise((resolve, reject) => {
        try {
          RNCAsyncStorage.multiSet([[key, value]], (errors: any) => {
            if (errors && errors[0]) {
              reject(errors[0]);
            } else {
              resolve();
            }
          });
        } catch (e) {
          reject(e);
        }
      }),
      removeItem: (key: string) => new Promise((resolve, reject) => {
        try {
          RNCAsyncStorage.multiRemove([key], (errors: any) => {
            if (errors && errors[0]) {
              reject(errors[0]);
            } else {
              resolve();
            }
          });
        } catch (e) {
          reject(e);
        }
      }),
      clear: () => new Promise((resolve, reject) => {
        try {
          RNCAsyncStorage.clear((error: any) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        } catch (e) {
          reject(e);
        }
      }),
    };
  }

  // If not ready and we have retries left, wait and retry
  if (retries < MAX_RETRIES) {
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    return waitForAsyncStorage(retries + 1);
  }

  // Final fallback - in-memory storage
  console.warn('⚠ AsyncStorage not available after retries. Using in-memory fallback.');
  const inMemoryStorage: { [key: string]: string } = {};
  return {
    getItem: async (key: string) => inMemoryStorage[key] || null,
    setItem: async (key: string, value: string) => { inMemoryStorage[key] = value; },
    removeItem: async (key: string) => { delete inMemoryStorage[key]; },
    clear: async () => { Object.keys(inMemoryStorage).forEach(k => delete inMemoryStorage[k]); },
  };
};

/**
 * Get AsyncStorage instance, initializing if necessary
 */
export const getAsyncStorage = async (): Promise<any> => {
  if (AsyncStorage) {
    return AsyncStorage;
  }

  if (initializationPromise) {
    AsyncStorage = await initializationPromise;
    return AsyncStorage;
  }

  initializationPromise = waitForAsyncStorage();
  AsyncStorage = await initializationPromise;
  return AsyncStorage;
};

/**
 * Synchronous getter (may return null if not initialized)
 * Use getAsyncStorage() for guaranteed initialization
 */
export const getAsyncStorageSync = (): any => {
  return AsyncStorage;
};





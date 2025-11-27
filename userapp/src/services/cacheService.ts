/**
 * Cache Service for API responses
 * Implements smart caching with data comparison to avoid unnecessary API calls
 */

import {getAsyncStorage} from '../utils/asyncStorageInit';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string; // Entity tag for comparison
  hash?: string; // Data hash for comparison
}

interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  compareByHash?: boolean; // Compare data by hash instead of etag
}

class CacheService {
  private cachePrefix = '@api_cache_';
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default

  /**
   * Generate a hash for data comparison
   */
  private generateHash(data: any): string {
    try {
      const str = JSON.stringify(data);
      // Simple hash function
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(36);
    } catch (error) {
      console.warn('Failed to generate hash:', error);
      return Date.now().toString();
    }
  }

  /**
   * Compare two data objects to check if they're different
   */
  private compareData(oldData: any, newData: any): boolean {
    try {
      const oldHash = this.generateHash(oldData);
      const newHash = this.generateHash(newData);
      return oldHash === newHash;
    } catch (error) {
      console.warn('Failed to compare data:', error);
      return false; // If comparison fails, assume data is different
    }
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const storage = await getAsyncStorage();
      if (!storage) {
        console.warn(`AsyncStorage not available for key ${key}`);
        return null;
      }
      
      const cacheKey = `${this.cachePrefix}${key}`;
      const cached = await storage.getItem(cacheKey);
      if (!cached) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired
      if (entry.timestamp && (now - entry.timestamp) > this.defaultTTL) {
        // Cache expired, but return it anyway (stale-while-revalidate pattern)
        return entry.data;
      }

      return entry.data;
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      // Don't log as error if it's just a missing key
      if (!errorMessage.includes('not found') && !errorMessage.includes('does not exist')) {
        console.warn(`Failed to get cache for key ${key}:`, errorMessage);
      }
      return null;
    }
  }

  /**
   * Set cached data
   */
  async set<T>(key: string, data: T, config?: CacheConfig): Promise<void> {
    try {
      const storage = await getAsyncStorage();
      if (!storage) {
        console.warn(`AsyncStorage not available for setting key ${key}`);
        return;
      }
      
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        hash: config?.compareByHash ? this.generateHash(data) : undefined,
      };

      await storage.setItem(
        `${this.cachePrefix}${key}`,
        JSON.stringify(entry)
      );
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      // Only log if it's not a simple storage unavailable error
      if (!errorMessage.includes('not available')) {
        console.warn(`Failed to set cache for key ${key}:`, errorMessage);
      }
    }
  }

  /**
   * Check if data has changed compared to cached version
   * Returns true if data is different or cache doesn't exist
   */
  async hasChanged<T>(key: string, newData: T): Promise<boolean> {
    try {
      const cached = await this.get<T>(key);
      if (!cached) {
        return true; // No cache, data is "changed"
      }

      return !this.compareData(cached, newData);
    } catch (error) {
      console.warn(`Failed to check cache change for key ${key}:`, error);
      return true; // Assume changed if check fails
    }
  }

  /**
   * Get cached data with metadata
   */
  async getWithMetadata<T>(key: string): Promise<{data: T | null; timestamp: number | null; isStale: boolean}> {
    try {
      const storage = await getAsyncStorage();
      const cached = await storage.getItem(`${this.cachePrefix}${key}`);
      if (!cached) {
        return {data: null, timestamp: null, isStale: false};
      }

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();
      const isStale = entry.timestamp ? (now - entry.timestamp) > this.defaultTTL : false;

      return {
        data: entry.data,
        timestamp: entry.timestamp,
        isStale,
      };
    } catch (error) {
      console.warn(`Failed to get cache metadata for key ${key}:`, error);
      return {data: null, timestamp: null, isStale: false};
    }
  }

  /**
   * Invalidate cache for a specific key
   */
  async invalidate(key: string): Promise<void> {
    try {
      const storage = await getAsyncStorage();
      await storage.removeItem(`${this.cachePrefix}${key}`);
    } catch (error) {
      console.warn(`Failed to invalidate cache for key ${key}:`, error);
    }
  }

  /**
   * Invalidate all cache
   */
  async clearAll(): Promise<void> {
    try {
      const storage = await getAsyncStorage();
      // Try to get all keys, fallback to manual removal if not available
      if (typeof storage.getAllKeys === 'function') {
        const keys = await storage.getAllKeys();
        const cacheKeys = keys.filter((key: string) => key.startsWith(this.cachePrefix));
        
        if (cacheKeys.length > 0) {
          if (typeof storage.multiRemove === 'function') {
            await storage.multiRemove(cacheKeys);
          } else {
            // Fallback: remove one by one
            for (const key of cacheKeys) {
              await storage.removeItem(key);
            }
          }
        }
      } else {
        // If getAllKeys is not available, we can't clear all - log warning
        console.warn('getAllKeys not available, cannot clear all cache');
      }
    } catch (error) {
      console.warn('Failed to clear all cache:', error);
    }
  }

  /**
   * Get or fetch data with caching
   * Fetches from API only if cache is missing, expired, or data has changed
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    config?: CacheConfig
  ): Promise<T> {
    try {
      // Try to get cached data
      const cached = await this.get<T>(key);
      const metadata = await this.getWithMetadata<T>(key);

      // If we have fresh cache, return it
      if (cached && !metadata.isStale) {
        // Check if data has changed in background (stale-while-revalidate)
        fetchFn().then(async (newData) => {
          const hasChanged = await this.hasChanged(key, newData);
          if (hasChanged) {
            await this.set(key, newData, config);
          }
        }).catch(() => {
          // Silently fail background refresh
        });

        return cached;
      }

      // Fetch fresh data
      const freshData = await fetchFn();

      // Check if data has actually changed
      if (cached) {
        const hasChanged = await this.hasChanged(key, freshData);
        if (!hasChanged) {
          // Data hasn't changed, just update timestamp
          await this.set(key, cached, config);
          return cached;
        }
      }

      // Data is new or changed, update cache
      await this.set(key, freshData, config);
      return freshData;
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      
      // Check if it's a network error
      const isNetworkError = errorMessage && (
        errorMessage.includes('Network request failed') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('timeout') ||
        errorMessage.toLowerCase().includes('network') ||
        errorMessage.includes('connection')
      );
      
      // Check if it's an AsyncStorage error
      const isStorageError = errorMessage && (
        errorMessage.includes('AsyncStorage') ||
        errorMessage.includes('storage') ||
        errorMessage.includes('key') && errorMessage.includes('fetch')
      );
      
      // If it's a 404 (not found) error, clear the cache for that key
      if (errorMessage?.includes('404') || 
          errorMessage?.includes('not found') ||
          errorMessage?.includes('Group not found') ||
          errorMessage?.includes('group not found')) {
        console.warn(`Resource not found for key ${key}, clearing cache`);
        await this.invalidate(key);
        throw error; // Re-throw to let the caller handle it
      }
      
      // If fetch fails due to network error, try to return stale cache
      try {
      const cached = await this.get<T>(key);
      if (cached) {
          console.warn(`Returning stale cache for key ${key} due to ${isNetworkError ? 'network' : isStorageError ? 'storage' : ''} error`);
        return cached;
        }
      } catch (cacheError) {
        // Ignore cache retrieval errors
      }
      
      // If it's a storage error, provide helpful message
      if (isStorageError) {
        console.warn(`Storage error for key ${key}, attempting direct fetch:`, errorMessage);
        // Try to fetch directly without caching
        try {
          return await fetchFn();
        } catch (fetchError) {
          // If direct fetch also fails, throw the original error
          throw error;
        }
      }
      
      // If it's a network error and no cache, throw a more helpful error
      if (isNetworkError) {
        const networkError = new Error('Network request failed. Please check your internet connection and ensure the backend server is running.');
        (networkError as any).isNetworkError = true;
        throw networkError;
      }
      
      throw error;
    }
  }
}

export const cacheService = new CacheService();
export type {CacheConfig};


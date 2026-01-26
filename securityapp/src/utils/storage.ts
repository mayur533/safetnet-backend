import AsyncStorage from '@react-native-async-storage/async-storage';
import { constants } from './constants';

export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error storing data:', error);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error retrieving data:', error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing data:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },

  // Convenience methods for common keys
  async setAuthToken(token: string): Promise<void> {
    return this.setItem(constants.STORAGE_KEYS.AUTH_TOKEN, token);
  },

  async getAuthToken(): Promise<string | null> {
    return this.getItem(constants.STORAGE_KEYS.AUTH_TOKEN);
  },

  async setUserId(userId: string): Promise<void> {
    return this.setItem(constants.STORAGE_KEYS.USER_ID, userId);
  },

  async getUserId(): Promise<string | null> {
    return this.getItem(constants.STORAGE_KEYS.USER_ID);
  },
};
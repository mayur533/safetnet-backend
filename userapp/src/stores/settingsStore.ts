import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  shakeToSendSOS: boolean;
  setShakeToSendSOS: (enabled: boolean) => void;
  loadSettings: () => Promise<void>;
}

const STORAGE_KEY = 'shakeToSendSOS';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  shakeToSendSOS: false,
  setShakeToSendSOS: async (enabled: boolean) => {
    set({shakeToSendSOS: enabled});
    // Persist to AsyncStorage
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(enabled));
    } catch (error) {
      console.error('Error saving shakeToSendSOS setting:', error);
    }
  },
  loadSettings: async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      if (value !== null) {
        const enabled = JSON.parse(value);
        set({shakeToSendSOS: enabled});
      }
    } catch (error) {
      console.error('Error loading shakeToSendSOS setting:', error);
    }
  },
}));


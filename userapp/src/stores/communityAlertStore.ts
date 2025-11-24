import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';

export interface CommunityAlertRecord {
  id: string;
  message: string;
  radiusMeters: number;
  delivered: boolean;
  createdAt: number;
}

interface CommunityAlertState {
  alerts: CommunityAlertRecord[];
  loaded: boolean;
  load: () => Promise<void>;
  addAlert: (alert: Omit<CommunityAlertRecord, 'id' | 'createdAt'>) => Promise<void>;
  clear: () => Promise<void>;
}

const STORAGE_KEY = '@community-alerts';
const MAX_ALERTS = 20;

const persistAlerts = async (alerts: CommunityAlertRecord[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch (error) {
    console.warn('Failed to persist community alerts', error);
  }
};

export const useCommunityAlertStore = create<CommunityAlertState>((set, get) => ({
  alerts: [],
  loaded: false,
  load: async () => {
    if (get().loaded) {
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        set({alerts: [], loaded: true});
        return;
      }
      const parsed: CommunityAlertRecord[] = JSON.parse(raw);
      set({alerts: parsed, loaded: true});
    } catch (error) {
      console.warn('Failed to load community alerts', error);
      set({alerts: [], loaded: true});
    }
  },
  addAlert: async ({message, radiusMeters, delivered}) => {
    const record: CommunityAlertRecord = {
      id: `${Date.now()}`,
      message,
      radiusMeters,
      delivered,
      createdAt: Date.now(),
    };
    const next = [record, ...get().alerts].slice(0, MAX_ALERTS);
    set({alerts: next});
    await persistAlerts(next);
  },
  clear: async () => {
    set({alerts: []});
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear community alerts', error);
    }
  },
}));



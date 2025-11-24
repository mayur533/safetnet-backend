import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface LiveShareSession {
  startedAt: number;
  durationMinutes: number;
  initialLocation: LatLng;
}

interface LiveShareState {
  session: LiveShareSession | null;
  isSharing: boolean;
  load: () => Promise<void>;
  startSession: (session: LiveShareSession) => Promise<void>;
  stopSession: () => Promise<void>;
}

const STORAGE_KEY = '@live-share-session';

const isExpired = (session: LiveShareSession | null) => {
  if (!session) {
    return true;
  }
  const expiresAt = session.startedAt + session.durationMinutes * 60 * 1000;
  return Date.now() >= expiresAt;
};

export const useLiveShareStore = create<LiveShareState>((set, get) => ({
  session: null,
  isSharing: false,
  load: async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      if (!value) {
        set({session: null, isSharing: false});
        return;
      }
      const parsed: LiveShareSession = JSON.parse(value);
      if (isExpired(parsed)) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        set({session: null, isSharing: false});
        return;
      }
      set({session: parsed, isSharing: true});
    } catch (error) {
      console.warn('Failed to load live share session', error);
      set({session: null, isSharing: false});
    }
  },
  startSession: async (session) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.warn('Failed to persist live share session', error);
    }
    set({session, isSharing: true});
  },
  stopSession: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to remove live share session', error);
    }
    set({session: null, isSharing: false});
  },
}));

export const getRemainingShareSeconds = (session: LiveShareSession | null) => {
  if (!session) {
    return 0;
  }
  const expiresAt = session.startedAt + session.durationMinutes * 60 * 1000;
  return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
};




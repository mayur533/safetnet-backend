import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {nanoid} from '../utils/id';

export type CheckInFrequency = 180 | 360 | 720 | 1440; // minutes

export interface CheckIn {
  id: string;
  label: string;
  contactIds: string[];
  frequencyMinutes: CheckInFrequency;
  nextTriggerAt: number;
  awaitingResponse: boolean;
  lastReminderSentAt?: number;
  reminderAttempts: number;
  lastCompletedAt?: number;
  createdAt: number;
  enabled: boolean;
}

interface CheckInState {
  checkIns: CheckIn[];
  loaded: boolean;
  load: () => Promise<void>;
  addCheckIn: (payload: {
    label: string;
    contactIds: string[];
    frequencyMinutes: CheckInFrequency;
  }) => Promise<void>;
  updateCheckIn: (id: string, updates: Partial<Omit<CheckIn, 'id' | 'createdAt'>>) => Promise<void>;
  removeCheckIn: (id: string) => Promise<void>;
  markCompleted: (id: string) => Promise<void>;
  snoozeCheckIn: (id: string, minutes: number) => Promise<void>;
  setAwaitingResponse: (id: string, awaiting: boolean) => Promise<void>;
  recordReminderSent: (id: string) => Promise<void>;
  getCheckInById: (id: string) => CheckIn | undefined;
  getDueCheckIns: () => CheckIn[];
  reset: () => void;
}

const calculateNextTrigger = (frequencyMinutes: number) => Date.now() + frequencyMinutes * 60 * 1000;
const STORAGE_KEY = '@trusted-checkins';

const persistCheckIns = async (items: CheckIn[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn('Failed to persist trusted check-ins', error);
  }
};

export const useCheckInStore = create<CheckInState>((set, get) => ({
  checkIns: [],
  loaded: false,
  load: async () => {
    if (get().loaded) {
      return;
    }
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) {
        set({checkIns: [], loaded: true});
        return;
      }
      const parsed: CheckIn[] = JSON.parse(stored);
      set({checkIns: parsed, loaded: true});
    } catch (error) {
      console.warn('Failed to load trusted check-ins', error);
      set({checkIns: [], loaded: true});
    }
  },
  addCheckIn: async ({label, contactIds, frequencyMinutes}) => {
    const checkIn: CheckIn = {
      id: nanoid(),
      label: label.trim(),
      contactIds,
      frequencyMinutes,
      nextTriggerAt: calculateNextTrigger(frequencyMinutes),
      awaitingResponse: false,
      reminderAttempts: 0,
      createdAt: Date.now(),
      enabled: true,
    };
    const updated = [...get().checkIns, checkIn];
    set({checkIns: updated});
    await persistCheckIns(updated);
  },
  updateCheckIn: async (id, updates) => {
    const updated = get().checkIns.map((checkIn) => {
      if (checkIn.id !== id) {
        return checkIn;
      }
      const nextTriggerAt = updates.frequencyMinutes
        ? calculateNextTrigger(updates.frequencyMinutes)
        : checkIn.nextTriggerAt;
      return {
        ...checkIn,
        ...updates,
        nextTriggerAt,
      };
    });
    set({checkIns: updated});
    await persistCheckIns(updated);
  },
  removeCheckIn: async (id) => {
    const updated = get().checkIns.filter((checkIn) => checkIn.id !== id);
    set({checkIns: updated});
    await persistCheckIns(updated);
  },
  markCompleted: async (id) => {
    const updated = get().checkIns.map((checkIn) => {
      if (checkIn.id !== id) {
        return checkIn;
      }
      return {
        ...checkIn,
        lastCompletedAt: Date.now(),
        nextTriggerAt: calculateNextTrigger(checkIn.frequencyMinutes),
        awaitingResponse: false,
        reminderAttempts: 0,
        lastReminderSentAt: undefined,
      };
    });
    set({checkIns: updated});
    await persistCheckIns(updated);
  },
  snoozeCheckIn: async (id, minutes) => {
    const updated = get().checkIns.map((checkIn) => {
      if (checkIn.id !== id) {
        return checkIn;
      }
      return {
        ...checkIn,
        nextTriggerAt: Date.now() + minutes * 60 * 1000,
        awaitingResponse: false,
        reminderAttempts: 0,
      };
    });
    set({checkIns: updated});
    await persistCheckIns(updated);
  },
  setAwaitingResponse: async (id, awaiting) => {
    const updated = get().checkIns.map((checkIn) =>
      checkIn.id === id
        ? {
            ...checkIn,
            awaitingResponse: awaiting,
          }
        : checkIn,
    );
    set({checkIns: updated});
    await persistCheckIns(updated);
  },
  recordReminderSent: async (id) => {
    const now = Date.now();
    const updated = get().checkIns.map((checkIn) =>
      checkIn.id === id
        ? {
            ...checkIn,
            awaitingResponse: true,
            lastReminderSentAt: now,
            reminderAttempts: checkIn.reminderAttempts + 1,
          }
        : checkIn,
    );
    set({checkIns: updated});
    await persistCheckIns(updated);
  },
  getCheckInById: (id) => get().checkIns.find((checkIn) => checkIn.id === id),
  getDueCheckIns: () => {
    const now = Date.now();
    return get().checkIns.filter(
      (checkIn) => checkIn.enabled && !checkIn.awaitingResponse && now >= checkIn.nextTriggerAt,
    );
  },
  reset: () => {
    set({checkIns: [], loaded: false});
    void AsyncStorage.removeItem(STORAGE_KEY).catch((error) => {
      console.warn('Failed to clear trusted check-ins', error);
    });
  },
}));


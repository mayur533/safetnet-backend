import {getAsyncStorage} from '../utils/asyncStorageInit';
import {Alert} from 'react-native';
import {create} from 'zustand';
import {sendSmsDirect} from '../services/smsService';

export interface PendingSosMessage {
  id: string;
  message: string;
  recipients: string[];
  createdAt: number;
  attempts: number;
}

interface OfflineSosState {
  loaded: boolean;
  pending: PendingSosMessage[];
  load: () => Promise<void>;
  enqueue: (input: {message: string; recipients: string[]}) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  flushPending: () => Promise<{sent: number; remaining: number}>;
}

const STORAGE_KEY = '@offline-sos-queue';

const persistQueue = async (queue: PendingSosMessage[]) => {
  try {
    const storage = await getAsyncStorage();
    await storage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn('Failed to persist SOS queue', error);
  }
};

export const useOfflineSosStore = create<OfflineSosState>((set, get) => ({
  loaded: false,
  pending: [],
  load: async () => {
    if (get().loaded) {
      return;
    }
    try {
      const storage = await getAsyncStorage();
      const raw = await storage.getItem(STORAGE_KEY);
      if (!raw) {
        set({loaded: true, pending: []});
        return;
      }
      const parsed: PendingSosMessage[] = JSON.parse(raw);
      set({pending: parsed, loaded: true});
    } catch (error) {
      console.warn('Failed to load SOS queue', error);
      set({pending: [], loaded: true});
    }
  },
  enqueue: async ({message, recipients}) => {
    const trimmedRecipients = recipients.map((r) => r.trim()).filter(Boolean);
    if (trimmedRecipients.length === 0) {
      return;
    }
    const entry: PendingSosMessage = {
      id: `${Date.now()}`,
      message,
      recipients: trimmedRecipients,
      createdAt: Date.now(),
      attempts: 0,
    };
    const current = get().pending;
    const next = [...current, entry].slice(-20);
    set({pending: next});
    await persistQueue(next);
    Alert.alert(
      'Saved for later',
      'No signal detected. Your SOS message will be retried when connectivity returns.',
    );
  },
  remove: async (id) => {
    const next = get().pending.filter((item) => item.id !== id);
    set({pending: next});
    await persistQueue(next);
  },
  clear: async () => {
    set({pending: []});
    try {
      const storage = await getAsyncStorage();
      await storage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear SOS queue', error);
    }
  },
  flushPending: async () => {
    const queue = get().pending;
    if (queue.length === 0) {
      return {sent: 0, remaining: 0};
    }
    let sent = 0;
    const remaining: PendingSosMessage[] = [];

    for (const item of queue) {
      try {
        const success = await sendSmsDirect(item.recipients, item.message);
        if (success) {
          sent += 1;
        } else {
          remaining.push({
            ...item,
            attempts: item.attempts + 1,
          });
        }
      } catch (error) {
        console.warn('SOS queue flush failed for item', item.id, error);
        remaining.push({
          ...item,
          attempts: item.attempts + 1,
        });
      }
    }

    set({pending: remaining});
    await persistQueue(remaining);
    if (sent > 0) {
      Alert.alert('SOS sent', `${sent} pending SOS message(s) were sent successfully.`);
    }
    return {sent, remaining: remaining.length};
  },
}));



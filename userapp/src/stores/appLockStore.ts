import {getAsyncStorage} from '../utils/asyncStorageInit';
import {create} from 'zustand';

export type AppLockType = 'alphanumeric' | 'pin';

interface AppLockState {
  enabled: boolean;
  lockType: AppLockType;
  password?: string;
  locked: boolean;
  initialized: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
  setLockType: (type: AppLockType) => Promise<void>;
  setPassword: (password?: string) => Promise<void>;
  clearPassword: () => Promise<void>;
  setLocked: (locked: boolean) => void;
  verifyPassword: (value: string) => boolean;
  load: () => Promise<void>;
}

const STORAGE_KEY = 'appLockSettings';

interface StoredAppLock {
  enabled: boolean;
  lockType: AppLockType;
  password?: string;
}

const readStoredSettings = async (): Promise<StoredAppLock | undefined> => {
  try {
    const storage = await getAsyncStorage();
    const value = await storage.getItem(STORAGE_KEY);
    if (!value) {
      return undefined;
    }
    const parsed = JSON.parse(value) as StoredAppLock;
    if (typeof parsed.enabled !== 'boolean') {
      return undefined;
    }
    const lockType: AppLockType = parsed.lockType === 'alphanumeric' ? 'alphanumeric' : 'pin';
    return {
      enabled: parsed.enabled,
      lockType,
      password: typeof parsed.password === 'string' && parsed.password.length > 0 ? parsed.password : undefined,
    };
  } catch (error) {
    console.error('Failed to load app lock settings:', error);
    return undefined;
  }
};

const persistSettings = async (settings: StoredAppLock) => {
  try {
    const storage = await getAsyncStorage();
    await storage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to persist app lock settings:', error);
  }
};

export const useAppLockStore = create<AppLockState>((set, get) => ({
  enabled: false,
  lockType: 'pin',
  password: undefined,
  locked: false,
  initialized: false,
  setEnabled: async (enabled) => {
    const {lockType, password} = get();
    set({enabled, locked: enabled ? get().locked : false});
    await persistSettings({enabled, lockType, password});
  },
  setLockType: async (type) => {
    const {enabled, password} = get();
    set({lockType: type});
    await persistSettings({enabled, lockType: type, password});
  },
  setPassword: async (password) => {
    const {enabled, lockType} = get();
    const safePassword = password && password.length > 0 ? password : undefined;
    set({password: safePassword});
    await persistSettings({enabled, lockType, password: safePassword});
  },
  clearPassword: async () => {
    const {enabled, lockType} = get();
    set({password: undefined});
    await persistSettings({enabled, lockType, password: undefined});
  },
  setLocked: (locked: boolean) => {
    set({locked});
  },
  verifyPassword: (value: string) => {
    const {password} = get();
    const isValid = password ? password === value : true;
    if (isValid) {
      set({locked: false});
    }
    return isValid;
  },
  load: async () => {
    const stored = await readStoredSettings();
    if (stored) {
      set({
        enabled: stored.enabled,
        lockType: stored.lockType,
        password: stored.password,
        locked: stored.enabled,
        initialized: true,
      });
      return;
    }
    set({initialized: true});
  },
}));


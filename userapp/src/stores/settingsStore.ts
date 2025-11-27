import {create} from 'zustand';
import {getAsyncStorage} from '../utils/asyncStorageInit';

export type ThemeMode = 'light' | 'dark' | 'system';
export type SosAudience = 'family' | 'police' | 'security';

export const DEFAULT_SOS_MESSAGES: Record<SosAudience, string> = {
  family: 'Emergency SOS! Please reach me immediately and share this with others.',
  police: 'Emergency in progress. Please dispatch officers to my location immediately.',
  security: 'Security alert! I need assistance at my current position right away.',
};

export const DEFAULT_SOS_TEMPLATE = DEFAULT_SOS_MESSAGES.family;

type PersistedSettings = {
  shakeToSendSOS: boolean;
  themeMode: ThemeMode;
  sosMessages: Record<SosAudience, string>;
};

interface SettingsState extends PersistedSettings {
  sosMessageTemplate: string;
  setShakeToSendSOS: (enabled: boolean) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setSosMessage: (target: SosAudience, value: string) => Promise<void>;
  resetSosMessage: (target: SosAudience) => Promise<void>;
  loadSettings: () => Promise<void>;
}

const STORAGE_KEY = 'appSettings';
const LEGACY_SHAKE_KEY = 'shakeToSendSOS';

const getDefaultSettings = (): SettingsState => ({
  shakeToSendSOS: false,
  themeMode: 'system',
  sosMessages: {...DEFAULT_SOS_MESSAGES},
  sosMessageTemplate: DEFAULT_SOS_TEMPLATE,
  setShakeToSendSOS: async () => {},
  setThemeMode: async () => {},
  setSosMessage: async () => {},
  resetSosMessage: async () => {},
  loadSettings: async () => {},
});

const persistSettings = async (settings: PersistedSettings) => {
  try {
    const storage = await getAsyncStorage();
    await storage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

const buildPersistPayload = (state: SettingsState): PersistedSettings => ({
  shakeToSendSOS: state.shakeToSendSOS,
  themeMode: state.themeMode,
  sosMessages: state.sosMessages,
});

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...getDefaultSettings(),
  setShakeToSendSOS: async (enabled: boolean) => {
    set({shakeToSendSOS: enabled});
    await persistSettings(buildPersistPayload(get()));
  },
  setThemeMode: async (mode: ThemeMode) => {
    set({themeMode: mode});
    await persistSettings(buildPersistPayload(get()));
  },
  setSosMessage: async (target: SosAudience, value: string) => {
    const sanitized = value.trim() || DEFAULT_SOS_MESSAGES[target];
    set((state) => {
      const updated = {...state.sosMessages, [target]: sanitized};
      return {
        sosMessages: updated,
        sosMessageTemplate: target === 'family' ? sanitized : state.sosMessageTemplate,
      };
    });
    await persistSettings(buildPersistPayload(get()));
  },
  resetSosMessage: async (target: SosAudience) => {
    set((state) => {
      const updated = {...state.sosMessages, [target]: DEFAULT_SOS_MESSAGES[target]};
      return {
        sosMessages: updated,
        sosMessageTemplate: target === 'family' ? DEFAULT_SOS_TEMPLATE : state.sosMessageTemplate,
      };
    });
    await persistSettings(buildPersistPayload(get()));
  },
  loadSettings: async () => {
    try {
      const storage = await getAsyncStorage();
      const value = await storage.getItem(STORAGE_KEY);
      if (value) {
        const parsed = JSON.parse(value);
        const storedMessages =
          parsed.sosMessages && typeof parsed.sosMessages === 'object'
            ? {...DEFAULT_SOS_MESSAGES, ...parsed.sosMessages}
            : {...DEFAULT_SOS_MESSAGES};
        set({
          shakeToSendSOS: typeof parsed.shakeToSendSOS === 'boolean' ? parsed.shakeToSendSOS : false,
          themeMode:
            parsed.themeMode === 'light' || parsed.themeMode === 'dark' || parsed.themeMode === 'system'
              ? parsed.themeMode
              : 'system',
          sosMessages: storedMessages,
          sosMessageTemplate: storedMessages.family || DEFAULT_SOS_TEMPLATE,
        });
        return;
      }

      // Legacy support for older shake-only storage
      const legacyShakeValue = await storage.getItem(LEGACY_SHAKE_KEY);
      if (legacyShakeValue !== null) {
        const shakeEnabled = JSON.parse(legacyShakeValue);
        set((state) => ({
          shakeToSendSOS: !!shakeEnabled,
          sosMessageTemplate: state.sosMessages.family,
        }));
        await persistSettings(buildPersistPayload(get()));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  },
}));

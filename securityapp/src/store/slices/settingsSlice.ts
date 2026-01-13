import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
  themeMode: ThemeMode;
  language: 'en' | 'es' | 'fr';
  notificationsEnabled: boolean;
  locationTrackingEnabled: boolean;
  notificationPermissionGranted: boolean;
  autoRefreshInterval: number; // in seconds
  onDuty: boolean;
}

const initialState: SettingsState = {
  themeMode: 'system',
  language: 'en',
  notificationsEnabled: true,
  locationTrackingEnabled: true,
  notificationPermissionGranted: false,
  autoRefreshInterval: 30,
  onDuty: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      state.themeMode = action.payload;
    },
    setLanguage: (state, action: PayloadAction<'en' | 'es' | 'fr'>) => {
      state.language = action.payload;
    },
    toggleNotifications: (state) => {
      state.notificationsEnabled = !state.notificationsEnabled;
    },
    toggleLocationTracking: (state) => {
      state.locationTrackingEnabled = !state.locationTrackingEnabled;
    },
    setAutoRefreshInterval: (state, action: PayloadAction<number>) => {
      state.autoRefreshInterval = action.payload;
    },
    setOnDuty: (state, action: PayloadAction<boolean>) => {
      state.onDuty = action.payload;
    },
    setNotificationPermissionGranted: (state, action: PayloadAction<boolean>) => {
      state.notificationPermissionGranted = action.payload;
    },
  },
});

export const {
  setThemeMode,
  setLanguage,
  toggleNotifications,
  toggleLocationTracking,
  setNotificationPermissionGranted,
  setAutoRefreshInterval,
  setOnDuty,
} = settingsSlice.actions;

export default settingsSlice.reducer;
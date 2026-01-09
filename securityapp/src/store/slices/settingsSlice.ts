import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  isDarkMode: boolean;
  language: 'en' | 'es' | 'fr';
  notificationsEnabled: boolean;
  locationTrackingEnabled: boolean;
  autoRefreshInterval: number; // in seconds
}

const initialState: SettingsState = {
  isDarkMode: false,
  language: 'en',
  notificationsEnabled: true,
  locationTrackingEnabled: true,
  autoRefreshInterval: 30,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.isDarkMode = !state.isDarkMode;
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
  },
});

export const {
  toggleDarkMode,
  setLanguage,
  toggleNotifications,
  toggleLocationTracking,
  setAutoRefreshInterval,
} = settingsSlice.actions;

export default settingsSlice.reducer;
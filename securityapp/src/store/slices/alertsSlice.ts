import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Alert } from '../../types/alert.types';

interface AlertsState {
  alerts: Alert[];
  activeAlert: Alert | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: AlertsState = {
  alerts: [],
  activeAlert: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    fetchAlertsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchAlertsSuccess: (state, action: PayloadAction<Alert[]>) => {
      state.alerts = action.payload;
      state.isLoading = false;
      state.error = null;
      state.lastUpdated = new Date().toISOString();
    },
    fetchAlertsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    setActiveAlert: (state, action: PayloadAction<Alert | null>) => {
      state.activeAlert = action.payload;
    },
    updateAlert: (state, action: PayloadAction<Alert>) => {
      const index = state.alerts.findIndex(alert => alert.id === action.payload.id);
      if (index !== -1) {
        state.alerts[index] = action.payload;
      }
    },
    clearAlerts: (state) => {
      state.alerts = [];
      state.activeAlert = null;
      state.error = null;
    },
  },
});

export const {
  fetchAlertsStart,
  fetchAlertsSuccess,
  fetchAlertsFailure,
  setActiveAlert,
  updateAlert,
  clearAlerts,
} = alertsSlice.actions;

export default alertsSlice.reducer;
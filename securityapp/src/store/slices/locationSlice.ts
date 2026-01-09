import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Location, GeofenceArea } from '../../types/location.types';

interface LocationState {
  currentLocation: Location | null;
  isTracking: boolean;
  geofenceAreas: GeofenceArea[];
  selectedGeofence: GeofenceArea | null;
  isLocationPermissionGranted: boolean;
  error: string | null;
  lastLocationUpdate: string | null;
}

const initialState: LocationState = {
  currentLocation: null,
  isTracking: false,
  geofenceAreas: [],
  selectedGeofence: null,
  isLocationPermissionGranted: false,
  error: null,
  lastLocationUpdate: null,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    updateCurrentLocation: (state, action: PayloadAction<Location>) => {
      state.currentLocation = action.payload;
      state.lastLocationUpdate = new Date().toISOString();
      state.error = null;
    },
    setLocationTracking: (state, action: PayloadAction<boolean>) => {
      state.isTracking = action.payload;
    },
    setGeofenceAreas: (state, action: PayloadAction<GeofenceArea[]>) => {
      state.geofenceAreas = action.payload;
    },
    setSelectedGeofence: (state, action: PayloadAction<GeofenceArea | null>) => {
      state.selectedGeofence = action.payload;
    },
    setLocationPermissionGranted: (state, action: PayloadAction<boolean>) => {
      state.isLocationPermissionGranted = action.payload;
    },
    setLocationError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearLocationError: (state) => {
      state.error = null;
    },
  },
});

export const {
  updateCurrentLocation,
  setLocationTracking,
  setGeofenceAreas,
  setSelectedGeofence,
  setLocationPermissionGranted,
  setLocationError,
  clearLocationError,
} = locationSlice.actions;

export default locationSlice.reducer;
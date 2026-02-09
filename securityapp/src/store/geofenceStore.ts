import { create } from 'zustand';
import { Geofence, UserInArea, geofenceService } from '../api/services/geofenceService';

interface GeofenceState {
  // State
  geofences: Geofence[];
  assignedGeofence: Geofence | null;
  usersInArea: UserInArea[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;

  // Enter/exit detection state
  lastKnownLocation: { latitude: number; longitude: number } | null;
  isInsideGeofence: boolean;
  lastBoundaryCrossTime: number;
  consecutiveInsideCount: number;
  consecutiveOutsideCount: number;

  // Actions
  fetchGeofences: () => Promise<void>;
  fetchAssignedGeofence: () => Promise<void>;
  fetchUsersInArea: (geofenceId: string) => Promise<void>;
  updateLocation: (latitude: number, longitude: number) => Promise<void>;

  // Helper actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Boundary detection
  checkBoundaryCrossing: (latitude: number, longitude: number) => void;
}

export const useGeofenceStore = create<GeofenceState>((set, get) => ({
  // Initial state
  geofences: [],
  assignedGeofence: null,
  usersInArea: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  // Boundary detection state
  lastKnownLocation: null,
  isInsideGeofence: false,
  lastBoundaryCrossTime: 0,
  consecutiveInsideCount: 0,
  consecutiveOutsideCount: 0,

  // Fetch all geofences
  fetchGeofences: async () => {
    set({ isLoading: true, error: null });

    try {
      console.log('🎯 Fetching geofences...');
      const geofences = await geofenceService.getGeofences();

      set({
        geofences,
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      });

      console.log(`✅ Fetched ${geofences.length} geofences`);
    } catch (error: any) {
      console.error('❌ Failed to fetch geofences:', error);
      
      // Provide user-friendly error message for SSL/connection issues
      let errorMessage = error.message || 'Failed to fetch geofences';
      if (error.message?.includes('SSL connection has been closed unexpectedly')) {
        errorMessage = 'Network connection unstable. Please check your internet connection.';
      } else if (error.message?.includes('Network Error') || error.code === 'NETWORK_ERROR') {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      }
      
      set({
        isLoading: false,
        error: errorMessage
      });
    }
  },

  // Fetch assigned geofence
  fetchAssignedGeofence: async () => {
    set({ isLoading: true, error: null });

    try {
      console.log('🎯 Fetching assigned geofence...');
      const assignedGeofence = await geofenceService.getAssignedGeofence();

      set({
        assignedGeofence,
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      });

      console.log(`✅ Assigned geofence: ${assignedGeofence?.name || 'None'}`);
    } catch (error: any) {
      console.error('❌ Failed to fetch assigned geofence:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch assigned geofence'
      });
    }
  },

  // Fetch users in geofence area
  fetchUsersInArea: async (geofenceId: string) => {
    try {
      console.log('👥 Fetching users in geofence area:', geofenceId);
      const usersInArea = await geofenceService.getUsersInArea(geofenceId);

      set({
        usersInArea,
        lastUpdated: new Date().toISOString()
      });

      console.log(`✅ Found ${usersInArea.length} users in area`);
    } catch (error: any) {
      console.error('❌ Failed to fetch users in area:', error);
      set({
        error: error.message || 'Failed to fetch users in area'
      });
    }
  },

  // Update location and check boundaries - DISABLED (backend handles location)
  updateLocation: async (latitude: number, longitude: number) => {
    console.log('🚫 Location tracking disabled - frontend no longer handles location updates');
    // Backend handles all location logic, frontend should not perform location tracking
    // Set neutral state without calling geofenceService
    set({ 
      lastKnownLocation: { latitude, longitude },
      isInsideGeofence: false,
      consecutiveInsideCount: 0,
      consecutiveOutsideCount: 0
    });
  },

  // Check for boundary crossing with hysteresis and debouncing - DISABLED (backend handles geofence logic)
  checkBoundaryCrossing: (latitude: number, longitude: number) => {
    console.log('🚫 Geofence detection disabled - frontend no longer handles boundary crossing');
    // Backend handles all geofence logic, frontend should not perform boundary detection
    // Set neutral state without calling geofenceService
    set({
      isInsideGeofence: false,
      consecutiveInsideCount: 0,
      consecutiveOutsideCount: 0,
      lastBoundaryCrossTime: Date.now()
    });
  },

  // Helper actions
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),
}));
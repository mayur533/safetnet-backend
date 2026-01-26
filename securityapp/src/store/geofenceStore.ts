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
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch geofences'
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

  // Update location and check boundaries
  updateLocation: async (latitude: number, longitude: number) => {
    const { assignedGeofence, lastKnownLocation } = get();

    // Update last known location
    set({ lastKnownLocation: { latitude, longitude } });

    // Check boundary crossing if we have an assigned geofence
    if (assignedGeofence) {
      get().checkBoundaryCrossing(latitude, longitude);
    }

    // Update users in area if we have an assigned geofence
    if (assignedGeofence) {
      try {
        await get().fetchUsersInArea(assignedGeofence.id);
      } catch (error) {
        // Silently fail for location updates
      }
    }
  },

  // Check for boundary crossing with hysteresis and debouncing
  checkBoundaryCrossing: (latitude: number, longitude: number) => {
    const { assignedGeofence, isInsideGeofence, consecutiveInsideCount, consecutiveOutsideCount } = get();

    if (!assignedGeofence) return;

    const currentlyInside = geofenceService.isPointInGeofence(latitude, longitude, assignedGeofence);
    const now = Date.now();

    // Hysteresis buffer (10 meters)
    const hysteresisBuffer = 10;
    let shouldTriggerAlert = false;

    if (assignedGeofence.geofence_type === 'circle' && assignedGeofence.radius) {
      const distance = geofenceService.calculateDistance(
        { latitude, longitude },
        { latitude: assignedGeofence.center_latitude, longitude: assignedGeofence.center_longitude }
      );

      // Apply hysteresis
      if (isInsideGeofence && distance > (assignedGeofence.radius + hysteresisBuffer)) {
        // Was inside, now outside with buffer
        shouldTriggerAlert = consecutiveOutsideCount >= 3; // Require 3 consecutive readings
        if (shouldTriggerAlert) {
          set({
            isInsideGeofence: false,
            consecutiveInsideCount: 0,
            consecutiveOutsideCount: consecutiveOutsideCount + 1,
            lastBoundaryCrossTime: now
          });
          console.log('🚪 EXITED geofence area');
        } else {
          set({ consecutiveOutsideCount: consecutiveOutsideCount + 1 });
        }
      } else if (!isInsideGeofence && distance < (assignedGeofence.radius - hysteresisBuffer)) {
        // Was outside, now inside with buffer
        shouldTriggerAlert = consecutiveInsideCount >= 3; // Require 3 consecutive readings
        if (shouldTriggerAlert) {
          set({
            isInsideGeofence: true,
            consecutiveInsideCount: consecutiveInsideCount + 1,
            consecutiveOutsideCount: 0,
            lastBoundaryCrossTime: now
          });
          console.log('🚪 ENTERED geofence area');
        } else {
          set({ consecutiveInsideCount: consecutiveInsideCount + 1 });
        }
      } else {
        // Reset counters when within hysteresis zone
        set({ consecutiveInsideCount: 0, consecutiveOutsideCount: 0 });
      }

      console.log(`📍 Distance: ${distance.toFixed(1)}m, Radius: ${assignedGeofence.radius}m, Inside: ${currentlyInside}, Hysteresis: ${isInsideGeofence}`);
    }

    // Trigger alerts only on actual boundary crossings
    if (shouldTriggerAlert) {
      const alertMessage = isInsideGeofence
        ? 'You have entered the assigned geofence area'
        : 'You have exited the assigned geofence area';

      // In a real app, you might want to show a notification or alert
      console.log(`🚨 GEOFENCE ALERT: ${alertMessage}`);

      // You could emit an event or show a notification here
      // For now, we'll just log it
    }
  },

  // Helper actions
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),
}));
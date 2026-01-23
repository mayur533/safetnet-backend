import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';

export interface Geofence {
  id: string;
  name: string;
  description?: string;
  center_latitude: number;
  center_longitude: number;
  radius?: number; // For circular geofences
  polygon_json?: {
    type: string;
    coordinates: number[][][];
  }; // For polygon geofences
  geofence_type: 'circle' | 'polygon';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
}

export interface UserInArea {
  user_id: string;
  user_name: string;
  user_email: string;
  current_latitude: number;
  current_longitude: number;
  last_seen: string;
  distance_from_center?: number;
  is_inside: boolean;
}

export interface LiveLocationSession {
  id: string;
  officer_id: string;
  geofence_id: string;
  start_time: string;
  end_time?: string;
  status: 'active' | 'paused' | 'stopped';
  last_location?: LocationData;
}

// Location service methods for live location tracking
export const locationService = {
  // Start a live location session
  startLiveLocation: async (geofenceId: string): Promise<LiveLocationSession> => {
    try {
      const payload = {
        geofence_id: geofenceId,
        officer_id: 'current_officer' // This should come from auth context
      };

      const response = await apiClient.post(API_ENDPOINTS.START_LIVE_LOCATION, payload);
      return response.data;
    } catch (error: any) {
      console.error('Failed to start live location:', error.message || error);
      throw error;
    }
  },

  // Update live location
  updateLiveLocation: async (sessionId: string, locationData: LocationData): Promise<LiveLocationSession> => {
    try {
      const payload = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        timestamp: locationData.timestamp || new Date().toISOString(),
        address: locationData.address
      };

      const response = await apiClient.patch(
        API_ENDPOINTS.UPDATE_LIVE_LOCATION.replace('{session_id}', sessionId),
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('Failed to update live location:', error.message || error);
      throw error;
    }
  },

  // Stop live location session
  stopLiveLocation: async (sessionId: string): Promise<LiveLocationSession> => {
    try {
      const response = await apiClient.delete(
        API_ENDPOINTS.STOP_LIVE_LOCATION.replace('{session_id}', sessionId)
      );
      return response.data;
    } catch (error: any) {
      console.error('Failed to stop live location:', error.message || error);
      throw error;
    }
  },

  // Get current location (client-side GPS)
  getCurrentLocation: async (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    });
  },
};

export const geofenceService = {
  // Get all geofences
  getGeofences: async (): Promise<Geofence[]> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.GET_GEOFENCE_DETAILS);

      // Handle both array response and paginated response
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data.results && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      return [];
    } catch (error: any) {
      console.error('Failed to fetch geofences:', error.message || error);
      return [];
    }
  },

  // Get geofence by ID
  getGeofenceById: async (id: string): Promise<Geofence | null> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.GET_GEOFENCE_DETAILS.replace('{id}', id));
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch geofence:', error.message || error);
      return null;
    }
  },

  // Get assigned geofence (for current officer)
  getAssignedGeofence: async (): Promise<Geofence | null> => {
    try {
      // This might need a specific endpoint for assigned geofence
      // For now, we'll get all geofences and return the first active one
      const geofences = await geofenceService.getGeofences();
      return geofences.find(g => g.status === 'active') || null;
    } catch (error: any) {
      console.error('Failed to fetch assigned geofence:', error.message || error);
      return null;
    }
  },

  // Get users in geofence area
  getUsersInArea: async (geofenceId: string): Promise<UserInArea[]> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.GET_USERS_IN_AREA.replace('{geofence_id}', geofenceId));

      // Handle both array response and paginated response
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data.results && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      return [];
    } catch (error: any) {
      console.error('Failed to fetch users in area:', error.message || error);
      return [];
    }
  },

  // Check if point is inside geofence
  isPointInGeofence: (latitude: number, longitude: number, geofence: Geofence): boolean => {
    if (geofence.geofence_type === 'circle' && geofence.radius) {
      // Circular geofence - calculate distance
      const distance = geofenceService.calculateDistance(
        { latitude, longitude },
        { latitude: geofence.center_latitude, longitude: geofence.center_longitude }
      );
      return distance <= geofence.radius;
    } else if (geofence.geofence_type === 'polygon' && geofence.polygon_json) {
      // Polygon geofence - use point-in-polygon algorithm
      return geofenceService.isPointInPolygon(latitude, longitude, geofence.polygon_json.coordinates[0]);
    }
    return false;
  },

  // Point-in-polygon algorithm (Ray casting algorithm)
  isPointInPolygon: (lat: number, lon: number, polygon: number[][]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][1], yi = polygon[i][0]; // Note: GeoJSON uses [lng, lat]
      const xj = polygon[j][1], yj = polygon[j][0];

      if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  },

  // Calculate distance between two points (Haversine formula)
  calculateDistance: (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (to.latitude - from.latitude) * Math.PI / 180;
    const dLon = (to.longitude - from.longitude) * Math.PI / 180;

    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers

    return distance * 1000; // Convert to meters
  },

  // Legacy methods for backward compatibility
  getGeofenceDetails: async (id: string): Promise<any> => {
    const geofence = await geofenceService.getGeofenceById(id);
    return geofence ? {
      geofence_id: geofence.id,
      name: geofence.name,
      radius: geofence.radius || 100,
      center_lat: geofence.center_latitude,
      center_lng: geofence.center_longitude
    } : null;
  },

  createGeofence: async (data: any): Promise<{ id: string }> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.GET_GEOFENCE_DETAILS, data);
      return { id: response.data.id };
    } catch (error: any) {
      console.error('Failed to create geofence:', error.message || error);
      throw error;
    }
  },

  updateGeofence: async (id: string, data: any): Promise<any> => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.GET_GEOFENCE_DETAILS.replace('{id}', id), data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to update geofence:', error.message || error);
      throw error;
    }
  },

  deleteGeofence: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(API_ENDPOINTS.GET_GEOFENCE_DETAILS.replace('{id}', id));
      return true;
    } catch (error: any) {
      console.error('Failed to delete geofence:', error.message || error);
      return false;
    }
  }
};
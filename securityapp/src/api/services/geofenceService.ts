import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { Platform } from 'react-native';

// Import React Native location modules
import { 
  Platform as RNPlatform, 
  PermissionsAndroid, 
  Alert
} from 'react-native';

// Import location library
import Geolocation from '@react-native-community/geolocation';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
  address?: string;
}

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

// Request location permissions for Android
const requestLocationPermission = async (): Promise<boolean> => {
  if (RNPlatform.OS === 'android') {
    try {
      console.log('🔍 Checking location permissions...');
      
      // Check if permission is already granted
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Access Required',
          message: 'This app needs access to your location for accurate GPS tracking during emergency response.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Grant',
        },
      );
      
      console.log('📋 Permission result:', granted);
      
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('✅ Fine location permission granted');
        
        // Also request coarse location as fallback
        try {
          const coarseGranted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
          );
          console.log('📋 Coarse permission result:', coarseGranted);
        } catch (err) {
          console.warn('⚠️ Could not request coarse location:', err);
        }
        
        return true;
      } else if (granted === PermissionsAndroid.RESULTS.DENIED) {
        console.log('❌ Location permission denied');
        Alert.alert(
          'Location Required',
          'Location access is required for accurate GPS tracking. Please enable location permissions in settings.',
          [{ text: 'OK' }]
        );
        return false;
      } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        console.log('❌ Location permission permanently denied');
        Alert.alert(
          'Location Required',
          'Location access is required for accurate GPS tracking. Please enable location permissions in app settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      return false;
    } catch (err) {
      console.error('❌ Error requesting location permission:', err);
      return false;
    }
  }
  
  // For iOS, permissions are handled automatically by the geolocation API
  console.log('📱 iOS - permissions handled by geolocation API');
  return true;
};

// Fallback GPS - try React Native built-in first, then random coordinates
const tryFallbackGPS = (resolve: Function, reject: Function, startTime: number, gpsOptions: any) => {
  console.log('🔄 Trying React Native built-in geolocation fallback...');
  
  // Try React Native's built-in geolocation as first fallback
  try {
    if (RNPlatform.OS === 'android') {
      // Use the same geolocation library but with different settings
      Geolocation.getCurrentPosition(
        (position: any) => {
          const endTime = Date.now();
          const acquisitionTime = endTime - startTime;
          
          console.log('✅ Fallback geolocation succeeded!');
          
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString(),
            address: `GPS: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
          };

          console.log('✅ Fallback GPS location acquired:');
          console.log(`   📍 Coordinates: ${locationData.latitude.toFixed(8)}, ${locationData.longitude.toFixed(8)}`);
          console.log(`   🎯 Accuracy: ±${locationData.accuracy?.toFixed(1)}m`);
          console.log(`   ⏱️ Acquisition time: ${acquisitionTime}ms`);
          console.log(`   🕐 GPS timestamp: ${locationData.timestamp}`);

          resolve(locationData);
        },
        (error: any) => {
          console.error('❌ Fallback geolocation also failed, using random coordinates...');
          console.error(`   🚫 Error: ${error.message} (code: ${error.code})`);
          useRandomCoordinates(resolve, reject, startTime);
        },
        {
          enableHighAccuracy: false, // Lower accuracy for faster response
          timeout: 10000,            // Shorter timeout for fallback
          maximumAge: 300000         // 5 minute cache
        }
      );
    } else {
      useRandomCoordinates(resolve, reject, startTime);
    }
  } catch (error) {
    console.error('❌ Fallback geolocation not available, no fallback coordinates allowed...');
    useRandomCoordinates(resolve, reject, startTime);
  }
};

// No fallback coordinates - require real GPS data only
const useRandomCoordinates = (resolve: Function, reject: Function, startTime: number) => {
  console.log('❌ No GPS available - fallback coordinates are not allowed');
  reject(new Error('GPS coordinates are required. Please enable location services and try again.'));
};

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

  // Get current location (client-side GPS with fresh fix)
  getCurrentLocation: async (): Promise<LocationData> => {
    // First, request location permissions
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      throw new Error('Location permission is required for GPS tracking');
    }

    // Check if location services are enabled
    console.log('🔍 Checking if location services are enabled...');
    
    return new Promise((resolve, reject) => {
      console.log('🛰️ Starting fresh GPS location acquisition...');
      console.log('📱 Platform:', RNPlatform.OS);
      console.log('🔍 Geolocation available:', typeof Geolocation !== 'undefined');
      console.log('📋 Geolocation methods:', Object.keys(Geolocation));
      
      const startTime = Date.now();
      
      // GPS configuration for fresh location - optimized for Android
      const gpsOptions = {
        enableHighAccuracy: false,   // Start with lower accuracy for faster response
        maximumAge: 300000,         // Allow 5 minute cache for faster response
        timeout: 10000,             // 10 second timeout for faster fallback
      };

      console.log('⚙️ GPS Settings:', gpsOptions);
      console.log('🚀 Calling Geolocation.getCurrentPosition...');

      // Try the community geolocation library first
      if (typeof Geolocation !== 'undefined' && Geolocation.getCurrentPosition) {
        console.log('📡 Using @react-native-community/geolocation');
        
        Geolocation.getCurrentPosition(
          (position: any) => {
            const endTime = Date.now();
            const acquisitionTime = endTime - startTime;
            
            console.log('✅ GPS Position received:', position);
            console.log('📍 Raw coordinates:', {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              heading: position.coords.heading,
              speed: position.coords.speed
            });
            
            const locationData: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date(position.timestamp).toISOString(),
              address: `GPS: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
            };

            console.log('✅ Fresh GPS location acquired:');
            console.log(`   📍 Coordinates: ${locationData.latitude.toFixed(8)}, ${locationData.longitude.toFixed(8)}`);
            console.log(`   🎯 Accuracy: ±${locationData.accuracy?.toFixed(1)}m`);
            console.log(`   ⏱️ Acquisition time: ${acquisitionTime}ms`);
            console.log(`   🕐 GPS timestamp: ${locationData.timestamp}`);
            console.log(`   🔄 Cache age: ${gpsOptions.maximumAge}ms (fresh fix)`);

            resolve(locationData);
          },
          (error: any) => {
            console.error('❌ Community geolocation failed, trying fallback...');
            console.error(`   🚫 Error: ${error.message} (code: ${error.code})`);
            
            // Try fallback to React Native's built-in geolocation
            tryFallbackGPS(resolve, reject, startTime, gpsOptions);
          },
          {
            ...gpsOptions,
            timeout: 20000, // Use same timeout as main config
            maximumAge: 60000, // Use same cache as main config
            enableHighAccuracy: true
          }
        );
      } else {
        console.log('⚠️ Community geolocation not available, using fallback...');
        tryFallbackGPS(resolve, reject, startTime, gpsOptions);
      }
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
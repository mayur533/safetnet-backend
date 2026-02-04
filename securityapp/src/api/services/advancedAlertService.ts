import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { Alert } from '../../types/alert.types';

// Define interfaces for advanced alert system
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

interface CreateAlertWithGPSData {
  alert_type: 'emergency' | 'normal' | 'security';
  message: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  // GPS data will be automatically captured
}

interface AlertResponse {
  id: number;
  log_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  alert_type: string;
  priority: string;
  message: string;
  description?: string;
  location_lat: number;
  location_long: number;
  timestamp: string;
  status: string;
  geofence_id: string;
  created_at: string;
}

class AdvancedAlertService {
  /**
   * Create an alert with automatic GPS capture
   * This function captures the current device GPS and stores it as the alert's fixed location
   */
  async createAlertWithGPS(alertData: CreateAlertWithGPSData): Promise<Alert> {
    try {
      console.log('🚨 Creating alert with automatic GPS capture...');
      
      // Step 1: Capture current device GPS with high accuracy
      const location = await this.captureCurrentGPS();
      
      if (!location) {
        throw new Error('Failed to capture GPS location. Please enable location services and try again.');
      }
      
      console.log('📍 GPS captured for alert:', {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: new Date(location.timestamp).toISOString(),
      });
      
      // Step 2: Create alert with captured GPS coordinates
      const alertPayload = {
        ...alertData,
        location_lat: location.latitude,
        location_long: location.longitude,
        location_accuracy: location.accuracy,
        location_timestamp: location.timestamp,
        // Ensure location is properly structured for backend
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: `GPS: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
        },
      };
      
      console.log('📡 Sending alert to backend with GPS data:', alertPayload);
      
      const response = await apiClient.post(API_ENDPOINTS.CREATE_SOS, alertPayload);
      
      // Step 3: Transform response to match Alert interface
      const createdAlert: Alert = {
        ...response.data,
        id: response.data.id || response.data.log_id,
        log_id: response.data.log_id || response.data.id?.toString(),
        user_id: response.data.user_id,
        user_name: response.data.user_name,
        user_email: response.data.user_email,
        user_phone: response.data.user_phone,
        alert_type: response.data.alert_type,
        priority: response.data.priority,
        message: response.data.message,
        description: response.data.description,
        location: {
          latitude: response.data.location_lat,
          longitude: response.data.location_long,
          address: response.data.location_address || `GPS: ${response.data.location_lat.toFixed(6)}, ${response.data.location_long.toFixed(6)}`,
        },
        location_lat: response.data.location_lat,
        location_long: response.data.location_long,
        timestamp: response.data.timestamp || response.data.created_at,
        status: response.data.status || 'pending',
        geofence_id: response.data.geofence_id,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
      };
      
      console.log('✅ Alert created successfully with GPS:', {
        alertId: createdAlert.id,
        location: createdAlert.location,
        timestamp: createdAlert.created_at,
      });
      
      return createdAlert;
      
    } catch (error: any) {
      console.error('❌ Failed to create alert with GPS:', error);
      
      if (error.message && error.message.includes('GPS')) {
        throw new Error('GPS capture failed. Please ensure location services are enabled and try again.');
      }
      
      throw new Error('Failed to create alert. Please try again.');
    }
  }
  
  /**
   * Capture current GPS with high accuracy and retry mechanism
   */
  private async captureCurrentGPS(): Promise<LocationData | null> {
    try {
      // Import geolocation dynamically
      const GeolocationModule = await import('@react-native-community/geolocation');
      const Geolocation = GeolocationModule.default;
      
      if (!Geolocation || !Geolocation.getCurrentPosition) {
        console.error('❌ Geolocation module not available');
        return null;
      }
      
      console.log('🛰️ Capturing GPS with high accuracy...');
      
      const position = await new Promise<any>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          resolve,
          (error) => {
            console.error('❌ GPS error:', error);
            
            // For timeout errors, try cached location as fallback
            if (error.code === 3) {
              console.log('⏰ GPS timeout, trying cached location...');
              Geolocation.getCurrentPosition(
                resolve,
                (fallbackError) => {
                  console.log('❌ No cached location available');
                  reject(error);
                },
                {
                  enableHighAccuracy: false,
                  timeout: 5000,
                  maximumAge: 300000, // 5 minutes cache
                }
              );
              return;
            }
            
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 60000, // 60 seconds for maximum accuracy
            maximumAge: 0, // No cache for initial attempt
          }
        );
      });
      
      const location: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };
      
      console.log('✅ GPS captured successfully:', {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: new Date(location.timestamp).toISOString(),
      });
      
      return location;
      
    } catch (error: any) {
      console.error('❌ Failed to capture GPS:', error);
      return null;
    }
  }
  
  /**
   * Get alert by ID with full location data
   */
  async getAlertWithLocation(alertId: string): Promise<Alert> {
    try {
      console.log('📡 Fetching alert with location data:', alertId);
      
      const response = await apiClient.get(API_ENDPOINTS.GET_SOS.replace('{id}', alertId));
      
      // Transform response to ensure location data is properly structured
      const alert: Alert = {
        ...response.data,
        id: response.data.id || response.data.log_id,
        log_id: response.data.log_id || response.data.id?.toString(),
        location: {
          latitude: response.data.location_lat,
          longitude: response.data.location_long,
          address: response.data.location_address || `GPS: ${response.data.location_lat.toFixed(6)}, ${response.data.location_long.toFixed(6)}`,
        },
        location_lat: response.data.location_lat,
        location_long: response.data.location_long,
        timestamp: response.data.timestamp || response.data.created_at,
        status: response.data.status || 'pending',
        created_at: response.data.created_at,
      };
      
      console.log('✅ Alert with location fetched:', {
        alertId: alert.id,
        location: alert.location,
        hasValidGPS: !!(alert.location_lat && alert.location_long),
      });
      
      return alert;
      
    } catch (error: any) {
      console.error('❌ Failed to fetch alert with location:', error);
      throw new Error('Failed to fetch alert details');
    }
  }
  
  /**
   * Update alert status (e.g., resolve, cancel)
   */
  async updateAlertStatus(alertId: string, status: 'resolved' | 'cancelled' | 'accepted'): Promise<Alert> {
    try {
      console.log('📡 Updating alert status:', { alertId, status });
      
      const response = await apiClient.patch(API_ENDPOINTS.UPDATE_SOS.replace('{id}', alertId), {
        status,
      });
      
      const updatedAlert: Alert = {
        ...response.data,
        location: {
          latitude: response.data.location_lat,
          longitude: response.data.location_long,
          address: response.data.location_address || `GPS: ${response.data.location_lat.toFixed(6)}, ${response.data.location_long.toFixed(6)}`,
        },
      };
      
      console.log('✅ Alert status updated:', {
        alertId: updatedAlert.id,
        newStatus: updatedAlert.status,
      });
      
      return updatedAlert;
      
    } catch (error: any) {
      console.error('❌ Failed to update alert status:', error);
      throw new Error('Failed to update alert status');
    }
  }
}

export const advancedAlertService = new AdvancedAlertService();

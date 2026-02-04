import { Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

interface GPSOptions {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  acquisitionTime: number;
}

class OptimizedGPS {
  // Ultra-fast GPS for emergency alerts
  static async getEmergencyLocation(): Promise<LocationData> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      // Tier 1: Ultra-fast (3 seconds) - Low accuracy for immediate response
      const ultraFastOptions: GPSOptions = {
        enableHighAccuracy: false,
        timeout: 3000,        // 3 seconds
        maximumAge: 60000     // 1 minute cache
      };

      Geolocation.getCurrentPosition(
        (position) => {
          const endTime = Date.now();
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            acquisitionTime: endTime - startTime
          });
        },
        (error) => {
          // Tier 2: Fast (8 seconds) - Medium accuracy
          this.getFastLocation(startTime).then(resolve).catch(reject);
        },
        ultraFastOptions
      );
    });
  }

  // Fast GPS for regular alerts
  static async getFastLocation(startTime?: number): Promise<LocationData> {
    const start = startTime || Date.now();
    
    return new Promise((resolve, reject) => {
      const fastOptions: GPSOptions = {
        enableHighAccuracy: true,
        timeout: 8000,        // 8 seconds
        maximumAge: 30000     // 30 second cache
      };

      Geolocation.getCurrentPosition(
        (position) => {
          const endTime = Date.now();
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            acquisitionTime: endTime - start
          });
        },
        (error) => {
          // Tier 3: Accurate (15 seconds) - High accuracy fallback
          this.getAccurateLocation(start).then(resolve).catch(reject);
        },
        fastOptions
      );
    });
  }

  // High accuracy GPS for critical situations
  static async getAccurateLocation(startTime?: number): Promise<LocationData> {
    const start = startTime || Date.now();
    
    return new Promise((resolve, reject) => {
      const accurateOptions: GPSOptions = {
        enableHighAccuracy: true,
        timeout: 15000,       // 15 seconds
        maximumAge: 5000      // 5 second cache (fresh data)
      };

      Geolocation.getCurrentPosition(
        (position) => {
          const endTime = Date.now();
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            acquisitionTime: endTime - start
          });
        },
        (error) => {
          reject(new Error(`GPS acquisition failed: ${error.message}`));
        },
        accurateOptions
      );
    });
  }

  // Smart GPS selection based on alert type
  static async getLocationForAlert(alertType: string): Promise<LocationData> {
    console.log(`🚀 Getting GPS for alert type: ${alertType}`);
    
    switch (alertType.toLowerCase()) {
      case 'emergency':
      case 'sos':
        console.log('🆘 Using EMERGENCY GPS (3s timeout)');
        return this.getEmergencyLocation();
      
      case 'urgent':
      case 'critical':
        console.log('⚡ Using FAST GPS (8s timeout)');
        return this.getFastLocation();
      
      default:
        console.log('📍 Using STANDARD GPS (15s timeout)');
        return this.getAccurateLocation();
    }
  }

  // Pre-warm GPS for faster response
  static async preWarmGPS(): Promise<void> {
    try {
      console.log('🔥 Pre-warming GPS...');
      await this.getFastLocation();
      console.log('✅ GPS pre-warmed successfully');
    } catch (error) {
      console.log('⚠️ GPS pre-warm failed:', error);
    }
  }

  // Check GPS availability
  static async checkGPSAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        { timeout: 2000, maximumAge: 1000, enableHighAccuracy: false }
      );
    });
  }
}

export default OptimizedGPS;

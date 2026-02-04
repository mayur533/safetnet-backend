import OptimizedGPS from './optimizedGPS';
import { alertService } from '../api/services/alertService';

interface AlertData {
  user: number;
  message: string;
  description?: string;
  alert_type: 'emergency' | 'security' | 'general';
  geofence?: number;
  location_address?: string;
}

interface CreateAlertResult {
  success: boolean;
  alert?: any;
  gpsData?: any;
  error?: string;
  acquisitionTime?: number;
}

class OptimizedAlertService {
  
  // Create alert with optimized GPS
  static async createAlertWithOptimizedGPS(alertData: AlertData): Promise<CreateAlertResult> {
    const startTime = Date.now();
    console.log(`🚀 Creating ${alertData.alert_type} alert with optimized GPS...`);
    
    try {
      // Step 1: Get GPS location based on alert urgency
      const gpsData = await OptimizedGPS.getLocationForAlert(alertData.alert_type);
      console.log(`📍 GPS acquired in ${gpsData.acquisitionTime}ms with ${gpsData.accuracy}m accuracy`);
      
      // Step 2: Prepare alert payload with GPS data
      const alertPayload = {
        ...alertData,
        location_lat: gpsData.latitude,
        location_long: gpsData.longitude,
        location_address: alertData.location_address || `GPS: ${gpsData.latitude.toFixed(6)}, ${gpsData.longitude.toFixed(6)}`,
        gps_accuracy: gpsData.accuracy,
        gps_acquisition_time: gpsData.acquisitionTime
      };
      
      // Step 3: Create the alert
      const alert = await alertService.createAlert(alertPayload);
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ Alert created successfully in ${totalTime}ms total`);
      
      return {
        success: true,
        alert,
        gpsData,
        acquisitionTime: totalTime
      };
      
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ Failed to create alert after ${totalTime}ms:`, error);
      
      // Fallback: Create alert without GPS
      try {
        console.log('🔄 Creating alert without GPS as fallback...');
        const alert = await alertService.createAlert({
          ...alertData,
          location_lat: undefined,
          location_long: undefined,
          location_address: alertData.location_address || 'Location unavailable'
        });
        
        return {
          success: true,
          alert,
          error: `GPS failed: ${error.message}`,
          acquisitionTime: totalTime
        };
      } catch (fallbackError: any) {
        return {
          success: false,
          error: `Both GPS and alert creation failed: ${fallbackError.message}`,
          acquisitionTime: totalTime
        };
      }
    }
  }
  
  // Batch create multiple alerts efficiently
  static async createMultipleAlerts(alertsData: AlertData[]): Promise<CreateAlertResult[]> {
    console.log(`📋 Creating ${alertsData.length} alerts with optimized GPS...`);
    
    // Pre-warm GPS once for all alerts
    await OptimizedGPS.preWarmGPS();
    
    const results = await Promise.allSettled(
      alertsData.map(alertData => this.createAlertWithOptimizedGPS(alertData))
    );
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: (result.reason as any)?.message || 'Unknown error',
          acquisitionTime: 0
        };
      }
    });
  }
  
  // Get GPS performance metrics
  static async getGPSPerformanceMetrics(): Promise<Record<string, any>> {
    const testCases = [
      { type: 'emergency', expectedTime: 3000 },
      { type: 'urgent', expectedTime: 8000 },
      { type: 'normal', expectedTime: 15000 }
    ];
    
    const metrics: Record<string, any> = {};
    
    for (const testCase of testCases) {
      try {
        const startTime = Date.now();
        await OptimizedGPS.getLocationForAlert(testCase.type);
        const actualTime = Date.now() - startTime;
        
        metrics[testCase.type] = {
          expectedTime: testCase.expectedTime,
          actualTime,
          withinTarget: actualTime <= testCase.expectedTime,
          performance: ((testCase.expectedTime / actualTime) * 100).toFixed(1) + '%'
        };
      } catch (error: any) {
        metrics[testCase.type] = {
          expectedTime: testCase.expectedTime,
          actualTime: null,
          withinTarget: false,
          error: error.message
        };
      }
    }
    
    return metrics;
  }
  
  // Pre-warm GPS for faster emergency response
  static async prepareForEmergencyResponse(): Promise<void> {
    console.log('🚨 Preparing for emergency response...');
    
    try {
      // Check GPS availability
      const isAvailable = await OptimizedGPS.checkGPSAvailability();
      if (!isAvailable) {
        console.warn('⚠️ GPS not available');
        return;
      }
      
      // Pre-warm with fast location
      await OptimizedGPS.preWarmGPS();
      
      console.log('✅ Emergency response preparation complete');
    } catch (error: any) {
      console.error('❌ Emergency preparation failed:', error);
    }
  }
}

export default OptimizedAlertService;

// Simple event emitter for live location updates
class SimpleEventEmitter {
  private events: Map<string, any[]> = new Map();

  on(event: string, callback: any) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  emit(event: string, data?: any) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  off(event: string, callback: any) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

const eventEmitter = new SimpleEventEmitter();

// Define interfaces for live location tracking
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

interface LiveLocationConfig {
  updateInterval: number; // milliseconds
  gpsTimeout: number; // milliseconds
  maxRetries: number;
  enableHighAccuracy: boolean;
  maxCacheAge: number; // milliseconds
}

interface LiveLocationStatus {
  isTracking: boolean;
  lastUpdate: number;
  accuracy: number;
  updateCount: number;
  errorCount: number;
}

class LiveLocationService {
  private trackingInterval: number | null = null;
  private currentLocation: LocationData | null = null;
  private status: LiveLocationStatus = {
    isTracking: false,
    lastUpdate: 0,
    accuracy: 0,
    updateCount: 0,
    errorCount: 0,
  };
  
  private config: LiveLocationConfig = {
    updateInterval: 60000, // 60 seconds - same as alert GPS timeout
    gpsTimeout: 60000,    // 60 seconds for GPS acquisition
    maxRetries: 3,
    enableHighAccuracy: true,
    maxCacheAge: 0, // No cache for live tracking
  };

  private listeners: Array<(location: LocationData | null, error?: string) => void> = [];

  /**
   * Start live location tracking
   */
  async startTracking(config?: Partial<LiveLocationConfig>): Promise<void> {
    try {
      if (this.status.isTracking) {
        console.log('📍 Live tracking already active');
        return;
      }

      // Update config with provided values
      this.config = { ...this.config, ...config };
      
      console.log('🚀 Starting live location tracking with config:', {
        updateInterval: this.config.updateInterval,
        gpsTimeout: this.config.gpsTimeout,
        enableHighAccuracy: this.config.enableHighAccuracy,
      });

      // Get initial location
      const initialLocation = await this.getCurrentLocation();
      if (initialLocation) {
        this.currentLocation = initialLocation;
        this.notifyListeners(initialLocation);
      }

      // Start periodic updates
      this.trackingInterval = setInterval(async () => {
        try {
          const location = await this.getCurrentLocation();
          if (location) {
            this.currentLocation = location;
            this.status.lastUpdate = Date.now();
            this.status.updateCount++;
            this.status.accuracy = location.accuracy || 0;
            
            console.log('📍 Live location updated:', {
              lat: location.latitude,
              lng: location.longitude,
              accuracy: location.accuracy,
              updateCount: this.status.updateCount,
            });
            
            this.notifyListeners(location);
            
            // Emit global event
            eventEmitter.emit('liveLocationUpdate', location);
          }
        } catch (error: any) {
          this.status.errorCount++;
          console.error('❌ Live location update failed:', error);
          this.notifyListeners(null, error.message);
          
          // Emit global error event
          eventEmitter.emit('liveLocationError', error.message);
        }
      }, this.config.updateInterval);

      this.status.isTracking = true;
      console.log('✅ Live location tracking started successfully');
      
      // Emit global start event
      eventEmitter.emit('liveTrackingStarted', this.status);

    } catch (error: any) {
      console.error('❌ Failed to start live tracking:', error);
      this.notifyListeners(null, error.message);
      throw error;
    }
  }

  /**
   * Stop live location tracking
   */
  stopTracking(): void {
    if (!this.status.isTracking) {
      console.log('📍 Live tracking not active');
      return;
    }

    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    this.status.isTracking = false;
    console.log('⏹️ Live location tracking stopped');
    
    // Emit global stop event
    eventEmitter.emit('liveTrackingStopped', this.status);
  }

  /**
   * Get current GPS location with 60-second timeout
   */
  private async getCurrentLocation(): Promise<LocationData | null> {
    try {
      console.log('🛰️ Capturing GPS location (60s timeout)...');
      
      // Import geolocation dynamically
      const GeolocationModule = await import('@react-native-community/geolocation');
      const Geolocation = GeolocationModule.default;
      
      if (!Geolocation || !Geolocation.getCurrentPosition) {
        throw new Error('Geolocation not available');
      }

      const position = await new Promise<any>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          resolve,
          (error) => {
            console.error('❌ GPS error:', error);
            
            // For timeout errors, try cached location as fallback
            if (error.code === 3) {
              console.log('⏰ GPS timeout, trying cached location fallback...');
              
              Geolocation.getCurrentPosition(
                (cachedPosition) => {
                  console.log('📍 Using cached GPS location as fallback');
                  resolve(cachedPosition);
                },
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
            enableHighAccuracy: this.config.enableHighAccuracy,
            timeout: this.config.gpsTimeout, // 60 seconds
            maximumAge: this.config.maxCacheAge,
          }
        );
      });

      const location: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };

      console.log('✅ GPS location captured:', {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: new Date(location.timestamp).toISOString(),
      });

      return location;

    } catch (error: any) {
      console.error('❌ Failed to get GPS location:', error);
      throw error;
    }
  }

  /**
   * Get current location without starting tracking
   */
  async getCurrentLocationOnce(): Promise<LocationData | null> {
    return this.getCurrentLocation();
  }

  /**
   * Add location update listener
   */
  addListener(callback: (location: LocationData | null, error?: string) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove location update listener
   */
  removeListener(callback: (location: LocationData | null, error?: string) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(location: LocationData | null, error?: string): void {
    this.listeners.forEach(listener => {
      try {
        listener(location, error);
      } catch (listenerError) {
        console.error('❌ Error in location listener:', listenerError);
      }
    });
  }

  /**
   * Get current location
   */
  getCurrentLocationData(): LocationData | null {
    return this.currentLocation;
  }

  /**
   * Get tracking status
   */
  getStatus(): LiveLocationStatus {
    return { ...this.status };
  }

  /**
   * Get tracking statistics
   */
  getStatistics(): {
    isTracking: boolean;
    lastUpdate: number;
    updateCount: number;
    errorCount: number;
    successRate: number;
    averageAccuracy: number;
    timeSinceLastUpdate: number;
  } {
    const successRate = this.status.updateCount + this.status.errorCount > 0 
      ? (this.status.updateCount / (this.status.updateCount + this.status.errorCount)) * 100 
      : 0;

    return {
      isTracking: this.status.isTracking,
      lastUpdate: this.status.lastUpdate,
      updateCount: this.status.updateCount,
      errorCount: this.status.errorCount,
      successRate,
      averageAccuracy: this.status.accuracy,
      timeSinceLastUpdate: Date.now() - this.status.lastUpdate,
    };
  }

  /**
   * Update tracking configuration
   */
  updateConfig(config: Partial<LiveLocationConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('🔧 Live tracking config updated:', this.config);
  }

  /**
   * Clear all listeners
   */
  clearListeners(): void {
    this.listeners = [];
    console.log('🗑️ All location listeners cleared');
  }

  /**
   * Force location update
   */
  async forceUpdate(): Promise<LocationData | null> {
    try {
      console.log('🔄 Forcing immediate location update...');
      const location = await this.getCurrentLocation();
      if (location) {
        this.currentLocation = location;
        this.status.lastUpdate = Date.now();
        this.status.updateCount++;
        this.notifyListeners(location);
        eventEmitter.emit('liveLocationUpdate', location);
      }
      return location;
    } catch (error: any) {
      this.status.errorCount++;
      this.notifyListeners(null, error.message);
      throw error;
    }
  }
}

export const liveLocationService = new LiveLocationService();
export type { LocationData, LiveLocationConfig, LiveLocationStatus };

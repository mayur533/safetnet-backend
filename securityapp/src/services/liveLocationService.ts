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
   * Start live location tracking - DISABLED (backend handles location)
   */
  async startTracking(config?: Partial<LiveLocationConfig>): Promise<void> {
    console.log('🚫 Live location tracking disabled - frontend no longer handles GPS tracking');
    // Backend handles all location logic, frontend should not perform GPS tracking
    // Set neutral status without starting any tracking
    this.status.isTracking = false;
    this.currentLocation = null;
    
    // Notify listeners that tracking is disabled
    this.notifyListeners(null, 'Live location tracking is disabled in frontend');
  }

  /**
   * Stop live location tracking - DISABLED (backend handles location)
   */
  stopTracking(): void {
    console.log('🚫 Live location tracking disabled - frontend no longer handles GPS tracking');
    // Backend handles all location logic, frontend should not perform GPS tracking
    // Set neutral status without any cleanup
    this.status.isTracking = false;
    this.currentLocation = null;
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }

  /**
   * Get current GPS location - DISABLED (backend handles location)
   */
  private async getCurrentLocation(): Promise<LocationData | null> {
    console.log('🚫 GPS tracking disabled - frontend no longer handles location acquisition');
    // Backend handles all location logic, frontend should not perform GPS tracking
    // Return null instead of trying to get GPS location
    return null;
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

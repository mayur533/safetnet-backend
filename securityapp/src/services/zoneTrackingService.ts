import { Alert } from '../types/alert.types';
import { Geofence } from '../types/alert.types';

// Define interfaces for zone tracking
interface ZoneEvent {
  id: string;
  officerId: string;
  officerName: string;
  zoneId: string;
  zoneName: string;
  eventType: 'entry' | 'exit';
  timestamp: number;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  duration?: number; // Duration in zone for exit events (in seconds)
}

interface ZoneStatus {
  zoneId: string;
  zoneName: string;
  isInside: boolean;
  entryTime?: number;
  lastUpdate: number;
  officerLocation?: {
    latitude: number;
    longitude: number;
  };
}

interface OfficerZoneTracking {
  officerId: string;
  officerName: string;
  assignedZones: Geofence[];
  currentStatus: ZoneStatus[];
  eventHistory: ZoneEvent[];
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
    timestamp: number;
  };
}

class ZoneTrackingService {
  private trackingData: Map<string, OfficerZoneTracking> = new Map();
  private eventListeners: Map<string, ((event: ZoneEvent) => void)[]> = new Map();
  private trackingInterval: number | null = null;

  /**
   * Initialize zone tracking for an officer
   */
  initializeOfficerTracking(officerId: string, officerName: string, assignedZones: Geofence[]) {
    console.log('🗺️ Initializing zone tracking for officer:', {
      officerId,
      officerName,
      assignedZones: assignedZones.map(z => ({ id: z.id, name: z.name, type: z.geofence_type }))
    });

    const tracking: OfficerZoneTracking = {
      officerId,
      officerName,
      assignedZones,
      currentStatus: assignedZones.map(zone => ({
        zoneId: zone.id,
        zoneName: zone.name,
        isInside: false,
        lastUpdate: Date.now(),
      })),
      eventHistory: [],
    };

    this.trackingData.set(officerId, tracking);
  }

  /**
   * Update officer location and check zone transitions
   */
  updateOfficerLocation(officerId: string, location: { latitude: number; longitude: number; accuracy?: number; timestamp: number }) {
    const tracking = this.trackingData.get(officerId);
    if (!tracking) {
      console.warn('⚠️ No tracking data found for officer:', officerId);
      return;
    }

    // Update last known location
    tracking.lastKnownLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: location.timestamp,
    };

    console.log('📍 Updating officer location for zone tracking:', {
      officerId: tracking.officerName,
      location: { lat: location.latitude, lng: location.longitude, accuracy: location.accuracy },
      assignedZones: tracking.assignedZones.length
    });

    // Check each assigned zone
    tracking.assignedZones.forEach(zone => {
      this.checkZoneTransition(tracking, zone, location);
    });
  }

  /**
   * Check if officer has transitioned in/out of a zone
   */
  private checkZoneTransition(tracking: OfficerZoneTracking, zone: Geofence, location: { latitude: number; longitude: number; accuracy?: number; timestamp: number }) {
    const currentStatus = tracking.currentStatus.find(status => status.zoneId === zone.id);
    if (!currentStatus) return;

    const isInsideNow = this.isPointInZone(location.latitude, location.longitude, zone);
    const wasInsideBefore = currentStatus.isInside;

    // Check for zone transition
    if (isInsideNow && !wasInsideBefore) {
      // Officer entered the zone
      this.handleZoneEntry(tracking, zone, location);
    } else if (!isInsideNow && wasInsideBefore) {
      // Officer exited the zone
      this.handleZoneExit(tracking, zone, location);
    }

    // Update current status
    currentStatus.isInside = isInsideNow;
    currentStatus.lastUpdate = location.timestamp;
    currentStatus.officerLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
    };
  }

  /**
   * Handle officer entering a zone
   */
  private handleZoneEntry(tracking: OfficerZoneTracking, zone: Geofence, location: { latitude: number; longitude: number; accuracy?: number; timestamp: number }) {
    const entryEvent: ZoneEvent = {
      id: `entry_${zone.id}_${tracking.officerId}_${Date.now()}`,
      officerId: tracking.officerId,
      officerName: tracking.officerName,
      zoneId: zone.id,
      zoneName: zone.name,
      eventType: 'entry',
      timestamp: location.timestamp,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      },
    };

    // Add to event history
    tracking.eventHistory.push(entryEvent);

    // Update zone status
    const zoneStatus = tracking.currentStatus.find(status => status.zoneId === zone.id);
    if (zoneStatus) {
      zoneStatus.isInside = true;
      zoneStatus.entryTime = location.timestamp;
    }

    console.log('🟢 Officer entered zone:', {
      officer: tracking.officerName,
      zone: zone.name,
      time: new Date(location.timestamp).toLocaleString(),
      location: { lat: location.latitude, lng: location.longitude }
    });

    // Notify listeners
    this.notifyListeners(tracking.officerId, entryEvent);
  }

  /**
   * Handle officer exiting a zone
   */
  private handleZoneExit(tracking: OfficerZoneTracking, zone: Geofence, location: { latitude: number; longitude: number; accuracy?: number; timestamp: number }) {
    const zoneStatus = tracking.currentStatus.find(status => status.zoneId === zone.id);
    const entryTime = zoneStatus?.entryTime;
    const duration = entryTime ? (location.timestamp - entryTime) / 1000 : undefined; // Convert to seconds

    const exitEvent: ZoneEvent = {
      id: `exit_${zone.id}_${tracking.officerId}_${Date.now()}`,
      officerId: tracking.officerId,
      officerName: tracking.officerName,
      zoneId: zone.id,
      zoneName: zone.name,
      eventType: 'exit',
      timestamp: location.timestamp,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      },
      duration,
    };

    // Add to event history
    tracking.eventHistory.push(exitEvent);

    // Update zone status
    if (zoneStatus) {
      zoneStatus.isInside = false;
      zoneStatus.entryTime = undefined;
    }

    console.log('🔴 Officer exited zone:', {
      officer: tracking.officerName,
      zone: zone.name,
      time: new Date(location.timestamp).toLocaleString(),
      duration: duration ? `${Math.round(duration)}s` : 'Unknown',
      location: { lat: location.latitude, lng: location.longitude }
    });

    // Notify listeners
    this.notifyListeners(tracking.officerId, exitEvent);
  }

  /**
   * Check if a point is inside a zone - DISABLED (backend handles geofence logic)
   */
  private isPointInZone(latitude: number, longitude: number, zone: Geofence): boolean {
    console.log('🚫 Zone tracking disabled - frontend no longer handles geofence calculations');
    // Backend handles all geofence logic, frontend should not perform zone detection
    // Return false instead of performing calculations
    return false;
  }

  /**
   * Check if point is inside a polygon - DISABLED (backend handles geofence logic)
   */
  private isPointInPolygon(latitude: number, longitude: number, polygonJson: string): boolean {
    console.log('🚫 Zone tracking disabled - frontend no longer handles polygon calculations');
    // Backend handles all geofence logic, frontend should not perform polygon detection
    // Return false instead of performing calculations
    return false;
  }

  /**
   * Check if point is inside a circle - DISABLED (backend handles geofence logic)
   */
  private isPointInCircle(latitude: number, longitude: number, centerLat: number, centerLng: number, radius: number): boolean {
    console.log('🚫 Zone tracking disabled - frontend no longer handles circle calculations');
    // Backend handles all geofence logic, frontend should not perform circle detection
    // Return false instead of performing calculations
    return false;
  }

  /**
   * Get current zone status for an officer
   */
  getOfficerZoneStatus(officerId: string): ZoneStatus[] {
    const tracking = this.trackingData.get(officerId);
    return tracking ? tracking.currentStatus : [];
  }

  /**
   * Get recent zone events for an officer
   */
  getOfficerZoneEvents(officerId: string, limit: number = 50): ZoneEvent[] {
    const tracking = this.trackingData.get(officerId);
    if (!tracking) return [];

    return tracking.eventHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get all officers currently in a specific zone
   */
  getOfficersInZone(zoneId: string): OfficerZoneTracking[] {
    const officersInZone: OfficerZoneTracking[] = [];

    this.trackingData.forEach(tracking => {
      const zoneStatus = tracking.currentStatus.find(status => status.zoneId === zoneId);
      if (zoneStatus && zoneStatus.isInside) {
        officersInZone.push(tracking);
      }
    });

    return officersInZone;
  }

  /**
   * Add event listener for zone events
   */
  addEventListener(officerId: string, callback: (event: ZoneEvent) => void) {
    if (!this.eventListeners.has(officerId)) {
      this.eventListeners.set(officerId, []);
    }
    this.eventListeners.get(officerId)!.push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(officerId: string, callback: (event: ZoneEvent) => void) {
    const listeners = this.eventListeners.get(officerId);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Notify all listeners for an officer
   */
  private notifyListeners(officerId: string, event: ZoneEvent) {
    const listeners = this.eventListeners.get(officerId);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('❌ Error in zone event listener:', error);
        }
      });
    }
  }

  /**
   * Get zone tracking summary for an officer
   */
  getTrackingSummary(officerId: string): {
    officerName: string;
    assignedZones: { id: string; name: string; isInside: boolean; entryTime?: number }[];
    recentEvents: ZoneEvent[];
    totalEvents: number;
  } | null {
    const tracking = this.trackingData.get(officerId);
    if (!tracking) return null;

    return {
      officerName: tracking.officerName,
      assignedZones: tracking.currentStatus.map(status => ({
        id: status.zoneId,
        name: status.zoneName,
        isInside: status.isInside,
        entryTime: status.entryTime,
      })),
      recentEvents: tracking.eventHistory.slice(-10).reverse(),
      totalEvents: tracking.eventHistory.length,
    };
  }

  /**
   * Clear tracking data for an officer
   */
  clearOfficerTracking(officerId: string) {
    this.trackingData.delete(officerId);
    this.eventListeners.delete(officerId);
    console.log('🗑️ Cleared zone tracking data for officer:', officerId);
  }

  /**
   * Get all active tracking data
   */
  getAllTrackingData(): Map<string, OfficerZoneTracking> {
    return this.trackingData;
  }
}

export const zoneTrackingService = new ZoneTrackingService();
export type { ZoneEvent, ZoneStatus, OfficerZoneTracking };

import apiClient from '../api/apiClient';
import { Geofence } from '../types/alert.types';

// Define interfaces for officer geofence assignments
interface OfficerGeofenceAssignment {
  id: string;
  officer_id: string;
  geofence_id: string;
  assigned_at: string;
  assigned_by: string;
  is_active: boolean;
  geofence?: Geofence;
}

interface OfficerWithGeofences {
  officer_id: string;
  officer_name: string;
  assigned_geofences: Geofence[];
}

class OfficerGeofenceService {
  private cache: Map<string, Geofence[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all geofences assigned to an officer
   */
  async getOfficerAssignedGeofences(officerId: string): Promise<Geofence[]> {
    // Check cache first
    const cached = this.getCachedData(officerId);
    if (cached) {
      console.log('📋 Using cached geofences for officer:', officerId);
      return cached;
    }

    try {
      console.log('🔍 Fetching assigned geofences for officer:', officerId);
      
      // Try to get from assignments endpoint
      const response = await apiClient.get(`/officers/${officerId}/geofences/`);
      
      if (response.data && Array.isArray(response.data)) {
        const geofences = response.data
          .map((assignment: OfficerGeofenceAssignment) => assignment.geofence)
          .filter((geofence): geofence is Geofence => geofence !== null);

        // Cache the results
        this.setCachedData(officerId, geofences);
        
        console.log('✅ Retrieved assigned geofences:', {
          officerId,
          count: geofences.length,
          geofenceNames: geofences.map(g => g.name)
        });
        
        return geofences;
      }
      
      // Fallback: try to get all geofences and filter by officer assignments
      return await this.getAllGeofencesForOfficer(officerId);
      
    } catch (error: any) {
      // Check if it's a 404 error (expected - endpoint doesn't exist)
      if (error.status === 404) {
        console.log('ℹ️ Officer geofence endpoint not found (404), using mock data');
      } else {
        console.error('❌ Failed to fetch officer geofences:', error);
      }
      
      // Fallback to mock data for development
      return this.getMockOfficerGeofences(officerId);
    }
  }

  /**
   * Get all geofences and filter for officer assignments
   */
  private async getAllGeofencesForOfficer(officerId: string): Promise<Geofence[]> {
    try {
      console.log('🔍 Fetching all geofences from existing endpoint:', officerId);
      
      // Use the existing geofence endpoint that exists in the backend
      const response = await apiClient.get('/geofence/');
      
      if (response.data && Array.isArray(response.data)) {
        // For now, return all active geofences as assigned
        // In a real implementation, this would filter based on officer assignments
        const allGeofences = response.data;
        const assignedGeofences = allGeofences.filter((geofence: any) => 
          geofence.status === 'active' || geofence.active !== false
        );
        
        this.setCachedData(officerId, assignedGeofences);
        
        console.log('✅ Retrieved geofences from existing endpoint:', {
          officerId,
          totalGeofences: allGeofences.length,
          assignedGeofences: assignedGeofences.length,
          geofenceNames: assignedGeofences.map((g: any) => g.name)
        });
        
        return assignedGeofences;
      }
      
      return [];
    } catch (error: any) {
      console.error('❌ Failed to fetch geofences from existing endpoint:', error);
      return this.getMockOfficerGeofences(officerId);
    }
  }

  /**
   * Get mock geofences for development/testing
   */
  private getMockOfficerGeofences(officerId: string): Geofence[] {
    console.log('🎭 Using mock geofences for officer:', officerId);
    
    const mockGeofences: Geofence[] = [
      {
        id: 'mock_zone_1',
        name: 'Main Security Zone',
        description: 'Primary security patrol area',
        geofence_type: 'polygon',
        polygon_json: JSON.stringify({
          type: 'Polygon',
          coordinates: [[
            [73.8560, 18.5200], // [longitude, latitude]
            [73.8570, 18.5200],
            [73.8570, 18.5210],
            [73.8560, 18.5210],
            [73.8560, 18.5200]
          ]]
        }),
        center_latitude: 18.5205,
        center_longitude: 73.8565,
        radius: 500,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'mock_zone_2',
        name: 'Parking Area',
        description: 'Parking lot surveillance zone',
        geofence_type: 'circle',
        polygon_json: undefined,
        center_latitude: 18.5215,
        center_longitude: 73.8575,
        radius: 200,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ];
    
    this.setCachedData(officerId, mockGeofences);
    return mockGeofences;
  }

  /**
   * Get cached data if not expired
   */
  private getCachedData(officerId: string): Geofence[] | null {
    const cached = this.cache.get(officerId);
    const expiry = this.cacheExpiry.get(officerId);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }
    
    // Clear expired cache
    if (cached) {
      this.cache.delete(officerId);
      this.cacheExpiry.delete(officerId);
    }
    
    return null;
  }

  /**
   * Set cached data with expiry
   */
  private setCachedData(officerId: string, geofences: Geofence[]): void {
    this.cache.set(officerId, geofences);
    this.cacheExpiry.set(officerId, Date.now() + this.CACHE_DURATION);
  }

  /**
   * Clear cache for specific officer
   */
  clearOfficerCache(officerId: string): void {
    this.cache.delete(officerId);
    this.cacheExpiry.delete(officerId);
    console.log('🗑️ Cleared geofence cache for officer:', officerId);
  }

  /**
   * Assign geofence to officer (ADMIN/SUBADMIN ONLY)
   * Backend API for subadmin to assign geofences to officers
   */
  async assignGeofenceToOfficer(officerId: string, geofenceId: string, assignedBy: string): Promise<OfficerGeofenceAssignment> {
    try {
      console.log('👮 Assigning geofence to officer:', { officerId, geofenceId, assignedBy });
      
      const assignmentData = {
        officer_id: officerId,
        geofence_id: geofenceId,
        assigned_by: assignedBy,
        is_active: true
      };
      
      const response = await apiClient.post('/admin/officers/' + officerId + '/geofences/', assignmentData);
      
      console.log('✅ Geofence assigned successfully:', response.data);
      
      // Clear cache for this officer
      this.clearCacheForOfficer(officerId);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to assign geofence:', error);
      throw new Error(`Failed to assign geofence: ${error.message || error}`);
    }
  }

  /**
   * Deactivate/unassign geofence from officer (ADMIN/SUBADMIN ONLY)
   * Backend API for subadmin to remove geofence assignments
   */
  async deactivateGeofenceAssignment(officerId: string, geofenceId: string): Promise<void> {
    try {
      console.log('🗑️ Deactivating geofence assignment:', { officerId, geofenceId });
      
      const response = await apiClient.patch('/admin/officers/' + officerId + '/geofences/' + geofenceId + '/', {
        is_active: false
      });
      
      console.log('✅ Geofence assignment deactivated:', response.data);
      
      // Clear cache for this officer
      this.clearCacheForOfficer(officerId);
    } catch (error: any) {
      console.error('❌ Failed to deactivate geofence assignment:', error);
      throw new Error(`Failed to deactivate geofence assignment: ${error.message || error}`);
    }
  }

  /**
   * Clear cache for specific officer
   */
  private clearCacheForOfficer(officerId: string): void {
    this.cache.delete(officerId);
    this.cacheExpiry.delete(officerId);
    console.log('🗑️ Cleared cache for officer:', officerId);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    console.log('🗑️ Cleared all geofence cache');
  }

  /**
   * Get geofence coordinates for map display
   */
  getGeofenceCoordinates(geofence: Geofence): Array<{latitude: number, longitude: number}> | null {
    try {
      if (geofence.geofence_type === 'polygon' && geofence.polygon_json) {
        const polygon = JSON.parse(geofence.polygon_json);
        if (polygon.type === 'Polygon' && polygon.coordinates && polygon.coordinates[0]) {
          return polygon.coordinates[0].map((coord: number[]) => ({
            latitude: coord[1], // GeoJSON is [longitude, latitude]
            longitude: coord[0]
          }));
        }
      } else if (geofence.geofence_type === 'circle') {
        // Create circle approximation using polygon points
        const centerLat = geofence.center_latitude;
        const centerLng = geofence.center_longitude;
        const radius = geofence.radius || 1000;
        
        if (!centerLat || !centerLng) {
          return null;
        }
        
        // Create circle points (approximate circle with 32 points)
        const points = [];
        const numPoints = 32;
        for (let i = 0; i <= numPoints; i++) {
          const angle = (i / numPoints) * 2 * Math.PI;
          const lat = centerLat + (radius / 111320) * Math.cos(angle);
          const lng = centerLng + (radius / (111320 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle);
          points.push({ latitude: lat, longitude: lng });
        }
        
        return points;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error parsing geofence coordinates:', error);
      return null;
    }
  }

  /**
   * Get all geofence coordinates for an officer
   */
  async getAllOfficerGeofenceCoordinates(officerId: string): Promise<Array<{id: string, name: string, coordinates: Array<{latitude: number, longitude: number}>}>> {
    const geofences = await this.getOfficerAssignedGeofences(officerId);
    
    return geofences.map(geofence => ({
      id: geofence.id,
      name: geofence.name,
      coordinates: this.getGeofenceCoordinates(geofence) || []
    })).filter(g => g.coordinates.length > 0);
  }

  /**
   * Check if officer is assigned to any geofences
   */
  async hasOfficerGeofences(officerId: string): Promise<boolean> {
    const geofences = await this.getOfficerAssignedGeofences(officerId);
    return geofences.length > 0;
  }
}

export const officerGeofenceService = new OfficerGeofenceService();

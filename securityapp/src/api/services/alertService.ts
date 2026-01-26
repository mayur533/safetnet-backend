import apiClient, { ApiError } from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { Alert } from '../../types/alert.types';

export interface DashboardStats {
  active: number;
  pending: number;
  resolved: number;
  total: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recent_alerts: Alert[];
  officer_info?: {
    name: string;
    badge_number: string;
    status: string;
  };
}



export const alertService = {

  // Get all alerts (SOS alerts)
  getAlerts: async (): Promise<Alert[]> => {
    try {
      console.log('📡 GET /sos/ - Fetching all alerts from backend');
      const response = await apiClient.get(API_ENDPOINTS.LIST_SOS);
      console.log(`📥 GET /sos/ response count: ${response.data.results ? response.data.results.length : response.data.length} alerts`);

      let alertsData: any[] = [];

      // Handle paginated response (Django REST Framework style)
      if (response.data.results && Array.isArray(response.data.results)) {
        // Paginated response: { count, next, previous, results: [...] }
        alertsData = response.data.results;
      } else if (Array.isArray(response.data)) {
        // Direct array response
        alertsData = response.data;
      } else {
        console.warn('Unexpected API response format for getAlerts');
        return [];
      }

      // Transform alerts to ensure they have the correct fields
      // Backend must provide integer IDs - no fallbacks to fake IDs
      const transformedAlerts = alertsData.map(alert => ({
        ...alert,
        // Backend provides integer ID - ensure it's a number
        id: typeof alert.id === 'number' ? alert.id : parseInt(alert.id) || alert.pk || alert.alert_id,
        // Ensure other required fields exist with defaults
        log_id: alert.log_id || '',
        user_id: alert.user_id || '',
        user_name: alert.user_name || alert.user || 'Unknown User',
        user_email: alert.user_email || '',
        user_phone: alert.user_phone || '',
        alert_type: alert.alert_type || 'security',
        priority: alert.priority || 'medium',
        message: alert.message || 'Alert message',
        location: alert.location || {
          latitude: alert.latitude || alert.location_lat || 0,
          longitude: alert.longitude || alert.location_long || 0,
          address: alert.address || 'Unknown location'
        },
        timestamp: alert.timestamp || alert.created_at || new Date().toISOString(),
        status: alert.status || 'pending',
        geofence_id: alert.geofence_id || '',
        created_at: alert.created_at || alert.timestamp || new Date().toISOString(),
        updated_at: alert.updated_at
      }));

      console.log('✅ Fetched alerts:', transformedAlerts.length, 'alerts');
      return transformedAlerts;
    } catch (error: any) {
      console.error('Failed to fetch alerts:', error.message || error);
      console.error('Error details:', error.response?.data || error);

      // Return empty array - real alerts should come from backend only
      return [];
    }
  },

  // Get active alerts only
  getActiveAlerts: async (): Promise<Alert[]> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.GET_ACTIVE_SOS);
      return response.data;
    } catch (error) {
      console.error('Error fetching active alerts:', error);
      throw error;
    }
  },

  // Get resolved alerts only
  getResolvedAlerts: async (): Promise<Alert[]> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.GET_RESOLVED_SOS);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching resolved alerts:', error);
      console.error('Error details:', error.response?.data || error);

      // Return empty array - real alerts should come from backend only
      return [];
    }
  },

  // Get alert by ID
  getAlertById: async (id: string): Promise<Alert> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.GET_SOS.replace('{id}', String(id)));
      return response.data;
    } catch (error) {
      console.error('Error fetching alert:', error);
      throw error;
    }
  },

  // Accept/respond to alert
  acceptAlert: async (id: string): Promise<Alert> => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.UPDATE_SOS.replace('{id}', String(id)), {
        status: 'accepted'
      });
      return response.data;
    } catch (error) {
      console.error('Error accepting alert:', error);
      throw error;
    }
  },

  // Resolve/close alert
  resolveAlert: async (id: string): Promise<Alert> => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.RESOLVE_SOS.replace('{id}', String(id)));
      return response.data;
    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  },

  // Create new alert (for officers)
  createAlert: async (alertData: {
    alert_type: 'emergency' | 'security' | 'general';
    message: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    location?: string;
  }): Promise<Alert> => {
    // Format data to match backend expectations
    const apiData = {
      alert_type: alertData.alert_type === 'general' ? 'normal' : alertData.alert_type,
      message: alertData.message,
      description: alertData.description || alertData.message,
      location_lat: alertData.latitude || 18.6472,
      location_long: alertData.longitude || 73.7845,
      location: alertData.location || 'Current Location',
    };

    try {
      console.log('📡 Creating alert with data:', apiData);
      console.log('📤 POST /sos/ request payload:', JSON.stringify(apiData, null, 2));

      const response = await apiClient.post(API_ENDPOINTS.CREATE_SOS, apiData);

      console.log('📥 POST /sos/ response:', {
        status: response.status,
        data: response.data,
        id: response.data.id,
        alert_type: response.data.alert_type,
        message: response.data.message
      });
      console.log('✅ Alert created, response:', response.data);

      // Transform the response to ensure it matches our Alert interface
      // Backend must return the real integer ID
      const createdAlert = {
        ...response.data,
        // Backend provides integer ID - ensure it's a number
        id: typeof response.data.id === 'number' ? response.data.id : parseInt(response.data.id) || response.data.pk || response.data.alert_id,
        // Ensure other required fields exist with defaults
        log_id: response.data.log_id || '',
        user_id: response.data.user_id || '',
        user_name: response.data.user_name || response.data.user || 'Security Officer',
        user_email: response.data.user_email || '',
        user_phone: response.data.user_phone || '',
        alert_type: response.data.alert_type || apiData.alert_type,
        priority: response.data.priority || (apiData.alert_type === 'emergency' ? 'high' : 'medium'),
        message: response.data.message || apiData.message,
        location: response.data.location || {
          latitude: apiData.location_lat,
          longitude: apiData.location_long,
          address: apiData.location
        },
        timestamp: response.data.timestamp || response.data.created_at || new Date().toISOString(),
        status: response.data.status || 'pending',
        geofence_id: response.data.geofence_id || '',
        created_at: response.data.created_at || response.data.timestamp || new Date().toISOString(),
        updated_at: response.data.updated_at
      };

      console.log('🔄 Transformed created alert:', createdAlert.id);
      return createdAlert;
    } catch (error: any) {
      console.error('Failed to create alert:', error.message || error);
      console.error('Error details:', error.response?.data || error);
      throw error; // Don't create mock alerts - let the UI handle the error
    }
  },

  // Delete alert
  deleteAlert: async (id: number): Promise<void> => {
    try {
      console.log('Attempting to delete alert:', id);
      await apiClient.delete(API_ENDPOINTS.DELETE_SOS.replace('{id}', String(id)));
      console.log('Alert deleted successfully');
    } catch (error: any) {
      console.error('Error deleting alert:', error);

      // Handle specific error cases
      if (error.response?.status === 404) {
        console.error('DELETE endpoint not implemented on backend');
        throw new Error('Delete functionality is not yet available. This feature will be implemented with the next backend update.');
      } else if (error.response?.status === 405) {
        console.error('DELETE method not allowed');
        throw new Error('Delete operation is not permitted on this alert.');
      } else if (error.response?.status >= 500) {
        console.error('Server error during delete');
        throw new Error('Server error occurred. Please try again later.');
      } else {
        // Re-throw other errors
        throw error;
      }
    }
  },

  // Get dashboard data
  getDashboardData: async (): Promise<DashboardData> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.DASHBOARD);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error.message || error);
      // Return empty dashboard data
      return {
        stats: { active: 0, pending: 0, resolved: 0, total: 0 },
        recent_alerts: [],
      };
    }
  },

  // Legacy alert endpoints (for backward compatibility)
  getSecurityAlerts: async (): Promise<Alert[]> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.GET_SECURITY_ALERTS);
      return response.data;
    } catch (error) {
      console.error('Error fetching security alerts:', error);
      // Fallback to SOS alerts if legacy endpoint fails
      return alertService.getAlerts();
    }
  },
};
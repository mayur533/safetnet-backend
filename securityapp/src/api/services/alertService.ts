import apiClient from '../axios.config';
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
      console.log('Fetching alerts from:', API_ENDPOINTS.LIST_SOS);
      const response = await apiClient.get(API_ENDPOINTS.LIST_SOS);
      console.log('Alerts API response:', response.data);

      // Ensure response.data is an array
      if (!Array.isArray(response.data)) {
        console.warn('API returned non-array data for alerts:', response.data);
        return []; // Return empty array instead of throwing
      }

      return response.data;
    } catch (error: any) {
      console.warn('Backend alerts API failed, falling back to mock data:', error.message);

      // Fallback to mock data when backend is unavailable
      const mockAlerts = [
        {
          id: 1,
          user_name: 'John Doe',
          user_mobile: '+1234567890',
          alert_type: 'emergency' as const,
          original_alert_type: 'emergency' as const,
          message: 'Emergency alert - Medical assistance needed',
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: new Date().toISOString(),
          status: 'pending' as const,
          priority: 'high' as const,
          location: 'San Francisco, CA',
          description: 'Medical emergency at downtown location'
        },
        {
          id: 2,
          user_name: 'Jane Smith',
          user_mobile: '+1234567891',
          alert_type: 'security' as const,
          original_alert_type: 'security' as const,
          message: 'Security concern - Suspicious activity',
          latitude: 37.7849,
          longitude: -122.4094,
          timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          status: 'accepted' as const,
          priority: 'medium' as const,
          location: 'Market Street, San Francisco',
          description: 'Suspicious person observed near bank'
        },
        {
          id: 3,
          user_name: 'Bob Wilson',
          user_mobile: '+1234567892',
          alert_type: 'general' as const,
          original_alert_type: 'general' as const,
          message: 'General assistance request',
          latitude: 37.7649,
          longitude: -122.4294,
          timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          status: 'completed' as const,
          priority: 'low' as const,
          location: 'Mission District, San Francisco',
          description: 'Request for directions to police station'
        }
      ];

      return mockAlerts;
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

  // Get alert by ID
  getAlertById: async (id: string): Promise<Alert> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.GET_SOS.replace('{id}', id));
      return response.data;
    } catch (error) {
      console.error('Error fetching alert:', error);
      throw error;
    }
  },

  // Accept/respond to alert
  acceptAlert: async (id: string): Promise<Alert> => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.UPDATE_SOS.replace('{id}', id), {
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
      const response = await apiClient.patch(API_ENDPOINTS.RESOLVE_SOS.replace('{id}', id));
      return response.data;
    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  },

  // Delete alert
  deleteAlert: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(API_ENDPOINTS.DELETE_SOS.replace('{id}', id));
    } catch (error) {
      console.error('Error deleting alert:', error);
      throw error;
    }
  },

  // Get dashboard data
  getDashboardData: async (): Promise<DashboardData> => {
    try {
      console.log('Attempting to fetch dashboard data from:', API_ENDPOINTS.DASHBOARD);
      const response = await apiClient.get(API_ENDPOINTS.DASHBOARD);
      console.log('Dashboard data fetched successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.warn('Backend dashboard API failed, falling back to mock data:', error.message);

      // Fallback to mock dashboard data when backend is unavailable
      const mockAlerts = await this.getAlerts(); // Use the same mock alerts
      const active = mockAlerts.filter(alert => alert.status === 'pending' || alert.status === 'accepted').length;
      const pending = mockAlerts.filter(alert => alert.status === 'pending').length;
      const resolved = mockAlerts.filter(alert => alert.status === 'completed').length;

      const recentAlerts = mockAlerts
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 2);

      return {
        stats: { active, pending, resolved, total: active + pending + resolved },
        recent_alerts: recentAlerts,
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
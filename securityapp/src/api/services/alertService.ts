import { apiClient } from '../axios.config';
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
      const response = await apiClient.get(API_ENDPOINTS.LIST_SOS);
      return response.data;
    } catch (error) {
      console.error('Error fetching alerts:', error);
      throw error;
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
      const response = await apiClient.get(API_ENDPOINTS.DASHBOARD);
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
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
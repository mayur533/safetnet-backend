import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'emergency' | 'alert';
  status: 'unread' | 'read' | 'acknowledged';
  created_at: string;
  updated_at?: string;
  priority: 'low' | 'medium' | 'high';
  sender?: string;
  geofence_id?: string;
}

export interface AcknowledgeNotificationPayload {
  notification_ids: string[];
}

export const notificationsService = {
  // Get all notifications
  getNotifications: async (): Promise<Notification[]> => {
    try {
      console.log('📡 Fetching notifications');
      const response = await apiClient.get(API_ENDPOINTS.LIST_NOTIFICATIONS);

      // Handle both array response and paginated response
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data.results && Array.isArray(response.data.results)) {
        return response.data.results;
      }

      console.log('✅ Fetched notifications');
      return [];
    } catch (error: any) {
      console.error('❌ Failed to fetch notifications:', error);
      console.error('Error details:', error.response?.data || error);
      return [];
    }
  },

  // Get notification by ID
  getNotificationById: async (id: string): Promise<Notification | null> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.LIST_NOTIFICATIONS.replace('{id}', id));
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to fetch notification:', error);
      return null;
    }
  },

  // Acknowledge notifications
  acknowledgeNotifications: async (notificationIds: string[]): Promise<{ success: boolean; acknowledged_count: number }> => {
    try {
      console.log('📡 Acknowledging notifications:', notificationIds);
      const payload: AcknowledgeNotificationPayload = {
        notification_ids: notificationIds
      };

      const response = await apiClient.post(API_ENDPOINTS.ACKNOWLEDGE_NOTIFICATIONS, payload);

      console.log('✅ Notifications acknowledged successfully');
      return {
        success: true,
        acknowledged_count: notificationIds.length
      };
    } catch (error: any) {
      console.error('❌ Failed to acknowledge notifications:', error);
      throw error;
    }
  },

  // Acknowledge single notification
  acknowledgeNotification: async (notificationId: string): Promise<boolean> => {
    try {
      await notificationsService.acknowledgeNotifications([notificationId]);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to acknowledge notification:', error);
      throw error;
    }
  }
};
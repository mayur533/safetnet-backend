import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';

interface BroadcastData {
  security_id: string;
  geofence_id: string;
  message: string;
  alert_type: 'general' | 'warning' | 'emergency';
  priority: boolean;
}

interface BroadcastResponse {
  success: boolean;
  message: string;
  broadcast_id?: string;
  recipients_count?: number;
}

export const broadcastService = {
  // Send broadcast message to users in area
  sendBroadcast: async (data: BroadcastData): Promise<BroadcastResponse> => {
    try {
      console.log('📡 Sending broadcast:', data);
      const response = await apiClient.post(API_ENDPOINTS.SEND_BROADCAST, {
        message: data.message,
        alert_type: data.alert_type,
        priority: data.priority,
        geofence_id: data.geofence_id,
        security_id: data.security_id
      });

      console.log('✅ Broadcast sent successfully');
      return {
        success: true,
        message: 'Broadcast sent successfully',
        broadcast_id: response.data?.id,
        recipients_count: response.data?.recipients_count
      };
    } catch (error: any) {
      console.error('❌ Failed to send broadcast:', error);
      console.error('Error details:', error.response?.data || error);
      throw error;
    }
  },

  // Get broadcast history (placeholder - may not be implemented)
  getBroadcastHistory: async (): Promise<any[]> => {
    try {
      // This endpoint may not exist on backend
      console.log('📡 Fetching broadcast history');
      const response = await apiClient.get(`${API_ENDPOINTS.SEND_BROADCAST}history/`);
      return response.data || [];
    } catch (error: any) {
      console.error('❌ Failed to fetch broadcast history:', error);
      // Return empty array if endpoint doesn't exist
      return [];
    }
  }
};
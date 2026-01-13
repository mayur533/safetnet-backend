// Stub service for broadcast functionality - returns dummy data only
interface BroadcastData {
  security_id: string;
  geofence_id: string;
  message: string;
  alert_type: 'general' | 'warning' | 'emergency';
  priority: boolean;
}

export const broadcastService = {
  sendBroadcast: (data: BroadcastData) => Promise.resolve({
    success: true,
    message: 'Broadcast sent successfully',
  }),
  getBroadcastHistory: () => Promise.resolve([]),
};
import { create } from 'zustand';
import { Notification, notificationsService } from '../api/services/notificationsService';

interface NotificationsState {
  // State
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;

  // Actions
  fetchNotifications: () => Promise<void>;
  acknowledgeNotification: (notificationId: string) => Promise<void>;
  acknowledgeMultipleNotifications: (notificationIds: string[]) => Promise<void>;

  // Helper actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Computed properties
  getUnreadCount: () => number;
  getNotificationsByStatus: (status: 'unread' | 'read' | 'acknowledged') => Notification[];
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  // Initial state
  notifications: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  // Fetch notifications from API
  fetchNotifications: async () => {
    set({ isLoading: true, error: null });

    try {
      console.log('🔔 Fetching notifications from API...');
      const notifications = await notificationsService.getNotifications();

      set({
        notifications,
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      });

      console.log(`✅ Fetched ${notifications.length} notifications from API`);
    } catch (error: any) {
      console.error('❌ Failed to fetch notifications:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch notifications'
      });
    }
  },

  // Acknowledge single notification
  acknowledgeNotification: async (notificationId: string) => {
    const { notifications } = get();

    // Find the notification to acknowledge
    const notificationToAcknowledge = notifications.find(n => n.id === notificationId);
    if (!notificationToAcknowledge) {
      throw new Error(`Notification with id ${notificationId} not found`);
    }

    // Optimistically update the UI
    const updatedNotifications = notifications.map(notification =>
      notification.id === notificationId
        ? { ...notification, status: 'acknowledged' as const }
        : notification
    );

    set({
      notifications: updatedNotifications,
      error: null
    });

    console.log('⚡ Notification acknowledged optimistically in UI');

    try {
      // Make API call
      console.log('📡 Making API call to acknowledge notification:', notificationId);
      await notificationsService.acknowledgeNotification(notificationId);

      set({
        lastUpdated: new Date().toISOString()
      });

      console.log('✅ Notification acknowledged successfully via API');

    } catch (error: any) {
      console.error('❌ Notification acknowledge failed, rolling back:', error);

      // Rollback: Restore original notification
      set({
        notifications,
        error: error?.message || 'Failed to acknowledge notification'
      });

      throw error;
    }
  },

  // Acknowledge multiple notifications
  acknowledgeMultipleNotifications: async (notificationIds: string[]) => {
    const { notifications } = get();

    // Optimistically update the UI
    const updatedNotifications = notifications.map(notification =>
      notificationIds.includes(notification.id)
        ? { ...notification, status: 'acknowledged' as const }
        : notification
    );

    set({
      notifications: updatedNotifications,
      error: null
    });

    console.log(`⚡ ${notificationIds.length} notifications acknowledged optimistically in UI`);

    try {
      // Make API call
      console.log('📡 Making API call to acknowledge notifications:', notificationIds);
      await notificationsService.acknowledgeNotifications(notificationIds);

      set({
        lastUpdated: new Date().toISOString()
      });

      console.log(`✅ ${notificationIds.length} notifications acknowledged successfully via API`);

    } catch (error: any) {
      console.error('❌ Multiple notifications acknowledge failed, rolling back:', error);

      // Rollback: Restore original notifications
      set({
        notifications,
        error: error?.message || 'Failed to acknowledge notifications'
      });

      throw error;
    }
  },

  // Helper actions
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),

  // Computed properties
  getUnreadCount: () => {
    const { notifications } = get();
    return notifications.filter(n => n.status === 'unread').length;
  },

  getNotificationsByStatus: (status: 'unread' | 'read' | 'acknowledged') => {
    const { notifications } = get();
    return notifications.filter(n => n.status === status);
  },
}));
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ListLoading, FormLoading, ContentLoading } from '@/components/ui/content-loading';
import { notificationsService, type Notification as BackendNotification } from '@/lib/services/notifications';

type NotificationType = 'NORMAL' | 'EMERGENCY';

export default function SubAdminNotificationsPage() {
  const [notifications, setNotifications] = useState<BackendNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationType, setNotificationType] = useState<NotificationType>('NORMAL');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetGeofence, setTargetGeofence] = useState('');

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await notificationsService.getAll();
      setNotifications(data);
    } catch (error: any) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !message || !targetGeofence) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await notificationsService.send({
        notification_type: notificationType,
        title,
        message,
        target_type: 'GEOFENCE_OFFICERS',
        target_geofence: parseInt(targetGeofence),
      });

      toast.success(`${notificationType === 'EMERGENCY' ? 'Emergency' : 'Normal'} notification sent successfully!`);
      
      // Reset form
      setTitle('');
      setMessage('');
      setTargetGeofence('');
      setNotificationType('NORMAL');
      
      // Refresh notifications list
      fetchNotifications();
    } catch (error: any) {
      console.error('Send notification error:', error);
      toast.error('Failed to send notification');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Send Notifications</h1>
          <p className="text-muted-foreground mt-1">Send alerts to security officers in your area</p>
        </div>

        {/* Form Loading Skeleton */}
        <div className="bg-card p-6 rounded-lg shadow-md border">
          <FormLoading fields={4} />
        </div>

        {/* History Loading Skeleton */}
        <div className="bg-card rounded-lg shadow-md border">
          <div className="px-6 py-4 border-b">
            <div className="h-6 w-48 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="p-6">
            <ListLoading rows={5} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Send Notifications</h1>
        <p className="text-muted-foreground mt-1">Send alerts to security officers in your area</p>
      </div>

      {/* Notification Form */}
      <div className="bg-card p-6 rounded-lg shadow-md border">
        <form onSubmit={handleSendNotification} className="space-y-4">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Notification Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setNotificationType('NORMAL')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      notificationType === 'NORMAL'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="material-icons-outlined text-primary mb-2" style={{ fontSize: '32px' }}>
                      notifications
                    </span>
                    <div className="font-medium">Normal Alert</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotificationType('EMERGENCY')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      notificationType === 'EMERGENCY'
                        ? 'border-red-500 bg-red-50'
                        : 'border-border hover:border-red-300'
                    }`}
                  >
                    <span className="material-icons-outlined text-red-600 mb-2" style={{ fontSize: '32px' }}>
                      emergency
                    </span>
                    <div className="font-medium text-red-600">Emergency Alert</div>
                  </button>
                </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title..."
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
              rows={4}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {message.length} / 500 characters
            </div>
          </div>

          {/* Target Geofence */}
          <div>
            <label className="block text-sm font-medium mb-2">Target Geofence</label>
            <select
              required
              value={targetGeofence}
              onChange={(e) => setTargetGeofence(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Geofence</option>
              <option value="all">All My Areas</option>
              <option value="north">North Gate</option>
              <option value="east">East Sector</option>
              <option value="west">West Zone</option>
              <option value="south">South Entrance</option>
              <option value="central">Central Park</option>
              <option value="main">Main Entrance</option>
              <option value="parking">Parking Area B</option>
              <option value="recreation">Recreation Center</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className={`px-6 py-2 rounded-lg text-white transition-colors flex items-center space-x-2 ${
                notificationType === 'EMERGENCY'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              <span className="material-icons-outlined">send</span>
              <span>Send Notification</span>
            </button>
          </div>
        </form>
      </div>

      {/* Notification History */}
      <div className="bg-card rounded-lg shadow-md border">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Notification History</h3>
        </div>
        <div className="divide-y">
          {notifications.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-icons text-6xl text-muted-foreground mb-2">
                notifications_none
              </span>
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="p-6 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`p-3 rounded-lg ${
                      notification.notification_type === 'EMERGENCY' 
                        ? 'bg-red-100' 
                        : 'bg-blue-100'
                    }`}>
                      <span className={`material-icons-outlined ${
                        notification.notification_type === 'EMERGENCY' ? 'text-red-600' : 'text-blue-600'
                      }`} style={{ fontSize: '24px' }}>
                        {notification.notification_type === 'EMERGENCY' ? 'emergency' : 'notifications'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold">{notification.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          notification.notification_type === 'EMERGENCY' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {notification.notification_type}
                        </span>
                        {notification.is_sent && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            Sent
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span className="flex items-center space-x-1">
                          <span className="material-icons-outlined" style={{ fontSize: '14px' }}>location_on</span>
                          <span>Geofence #{notification.target_geofence || 'All'}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span className="material-icons-outlined" style={{ fontSize: '14px' }}>category</span>
                          <span>{notification.target_type}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span className="material-icons-outlined" style={{ fontSize: '14px' }}>schedule</span>
                          <span>{new Date(notification.created_at).toLocaleString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground p-2">
                    <span className="material-icons-outlined">more_vert</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Notification Service
 * Handles push notifications for alerts, community messages, and other app events
 */

import {Platform, NativeModules} from 'react-native';

// Import push notifications - use dynamic import to avoid bundling issues
let PushNotification: any = null;
const loadPushNotification = () => {
  if (PushNotification !== null) {
    return PushNotification;
  }
  try {
    const pushNotifModule = require('react-native-push-notification');
    PushNotification = pushNotifModule.default || pushNotifModule;
    return PushNotification;
  } catch (error) {
    console.warn('PushNotification module not available:', error);
    PushNotification = false;
    return null;
  }
};

// Configure notifications once
let notificationsConfigured = false;
let channelCreated = false;

export const configureNotifications = () => {
  const notificationModule = loadPushNotification();
  if (!notificationModule) {
    return;
  }

  if (notificationsConfigured) {
    return;
  }

  try {
    if (Platform.OS === 'android') {
      // Create notification channel for Android
      if (!channelCreated) {
        try {
          const RNPushNotification = NativeModules.RNPushNotification;
          if (RNPushNotification && typeof RNPushNotification.createChannel === 'function') {
            RNPushNotification.createChannel(
              {
                channelId: 'alerts-channel',
                channelName: 'Alerts & Community',
                channelDescription: 'Notifications for alerts and community messages',
                playSound: true,
                soundName: 'default',
                importance: 4, // High importance
                vibrate: true,
              },
              (created: boolean) => {
                console.log('Alerts channel created:', created);
                channelCreated = true;
              }
            );
          }
        } catch (error) {
          console.warn('Could not create alerts notification channel:', error);
        }
      }
    }

    notificationModule.configure({
      onRegister: function (token: any) {
        console.log('Push notification token:', token);
      },
      onNotification: function (notification: any) {
        console.log('Notification received:', notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: false,
      requestPermissions: Platform.OS === 'ios',
    });

    notificationsConfigured = true;
  } catch (error) {
    console.error('Error configuring notifications:', error);
  }
};

/**
 * Send a notification for a new alert
 */
export const sendAlertNotification = async (title: string, message: string, alertId?: string) => {
  try {
    configureNotifications();
    
    const notificationModule = loadPushNotification();
    if (!notificationModule) {
      console.warn('PushNotification not available');
      return;
    }

    // Check native module
    try {
      const RNPushNotification = NativeModules.RNPushNotification;
      if (!RNPushNotification || RNPushNotification === null) {
        console.warn('RNPushNotification native module is null');
        return;
      }
    } catch (error) {
      console.warn('Could not check native module:', error);
    }

    const notificationConfig: any = {
      id: 'alert-' + (alertId || Date.now()),
      title: title,
      message: message,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      vibration: 1000,
      tag: 'alert',
      userInfo: {
        type: 'alert',
        alertId: alertId,
        timestamp: Date.now(),
      },
    };

    if (Platform.OS === 'android') {
      notificationConfig.channelId = 'alerts-channel';
      notificationConfig.importance = 'high';
      notificationConfig.priority = 'high';
      notificationConfig.autoCancel = true;
    }

    if (notificationModule && typeof notificationModule.localNotification === 'function') {
      try {
        notificationModule.localNotification(notificationConfig);
        console.log('Alert notification sent:', title);
      } catch (error) {
        console.warn('Could not send alert notification:', error);
      }
    }
  } catch (error) {
    console.error('Error sending alert notification:', error);
  }
};

/**
 * Send a notification for a new community message
 */
export const sendCommunityNotification = async (title: string, message: string, communityId?: string) => {
  try {
    configureNotifications();
    
    const notificationModule = loadPushNotification();
    if (!notificationModule) {
      console.warn('PushNotification not available');
      return;
    }

    // Check native module
    try {
      const RNPushNotification = NativeModules.RNPushNotification;
      if (!RNPushNotification || RNPushNotification === null) {
        console.warn('RNPushNotification native module is null');
        return;
      }
    } catch (error) {
      console.warn('Could not check native module:', error);
    }

    const notificationConfig: any = {
      id: 'community-' + (communityId || Date.now()),
      title: title,
      message: message,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      vibration: 1000,
      tag: 'community',
      userInfo: {
        type: 'community',
        communityId: communityId,
        timestamp: Date.now(),
      },
    };

    if (Platform.OS === 'android') {
      notificationConfig.channelId = 'alerts-channel';
      notificationConfig.importance = 'high';
      notificationConfig.priority = 'high';
      notificationConfig.autoCancel = true;
    }

    if (notificationModule && typeof notificationModule.localNotification === 'function') {
      try {
        notificationModule.localNotification(notificationConfig);
        console.log('Community notification sent:', title);
      } catch (error) {
        console.warn('Could not send community notification:', error);
      }
    }
  } catch (error) {
    console.error('Error sending community notification:', error);
  }
};





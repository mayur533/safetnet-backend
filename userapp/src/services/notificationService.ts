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
    
    // Check native module
    let nativeModuleAvailable = false;
    try {
      const RNPushNotification = NativeModules.RNPushNotification;
      if (RNPushNotification && RNPushNotification !== null) {
        nativeModuleAvailable = true;
      }
    } catch (error) {
      console.warn('Could not check native module:', error);
    }

    // If native module is available, use it
    if (notificationModule && nativeModuleAvailable) {
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

      if (typeof notificationModule.localNotification === 'function') {
        try {
          notificationModule.localNotification(notificationConfig);
          console.log('Alert notification sent:', title);
          return; // Success, exit early
        } catch (error) {
          console.warn('Could not send alert notification via module:', error);
          // Fall through to fallback
        }
      }
    }

    // Fallback: Use Alert for critical notifications (works even if native module is null)
    // This ensures users still see important alerts
    if (Platform.OS === 'android') {
      // On Android, try to use Toast or Alert as fallback
      const {Alert} = require('react-native');
      Alert.alert(title, message, [{text: 'OK'}]);
      console.log('Alert notification sent via Alert.alert fallback:', title);
    } else {
      // iOS fallback
      const {Alert} = require('react-native');
      Alert.alert(title, message, [{text: 'OK'}]);
      console.log('Alert notification sent via Alert.alert fallback:', title);
    }
  } catch (error) {
    console.error('Error sending alert notification:', error);
    // Last resort: try basic Alert
    try {
      const {Alert} = require('react-native');
      Alert.alert(title || 'Alert', message || 'Notification');
    } catch (fallbackError) {
      console.error('Even fallback Alert failed:', fallbackError);
    }
  }
};

/**
 * Send a notification for a new community message
 */
export const sendCommunityNotification = async (title: string, message: string, communityId?: string) => {
  try {
    configureNotifications();
    
    const notificationModule = loadPushNotification();
    
    // Check native module
    let nativeModuleAvailable = false;
    try {
      const RNPushNotification = NativeModules.RNPushNotification;
      if (RNPushNotification && RNPushNotification !== null) {
        nativeModuleAvailable = true;
      }
    } catch (error) {
      console.warn('Could not check native module:', error);
    }

    // If native module is available, use it
    if (notificationModule && nativeModuleAvailable) {
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

      if (typeof notificationModule.localNotification === 'function') {
        try {
          notificationModule.localNotification(notificationConfig);
          console.log('Community notification sent:', title);
          return; // Success, exit early
        } catch (error) {
          console.warn('Could not send community notification via module:', error);
          // Fall through to fallback (silent for community messages)
        }
      }
    }

    // For community messages, we don't show Alert fallback (less critical)
    console.log('Community notification skipped (native module unavailable):', title);
  } catch (error) {
    console.error('Error sending community notification:', error);
  }
};

export const sendLiveShareNotification = async (title: string, message: string) => {
  try {
    configureNotifications();
    const notificationModule = loadPushNotification();
    
    // Check native module
    let nativeModuleAvailable = false;
    try {
      const RNPushNotification = NativeModules.RNPushNotification;
      if (RNPushNotification && RNPushNotification !== null) {
        nativeModuleAvailable = true;
      }
    } catch (error) {
      console.warn('Could not check native module:', error);
    }

    // If native module is available, use it
    if (notificationModule && nativeModuleAvailable) {
      const notificationConfig: any = {
        id: 'live-share-' + Date.now(),
        title,
        message,
        playSound: true,
        soundName: 'default',
        vibrate: true,
        vibration: 1000,
        tag: 'live-share',
        userInfo: {
          type: 'live-share',
          timestamp: Date.now(),
        },
      };

      if (Platform.OS === 'android') {
        notificationConfig.channelId = 'alerts-channel';
        notificationConfig.importance = 'high';
        notificationConfig.priority = 'high';
        notificationConfig.autoCancel = true;
      }

      if (typeof notificationModule.localNotification === 'function') {
        try {
          notificationModule.localNotification(notificationConfig);
          console.log('Live share notification sent:', title);
          return; // Success, exit early
        } catch (error) {
          console.warn('Could not send live share notification via module:', error);
          // Fall through to fallback
        }
      }
    }

    // Fallback: Use Alert for critical live share notifications
    const {Alert} = require('react-native');
    Alert.alert(title, message, [{text: 'OK'}]);
    console.log('Live share notification sent via Alert.alert fallback:', title);
  } catch (error) {
    console.error('Error sending live share notification:', error);
    // Last resort: try basic Alert
    try {
      const {Alert} = require('react-native');
      Alert.alert(title || 'Live Share', message || 'Notification');
    } catch (fallbackError) {
      console.error('Even fallback Alert failed:', fallbackError);
    }
  }
};





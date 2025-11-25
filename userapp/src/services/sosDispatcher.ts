import {Alert, Linking, Platform, PermissionsAndroid, NativeModules} from 'react-native';
import {useContactStore} from '../stores/contactStore';
import {requestDirectCall} from './callService';
import {checkNetworkStatus} from './networkService';
import {sendSmsDirect} from './smsService';
import {useSettingsStore, DEFAULT_SOS_TEMPLATE} from '../stores/settingsStore';
import {useOfflineSosStore} from '../stores/offlineSosStore';
import {useAuthStore} from '../stores/authStore';

// Import push notifications - use dynamic import to avoid bundling issues
let PushNotification: any = null;
const loadPushNotification = (forceReload: boolean = false) => {
  // If forceReload is true, always try to reload
  if (!forceReload && PushNotification !== null && PushNotification !== false) {
    return PushNotification;
  }
  try {
    // Use require with explicit path to avoid module resolution issues
    const pushNotifModule = require('react-native-push-notification');
    const loadedModule = pushNotifModule.default || pushNotifModule;
    // Only cache if it's a valid module
    if (loadedModule && typeof loadedModule.configure === 'function') {
      PushNotification = loadedModule;
      return PushNotification;
    } else {
      PushNotification = false;
      return null;
    }
  } catch (error) {
    console.warn('PushNotification module not available:', error);
    PushNotification = false; // Use false instead of null to indicate we tried
    return null;
  }
};

const buildSmsUrl = (phones: string[], message: string) => {
  const encodedMessage = encodeURIComponent(message);
  return `sms:${phones.join(',')}?body=${encodedMessage}`;
};

// Configure notifications once
let notificationsConfigured = false;
let channelCreated = false;

export const configureNotifications = () => {
  const notificationModule = loadPushNotification();
  if (!notificationModule) {
    return;
  }

  try {
    if (!notificationsConfigured && notificationModule && typeof notificationModule.configure === 'function') {
      const shouldRequestPermissions = Platform.OS === 'ios';

      const config: any = {
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
        requestPermissions: shouldRequestPermissions,
      };

      notificationModule.configure(config);
      notificationsConfigured = true;
      console.log('PushNotification configured');
    }

    // Create notification channel for Android - always ensure it exists
    if (Platform.OS === 'android' && notificationModule && notificationModule !== null && notificationModule !== false) {
      if (!channelCreated && typeof notificationModule.createChannel === 'function') {
        try {
          notificationModule.createChannel(
            {
              channelId: 'sos-channel',
              channelName: 'SOS Alerts',
              channelDescription: 'Notifications for emergency SOS alerts',
              playSound: true,
              soundName: 'default',
              importance: 4, // High importance
              vibrate: true,
            },
            (created: boolean) => {
              if (created !== undefined) {
                console.log(`SOS notification channel ${created ? 'created' : 'already exists'}`);
              }
              channelCreated = true;
            },
          );
        } catch (error) {
          console.warn('Error creating notification channel:', error);
          // Mark as created to prevent retries
          channelCreated = true;
        }
      } else if (!channelCreated) {
        // If createChannel is not available, mark as created to prevent errors
        console.warn('createChannel function not available on PushNotification module');
        channelCreated = true;
      }
    }
  } catch (error) {
    console.warn('Failed to configure notifications:', error);
  }
};

const sendSOSNotification = async () => {
  try {
    console.log('=== Starting SOS Notification ===');
    
    // Try to load the notification module fresh
    let notificationModule: any = null;
    try {
      const pushNotifModule = require('react-native-push-notification');
      notificationModule = pushNotifModule.default || pushNotifModule;
      // Validate it's a proper module
      if (!notificationModule || typeof notificationModule.configure !== 'function') {
        notificationModule = null;
      }
    } catch (error) {
      console.warn('Could not load PushNotification module:', error);
      notificationModule = null;
    }

    if (!notificationModule) {
      console.warn('PushNotification is not available - notification will not be sent');
      return;
    }

    // Ensure notifications are configured first
    configureNotifications();

    // Request notification permission on Android 13+ if needed
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (!hasPermission) {
          console.log('Requesting notification permission...');
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message: 'This app needs notification permission to show SOS alerts.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('Notification permission not granted:', granted);
            return;
          }
          console.log('Notification permission granted');
        } else {
          console.log('Notification permission already granted');
        }
      } catch (error) {
        console.warn('Failed to request notification permission:', error);
      }
    }

    // Small delay to ensure channel is created on Android
    if (Platform.OS === 'android' && !channelCreated) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Re-check notification module one more time before using it
    if (!notificationModule || notificationModule === null || notificationModule === false) {
      console.warn('PushNotification module is not available - skipping notification');
      return;
    }

    // Check if localNotification method exists
    if (typeof notificationModule.localNotification !== 'function') {
      console.warn('PushNotification.localNotification is not a function');
      if (notificationModule) {
        console.log('PushNotification object type:', typeof notificationModule);
        try {
          const keys = Object.keys(notificationModule);
          console.log('PushNotification object keys (first 10):', keys.slice(0, 10));
        } catch (e) {
          console.log('Could not get keys from notificationModule');
        }
      }
      return;
    }

    // Prepare notification config
    const notificationConfig: any = {
      id: 'sos-' + Date.now(),
      title: 'SOS Sent',
      message: 'SOS is sent, we will reach you immediately as soon as possible',
      playSound: true,
      soundName: 'default',
      vibrate: true,
      vibration: 1000,
      tag: 'sos-alert',
      userInfo: {
        type: 'sos',
        timestamp: Date.now(),
      },
    };

    // Add Android-specific properties
    if (Platform.OS === 'android') {
      notificationConfig.channelId = 'sos-channel';
      notificationConfig.importance = 'high';
      notificationConfig.priority = 'high';
      notificationConfig.autoCancel = false;
      notificationConfig.ongoing = false;
    }

    console.log('Sending SOS notification with config:', JSON.stringify(notificationConfig, null, 2));
    
    // Final validation before calling - check native module directly
    if (!notificationModule || 
        notificationModule === null || 
        notificationModule === false ||
        typeof notificationModule.localNotification !== 'function') {
      console.error('PushNotification.localNotification is not available');
      return;
    }

    // Check if the native module exists (react-native-push-notification uses RNPushNotification native module)
    try {
      const RNPushNotification = NativeModules.RNPushNotification;
      if (!RNPushNotification || RNPushNotification === null) {
        console.warn('RNPushNotification native module is null - notification cannot be sent');
        return;
      }
      
      // Check if presentLocalNotification method exists on native module
      if (typeof RNPushNotification.presentLocalNotification !== 'function') {
        console.warn('RNPushNotification.presentLocalNotification is not available - notification cannot be sent');
        return;
      }
    } catch (nativeCheckError) {
      console.warn('Could not check native module:', nativeCheckError);
      // Continue anyway - the try-catch below will handle it
    }

    // Call localNotification with final safety check
    try {
      // Double-check notificationModule is still valid right before calling
      if (!notificationModule || typeof notificationModule.localNotification !== 'function') {
        console.error('PushNotification became invalid right before call');
        return;
      }
      
      notificationModule.localNotification(notificationConfig);
      console.log('✅ SOS notification sent successfully');
    } catch (notifError: any) {
      // Silently handle the error - don't crash the app
      console.warn('Could not send notification (this is non-critical):', notifError?.message || String(notifError));
      // Don't log the full error stack to avoid cluttering console
    }
  } catch (error: any) {
    console.error('Failed to send SOS notification:', error);
    console.error('Error message:', error?.message || String(error));
  }
};

type DispatchResult = {
  smsInitiated: boolean;
  callInitiated: boolean;
};

export const dispatchSOSAlert = async (message: string): Promise<DispatchResult> => {
  // TESTING MODE: Don't make actual API calls
  console.log('=== SOS Alert Dispatch (Testing Mode) ===');
  
  const {contacts, primaryContactId} = useContactStore.getState();
  const sanitizedContacts = contacts
    .filter(contact => contact.phone)
    .map(contact => ({
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
    }));

  const primaryContact = sanitizedContacts.find(contact => contact.id === primaryContactId);
  const hasFamilyContacts = sanitizedContacts.length > 0;

  let smsInitiated = false;
  let callInitiated = false;

  // If no family contacts, send to police and security officer
  if (!hasFamilyContacts) {
    console.log('No family contacts found. Sending SOS to Police and Security Officer.');
    // Police and Security Officer numbers (from categoryCards)
    const emergencyContacts = [
      {name: 'Police', phone: '9561606066'},
      {name: 'Security Officer', phone: '9561606067'},
    ];
    
    const template = useSettingsStore.getState().sosMessageTemplate || DEFAULT_SOS_TEMPLATE;
    const smsMessage = message || template;
    const emergencyPhones = emergencyContacts.map(ec => ec.phone);
    const smsUrl = buildSmsUrl(emergencyPhones, smsMessage);
    
    try {
      // In testing mode, just log instead of actually opening SMS
      console.log('Would send SMS to:', emergencyPhones);
      console.log('Message:', smsMessage);
      // await Linking.openURL(smsUrl);
      smsInitiated = true;
    } catch (error) {
      console.error('Error preparing emergency SMS:', error);
    }
    
    // Try to call police (primary emergency contact)
    try {
      console.log('Would call:', emergencyContacts[0].phone);
      // await requestDirectCall(emergencyContacts[0].phone);
      callInitiated = true;
    } catch (error) {
      console.error('Error preparing emergency call:', error);
    }
  } else {
    // Has family contacts - send to them
    const smsRecipients = sanitizedContacts.map((contact) => contact.phone);
    const template = useSettingsStore.getState().sosMessageTemplate || DEFAULT_SOS_TEMPLATE;
    const smsMessage = message || template;
    const smsUrl = buildSmsUrl(smsRecipients, smsMessage);
    
    try {
      // In testing mode, just log instead of actually opening SMS
      console.log('Would send SMS to family contacts:', smsRecipients);
      console.log('Message:', smsMessage);
      // await Linking.openURL(smsUrl);
      smsInitiated = true;
    } catch (error) {
      console.error('Error preparing SMS:', error);
    }

    if (primaryContact && primaryContact.phone) {
      try {
        console.log('Would call primary contact:', primaryContact.phone);
        // await requestDirectCall(primaryContact.phone);
        callInitiated = true;
      } catch (error) {
        console.error('Error preparing call:', error);
      }
    }
  }

  // Send push notification immediately (don't await to avoid blocking)
  // This ensures notification is sent even if there are delays in other operations
  sendSOSNotification().catch((error) => {
    console.error('Failed to send SOS notification:', error);
  });

  return {
    smsInitiated,
    callInitiated,
  };
};

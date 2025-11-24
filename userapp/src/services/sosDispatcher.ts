import {Alert, Linking, Platform, PermissionsAndroid} from 'react-native';
import {useContactStore} from '../stores/contactStore';
import {requestDirectCall} from './callService';
import {useIncidentStore} from '../stores/incidentStore';
import {checkNetworkStatus} from './networkService';
import {sendSmsDirect} from './smsService';
import {useSettingsStore, DEFAULT_SOS_TEMPLATE} from '../stores/settingsStore';
import {useOfflineSosStore} from '../stores/offlineSosStore';
import {useAVRecorderStore} from '../stores/avRecorderStore';
import {startEvidenceRecording} from './avRecorderService';
import {useAuthStore} from '../stores/authStore';
import {notifyResponseCenter} from './responseCenterService';

// Import push notifications - use dynamic import to avoid bundling issues
let PushNotification: any = null;
const loadPushNotification = () => {
  if (PushNotification !== null) {
    return PushNotification;
  }
  try {
    // Use require with explicit path to avoid module resolution issues
    const pushNotifModule = require('react-native-push-notification');
    PushNotification = pushNotifModule.default || pushNotifModule;
    return PushNotification;
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
    if (Platform.OS === 'android' && notificationModule && typeof notificationModule.createChannel === 'function') {
      if (!channelCreated) {
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
            console.log(`SOS notification channel ${created ? 'created' : 'already exists'}`);
            channelCreated = true;
          },
        );
      }
    }
  } catch (error) {
    console.warn('Failed to configure notifications:', error);
  }
};

const sendSOSNotification = async () => {
  try {
    console.log('=== Starting SOS Notification ===');
    
    const notificationModule = loadPushNotification();
    if (!notificationModule) {
      console.error('PushNotification is not available - notification will not be sent');
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
            console.error('Notification permission not granted:', granted);
            return;
          }
          console.log('Notification permission granted');
        } else {
          console.log('Notification permission already granted');
        }
      } catch (error) {
        console.error('Failed to request notification permission:', error);
      }
    }

    // Small delay to ensure channel is created on Android
    if (Platform.OS === 'android' && !channelCreated) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (notificationModule && typeof notificationModule.localNotification === 'function') {
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
      
      try {
        notificationModule.localNotification(notificationConfig);
        console.log('✅ SOS notification sent successfully');
      } catch (notifError) {
        console.error('Error calling localNotification:', notifError);
      }
    } else {
      console.error('PushNotification.localNotification is not available');
      console.log('PushNotification object:', notificationModule);
      console.log('localNotification type:', typeof notificationModule?.localNotification);
    }
  } catch (error) {
    console.error('Failed to send SOS notification:', error);
  }
};

type DispatchResult = {
  smsInitiated: boolean;
  callInitiated: boolean;
};

export const dispatchSOSAlert = async (message: string): Promise<DispatchResult> => {
  const {contacts, primaryContactId} = useContactStore.getState();
  const sanitizedContacts = contacts
    .filter(contact => contact.phone)
    .map(contact => ({
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
    }));

  const primaryContact = sanitizedContacts.find(contact => contact.id === primaryContactId);

  let smsInitiated = false;
  let callInitiated = false;

  const smsRecipients = sanitizedContacts.map((contact) => contact.phone);
  const template = useSettingsStore.getState().sosMessageTemplate || DEFAULT_SOS_TEMPLATE;
  const autoRecordEvidence = useSettingsStore.getState().autoRecordEvidence;
  const isPremiumUser = useAuthStore.getState().user?.plan === 'premium';

  const smsMessage = message || template;
  const smsUrl = buildSmsUrl(smsRecipients, smsMessage);
  const networkStatus = await checkNetworkStatus();
  const offlineQueue = useOfflineSosStore.getState();
  const hasRecipients = smsRecipients.length > 0;
  const shouldUseDirectSms = !networkStatus.isInternetReachable;
  let smsQueuedForLater = false;

  if (hasRecipients && shouldUseDirectSms) {
    const directSuccess = await sendSmsDirect(smsRecipients, smsMessage);
    smsInitiated = directSuccess;
    if (!directSuccess) {
      await offlineQueue.enqueue({message: smsMessage, recipients: smsRecipients});
      smsQueuedForLater = true;
    }
  } else if (hasRecipients) {
    if (smsUrl) {
      try {
        await Linking.openURL(smsUrl);
        smsInitiated = true;
      } catch (error) {
        const err = error as Error;
        Alert.alert('Error sending SMS', `Failed to send SMS: ${err?.message ?? 'Unknown error'}`);
      }
    }

    if (!smsInitiated) {
      const directSuccess = await sendSmsDirect(smsRecipients, smsMessage);
      smsInitiated = directSuccess;
      if (!directSuccess && !networkStatus.isInternetReachable) {
        await offlineQueue.enqueue({message: smsMessage, recipients: smsRecipients});
        smsQueuedForLater = true;
      }
    }
  }

  if (primaryContact && primaryContact.phone) {
    try {
      await requestDirectCall(primaryContact.phone);
      callInitiated = true;
    } catch (error) {
      const err = error as Error;
      Alert.alert('Error calling', `Failed to call ${primaryContact.name}: ${err?.message ?? 'Unknown error'}`);
    }
  }

  const incidentStore = useIncidentStore.getState();
  const incidentRecord = await incidentStore.addIncident({
    message: smsMessage,
    smsSent: smsInitiated,
    callPlaced: callInitiated,
    callNumber: primaryContact?.phone,
    recipients: smsRecipients,
    timestamp: Date.now(),
  });

  if (autoRecordEvidence && isPremiumUser && !useAVRecorderStore.getState().isRecording) {
    void startEvidenceRecording();
  }

  if (isPremiumUser) {
    try {
      await notifyResponseCenter({
        incidentId: incidentRecord.id,
        message: smsMessage,
        smsSent: smsInitiated,
        callPlaced: callInitiated,
        recipients: smsRecipients,
      });
    } catch (error) {
      console.warn('Failed to notify response center', error);
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

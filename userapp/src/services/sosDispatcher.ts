import {Alert, Platform, PermissionsAndroid, NativeModules} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import {useContactStore} from '../stores/contactStore';
import {requestDirectCall} from './callService';
import {checkNetworkStatus} from './networkService';
import {sendSmsDirect} from './smsService';
import {useSettingsStore, DEFAULT_SOS_TEMPLATE, DEFAULT_SOS_MESSAGES} from '../stores/settingsStore';
import {useOfflineSosStore} from '../stores/offlineSosStore';
import {useAuthStore} from '../stores/authStore';
import {apiService} from './apiService';
import {startLiveLocationShareUpdates, getActiveLiveShareSession, type LiveShareSession} from './liveLocationShareService';

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

// Configure notifications once
let notificationsConfigured = false;
let channelCreated = false;

const POLICE_CONTACT = {name: 'Police', phone: '7887659473'};

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * Polygon coordinates are in GeoJSON format: [longitude, latitude]
 */
const isPointInPolygon = (
  point: {latitude: number; longitude: number},
  polygon: number[][]
): boolean => {
  if (!polygon || polygon.length < 3) return false;
  
  const {latitude: lat, longitude: lng} = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    // GeoJSON format: [longitude, latitude]
    const [xi, yi] = polygon[i]; // xi = lng, yi = lat
    const [xj, yj] = polygon[j]; // xj = lng, yj = lat
    
    // Ray casting algorithm
    const intersect = 
      ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
};

/**
 * Find which geofence the user is currently in
 */
const findUserGeofence = async (
  location: {latitude: number; longitude: number},
  userId: number
): Promise<{geofence: any; securityOfficer: any} | null> => {
  try {
    // Get all geofences
    const geofencesData = await apiService.getGeofences(userId, true);
    const geofences = Array.isArray(geofencesData?.geofences) 
      ? geofencesData.geofences 
      : Array.isArray(geofencesData) 
        ? geofencesData 
        : [];
    
    if (!geofences.length) {
      console.log('No geofences found');
      return null;
    }
    
    // Check each geofence to see if user is inside
    for (const geofence of geofences) {
      if (!geofence.is_active && geofence.active !== true) continue;
      
      // Check if point is inside polygon
      const polygon = geofence.polygon || geofence.polygon_json;
      if (polygon && Array.isArray(polygon) && polygon.length > 0) {
        // Polygon format: [[[lng, lat], [lng, lat], ...]]
        const ring = Array.isArray(polygon[0]) ? polygon[0] : polygon;
        const isInside = isPointInPolygon(location, ring);
        
        if (isInside) {
          console.log(`User is inside geofence: ${geofence.name}`);
          
          // Get security officers for this geofence
          try {
            const officersData = await apiService.getSecurityOfficers(
              location.latitude,
              location.longitude
            );
            const officers = Array.isArray(officersData?.officers)
              ? officersData.officers
              : Array.isArray(officersData)
                ? officersData
                : [];
            
            // Find officer assigned to this geofence
            const assignedOfficer = officers.find(
              (officer: any) => 
                officer.assigned_geofence_id === geofence.id ||
                officer.assigned_geofence?.id === geofence.id ||
                officer.geofence_id === geofence.id
            );
            
            if (assignedOfficer) {
              return {
                geofence,
                securityOfficer: assignedOfficer,
              };
            }
          } catch (error) {
            console.error('Error getting security officers:', error);
          }
        }
      }
    }
    
    console.log('User is not inside any geofence');
    return null;
  } catch (error) {
    console.error('Error finding user geofence:', error);
    return null;
  }
};

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
  liveShareUrl?: string | null;
  liveShareSession?: LiveShareSession | null;
};

/**
 * Get current user location
 */
const getCurrentLocation = (): Promise<{latitude: number; longitude: number} | null> => {
  return new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('Error getting location for SOS:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Get live share base URL
 */
const getLiveShareBaseUrl = (): string => {
  const base = __DEV__
    ? 'http://192.168.0.125:8000/live-share'
    : 'https://safetnet-backend.onrender.com/live-share';
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

/**
 * Build Google Maps URL as fallback
 */
const buildGoogleMapsUrl = (latitude: number, longitude: number): string => {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
};

export const dispatchSOSAlert = async (message: string): Promise<DispatchResult> => {
  console.log('=== SOS Alert Dispatch ===');
  
  const user = useAuthStore.getState().user;
  const {contacts, primaryContactId} = useContactStore.getState();
  const userPlan = user?.plan || 'free';
  const isPremium = userPlan === 'premium';
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
  let liveShareUrl: string | null = null;
  let liveShareSession: LiveShareSession | null = null;

  // Get current location
  let location = null;
  try {
    location = await getCurrentLocation();
    if (location) {
      console.log('Location obtained:', location);
    } else {
      console.warn('Could not get location for SOS');
    }
  } catch (error) {
    console.error('Error getting location:', error);
  }

  // STEP 1: Send SOS to backend API and WAIT for live share URL
  // This ensures we have the live share URL before sending any messages
  if (user?.id) {
    try {
      const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
      const sosData: {longitude?: number; latitude?: number; notes?: string} = {};
      
      if (location) {
        sosData.longitude = location.longitude;
        sosData.latitude = location.latitude;
      }
      
      const template = useSettingsStore.getState().sosMessageTemplate || DEFAULT_SOS_TEMPLATE;
      sosData.notes = message || template;
      
      console.log('📤 Sending SOS to backend and waiting for live share URL...');
      const sosResponse = await apiService.triggerSOS(userId, sosData);
      console.log('✅ SOS sent to backend successfully');
      console.log('SOS Response:', JSON.stringify(sosResponse, null, 2));

      const liveSharePayload = sosResponse?.live_share;
      console.log('Live share payload from backend:', liveSharePayload);
      
      // Extract live share URL from backend response
      if (liveSharePayload?.share_url) {
        liveShareUrl = liveSharePayload.share_url;
        console.log('✅ Live share URL received from backend:', liveShareUrl);
      }

      const backendSession = liveSharePayload?.session;
      if (backendSession?.id) {
        try {
          // Build URL if not provided but we have a token
          if (!liveShareUrl && backendSession.share_token) {
            const liveShareBaseUrl = getLiveShareBaseUrl();
            const normalizedBase = liveShareBaseUrl.endsWith('/')
              ? liveShareBaseUrl.slice(0, -1)
              : liveShareBaseUrl;
            liveShareUrl = `${normalizedBase}/${backendSession.share_token}/`;
            console.log('✅ Built live share URL from token:', liveShareUrl);
          }
          
          // Start live location updates with the session
          await startLiveLocationShareUpdates(userId, backendSession.id, location || undefined, {
            onSessionEnded: (payload) => {
              console.log('SOS live share session ended:', payload);
            },
            shareUrl: liveShareUrl ?? null,
            shareToken: backendSession.share_token || backendSession.shareToken || null,
            planType: backendSession.plan_type || backendSession.planType || null,
            expiresAt: backendSession.expires_at || backendSession.expiresAt || null,
          });
          liveShareSession = getActiveLiveShareSession();
          console.log('✅ Live share session started from backend:', liveShareSession);
        } catch (error) {
          console.error('Failed to start live share updates from backend session:', error);
        }
      } else {
        console.warn('No backend session found in response');
      }
    } catch (error: any) {
      console.error('Error sending SOS to backend:', error);
      // Will try fallback below
    }
  } else {
    console.warn('User not authenticated, skipping backend SOS');
  }

  // STEP 2: Fallback - start live share locally if backend did not create one
  // This ensures we ALWAYS have a live share URL before sending messages
  if (!liveShareUrl && !liveShareSession && user?.id && location) {
    try {
      const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
      const durationMinutes = isPremium ? 1440 : 30;
      console.log('📤 Starting fallback live location sharing for SOS...');
      const response = await apiService.startLiveLocationShare(userId, durationMinutes);
      const session = response?.session;
      const sessionId = session?.id;

      if (sessionId) {
        const shareToken = session?.share_token || session?.shareToken;
        const liveShareBaseUrl = getLiveShareBaseUrl();
        liveShareUrl = shareToken
          ? `${liveShareBaseUrl}/${shareToken}/`
          : buildGoogleMapsUrl(location.latitude, location.longitude);

        await startLiveLocationShareUpdates(userId, sessionId, location, {
          onSessionEnded: (payload) => {
            console.log('SOS live share session ended (fallback):', payload);
          },
          shareUrl: liveShareUrl,
          shareToken,
          planType: session?.plan_type || session?.planType || null,
          expiresAt: session?.expires_at || session?.expiresAt || null,
        });
        liveShareSession = getActiveLiveShareSession();
        console.log('✅ Fallback live location sharing started for SOS:', liveShareUrl);
      }
    } catch (error) {
      console.error('Error starting fallback live location sharing for SOS:', error);
      // Last resort: use static location URL
      if (location) {
        liveShareUrl = buildGoogleMapsUrl(location.latitude, location.longitude);
        console.log('⚠️ Using static location URL as last resort:', liveShareUrl);
      }
    }
  }

  // STEP 3: Construct messages with live share URL
  // NOW that we have the live share URL (or confirmed we can't get one),
  // construct messages with the URL included
  // At this point, we have either:
  // 1. Live share URL from backend
  // 2. Live share URL from fallback
  // 3. Static location URL as last resort
  // 4. No URL (should not happen, but handled gracefully)
  console.log('📝 Constructing messages with live share URL:', liveShareUrl);
  
  const settingsState = useSettingsStore.getState();
  const messageTemplates = settingsState.sosMessages || DEFAULT_SOS_MESSAGES;
  let familyMessage = message?.trim() || messageTemplates.family || DEFAULT_SOS_TEMPLATE;
  let securityMessage = messageTemplates.security || DEFAULT_SOS_MESSAGES.security;

  // Append live share URL to messages if available (not to police)
  console.log('📝 Before appending URL - liveShareUrl:', liveShareUrl);
  if (liveShareUrl) {
    const locationText = '\n\n📍 Track my live location: ' + liveShareUrl;
    familyMessage += locationText;
    securityMessage += locationText;
    console.log('✅ Added live share URL to messages:', liveShareUrl);
    console.log('📱 Family message length:', familyMessage.length);
    console.log('📱 Security message length:', securityMessage.length);
    // Don't include live share URL in police message
  } else if (location) {
    // Fallback to static location if live share failed (not to police)
    const staticLocationUrl = buildGoogleMapsUrl(location.latitude, location.longitude);
    const locationText = '\n\n📍 My location: ' + staticLocationUrl;
    familyMessage += locationText;
    securityMessage += locationText;
    console.log('⚠️ Using fallback static location URL:', staticLocationUrl);
    // Don't include location URL in police message
  } else {
    console.warn('⚠️ No location or live share URL available for messages');
  }

  // STEP 4: Determine recipient and send messages
  // Messages are sent AFTER live share URL is ready and included in the message text
  console.log('📤 Ready to send messages with live share URL included');

  const sendSmsGroup = async (label: string, recipients: string[], body: string) => {
    if (!recipients.length) {
      return false;
    }
    try {
      const sent = await sendSmsDirect(recipients, body);
      console.log(`SMS sent to ${label}:`, recipients);
      return sent;
    } catch (error) {
      console.error(`Failed to send ${label} SMS:`, error);
      return false;
    }
  };

  // STEP 4 (continued): Determine recipient based on geofence
  // Check which geofence user is in and get assigned security officer
  let assignedSecurityOfficer: any = null;
  let isInsideGeofence = false;
  
  if (location && user?.id) {
    try {
      const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
      const geofenceInfo = await findUserGeofence(location, userId);
      
      if (geofenceInfo?.securityOfficer) {
        assignedSecurityOfficer = geofenceInfo.securityOfficer;
        isInsideGeofence = true;
        console.log('✅ Found assigned security officer:', assignedSecurityOfficer);
      }
    } catch (error) {
      console.error('Error checking geofence:', error);
    }
  }

  // STEP 4 (continued): Send messages with live share URL included
  // Messages are sent AFTER live share URL is ready and included in the message text
  // If inside geofence: send to assigned security officer
  // If outside geofence: send to family and call police
  if (isInsideGeofence && assignedSecurityOfficer) {
    // Inside geofence - send to assigned security officer
    const officerPhone = assignedSecurityOfficer.contact || assignedSecurityOfficer.phone;
    if (officerPhone) {
      const securitySuccess = await sendSmsGroup(
        'assigned security officer',
        [officerPhone],
        securityMessage
      );
      smsInitiated = smsInitiated || securitySuccess;
      console.log(`SOS sent to assigned security officer: ${assignedSecurityOfficer.name || 'Unknown'}`);
    } else {
      console.warn('Assigned security officer has no phone number');
    }
    
    // Also call police
    try {
      await requestDirectCall(POLICE_CONTACT.phone);
      callInitiated = true;
    } catch (error) {
      console.error('Error calling police hotline:', error);
      Alert.alert(
        'Unable to call police',
        'We could not place the call automatically. Please dial the police hotline manually.',
      );
    }
  } else {
    // Outside geofence - send to family and call police
    if (hasFamilyContacts) {
      const smsRecipients = sanitizedContacts.map((contact) => contact.phone);
      const familySuccess = await sendSmsGroup('family contacts', smsRecipients, familyMessage);
      smsInitiated = smsInitiated || familySuccess;

      if (primaryContact?.phone) {
        try {
          await requestDirectCall(primaryContact.phone);
          callInitiated = true;
        } catch (error) {
          console.error('Error calling primary contact:', error);
        }
      }
    } else {
      console.log('No family contacts configured. Skipping family SMS.');
    }

    // Call police
    try {
      await requestDirectCall(POLICE_CONTACT.phone);
      callInitiated = true;
    } catch (error) {
      console.error('Error calling police hotline:', error);
      Alert.alert(
        'Unable to call police',
        'We could not place the call automatically. Please dial the police hotline manually.',
      );
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
    liveShareUrl,
    liveShareSession,
  };
};

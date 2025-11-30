import {Alert, Platform, PermissionsAndroid, NativeModules} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import {useContactStore} from '../stores/contactStore';
import {requestDirectCall} from './callService';
import {sendSmsDirect} from './smsService';
import {useSettingsStore, DEFAULT_SOS_TEMPLATE, DEFAULT_SOS_MESSAGES} from '../stores/settingsStore';
import {useAuthStore} from '../stores/authStore';
import {apiService} from './apiService';
import {startLiveLocationShareUpdates, getActiveLiveShareSession, type LiveShareSession} from './liveLocationShareService';
import {sendAlertNotification} from './notificationService';

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
      await new Promise<void>(resolve => setTimeout(resolve, 100));
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
        } catch {
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

  // Variables for background operations (will be updated asynchronously)
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

  // STEP 1: Determine recipient based on geofence (needed for both calls and messages)
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

  // STEP 1: TRIGGER CALLS IMMEDIATELY (User already held for 3 seconds)
  // Call happens immediately and doesn't block - runs in background
  console.log('📞 ========== TRIGGERING CALLS IMMEDIATELY (NON-BLOCKING) ==========');
  let callInitiated = false;
  
  // Call immediately (non-blocking - don't await)
  (async () => {
    try {
      // Determine who to call based on geofence
      if (isInsideGeofence && assignedSecurityOfficer) {
        // Inside geofence - call police immediately
        await requestDirectCall(POLICE_CONTACT.phone);
        callInitiated = true;
        console.log('✅ Police call initiated immediately (geofence mode)');
      } else {
        // Outside geofence - call primary contact first, then police
        if (primaryContact?.phone) {
          try {
            await requestDirectCall(primaryContact.phone);
            callInitiated = true;
            console.log('✅ Primary contact call initiated immediately');
          } catch (error) {
            console.error('Error calling primary contact:', error);
          }
        }
        
        // Also call police
        await requestDirectCall(POLICE_CONTACT.phone);
        callInitiated = true;
        console.log('✅ Police call initiated immediately (outside geofence)');
      }
    } catch (error) {
      console.error('Error calling:', error);
      Alert.alert(
        'Unable to call',
        'We could not place the call automatically. Please dial manually.',
      );
    }
  })().catch(err => console.error('Call initiation failed:', err));

  // STEP 2: HANDLE LIVE LOCATION SHARING, SMS, AND API CALLS
  // Wait for all of these to complete before returning (so success screen shows at right time)
  console.log('📤 ========== HANDLING LIVE LOCATION, SMS & API CALLS ==========');
  
  const sendSmsGroup = async (label: string, recipients: string[], body: string) => {
    if (!recipients.length) {
      return false;
    }
    try {
      console.log(`📤 Sending SMS to ${label} with message:`, body);
      // Force direct SMS sending (don't open app selector) for SOS
      const sent = await sendSmsDirect(recipients, body, true);
      if (sent) {
        console.log(`✅ SMS sent directly to ${label}:`, recipients);
      } else {
        console.warn(`⚠️ SMS could not be sent directly to ${label} - permission may be required`);
      }
      return sent;
    } catch (error) {
      console.error(`❌ Failed to send ${label} SMS:`, error);
      return false;
    }
  };
  
  // Wait for all background operations to complete
  let smsInitiated = false;
  let apiCallCompleted = false;

  try {
    // STEP 2a: Start live location sharing FIRST (exactly like HomeScreen)
    console.log('📍 Starting live location sharing for SOS...');
    let liveShareResult: {shareUrl: string; locationMessage: string} | null = null;
    
    try {
      // Use live location service directly (same as HomeScreen)
      const result = await startLiveLocationShare((payload) => {
        console.log('SOS live share session ended:', payload);
      });
      
      liveShareUrl = result.shareUrl;
      liveShareSession = result.session;
      liveShareResult = {
        shareUrl: result.shareUrl,
        locationMessage: result.locationMessage,
      };
      
      console.log('✅ Live location sharing started for SOS:', {
        shareUrl: result.shareUrl,
        sessionId: result.sessionId,
      });
    } catch (error: any) {
      console.error('❌ Error starting live location sharing for SOS:', error);
      
      // Send push notification when live share fails in SOS
      const errorMessage = error?.message || 'Unknown error';
      let notificationMessage = 'Live location sharing failed. Using static location instead.';
      
      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        notificationMessage = 'Live location sharing timed out. Using static location instead.';
      } else if (errorMessage.includes('Cannot connect') || errorMessage.includes('Network')) {
        notificationMessage = 'Cannot connect to server for live sharing. Using static location instead.';
      }
      
      try {
        await sendAlertNotification(
          'SOS Alert - Location Sharing',
          notificationMessage
        );
        console.log('📱 Push notification sent for live share failure in SOS');
      } catch (notifError) {
        console.warn('Failed to send push notification for live share failure:', notifError);
      }
      
      // Fallback to static location if live sharing fails
      if (location) {
        liveShareUrl = buildGoogleMapsUrl(location.latitude, location.longitude);
        liveShareResult = {
          shareUrl: liveShareUrl,
          locationMessage: `My location:\n${liveShareUrl}`,
        };
        console.log('⚠️ Using static location fallback:', liveShareUrl);
      } else {
        console.warn('⚠️ No location available for fallback');
      }
    }

    // STEP 2b: Construct combined SOS + Location messages (NOW we have location ready)
    const settingsState = useSettingsStore.getState();
    const messageTemplates = settingsState.sosMessages || DEFAULT_SOS_MESSAGES;
    const baseFamilyMessage = message?.trim() || messageTemplates.family || DEFAULT_SOS_TEMPLATE;
    const baseSecurityMessage = messageTemplates.security || DEFAULT_SOS_MESSAGES.security;

    let familyMessage: string;
    let securityMessage: string;
    
    if (liveShareResult) {
      // Combine SOS message with live location message
      // Format: SOS Message + \n\n + Location Message
      familyMessage = `${baseFamilyMessage}\n\n${liveShareResult.locationMessage}`;
      securityMessage = `${baseSecurityMessage}\n\n${liveShareResult.locationMessage}`;
    } else if (location) {
      // Fallback: static location
      const staticLocationUrl = buildGoogleMapsUrl(location.latitude, location.longitude);
      familyMessage = `${baseFamilyMessage}\n\nMy location:\n${staticLocationUrl}`;
      securityMessage = `${baseSecurityMessage}\n\nMy location:\n${staticLocationUrl}`;
    } else {
      // No location available - just SOS message
      familyMessage = baseFamilyMessage;
      securityMessage = baseSecurityMessage;
    }

    // STEP 2c: Send SMS messages with combined SOS + Location (NOW both are ready)
    // Run SMS and API call in parallel
    console.log('📤 Preparing to send SMS and API call...');
    console.log('📝 Family message:', familyMessage.substring(0, 100) + '...');
    console.log('📝 Security message:', securityMessage.substring(0, 100) + '...');
    
    const [smsResult, apiResult] = await Promise.allSettled([
      // Send SMS
      (async () => {
        try {
          if (isInsideGeofence && assignedSecurityOfficer) {
            const officerPhone = assignedSecurityOfficer.contact || assignedSecurityOfficer.phone;
            if (officerPhone) {
              console.log(`📤 Attempting to send SMS to security officer: ${officerPhone}`);
              const securitySuccess = await sendSmsGroup(
                'assigned security officer',
                [officerPhone],
                securityMessage
              );
              smsInitiated = smsInitiated || securitySuccess;
              console.log(`✅ SMS result for security officer: ${securitySuccess}`);
              return securitySuccess;
            } else {
              console.warn('⚠️ No phone number for security officer');
              return false;
            }
          } else {
            if (hasFamilyContacts) {
              const smsRecipients = sanitizedContacts.map((contact) => contact.phone);
              console.log(`📤 Attempting to send SMS to ${smsRecipients.length} family contact(s):`, smsRecipients);
              const familySuccess = await sendSmsGroup('family contacts', smsRecipients, familyMessage);
              smsInitiated = smsInitiated || familySuccess;
              console.log(`✅ SMS result for family contacts: ${familySuccess}`);
              return familySuccess;
            } else {
              console.warn('⚠️ No family contacts available');
              return false;
            }
          }
        } catch (error) {
          console.error('❌ Error in SMS sending promise:', error);
          return false;
        }
      })(),
      // Send API call
      (async () => {
        try {
          if (user?.id) {
            const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
            const sosData: {longitude?: number; latitude?: number; notes?: string} = {};
            
            if (location) {
              sosData.longitude = location.longitude;
              sosData.latitude = location.latitude;
            }
            
            const template = useSettingsStore.getState().sosMessageTemplate || DEFAULT_SOS_TEMPLATE;
            sosData.notes = message || template;
            
            console.log('📤 Sending SOS event to backend...');
            await apiService.triggerSOS(userId, sosData);
            console.log('✅ SOS event created in backend');
            apiCallCompleted = true;
            return true;
          } else {
            console.warn('⚠️ No user ID available for API call');
            return false;
          }
        } catch (error) {
          console.error('❌ Error sending SOS to backend:', error);
          return false;
        }
      })(),
    ]);

    // Check results - handle both fulfilled and rejected
    if (smsResult.status === 'fulfilled') {
      smsInitiated = smsResult.value || smsInitiated;
      console.log('✅ SMS promise fulfilled:', smsResult.value);
    } else {
      console.error('❌ SMS promise rejected:', smsResult.reason);
      // Try to send SMS again as fallback
      try {
        const settingsState = useSettingsStore.getState();
        const messageTemplates = settingsState.sosMessages || DEFAULT_SOS_MESSAGES;
        const baseMessage = message?.trim() || messageTemplates.family || DEFAULT_SOS_TEMPLATE;
        const fallbackMessage = liveShareResult 
          ? `${baseMessage}\n\n${liveShareResult.locationMessage}`
          : baseMessage;
        
        if (isInsideGeofence && assignedSecurityOfficer) {
          const officerPhone = assignedSecurityOfficer.contact || assignedSecurityOfficer.phone;
          if (officerPhone) {
            const retrySuccess = await sendSmsGroup('security officer (retry)', [officerPhone], fallbackMessage);
            smsInitiated = smsInitiated || retrySuccess;
          }
        } else if (hasFamilyContacts) {
          const smsRecipients = sanitizedContacts.map((contact) => contact.phone);
          const retrySuccess = await sendSmsGroup('family contacts (retry)', smsRecipients, fallbackMessage);
          smsInitiated = smsInitiated || retrySuccess;
        }
      } catch (retryError) {
        console.error('❌ SMS retry also failed:', retryError);
      }
    }
    
    if (apiResult.status === 'fulfilled') {
      apiCallCompleted = apiResult.value || apiCallCompleted;
      console.log('✅ API promise fulfilled:', apiResult.value);
    } else {
      console.error('❌ API promise rejected:', apiResult.reason);
    }

    console.log('✅ Background SOS operations completed:', {
      smsInitiated,
      apiCallCompleted,
      liveShareUrl,
      liveShareSession: liveShareSession ? 'active' : 'none',
    });
    
    // Final check: If SMS wasn't sent, try one more time with whatever we have
    if (!smsInitiated) {
      console.warn('⚠️ SMS was not sent successfully, attempting final fallback...');
      try {
        const settingsState = useSettingsStore.getState();
        const messageTemplates = settingsState.sosMessages || DEFAULT_SOS_MESSAGES;
        const baseMessage = message?.trim() || messageTemplates.family || DEFAULT_SOS_TEMPLATE;
        
        // Try to include location if available
        let finalMessage = baseMessage;
        if (liveShareResult) {
          finalMessage = `${baseMessage}\n\n${liveShareResult.locationMessage}`;
        } else if (location) {
          const staticUrl = buildGoogleMapsUrl(location.latitude, location.longitude);
          finalMessage = `${baseMessage}\n\nMy location:\n${staticUrl}`;
        }
        
        if (isInsideGeofence && assignedSecurityOfficer) {
          const officerPhone = assignedSecurityOfficer.contact || assignedSecurityOfficer.phone;
          if (officerPhone) {
            const finalSuccess = await sendSmsGroup('assigned security officer (final fallback)', [officerPhone], finalMessage);
            smsInitiated = smsInitiated || finalSuccess;
            console.log('✅ Final fallback SMS result:', finalSuccess);
          }
        } else if (hasFamilyContacts) {
          const smsRecipients = sanitizedContacts.map((contact) => contact.phone);
          const finalSuccess = await sendSmsGroup('family contacts (final fallback)', smsRecipients, finalMessage);
          smsInitiated = smsInitiated || finalSuccess;
          console.log('✅ Final fallback SMS result:', finalSuccess);
        }
      } catch (finalError) {
        console.error('❌ Final fallback SMS also failed:', finalError);
      }
    }
  } catch (error) {
    console.error('❌ Error in background SOS operations:', error);
    // Even if there's an error, try to send basic SOS message without location
    try {
      const settingsState = useSettingsStore.getState();
      const messageTemplates = settingsState.sosMessages || DEFAULT_SOS_MESSAGES;
      const baseMessage = message?.trim() || messageTemplates.family || DEFAULT_SOS_TEMPLATE;
      
      if (isInsideGeofence && assignedSecurityOfficer) {
        const officerPhone = assignedSecurityOfficer.contact || assignedSecurityOfficer.phone;
        if (officerPhone) {
          const fallbackSuccess = await sendSmsGroup('assigned security officer (fallback)', [officerPhone], baseMessage);
          smsInitiated = smsInitiated || fallbackSuccess;
          console.log('✅ Fallback SMS result:', fallbackSuccess);
        }
      } else if (hasFamilyContacts) {
        const smsRecipients = sanitizedContacts.map((contact) => contact.phone);
        const fallbackSuccess = await sendSmsGroup('family contacts (fallback)', smsRecipients, baseMessage);
        smsInitiated = smsInitiated || fallbackSuccess;
        console.log('✅ Fallback SMS result:', fallbackSuccess);
      }
    } catch (fallbackError) {
      console.error('❌ Fallback SMS also failed:', fallbackError);
    }
  }

  // Send push notification immediately (don't await to avoid blocking)
  // This ensures notification is sent even if there are delays in other operations
  sendSOSNotification().catch((error) => {
    console.error('Failed to send SOS notification:', error);
  });

  // Return result - function will only return after SMS and API call complete
  return {
    smsInitiated,
    callInitiated,
    liveShareUrl,
    liveShareSession,
  };
};

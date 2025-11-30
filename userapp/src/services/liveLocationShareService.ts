import Geolocation from '@react-native-community/geolocation';
import {Alert, Platform, PermissionsAndroid} from 'react-native';
import GeolocationService from 'react-native-geolocation-service';
import {apiService} from './apiService';
import {useAuthStore} from '../stores/authStore';

export interface LiveShareSession {
  userId: number;
  sessionId: number;
  shareUrl?: string | null;
  shareToken?: string | null;
  planType?: string | null;
  expiresAt?: string | null;
}

type LiveShareEndReason = 'expired' | 'error';

interface LiveShareUpdateOptions {
  onSessionEnded?: (payload: {reason: LiveShareEndReason; message?: string}) => void;
  shareUrl?: string | null;
  shareToken?: string | null;
  planType?: string | null;
  expiresAt?: string | null;
}

let watchId: number | null = null;
let activeSession: LiveShareSession | null = null;

const clearWatcher = () => {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
};

export const getActiveLiveShareSession = (): LiveShareSession | null => activeSession;

export const startLiveLocationShareUpdates = async (
  userId: number,
  sessionId: number,
  initialLocation?: {latitude: number; longitude: number},
  options?: LiveShareUpdateOptions,
) => {
  activeSession = {
    userId,
    sessionId,
    shareUrl: options?.shareUrl ?? null,
    shareToken: options?.shareToken ?? null,
    planType: options?.planType ?? null,
    expiresAt: options?.expiresAt ?? null,
  };

  if (initialLocation) {
    try {
      await apiService.updateLiveLocationShare(userId, sessionId, initialLocation.latitude, initialLocation.longitude);
    } catch (error) {
      console.warn('Failed to send initial live share location:', error);
    }
  }

  clearWatcher();

  watchId = Geolocation.watchPosition(
    async (position) => {
      if (!activeSession) {
        return;
      }
      try {
        await apiService.updateLiveLocationShare(
          activeSession.userId,
          activeSession.sessionId,
          position.coords.latitude,
          position.coords.longitude,
        );
      } catch (error: any) {
        const message = error?.message?.toLowerCase?.() || '';
        if (message.includes('session has ended')) {
          clearWatcher();
          activeSession = null;
          options?.onSessionEnded?.({
            reason: 'expired',
            message: error?.message || 'Live location session has ended',
          });
          return;
        }
        console.warn('Live share update failed:', error);
      }
    },
    (error) => {
      console.warn('Live share watch error:', error);
      Alert.alert('Live sharing paused', 'Unable to get GPS updates. Please ensure location services are enabled.');
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 1,
      interval: 2000,
      fastestInterval: 1000,
    },
  );
};

export const stopLiveLocationShareUpdates = async () => {
  clearWatcher();
  if (activeSession) {
    try {
      await apiService.stopLiveLocationShare(activeSession.userId, activeSession.sessionId);
    } catch (error) {
      console.warn('Failed to stop live share session:', error);
    }
  }
  activeSession = null;
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

/**
 * Ensure location permission is granted
 */
const ensureLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'SafeTNet needs location access to share your live position.',
        buttonPositive: 'Allow',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.warn('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Get current location with fallback methods
 */
const fetchLocationWithFallback = async (): Promise<{latitude: number; longitude: number}> => {
  const getCurrentPosition = (options = {enableHighAccuracy: true, timeout: 15000}) =>
    new Promise<{latitude: number; longitude: number}>((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => reject(error),
        options,
      );
    });

  const getEnhancedPosition = () =>
    new Promise<{latitude: number; longitude: number}>((resolve, reject) => {
      GeolocationService.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          forceRequestLocation: true,
          showLocationDialog: true,
        },
      );
    });

  try {
    return await getCurrentPosition();
  } catch (primaryError: any) {
    if (Platform.OS === 'android') {
      try {
        return await getEnhancedPosition();
      } catch (enhancedError) {
        throw enhancedError;
      }
    }
    throw primaryError;
  }
};

/**
 * Start live location sharing and return share URL
 * This is a reusable function that can be called from SOS or home screen
 */
export interface StartLiveShareResult {
  shareUrl: string;
  shareToken: string | null;
  sessionId: number;
  session: LiveShareSession | null;
  locationMessage: string; // The formatted message with share URL
}

export const startLiveLocationShare = async (
  onSessionEnded?: (payload: {reason: LiveShareEndReason; message?: string}) => void,
): Promise<StartLiveShareResult> => {
  // Get user info
  const user = useAuthStore.getState().user;
  if (!user?.id) {
    throw new Error('User not authenticated');
  }

  const isPremium = user.plan === 'premium';
  const durationMinutes = isPremium ? 1440 : 15;

  // Check location permission
  const hasPermission = await ensureLocationPermission();
  if (!hasPermission) {
    throw new Error('Location permission not granted');
  }

  // Get current location
  const coords = await fetchLocationWithFallback();

  // Create live location share session (exactly like old working HomeScreen)
  // Note: Old commit used user.id directly, but API expects number, so we ensure it's a number
  const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
  const response = await apiService.startLiveLocationShare(userId, durationMinutes);
  const session = response?.session;
  const sessionId = session?.id;

  if (!sessionId) {
    throw new Error('Could not start live share session');
  }

  // Session plan type logic (exactly like old working HomeScreen with fallback)
  const sessionPlanType =
    session?.plan_type === 'premium'
      ? 'premium'
      : session?.plan_type === 'free'
      ? 'free'
      : isPremium
      ? 'premium'
      : 'free';

  const shareToken = session?.share_token || session?.shareToken;
  const liveShareBaseUrl = getLiveShareBaseUrl();
  const normalizedBase = liveShareBaseUrl.endsWith('/')
    ? liveShareBaseUrl.slice(0, -1)
    : liveShareBaseUrl;

  const shareUrl = shareToken
    ? `${normalizedBase}/${shareToken}/`
    : buildGoogleMapsUrl(coords.latitude, coords.longitude);

  // Start live location updates (exactly like old working HomeScreen)
  await startLiveLocationShareUpdates(userId, sessionId, coords, {
    onSessionEnded,
    shareUrl,
    shareToken,
    planType: sessionPlanType,
    expiresAt: session?.expires_at || session?.expiresAt || null,
  });

  // Get active session
  const activeSession = getActiveLiveShareSession();

  // Construct location message (exactly like old working HomeScreen)
  const locationMessage = isPremium
    ? `I'm sharing my live location. Track me here until I stop sharing:\n${shareUrl}`
    : `I'm sharing my live location for the next 15 minutes. Track me here:\n${shareUrl}`;

  return {
    shareUrl,
    shareToken,
    sessionId,
    session: activeSession,
    locationMessage,
  };
};



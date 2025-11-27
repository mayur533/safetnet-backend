import Geolocation from '@react-native-community/geolocation';
import {Alert} from 'react-native';
import {apiService} from './apiService';

interface LiveShareSession {
  userId: number;
  sessionId: number;
}

type LiveShareEndReason = 'expired' | 'error';

interface LiveShareUpdateOptions {
  onSessionEnded?: (payload: {reason: LiveShareEndReason; message?: string}) => void;
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
  activeSession = {userId, sessionId};

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



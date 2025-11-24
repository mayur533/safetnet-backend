import {Alert, AppState, DeviceEventEmitter, Platform, ToastAndroid} from 'react-native';
import {dispatchSOSAlert} from './sosDispatcher';
import {useSettingsStore} from '../stores/settingsStore';
import {useAuthStore} from '../stores/authStore';
import {useAppLockStore} from '../stores/appLockStore';

type VolumePressPayload = {
  type: 'up' | 'down';
  timestamp?: number;
};

const EVENT_NAME = 'hardwareVolumePress';
const DETECTION_WINDOW_MS = 1500;
const REQUIRED_PRESSES = 5;
const COOLDOWN_MS = 8000;

let initialized = false;
let pressTimestamps: number[] = [];
let lastTrigger = 0;
let listener: {remove: () => void} | null = null;
let inFlight = false;

const shouldListen = () => {
  if (AppState.currentState !== 'active') {
    return false;
  }
  if (!useSettingsStore.getState().quickLaunchVolume) {
    return false;
  }
  if (!useAuthStore.getState().isAuthenticated) {
    return false;
  }
  return true;
};

const resetPresses = () => {
  pressTimestamps = [];
};

const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    Alert.alert('Quick Launch', message);
  }
};

const performQuickLaunchSOS = async () => {
  if (inFlight) {
    return;
  }
  inFlight = true;
  try {
    const result = await dispatchSOSAlert('');
    if (result.smsInitiated || result.callInitiated) {
      showToast('Emergency SOS launched.');
    } else {
      showToast('Could not send SOS automatically. Check connectivity.');
    }
  } catch (error) {
    console.warn('Quick launch SOS failed', error);
    showToast('Failed to launch SOS. Try manually from the app.');
  } finally {
    inFlight = false;
  }
};

const handleVolumePress = (payload: VolumePressPayload) => {
  if (!shouldListen()) {
    return;
  }

  const now = Date.now();
  if (now - lastTrigger < COOLDOWN_MS) {
    return;
  }

  pressTimestamps = pressTimestamps.filter((timestamp) => now - timestamp <= DETECTION_WINDOW_MS);
  pressTimestamps.push(now);

  if (pressTimestamps.length < REQUIRED_PRESSES) {
    return;
  }

  resetPresses();
  lastTrigger = now;

  const appLock = useAppLockStore.getState();
  if (appLock.enabled && appLock.locked) {
    Alert.alert('Unlock required', 'Unlock the app to launch SOS quickly.');
    return;
  }

  void performQuickLaunchSOS();
};

export const initializeQuickLaunchService = () => {
  if (initialized) {
    return;
  }
  initialized = true;
  listener = DeviceEventEmitter.addListener(EVENT_NAME, handleVolumePress);
};

export const teardownQuickLaunchService = () => {
  listener?.remove();
  listener = null;
  initialized = false;
  resetPresses();
};



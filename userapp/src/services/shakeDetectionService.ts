import {AppState, AppStateStatus, Platform} from 'react-native';

// Safely import react-native-push-notification
let PushNotification: any = null;
try {
  const pushNotifModule = require('react-native-push-notification');
  PushNotification = pushNotifModule.default || pushNotifModule;
  // Check if it's actually available
  if (PushNotification && typeof PushNotification.configure === 'function') {
    // Module is available
  } else {
    PushNotification = null;
  }
} catch (error) {
  console.warn('react-native-push-notification not available:', error);
  PushNotification = null;
}

// Safely import react-native-sensors
let accelerometer: any = null;
let setUpdateIntervalForType: any = null;
let SensorTypes: any = null;

// Function to check and initialize accelerometer
function initializeAccelerometer() {
  // Always re-check to ensure module is loaded
  if (accelerometer === false) {
    return false; // Already checked and not available
  }

  try {
    const sensors = require('react-native-sensors');
    console.log('Sensors module loaded:', !!sensors);
    console.log('Sensors keys:', sensors ? Object.keys(sensors) : 'null');
    
    if (sensors && sensors.accelerometer) {
      accelerometer = sensors.accelerometer;
      setUpdateIntervalForType = sensors.setUpdateIntervalForType;
      SensorTypes = sensors.SensorTypes;

      console.log('Accelerometer found:', !!accelerometer);
      console.log('SensorTypes:', !!SensorTypes);
      console.log('Accelerometer type:', typeof accelerometer);

      // Test if accelerometer has subscribe method
      if (accelerometer && typeof accelerometer.subscribe === 'function') {
        console.log('Accelerometer has subscribe method - module is ready');
      } else {
        console.warn('Accelerometer does not have subscribe method');
        accelerometer = false;
        return false;
      }

      // Configure sensor update interval safely
      if (setUpdateIntervalForType && SensorTypes && SensorTypes.accelerometer) {
        try {
          setUpdateIntervalForType(SensorTypes.accelerometer, 100); // 100ms = 10Hz
          console.log('Accelerometer update interval set');
        } catch (e) {
          console.warn('Could not set accelerometer update interval:', e);
        }
      }
    } else {
      console.warn('react-native-sensors accelerometer not found in module');
      console.warn('Available exports:', sensors ? Object.keys(sensors) : 'none');
      accelerometer = false; // Mark as checked but not available
    }
  } catch (error: any) {
    console.warn('react-native-sensors not available:', error?.message || error);
    console.warn('Error details:', error);
    accelerometer = false; // Mark as checked but not available
  }

  return accelerometer;
}

// Try to initialize immediately
initializeAccelerometer();

interface ShakeDetectionConfig {
  threshold: number; // Acceleration threshold for shake detection
  shakeCount: number; // Number of shakes required
  timeWindow: number; // Time window in ms to detect shakes
}

const defaultConfig: ShakeDetectionConfig = {
  threshold: 2.5, // g-force threshold
  shakeCount: 3,
  timeWindow: 2000, // 2 seconds
};

class ShakeDetectionService {
  private subscription: any = null;
  private shakeTimestamps: number[] = [];
  private isActive: boolean = false;
  private config: ShakeDetectionConfig = defaultConfig;
  private onShakeDetected: (() => void) | null = null;
  private lastAcceleration: {x: number; y: number; z: number} | null = null;
  private appStateListener: any = null;

  private isConfigured: boolean = false;

  constructor() {
    // Configure push notifications lazily
    this.configureNotifications();
  }

  private configureNotifications() {
    if (this.isConfigured) {
      return;
    }

    if (!PushNotification) {
      console.warn('PushNotification is not available - notifications will be disabled');
      this.isConfigured = true; // Mark as configured to avoid repeated checks
      return;
    }

    try {
      // Configure push notifications only if available
      if (PushNotification && typeof PushNotification.configure === 'function') {
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
          popInitialNotification: false, // Changed to false to avoid getInitialNotification error
          requestPermissions: Platform.OS === 'ios', // Only request on iOS
        };

        // Only add getInitialNotification if it exists
        if (PushNotification.getInitialNotification) {
          try {
            const initialNotification = PushNotification.getInitialNotification();
            if (initialNotification) {
              console.log('Initial notification:', initialNotification);
            }
          } catch (e) {
            console.warn('Could not get initial notification:', e);
          }
        }

        PushNotification.configure(config);
      }

      // Create notification channel for Android
      if (Platform.OS === 'android' && PushNotification && typeof PushNotification.createChannel === 'function') {
        try {
          PushNotification.createChannel(
            {
              channelId: 'sos-channel',
              channelName: 'SOS Notifications',
              channelDescription: 'Notifications for SOS alerts',
              playSound: true,
              soundName: 'default',
              importance: 4, // High importance
              vibrate: true,
            },
            (created: boolean) => {
              if (created) {
                console.log('SOS notification channel created');
              }
            },
          );
        } catch (e) {
          console.warn('Could not create notification channel:', e);
        }
      }

      this.isConfigured = true;
    } catch (error) {
      console.error('Error configuring push notifications:', error);
      this.isConfigured = true; // Mark as configured to avoid repeated failures
    }
  }

  start(onShakeDetected: () => void) {
    if (this.isActive) {
      return;
    }

    // Re-check and initialize accelerometer
    const accel = initializeAccelerometer();
    if (!accel || accel === false) {
      console.error('Accelerometer is not available');
      return;
    }

    this.onShakeDetected = onShakeDetected;
    this.isActive = true;
    this.shakeTimestamps = [];

    try {
      // Use the re-initialized accelerometer
      const accel = initializeAccelerometer();
      if (!accel || accel === false) {
        console.error('Accelerometer not available for subscription');
        this.isActive = false;
        return;
      }

      // Subscribe to accelerometer
      this.subscription = accel.subscribe(
        ({x, y, z}: {x: number; y: number; z: number}) => {
          if (x !== undefined && y !== undefined && z !== undefined) {
            this.handleAccelerometerData(x, y, z);
          }
        },
        (error: any) => {
          console.error('Accelerometer subscription error:', error);
          this.isActive = false;
        },
      );
      
      console.log('Accelerometer subscription started successfully');

      // Monitor app state to keep detection active in background
      this.appStateListener = AppState.addEventListener('change', this.handleAppStateChange);
    } catch (error) {
      console.error('Error starting shake detection:', error);
      this.isActive = false;
    }
  }

  stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.isActive = false;
    this.shakeTimestamps = [];
    this.lastAcceleration = null;
    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
    }
  }

  isAccelerometerAvailable(): boolean {
    // Re-check availability in case module loaded later
    const result = initializeAccelerometer();
    return result !== null && result !== false;
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    // Keep shake detection active even when app is in background
    // The accelerometer subscription continues to work in background
    console.log('App state changed to:', nextAppState);
  };

  private handleAccelerometerData(x: number, y: number, z: number) {
    // Validate input
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
      return;
    }

    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      return;
    }

    if (!this.lastAcceleration) {
      this.lastAcceleration = {x, y, z};
      return;
    }

    // Calculate acceleration change
    const deltaX = Math.abs(x - this.lastAcceleration.x);
    const deltaY = Math.abs(y - this.lastAcceleration.y);
    const deltaZ = Math.abs(z - this.lastAcceleration.z);

    const totalDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);

    // Check if shake detected (acceleration change exceeds threshold)
    if (totalDelta > this.config.threshold) {
      const now = Date.now();
      this.shakeTimestamps.push(now);

      // Remove old timestamps outside time window
      this.shakeTimestamps = this.shakeTimestamps.filter(
        (timestamp) => now - timestamp <= this.config.timeWindow,
      );

      // Check if required number of shakes detected
      if (this.shakeTimestamps.length >= this.config.shakeCount) {
        this.triggerShakeDetected();
        this.shakeTimestamps = []; // Reset after detection
      }
    }

    this.lastAcceleration = {x, y, z};
  }

  private triggerShakeDetected() {
    if (this.onShakeDetected) {
      // Call the callback to send SOS
      this.onShakeDetected();
      // Show notification
      this.showSOSNotification();
    }
  }

  showSOSNotification() {
    try {
      if (!PushNotification) {
        console.warn('PushNotification is not available - using Alert as fallback');
        // Fallback to Alert if notifications not available
        const {Alert} = require('react-native');
        Alert.alert('SOS Sent Successfully', 'Your emergency alert has been sent to your contacts.');
        return;
      }

      // Ensure notifications are configured
      this.configureNotifications();

      if (PushNotification && typeof PushNotification.localNotification === 'function') {
        const notificationConfig: any = {
          title: 'SOS Sent Successfully',
          message: 'Your emergency alert has been sent to your contacts.',
          playSound: true,
          soundName: 'default',
          vibrate: true,
          vibration: 1000,
        };

        // Add Android-specific properties
        if (Platform.OS === 'android') {
          notificationConfig.channelId = 'sos-channel';
          notificationConfig.importance = 'high';
          notificationConfig.priority = 'high';
        }

        PushNotification.localNotification(notificationConfig);
      } else {
        // Fallback to Alert
        const {Alert} = require('react-native');
        Alert.alert('SOS Sent Successfully', 'Your emergency alert has been sent to your contacts.');
      }
    } catch (error) {
      console.error('Error showing SOS notification:', error);
      // Fallback to Alert on error
      try {
        const {Alert} = require('react-native');
        Alert.alert('SOS Sent Successfully', 'Your emergency alert has been sent to your contacts.');
      } catch (e) {
        console.error('Could not show alert:', e);
      }
    }
  }
}

// Singleton instance
export const shakeDetectionService = new ShakeDetectionService();


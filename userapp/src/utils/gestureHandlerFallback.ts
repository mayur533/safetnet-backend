/**
 * Fallback for gesture handler when TurboModule is not available
 * This allows the app to work even if RNGestureHandlerModule is not registered
 */

import { View, ViewProps } from 'react-native';

// Create a polyfill for GestureHandlerRootView that just renders a View
export const GestureHandlerRootView = View as React.ComponentType<ViewProps & { children?: React.ReactNode }>;

// Export a safe version that won't crash if gesture handler fails
let SafeGestureHandlerRootView: any = View;

try {
  const gestureHandler = require('react-native-gesture-handler');
  if (gestureHandler && gestureHandler.GestureHandlerRootView) {
    SafeGestureHandlerRootView = gestureHandler.GestureHandlerRootView;
  }
} catch (e) {
  console.warn('Gesture handler not available, using View fallback');
}

export { SafeGestureHandlerRootView };



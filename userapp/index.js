/**
 * @format
 */

// Polyfill gesture handler to prevent TurboModule errors
// Load the polyfill before gesture handler tries to access TurboModuleRegistry
require('./src/utils/gestureHandlerPolyfill');

// Try to import gesture handler, but catch any errors
let gestureHandlerLoaded = false;
try {
  require('react-native-gesture-handler');
  gestureHandlerLoaded = true;
} catch (e) {
  console.warn('Gesture handler failed to load, using fallback:', e.message);
}

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

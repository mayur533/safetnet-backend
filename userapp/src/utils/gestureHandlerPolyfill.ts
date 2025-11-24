/**
 * Polyfill for react-native-gesture-handler to prevent TurboModule errors
 * This intercepts the module loading and provides a fallback
 */

// Create a mock TurboModule that won't crash
const createMockTurboModule = () => {
  return {
    handleSetJSResponder: () => {},
    handleClearJSResponder: () => {},
    createGestureHandler: () => {},
    attachGestureHandler: () => {},
    updateGestureHandler: () => {},
    dropGestureHandler: () => {},
    install: () => false,
    flushOperations: () => {},
  };
};

// Intercept the module loading
try {
  const TurboModuleRegistry = require('react-native').TurboModuleRegistry;
  if (TurboModuleRegistry) {
    // Try to get the module, but don't enforce it
    const module = TurboModuleRegistry.get('RNGestureHandlerModule');
    if (!module) {
      // If module is not found, provide a mock
      console.warn('RNGestureHandlerModule not found, using mock implementation');
      // We can't directly add to TurboModuleRegistry, so we'll handle this in the component
    }
  }
} catch (e) {
  console.warn('Could not access TurboModuleRegistry:', e.message);
}

export const mockGestureHandlerModule = createMockTurboModule();



/**
 * Patched version of NativeRNGestureHandlerModule that uses get() instead of getEnforcing()
 * This prevents the app from crashing when the TurboModule is not registered
 */

import { TurboModuleRegistry, TurboModule } from 'react-native';
import { Double } from 'react-native/Libraries/Types/CodegenTypes';

export interface Spec extends TurboModule {
  handleSetJSResponder: (tag: Double, blockNativeResponder: boolean) => void;
  handleClearJSResponder: () => void;
  createGestureHandler: (
    handlerName: string,
    handlerTag: Double,
    config: Object
  ) => void;
  attachGestureHandler: (
    handlerTag: Double,
    newView: Double,
    actionType: Double
  ) => void;
  updateGestureHandler: (handlerTag: Double, newConfig: Object) => void;
  dropGestureHandler: (handlerTag: Double) => void;
  install: () => boolean;
  flushOperations: () => void;
}

// Use get() instead of getEnforcing() to allow fallback
const module = TurboModuleRegistry.get<Spec>('RNGestureHandlerModule');

if (!module) {
  console.warn('RNGestureHandlerModule not found, gesture handler features will be limited');
  // Return a mock module that won't crash
  export default {
    handleSetJSResponder: () => {},
    handleClearJSResponder: () => {},
    createGestureHandler: () => {},
    attachGestureHandler: () => {},
    updateGestureHandler: () => {},
    dropGestureHandler: () => {},
    install: () => false,
    flushOperations: () => {},
  } as Spec;
} else {
  export default module;
}



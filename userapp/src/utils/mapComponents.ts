let MapView: any = null;
let Marker: any = null;
let Circle: any = null;
let PROVIDER_GOOGLE: any = null;
let mapsModuleAvailable = false;

try {
  const mapsModule = require('react-native-maps');
  if (mapsModule) {
    MapView = mapsModule.default || mapsModule.MapView;
    Marker = mapsModule.Marker;
    Circle = mapsModule.Circle;
    PROVIDER_GOOGLE = mapsModule.PROVIDER_GOOGLE || 'google';
    mapsModuleAvailable = Boolean(MapView && Marker);
    if (__DEV__ && mapsModuleAvailable) {
      console.log('[mapComponents] react-native-maps loaded');
    }
  }
} catch (error: any) {
  console.warn('[mapComponents] react-native-maps not available:', error?.message || error);
  mapsModuleAvailable = false;
}

export {MapView, Marker, Circle, PROVIDER_GOOGLE, mapsModuleAvailable};


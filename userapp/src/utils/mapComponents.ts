let MapView: any = null;
let Marker: any = null;
let Circle: any = null;
let UrlTile: any = null;
let PROVIDER_GOOGLE: any = null;
let PROVIDER_DEFAULT: any = null;
let mapsModuleAvailable = false;

try {
  const mapsModule = require('react-native-maps');
  if (mapsModule) {
    MapView = mapsModule.default || mapsModule.MapView;
    Marker = mapsModule.Marker;
    Circle = mapsModule.Circle;
    UrlTile = mapsModule.UrlTile;
    PROVIDER_GOOGLE = mapsModule.PROVIDER_GOOGLE || 'google';
    PROVIDER_DEFAULT = mapsModule.PROVIDER_DEFAULT || null;
    mapsModuleAvailable = Boolean(MapView && Marker);
    if (__DEV__ && mapsModuleAvailable) {
      console.log('[mapComponents] react-native-maps loaded successfully');
    }
  }
} catch (error: any) {
  console.warn('[mapComponents] react-native-maps not available:', error?.message || error);
  mapsModuleAvailable = false;
}

export {MapView, Marker, Circle, UrlTile, PROVIDER_GOOGLE, PROVIDER_DEFAULT, mapsModuleAvailable};

